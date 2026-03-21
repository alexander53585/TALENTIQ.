// GET /api/16pf/evaluations/[id] — Get full evaluation (HR only)
// PUT /api/16pf/evaluations/[id]/notes — Save specialist notes
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;

    // 1. Validar membresía activa del usuario
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Sin membresía activa' }, { status: 403 });
    }

    // 2. Definir permisos base (HR Only)
    const canAccessFull = ['owner', 'admin', 'hr_specialist'].includes(membership.role);
    const isManager = membership.role === 'manager';

    if (!canAccessFull && !isManager) {
      return NextResponse.json({ error: 'Acceso denegado. Se requiere rol de RR.HH.' }, { status: 403 });
    }

    // 3. Obtener la evaluación filtrando ESTRICTAMENTE por organization_id (Cross-tenant protection)
    // Usamos el organization_id de la membresía para asegurar que no se consulten datos de otros tenants
    const { data: evaluation, error } = await supabase
      .from('pf16_evaluations')
      .select(`
        *,
        candidates:candidate_id(first_name, last_name, email),
        vacancy:vacancy_id(title)
      `)
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .maybeSingle();

    if (error) throw error;
    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluación no encontrada en tu organización' }, { status: 404 });
    }

    // 4. Aplicar Matriz de Autorización por Rol
    const isMinimalRequest = request.nextUrl.searchParams.get('minimal') === 'true';

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
        // Al manager solo le llega el resumen de las notas si es que existe
        specialist_notes_summary: evaluation.specialist_notes?.resumen || null,
      });
    }

    // Caso B: Owner / Admin / HR Specialist -> Acceso Completo (Hardening: remove answers_encrypted)
    const { answers_encrypted, ...safeEvaluation } = evaluation;
    
    return NextResponse.json(safeEvaluation);
  } catch (err: unknown) {
    console.error("[16PF API] Error:", err);
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
