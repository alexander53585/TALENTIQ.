/**
 * POST /api/moments/posts/[id]/report
 * Reporta un post publicado.
 *
 * Permisos:
 *   - Cualquier miembro de la org puede reportar (canReport)
 *   - 404 si el post pertenece a otra org (anti-enumeración)
 *   - 409 si el usuario ya reportó este post
 *
 * Payload: { reason: ReportReason, detail?: string }
 * target_type y target_id vienen de la URL, nunca del cliente.
 */
import { NextRequest, NextResponse }    from 'next/server'
import { createClient }                 from '@/lib/supabase/server'
import { getRequestContext }            from '@/lib/auth/requestContext'
import { validateReportCreate }         from '@/lib/moments/validators'
import { canReport }                    from '@/lib/moments/permissions'
import { logMomentsAudit }              from '@/lib/moments/audit'
import { toErrorResponse, NotFoundError, ForbiddenError, ConflictError } from '@/lib/moments/errors'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { orgId, userId, role } = await getRequestContext()
    const { id: postId }          = await params

    if (!canReport(role)) {
      throw new ForbiddenError('No tienes permisos para reportar contenido')
    }

    const body      = await req.json().catch(() => null)
    const validated = validateReportCreate(body)

    const supabase = await createClient()

    // ── Verificar que el post existe y está publicado en esta org ─────
    const { data: post, error: postErr } = await supabase
      .from('moments_posts')
      .select('id, status')
      .eq('id', postId)
      .eq('organization_id', orgId)   // AISLAMIENTO TENANT
      .maybeSingle()

    if (postErr || !post || post.status !== 'published') {
      throw new NotFoundError('Post no encontrado')
    }

    // ── Insertar reporte ──────────────────────────────────────────────
    const { data: report, error: insertErr } = await supabase
      .from('moments_reports')
      .insert({
        organization_id: orgId,
        reporter_id:     userId,
        target_type:     'post',
        target_id:       postId,
        reason:          validated.reason,
        detail:          validated.detail,
        status:          'pending',
      })
      .select('id, reason, status, created_at')
      .single()

    if (insertErr) {
      // Unique violation: usuario ya reportó este post
      if (insertErr.code === '23505') {
        throw new ConflictError('Ya has reportado este post', 'ALREADY_REPORTED')
      }
      throw insertErr
    }

    logMomentsAudit({
      actor_id:    userId,
      org_id:      orgId,
      action:      'post.reported',
      target_type: 'post',
      target_id:   postId,
      metadata:    { reason: validated.reason, report_id: report.id },
    })

    return NextResponse.json({ data: report }, { status: 201 })

  } catch (err) {
    return toErrorResponse(err)
  }
}
