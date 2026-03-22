/**
 * POST /api/moments/posts
 * Crea una publicación en una comunidad de Moments.
 *
 * Flujo:
 *   1. Autenticación y resolución de contexto (orgId, rol)
 *   2. Validar payload (post_type, body, title, community_id)
 *   3. Verificar que la comunidad existe en la org del usuario
 *   4. Verificar canPostInCommunity(rol, posting_policy)
 *   5. Rate limiting: máx 10 posts/hora
 *   6. Sanitizar contenido textual (anti XSS almacenado)
 *   7. Insertar post
 *
 * Seguridad:
 *   - organization_id siempre del contexto de sesión
 *   - 404 si la comunidad pertenece a otra org (evita enumeración)
 *   - 403 si posting_policy = admins_only y el usuario no es admin
 *   - 409 si se excede el rate limit
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getRequestContext }         from '@/lib/auth/requestContext'
import { canPostInCommunity }        from '@/lib/moments/permissions'
import { validatePostCreate }        from '@/lib/moments/validators'
import { sanitizeText, sanitizeTitle } from '@/lib/moments/sanitize'
import { checkRateLimit, rollbackRateLimit } from '@/lib/moments/rateLimit'
import {
  toErrorResponse,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/lib/moments/errors'
import type { PostingPolicy } from '@/lib/moments/validators'

export async function POST(req: NextRequest) {
  try {
    const { orgId, userId, role } = await getRequestContext()

    // ── 1. Validar payload ─────────────────────────────────────────────
    const body      = await req.json().catch(() => null)
    const validated = validatePostCreate(body)

    // ── 2. Verificar comunidad en la org del usuario ───────────────────
    const supabase = await createClient()

    const { data: community, error: commErr } = await supabase
      .from('moments_communities')
      .select('id, posting_policy, is_archived, is_private')
      .eq('id', validated.community_id)
      .eq('organization_id', orgId)   // AISLAMIENTO TENANT
      .maybeSingle()

    if (commErr || !community) {
      throw new NotFoundError('Comunidad no encontrada')
    }

    if (community.is_archived) {
      throw new ConflictError('La comunidad está archivada', 'COMMUNITY_ARCHIVED')
    }

    // ── 3. Verificar posting_policy ────────────────────────────────────
    const policy = community.posting_policy as PostingPolicy
    if (!canPostInCommunity(role, policy)) {
      throw new ForbiddenError(
        'Esta comunidad solo permite publicar a administradores',
      )
    }

    // ── 4. Rate limiting ───────────────────────────────────────────────
    checkRateLimit(userId, 'post')

    // ── 5. Sanitizar contenido ─────────────────────────────────────────
    const cleanBody  = sanitizeText(validated.body)
    const cleanTitle = validated.title ? sanitizeTitle(validated.title) : null

    if (cleanBody.length === 0) {
      rollbackRateLimit(userId, 'post')
      throw new ForbiddenError('El contenido del post no puede estar vacío tras la sanitización')
    }

    // ── 6. Insertar post ───────────────────────────────────────────────
    const { data: post, error: insertErr } = await supabase
      .from('moments_posts')
      .insert({
        organization_id: orgId,
        community_id:    validated.community_id,
        author_id:       userId,
        post_type:       validated.post_type,
        title:           cleanTitle,
        body:            cleanBody,
        status:          'published',
      })
      .select('id, community_id, post_type, title, body, is_pinned, created_at')
      .single()

    if (insertErr) {
      rollbackRateLimit(userId, 'post')
      throw insertErr
    }

    return NextResponse.json({ data: post }, { status: 201 })

  } catch (err) {
    return toErrorResponse(err)
  }
}
