/**
 * POST /api/moments/communities/[id]/join
 * El usuario autenticado se une a una comunidad de su organización.
 *
 * Seguridad:
 * - orgId resuelto desde sesión (nunca del cliente)
 * - Comunidad buscada con .eq('organization_id', orgId) → 404 si es de otra org
 * - Comunidades privadas solo accesibles si el usuario es admin
 * - Comunidades archivadas no admiten nuevos miembros
 * - Unicidad (community_id, user_id) manejada vía 409
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getRequestContext }         from '@/lib/auth/requestContext'
import { isAdmin }                   from '@/lib/moments/permissions'
import {
  toErrorResponse,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/lib/moments/errors'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { orgId, userId, role } = await getRequestContext()
    const { id: communityId }     = await params

    const supabase = await createClient()

    // ── 1. Verificar que la comunidad existe en la org del usuario ────
    const { data: community, error: findErr } = await supabase
      .from('moments_communities')
      .select('id, name, is_private, is_archived, posting_policy')
      .eq('id', communityId)
      .eq('organization_id', orgId)   // AISLAMIENTO TENANT
      .maybeSingle()

    if (findErr || !community) {
      throw new NotFoundError('Comunidad no encontrada')
    }

    // ── 2. Comunidades archivadas no admiten nuevos miembros ──────────
    if (community.is_archived) {
      throw new ConflictError('La comunidad está archivada', 'COMMUNITY_ARCHIVED')
    }

    // ── 3. Comunidades privadas: solo admins pueden unirse directamente
    if (community.is_private && !isAdmin(role)) {
      throw new ForbiddenError('Esta comunidad es privada. Solicita acceso a un administrador')
    }

    // ── 4. Comprobar si ya es miembro ────────────────────────────────
    const { data: existing } = await supabase
      .from('moments_community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      throw new ConflictError('Ya eres miembro de esta comunidad', 'ALREADY_MEMBER')
    }

    // ── 5. Insertar membresía ────────────────────────────────────────
    const { error: insertErr } = await supabase
      .from('moments_community_members')
      .insert({
        organization_id: orgId,
        community_id:    communityId,
        user_id:         userId,
        role:            'member',
      })

    if (insertErr) {
      // UNIQUE violation → race condition, ya es miembro
      if (insertErr.code === '23505') {
        throw new ConflictError('Ya eres miembro de esta comunidad', 'ALREADY_MEMBER')
      }
      throw insertErr
    }

    return NextResponse.json({
      data: { community_id: communityId, community_name: community.name, role: 'member' },
    })

  } catch (err) {
    return toErrorResponse(err)
  }
}
