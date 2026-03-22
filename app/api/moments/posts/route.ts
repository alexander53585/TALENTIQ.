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
import { sendMomentsNotification }           from '@/lib/moments/notifications'
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

    // ── 6. Enriquecer metadata con nombres denormalizados ──────────────
    let enrichedMetadata: Record<string, unknown> | null = null

    if (validated.metadata && 'competency_id' in validated.metadata) {
      const { competency_id, employee_id } = validated.metadata
      let competency_name: string | null = null
      let employee_name:   string | null = null

      if (competency_id) {
        const { data: comp } = await supabase
          .from('cardinal_competencies')
          .select('name')
          .eq('id', competency_id)
          .eq('organization_id', orgId)
          .eq('is_active', true)
          .maybeSingle()
        competency_name = comp?.name ?? null
        if (!competency_name) throw new NotFoundError('Competencia no encontrada')
      }

      if (employee_id) {
        const { data: emp } = await supabase
          .from('employees')
          .select('full_name')
          .eq('id', employee_id)
          .eq('organization_id', orgId)
          .maybeSingle()
        employee_name = emp?.full_name ?? null
        if (!employee_name) throw new NotFoundError('Empleado no encontrado')
      }

      enrichedMetadata = { competency_id, competency_name, employee_id, employee_name }

    } else if (validated.metadata && 'job_position_id' in validated.metadata) {
      const { job_position_id } = validated.metadata
      let job_position_name: string | null = null

      if (job_position_id) {
        const { data: pos } = await supabase
          .from('job_positions')
          .select('puesto')
          .eq('id', job_position_id)
          .eq('organization_id', orgId)
          .maybeSingle()
        job_position_name = pos?.puesto ?? null
        if (!job_position_name) throw new NotFoundError('Cargo no encontrado')
      }

      enrichedMetadata = { job_position_id, job_position_name }
    }

    // ── 7. Insertar post ───────────────────────────────────────────────
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
        metadata:        enrichedMetadata,
      })
      .select('id, community_id, post_type, title, body, is_pinned, created_at, metadata')
      .single()

    if (insertErr) {
      rollbackRateLimit(userId, 'post')
      throw insertErr
    }

    // ── 8. Notificar al empleado reconocido (fire-and-forget) ──────────
    if (
      validated.post_type === 'recognition' &&
      enrichedMetadata &&
      'employee_id' in enrichedMetadata &&
      enrichedMetadata.employee_id
    ) {
      const employeeId = enrichedMetadata.employee_id as string
      supabase
        .from('employees')
        .select('user_id, full_name')
        .eq('id', employeeId)
        .eq('organization_id', orgId)
        .maybeSingle()
        .then(({ data: emp }) => {
          if (!emp?.user_id || emp.user_id === userId) return
          // Fetch actor (sender) display name
          supabase
            .from('employees')
            .select('full_name')
            .eq('user_id', userId)
            .eq('organization_id', orgId)
            .maybeSingle()
            .then(({ data: actor }) => {
              sendMomentsNotification({
                organization_id:    orgId,
                user_id:            emp.user_id,
                type:               'recognition',
                actor_id:           userId,
                actor_display_name: actor?.full_name ?? undefined,
                post_id:            post.id,
                title:              cleanTitle ?? 'Te han reconocido',
                body:               cleanBody.slice(0, 80),
              })
            })
        })
    }

    return NextResponse.json({ data: post }, { status: 201 })

  } catch (err) {
    return toErrorResponse(err)
  }
}
