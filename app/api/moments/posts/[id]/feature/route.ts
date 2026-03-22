/**
 * POST /api/moments/posts/[id]/feature
 * Destaca (pin) o quita el destacado de un post.
 *
 * Permisos:
 *   - owner/admin: siempre
 *   - hr_specialist: solo si es admin de la comunidad del post
 *   - otros: 403
 *
 * Payload: { featured: boolean }
 * featured=true  → is_pinned=true
 * featured=false → is_pinned=false
 */
import { NextRequest, NextResponse }    from 'next/server'
import { createClient }                 from '@/lib/supabase/server'
import { getRequestContext }            from '@/lib/auth/requestContext'
import { validateFeaturePost }          from '@/lib/moments/validators'
import { canModeratePost }              from '@/lib/moments/permissions'
import { logMomentsAudit }              from '@/lib/moments/audit'
import { toErrorResponse, NotFoundError, ForbiddenError } from '@/lib/moments/errors'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { orgId, userId, role } = await getRequestContext()
    const { id: postId }          = await params

    const body      = await req.json().catch(() => null)
    const validated = validateFeaturePost(body)

    const supabase = await createClient()

    // ── Obtener el post y su comunidad ────────────────────────────────
    const { data: post, error: postErr } = await supabase
      .from('moments_posts')
      .select('id, status, community_id')
      .eq('id', postId)
      .eq('organization_id', orgId)   // AISLAMIENTO TENANT
      .maybeSingle()

    if (postErr || !post || post.status === 'removed') {
      throw new NotFoundError('Post no encontrado')
    }

    // ── Verificar si el usuario es admin de la comunidad del post ─────
    const { data: membership } = await supabase
      .from('moments_community_members')
      .select('role')
      .eq('community_id', post.community_id)
      .eq('user_id', userId)
      .maybeSingle()

    const isCommunityAdmin = membership?.role === 'admin'

    if (!canModeratePost(role, isCommunityAdmin)) {
      throw new ForbiddenError('No tienes permisos para destacar este post')
    }

    // ── Actualizar is_pinned ──────────────────────────────────────────
    const { data: updated, error: updateErr } = await supabase
      .from('moments_posts')
      .update({ is_pinned: validated.featured })
      .eq('id', postId)
      .eq('organization_id', orgId)
      .select('id, is_pinned, updated_at')
      .single()

    if (updateErr) throw updateErr

    logMomentsAudit({
      actor_id:    userId,
      org_id:      orgId,
      action:      validated.featured ? 'post.featured' : 'post.unfeatured',
      target_type: 'post',
      target_id:   postId,
    })

    return NextResponse.json({ data: updated })

  } catch (err) {
    return toErrorResponse(err)
  }
}
