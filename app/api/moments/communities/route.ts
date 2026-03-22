/**
 * GET  /api/moments/communities  — lista comunidades de la org activa
 * POST /api/moments/communities  — crea una comunidad (owner/admin/hr_specialist)
 *
 * Seguridad:
 * - getRequestContext() resuelve orgId desde sesión (nunca del cliente)
 * - Todas las queries filtran por organization_id
 * - POST requiere rol admin; devuelve 403 si no cumple
 * - 404 homogéneo para recursos de otras orgs (evita enumeración)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getRequestContext }         from '@/lib/auth/requestContext'
import { canCreateCommunity }        from '@/lib/moments/permissions'
import { validateCommunityCreate }   from '@/lib/moments/validators'
import { toErrorResponse, ForbiddenError } from '@/lib/moments/errors'

// ── GET /api/moments/communities ─────────────────────────────────────

export async function GET(_req: NextRequest) {
  try {
    const { orgId, userId, role } = await getRequestContext()
    const supabase = await createClient()

    // Selecciona comunidades de la org, excluyendo archivadas.
    // RLS filtra adicionalmente las privadas si el usuario no es miembro.
    // member_count se obtiene vía subquery embebida en select.
    const { data, error } = await supabase
      .from('moments_communities')
      .select(`
        id,
        name,
        description,
        icon_emoji,
        banner_url,
        posting_policy,
        is_private,
        is_archived,
        created_by,
        created_at,
        updated_at,
        member_count:moments_community_members(count),
        is_member:moments_community_members!inner(user_id)
      `)
      .eq('organization_id', orgId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Normalizar: member_count es array [{ count }], is_member indica si el usuario está
    const communities = (data ?? []).map(c => ({
      ...c,
      member_count: (c.member_count as unknown as { count: number }[])[0]?.count ?? 0,
      is_member:    Array.isArray(c.is_member) &&
                    c.is_member.some((m: { user_id: string }) => m.user_id === userId),
    }))

    return NextResponse.json({ data: communities })

  } catch (err) {
    return toErrorResponse(err)
  }
}

// ── POST /api/moments/communities ────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { orgId, userId, role } = await getRequestContext()

    // Solo admins pueden crear comunidades
    if (!canCreateCommunity(role)) {
      throw new ForbiddenError('Solo administradores pueden crear comunidades')
    }

    const body      = await req.json().catch(() => null)
    const validated = validateCommunityCreate(body)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('moments_communities')
      .insert({
        organization_id: orgId,
        created_by:      userId,
        name:            validated.name,
        description:     validated.description,
        posting_policy:  validated.posting_policy,
        is_private:      validated.is_private,
      })
      .select('id, name, description, posting_policy, is_private, created_at')
      .single()

    if (error) throw error

    // Auto-agregar al creador como admin de la comunidad
    await supabase
      .from('moments_community_members')
      .insert({
        organization_id: orgId,
        community_id:    data.id,
        user_id:         userId,
        role:            'admin',
      })

    return NextResponse.json({ data }, { status: 201 })

  } catch (err) {
    return toErrorResponse(err)
  }
}
