// GET /api/16pf/evaluations/[id] — Obtiene evaluación completa (HR o Manager)
import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse, ForbiddenError, NotFoundError } from '@/lib/moments/errors'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verificar sesión, membresía activa Y vigencia (valid_until) via getRequestContext
    const { orgId, role } = await getRequestContext()

    const { id } = await params

    // 2. Definir permisos base (HR Only + Manager con vista parcial)
    const canAccessFull = ['owner', 'admin', 'hr_specialist'].includes(role)
    const isManager = role === 'manager'

    if (!canAccessFull && !isManager) {
      throw new ForbiddenError('Acceso denegado. Se requiere rol de RR.HH. o superior.')
    }

    // 3. Obtener la evaluación filtrando ESTRICTAMENTE por organization_id (protección cross-tenant)
    const supabase = await createClient()
    const { data: evaluation, error } = await supabase
      .from('pf16_evaluations')
      .select(`
        *,
        candidates:candidate_id(first_name, last_name, email),
        vacancy:vacancy_id(title)
      `)
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (error) throw error
    if (!evaluation) {
      throw new NotFoundError('Evaluación no encontrada en tu organización')
    }

    // 4. Aplicar Matriz de Autorización por Rol
    const isMinimalRequest = request.nextUrl.searchParams.get('minimal') === 'true'

    // Caso A: Managers o solicitud Minimal -> Vista parcial de seguimiento
    if (isManager || isMinimalRequest) {
      return NextResponse.json({
        id: evaluation.id,
        candidate_id: evaluation.candidate_id,
        candidate: evaluation.candidates,
        vacancy: evaluation.vacancy,
        status: evaluation.status,
        progress_pct: evaluation.progress_pct,
        sent_at: evaluation.sent_at,
        completed_at: evaluation.completed_at,
        // Al manager solo le llega el resumen de las notas si existe
        specialist_notes_summary: evaluation.specialist_notes?.resumen || null,
      })
    }

    // Caso B: Owner / Admin / HR Specialist -> Acceso Completo (sin respuestas encriptadas)
    const { answers_encrypted, ...safeEvaluation } = evaluation

    return NextResponse.json(safeEvaluation)
  } catch (err: unknown) {
    return toErrorResponse(err)
  }
}
