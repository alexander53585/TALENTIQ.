/**
 * GET /api/admin/members  — Lista los miembros de la organización del usuario autenticado.
 * PUT /api/admin/members  — Actualiza el rol de un miembro de la organización.
 *
 * Seguridad:
 * - Autenticación y membresía activa resuelta por getRequestContext() (nunca del cliente)
 * - Solo owner o admin pueden listar y modificar miembros
 * - Solo owner puede asignar el rol 'owner' a otro miembro
 * - El membership a modificar debe pertenecer a la misma organización (aislamiento tenant)
 * - Errores tipados con toErrorResponse()
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import {
  toErrorResponse,
  ForbiddenError,
  ValidationError,
  NotFoundError,
} from '@/lib/moments/errors'

// Roles válidos del sistema
const VALID_ROLES = ['owner', 'admin', 'hr_specialist', 'manager', 'employee'] as const
type ValidRole = typeof VALID_ROLES[number]

/* ── GET — listar miembros de la organización ─────────── */
export async function GET() {
  try {
    // Resuelve userId, orgId y role desde la sesión activa.
    // Lanza NotAuthenticatedError o ForbiddenError si no hay sesión/membresía válida.
    const { orgId, role } = await getRequestContext()

    // Solo owner y admin pueden ver la lista de miembros
    if (!['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Se requiere rol owner o admin para ver los miembros')
    }

    const supabase = await createClient()

    // Obtener membresías de la organización
    const { data: memberships, error: memError } = await supabase
      .from('user_memberships')
      .select(`
        id,
        user_id,
        role,
        scope,
        is_active,
        created_at
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true })

    if (memError) {
      throw new Error(memError.message)
    }

    // Enriquecer con emails desde la tabla de perfiles
    const userIds = memberships.map(m => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds)

    const data = memberships.map(m => ({
      ...m,
      email: profiles?.find(p => p.id === m.user_id)?.email || 'Usuario',
    }))

    return NextResponse.json({ data })

  } catch (err) {
    return toErrorResponse(err)
  }
}

/* ── PUT — actualizar rol de un miembro ───────────────── */
export async function PUT(req: NextRequest) {
  try {
    // Resuelve contexto de seguridad desde la sesión activa
    const { orgId, role: callerRole } = await getRequestContext()

    // Solo owner y admin pueden cambiar roles
    if (!['owner', 'admin'].includes(callerRole)) {
      throw new ForbiddenError('Se requiere rol owner o admin para modificar roles')
    }

    // Parsear body
    const body = await req.json().catch(() => null)
    if (!body?.id || !body?.role) {
      throw new ValidationError('Los campos id y role son requeridos')
    }

    // Validar que el nuevo rol es un valor permitido
    if (!VALID_ROLES.includes(body.role as ValidRole)) {
      throw new ValidationError(
        `El rol '${body.role}' no es válido. Opciones: ${VALID_ROLES.join(', ')}`,
        'role',
      )
    }

    // Solo el owner puede asignar el rol 'owner' a otro miembro
    if (body.role === 'owner' && callerRole !== 'owner') {
      throw new ForbiddenError('Solo un owner puede asignar el rol owner a otro miembro')
    }

    const supabase = await createClient()

    // Verificar que el membership a modificar pertenece a la misma organización.
    // Esto previene que un admin/owner modifique membresías de otras orgs.
    const { data: targetMembership } = await supabase
      .from('user_memberships')
      .select('id, organization_id')
      .eq('id', body.id)
      .eq('organization_id', orgId) // aislamiento tenant
      .maybeSingle()

    if (!targetMembership) {
      // 404 para evitar revelar si el membership existe en otra organización
      throw new NotFoundError('Membresía no encontrada en esta organización')
    }

    // Actualizar el rol
    const { data, error } = await supabase
      .from('user_memberships')
      .update({ role: body.role })
      .eq('id', body.id)
      .eq('organization_id', orgId) // doble garantía de aislamiento
      .select()
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ data })

  } catch (err) {
    return toErrorResponse(err)
  }
}
