/**
 * POST /api/moments/posts/[id]/comments
 * Agrega un comentario a un post publicado.
 *
 * Seguridad:
 *   - organization_id siempre del contexto de sesión
 *   - 404 si el post pertenece a otra org (evita enumeración)
 *   - 422 si el post está bloqueado (is_locked)
 *   - Rate limiting: máx 30 comentarios/hora por usuario
 *   - Sanitización de body (anti XSS almacenado)
 *   - parent_comment_id validado como perteneciente al mismo post y org
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getRequestContext }         from '@/lib/auth/requestContext'
import { validateCommentCreate }     from '@/lib/moments/validators'
import { sanitizeText }              from '@/lib/moments/sanitize'
import { checkRateLimit, rollbackRateLimit } from '@/lib/moments/rateLimit'
import {
  toErrorResponse,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@/lib/moments/errors'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { orgId, userId } = await getRequestContext()
    const { id: postId }    = await params

    // ── 1. Validar payload ─────────────────────────────────────────────
    const body      = await req.json().catch(() => null)
    const validated = validateCommentCreate(body)

    // post_id del body debe coincidir con el [id] de la URL
    if (validated.post_id !== postId) {
      throw new ValidationError(
        '"post_id" debe coincidir con el ID del post en la URL',
        'post_id',
      )
    }

    const supabase = await createClient()

    // ── 2. Verificar que el post existe en la org ──────────────────────
    const { data: post, error: postErr } = await supabase
      .from('moments_posts')
      .select('id, is_locked, status')
      .eq('id', postId)
      .eq('organization_id', orgId)   // AISLAMIENTO TENANT
      .maybeSingle()

    if (postErr || !post) {
      throw new NotFoundError('Post no encontrado')
    }

    if (post.status !== 'published') {
      throw new NotFoundError('Post no encontrado')
    }

    if (post.is_locked) {
      throw new ConflictError('El post está bloqueado y no acepta comentarios', 'POST_LOCKED')
    }

    // ── 3. Validar parent_comment_id si se provee ──────────────────────
    if (validated.parent_id) {
      const { data: parent } = await supabase
        .from('moments_comments')
        .select('id')
        .eq('id', validated.parent_id)
        .eq('post_id', postId)
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .maybeSingle()

      if (!parent) {
        throw new NotFoundError('Comentario padre no encontrado en este post')
      }
    }

    // ── 4. Rate limiting ───────────────────────────────────────────────
    checkRateLimit(userId, 'comment')

    // ── 5. Sanitizar ──────────────────────────────────────────────────
    const cleanBody = sanitizeText(validated.body)
    if (cleanBody.length === 0) {
      rollbackRateLimit(userId, 'comment')
      throw new ValidationError('El comentario no puede estar vacío tras la sanitización', 'body')
    }

    // ── 6. Insertar comentario ─────────────────────────────────────────
    const { data: comment, error: insertErr } = await supabase
      .from('moments_comments')
      .insert({
        organization_id:    orgId,
        post_id:            postId,
        author_id:          userId,
        body:               cleanBody,
        parent_comment_id:  validated.parent_id ?? null,
        status:             'active',
      })
      .select('id, post_id, body, parent_comment_id, created_at')
      .single()

    if (insertErr) {
      rollbackRateLimit(userId, 'comment')
      throw insertErr
    }

    return NextResponse.json({ data: comment }, { status: 201 })

  } catch (err) {
    return toErrorResponse(err)
  }
}
