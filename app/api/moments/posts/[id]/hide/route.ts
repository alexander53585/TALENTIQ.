/**
 * POST /api/moments/posts/[id]/hide
 * Oculta (soft-delete) o restaura un post sin eliminar su historial de auditoría.
 *
 * Permisos:
 *   - owner/admin: siempre
 *   - hr_specialist: solo si es admin de la comunidad del post
 *   - otros: 403
 *
 * Payload: { hidden: boolean }
 * hidden=true  → status='removed'   (soft-delete)
 * hidden=false → status='published' (restaurar)
 *
 * Invariante: el registro en DB siempre existe — solo cambia status.
 * Los registros de auditoría anteriores no se ven afectados.
 */
import { NextRequest, NextResponse }    from 'next/server'
import { createClient }                 from '@/lib/supabase/server'
import { getRequestContext }            from '@/lib/auth/requestContext'
import { validateHidePost }             from '@/lib/moments/validators'
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
    const validated = validateHidePost(body)

    const supabase = await createClient()

    // ── Obtener el post y su comunidad ────────────────────────────────
    // Permite status cualquiera para poder restaurar posts ocultos
    const { data: post, error: postErr } = await supabase
      .from('moments_posts')
      .select('id, status, community_id')
      .eq('id', postId)
      .eq('organization_id', orgId)   // AISLAMIENTO TENANT
      .maybeSingle()

    if (postErr || !post) {
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
      throw new ForbiddenError('No tienes permisos para ocultar este post')
    }

    // ── Actualizar status ─────────────────────────────────────────────
    const newStatus = validated.hidden ? 'removed' : 'published'

    const { data: updated, error: updateErr } = await supabase
      .from('moments_posts')
      .update({ status: newStatus })
      .eq('id', postId)
      .eq('organization_id', orgId)
      .select('id, status, updated_at')
      .single()

    if (updateErr) throw updateErr

    logMomentsAudit({
      actor_id:    userId,
      org_id:      orgId,
      action:      validated.hidden ? 'post.hidden' : 'post.restored',
      target_type: 'post',
      target_id:   postId,
      metadata:    { previous_status: post.status, new_status: newStatus },
    })

    return NextResponse.json({ data: updated })

  } catch (err) {
    return toErrorResponse(err)
  }
}
