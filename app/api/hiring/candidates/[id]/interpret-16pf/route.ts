import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiComplete } from '@/lib/ai/claude';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;

    const { data: cand, error: candErr } = await supabase
      .from('candidates')
      .select('*, vacancies(job_positions(profile_16pf_reference, title))')
      .eq('id', id)
      .single();

    if (candErr || !cand) return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 });

    const { data: pf } = await supabase
      .from('pf16_evaluations')
      .select('*')
      .eq('candidate_id', id)
      .single();

    if (!pf) return NextResponse.json({ error: 'El candidato no tiene un test 16PF creado' }, { status: 404 });
    if (pf.status !== 'completed') return NextResponse.json({ error: 'El test 16PF aún no está completado' }, { status: 400 });

    const refProfile = (cand.vacancies as any).job_positions?.profile_16pf_reference || 'No definido.';

    const prompt = `Eres un psicometrista experto analizando perfiles 16PF para el cargo "${(cand.vacancies as any).job_positions?.title}".
Perfil de Referencia Esperado:
${typeof refProfile === 'string' ? refProfile : JSON.stringify(refProfile, null, 2)}

Resultados del Candidato:
Decatipos: ${JSON.stringify(pf.decatipos)}
Dimensiones Globales: ${JSON.stringify(pf.global_dims)}

Señala:
1. Match general con el cargo
2. Factores Clave
3. Recomendación Final`;

    const aiInterpretation = await aiComplete({
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-sonnet-4-5',
      feature: 'interpret_16pf',
    });

    const { data: existingEval } = await supabase
      .from('candidate_evaluations')
      .select('id')
      .eq('candidate_id', id)
      .eq('evaluation_type', '16pf')
      .single();

    if (existingEval) {
      await supabase.from('candidate_evaluations').update({ ai_interpretation: aiInterpretation }).eq('id', existingEval.id);
    } else {
      await supabase.from('candidate_evaluations').insert({
        candidate_id: id,
        evaluation_type: '16pf',
        conducted_by: user.id,
        score: pf.progress_pct,
        raw_data: JSON.stringify(pf),
        ai_interpretation: aiInterpretation
      });
    }

    return NextResponse.json({ success: true, ai_interpretation: aiInterpretation });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
