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

    const { data: membership } = await supabase
      .from('user_memberships')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership) return NextResponse.json({ error: 'Sin membresía activa' }, { status: 403 });

    const minimal = request.nextUrl.searchParams.get('minimal') === 'true';

    const { data: evaluation, error } = await supabase
      .from('pf16_evaluations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!evaluation) return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 });

    // Managers only see status and progress
    if (minimal || membership.role === 'manager') {
      return NextResponse.json({
        id: evaluation.id,
        status: evaluation.status,
        progress_pct: evaluation.progress_pct,
        sent_at: evaluation.sent_at,
        completed_at: evaluation.completed_at,
        specialist_notes: evaluation.specialist_notes?.resumen || null,
      });
    }

    // HR specialists see everything except raw answers
    const { answers_encrypted, ...safeEval } = evaluation;
    return NextResponse.json(safeEval);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
