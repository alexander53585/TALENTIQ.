// POST /api/16pf/evaluations — Create a new 16PF evaluation
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Check role
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership) return NextResponse.json({ error: 'Sin membresía activa' }, { status: 403 });
    if (!['hr_specialist', 'admin', 'owner'].includes(membership.role)) {
      return NextResponse.json({ error: 'Rol insuficiente. Se requiere hr_specialist o superior.' }, { status: 403 });
    }

    const body = await request.json();
    const { candidate_id, vacancy_id, job_position_id, norm_idx = 1 } = body;

    const { data: evaluation, error } = await supabase
      .from('pf16_evaluations')
      .insert({
        organization_id: membership.organization_id,
        candidate_id: candidate_id || null,
        vacancy_id: vacancy_id || null,
        job_position_id: job_position_id || null,
        evaluator_id: user.id,
        norm_idx,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(evaluation, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
