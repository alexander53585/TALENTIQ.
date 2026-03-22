/**
 * POST /api/moments/reports/[id]/resolve
 * Resuelve un reporte pendiente (dismiss / action).
 *
 * Permisos:
 *   - owner/admin: pueden resolver cualquier reporte de su org
 *   - hr_specialist: solo si es admin de la comunidad del post reportado
 *   - otros: 403
 *
 * Payload: { resolution: 'dismiss' | 'action', notes?: string }
 *
 * Status map:
 *   dismiss → 'dismissed'
 *   action  → 'actioned'
 */
import { NextRequest, NextResponse }    from 'next/server'
import { createClient }                 from '@/lib/supabase/server'
import { getRequestContext }            from '@/lib/auth/requestContext'
import { validateReportResolve }        from '@/lib/moments/validators'
import { canResolveReport }             from '@/lib/moments/permissions'
import { logMomentsAudit }              from '@/lib/moments/audit'
import {
  toErrorResponse,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/lib/moments/errors'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { orgId, userId, role } = await getRequestContext()
    const { id: reportId }        = await params

    const body      = await req.json().catch(() => null)
    const validated = validateReportResolve(body)

    const supabase = await createClient()

    // ── Obtener el reporte ────────────────────────────────────────────
    const { data: report, error: reportErr } = await supabase
      .from('moments_reports')
      .select('id, status, target_type, target_id')
      .eq('id', reportId)
      .eq('organization_id', orgId)   // AISLAMIENTO TENANT
      .maybeSingle()

    if (reportErr || !report) {
      throw new NotFoundError('Reporte no encontrado')
    }

    if (report.status !== 'pending') {
      throw new ConflictError(
        `El reporte ya fue procesado con estado: ${report.status}`,
        'REPORT_ALREADY_RESOLVED',
      )
    }

    // ── Verificar si el usuario es admin de la comunidad del post ─────
    let isCommunityAdmin = false

    if (report.target_type === 'post') {
      const { data: post } = await supabase
        .from('moments_posts')
        .select('community_id')
        .eq('id', report.target_id)
        .eq('organization_id', orgId)
        .maybeSingle()

      if (post) {
        const { data: membership } = await supabase
          .from('moments_community_members')
          .select('role')
          .eq('community_id', post.community_id)
          .eq('user_id', userId)
          .maybeSingle()

        isCommunityAdmin = membership?.role === 'admin'
      }
    }

    if (!canResolveReport(role, isCommunityAdmin)) {
      throw new ForbiddenError('No tienes permisos para resolver este reporte')
    }

    // ── Actualizar estado del reporte ─────────────────────────────────
    const newStatus = validated.resolution === 'dismiss' ? 'dismissed' : 'actioned'

    const { data: resolved, error: updateErr } = await supabase
      .from('moments_reports')
      .update({
        status:       newStatus,
        reviewed_by:  userId,
        reviewed_at:  new Date().toISOString(),
        notes:        validated.notes,
      })
      .eq('id', reportId)
      .eq('organization_id', orgId)
      .select('id, status, reviewed_at')
      .single()

    if (updateErr) throw updateErr

    logMomentsAudit({
      actor_id:    userId,
      org_id:      orgId,
      action:      `report.${newStatus}`,
      target_type: 'report',
      target_id:   reportId,
      metadata:    {
        resolution:  validated.resolution,
        notes:       validated.notes,
        target_type: report.target_type,
        target_id:   report.target_id,
      },
    })

    return NextResponse.json({ data: resolved })

  } catch (err) {
    return toErrorResponse(err)
  }
}
