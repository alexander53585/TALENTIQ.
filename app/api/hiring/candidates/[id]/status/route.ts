import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse, ForbiddenError, NotFoundError } from '@/lib/moments/errors'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verificar sesión, membresía activa y vigencia
    const { userId, orgId, role } = await getRequestContext()

    // Solo owner, admin y hr_specialist pueden cambiar el estado de candidatos
    const ALLOWED = ['owner', 'admin', 'hr_specialist'] as const
    if (!(ALLOWED as readonly string[]).includes(role)) {
      throw new ForbiddenError('Se requiere rol de RR.HH. o superior para gestionar candidatos')
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }

    const supabase = await createClient()

    // Obtener candidato actual para validar acceso y construir historial
    const { data: cand, error: fetchErr } = await supabase
      .from('candidates')
      .select('status, status_history, organization_id')
      .eq('id', id)
      .single()

    if (fetchErr || !cand) {
      throw new NotFoundError('Candidato no encontrado')
    }

    // Validación cross-tenant: el candidato debe pertenecer a la organización del usuario
    if (cand.organization_id !== orgId) {
      throw new NotFoundError('Candidato no encontrado')
    }

    if (cand.status === status) {
      return NextResponse.json({ message: 'Sin cambios' })
    }

    const historyArray = Array.isArray(cand.status_history) ? cand.status_history : []
    const newEntry = {
      from: cand.status,
      to: status,
      by: userId,
      at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('candidates')
      .update({
        status,
        updated_at: new Date().toISOString(),
        status_history: [...historyArray, newEntry],
      })
      .eq('id', id)
      .select('id, status, status_history')
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err: unknown) {
    return toErrorResponse(err)
  }
}
