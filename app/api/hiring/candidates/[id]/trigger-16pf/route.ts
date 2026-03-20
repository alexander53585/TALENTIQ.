import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;

    // Obtener candidato y validarlo
    const { data: cand, error: candErr } = await supabase
      .from('candidates')
      .select('*, vacancies(id, job_position_id)')
      .eq('id', id)
      .single();

    if (candErr || !cand) return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 });

    // Actualizar consentimiento
    await supabase.from('candidates').update({ consent_16pf: true }).eq('id', id);

    // Crear la evaluación 16PF
    const { data: pf, error: pfErr } = await supabase
      .from('pf16_evaluations')
      .insert({
        organization_id: cand.organization_id,
        candidate_id: id,
        vacancy_id: (cand.vacancies as any).id,
        job_position_id: (cand.vacancies as any).job_position_id,
        evaluator_id: user.id,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .select('*, access_token')
      .single();

    if (pfErr) throw pfErr;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const link = baseUrl + '/16pf/' + pf.access_token;

    return NextResponse.json({ success: true, pf16: pf, link });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
