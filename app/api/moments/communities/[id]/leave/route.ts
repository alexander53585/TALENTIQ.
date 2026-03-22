/**
 * POST /api/moments/communities/[id]/leave
 * El usuario autenticado abandona una comunidad de su organización.
 *
 * Seguridad:
 * - orgId resuelto desde sesión (nunca del cliente)
 * - Comunidad verificada con .eq('organization_id', orgId) → 404 si es de otra org
 * - Si el usuario no es miembro → 404 (no revelamos si la comunidad existe en otra org)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getRequestContext }         from '@/lib/auth/requestContext'
import { toErrorResponse, NotFoundError } from '@/lib/moments/errors'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { orgId, userId } = await getRequestContext()
    const { id: communityId } = await params

    const supabase = await createClient()

    // ── 1. Verificar que la comunidad existe en la org del usuario ────
    // Usar 404 aunque la comunidad exista en otra org (evitar enumeración)
    const { data: community, error: findErr } = await supabase
      .from('moments_communities')
      .select('id, name')
      .eq('id', communityId)
      .eq('organization_id', orgId)   // AISLAMIENTO TENANT
      .maybeSingle()

    if (findErr || !community) {
      throw new NotFoundError('Comunidad no encontrada')
    }

    // ── 2. Verificar membresía activa ────────────────────────────────
    const { data: membership } = await supabase
      .from('moments_community_members')
      .select('id, role')
      .eq('community_id', communityId)
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!membership) {
      throw new NotFoundError('No eres miembro de esta comunidad')
    }

    // ── 3. Eliminar membresía ────────────────────────────────────────
    const { error: deleteErr } = await supabase
      .from('moments_community_members')
      .delete()
      .eq('id', membership.id)
      .eq('organization_id', orgId)

    if (deleteErr) throw deleteErr

    return NextResponse.json({ data: { left: true, community_id: communityId } })

  } catch (err) {
    return toErrorResponse(err)
  }
}
