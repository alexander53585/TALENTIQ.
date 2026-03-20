import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;

    // Obtener candidato y vacante para pesos
    const { data: cand, error: candErr } = await supabase
      .from('candidates')
      .select('*, vacancies(evaluation_structure)')
      .eq('id', id)
      .single();

    if (candErr || !cand) return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 });

    // Obtener evaluaciones completadas
    const { data: evals, error: evalErr } = await supabase
      .from('candidate_evaluations')
      .select('evaluation_type, score')
      .eq('candidate_id', id)
      .not('score', 'is', null);

    if (evalErr) throw evalErr;

    const weights = (cand.vacancies as any)?.evaluation_structure || { "16pf": 25, "competencies": 30, "technical": 20, "cultural": 15, "ethical": 10 };
    
    let totalScore = 0;
    const breakdown: Record<string, number> = {};

    for (const e of evals) {
      // e.evaluation_type map to structure: '16pf', 'competencies', etc.
      const w = weights[e.evaluation_type] || 0;
      const componentScore = (e.score || 0) * (w / 100);
      
      breakdown[e.evaluation_type] = Number(e.score || 0);
      totalScore += componentScore;
    }

    // Actualizar KultuFit Score on Candidate
    const { data, error } = await supabase
      .from('candidates')
      .update({
        kultufit_score: Number(totalScore.toFixed(2)),
        kultfit_breakdown: breakdown,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, kultufit_score, kultfit_breakdown')
      .single();

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
