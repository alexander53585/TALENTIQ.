/**
 * POST /api/moments/posts/[id]/best-answer
 *
 * Marca o desmarca una respuesta como "mejor respuesta" en una pregunta.
 * body: { comment_id: string | null }   (null = quitar marca actual)
 *
 * Permisos: solo el autor del post, o admins/owner/hr_specialist de la org.
 *
 * Seguridad:
 *   - organization_id siempre del contexto de sesión
 *   - 404 si post no existe en la org
 *   - 403 si no es autor ni admin
 *   - 409 si el post no es de tipo question
 *   - 422 si el comment_id no pertenece al post
 */
import { NextRequest, NextResponse }      from 'next/server'
import { createClient }                   from '@/lib/supabase/server'
import { getRequestContext }              from '@/lib/auth/requestContext'
import { validateBestAnswer }             from '@/lib/moments/validators'
import {
  toErrorResponse,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/lib/moments/errors'

const ADMIN_ROLES = new Set(['owner', 'admin', 'hr_specialist'])

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { orgId, userId, role } = await getRequestContext()
    const { id: postId }          = await params
    const supabase                = await createClient()

    const rawBody  = await req.json().catch(() => null)
    const validated = validateBestAnswer(rawBody)

    // ── 1. Obtener post ────────────────────────────────────────────────
    const { data: post } = await supabase
      .from('moments_posts')
      .select('post_type, author_id')
      .eq('id', postId)
      .eq('organization_id', orgId)
      .eq('status', 'published')
      .maybeSingle()

    if (!post) throw new NotFoundError('Post no encontrado')
    if (post.post_type !== 'question') {
      throw new ConflictError('Solo los posts de tipo pregunta pueden tener mejor respuesta', 'TYPE_MISMATCH')
    }

    // ── 2. Verificar permiso ───────────────────────────────────────────
    const isAuthor = post.author_id === userId
    const isAdmin  = ADMIN_ROLES.has(role)
    if (!isAuthor && !isAdmin) {
      throw new ForbiddenError('Solo el autor de la pregunta puede marcar la mejor respuesta')
    }

    // ── 3. Verificar que el comment pertenece al post (si se provee) ──
    if (validated.comment_id) {
      const { data: comment } = await supabase
        .from('moments_comments')
        .select('id')
        .eq('id', validated.comment_id)
        .eq('post_id', postId)
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .maybeSingle()

      if (!comment) throw new NotFoundError('Comentario no encontrado en este post')
    }

    // ── 4. Limpiar marca anterior y aplicar nueva ──────────────────────
    // Clear all best answers on this post first
    await supabase
      .from('moments_comments')
      .update({ is_best_answer: false })
      .eq('post_id', postId)
      .eq('organization_id', orgId)
      .eq('is_best_answer', true)

    if (validated.comment_id) {
      await supabase
        .from('moments_comments')
        .update({ is_best_answer: true })
        .eq('id', validated.comment_id)
        .eq('organization_id', orgId)
    }

    return NextResponse.json({ data: { comment_id: validated.comment_id } })

  } catch (err) {
    return toErrorResponse(err)
  }
}
