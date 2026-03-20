// POST /api/16pf/evaluations/[id]/compare — Compare with job position reference profile
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;

    // Get evaluation with decatipos
    const { data: evaluation, error: evalErr } = await supabase
      .from('pf16_evaluations')
      .select('*, job_position_id')
      .eq('id', id)
      .single();

    if (evalErr || !evaluation) {
      return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 });
    }

    if (!evaluation.decatipos) {
      return NextResponse.json({ error: 'La evaluación no tiene resultados aún' }, { status: 400 });
    }

    if (!evaluation.job_position_id) {
      return NextResponse.json({ error: 'No hay cargo asociado a esta evaluación' }, { status: 400 });
    }

    // Get job position reference profile
    const { data: jobPosition, error: jpErr } = await supabase
      .from('job_positions')
      .select('name, profile_16pf_reference')
      .eq('id', evaluation.job_position_id)
      .single();

    if (jpErr || !jobPosition?.profile_16pf_reference) {
      return NextResponse.json({ error: 'El cargo no tiene perfil de referencia 16PF' }, { status: 400 });
    }

    const referenceProfile = jobPosition.profile_16pf_reference;

    // Call AI for comparison
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `Eres un psicólogo organizacional especialista en evaluación 16PF con más de 15 años de experiencia. Tu tarea es comparar el perfil real de un candidato con el perfil de referencia de un cargo.

REGLAS IMPORTANTES:
1. El perfil de referencia es ORIENTATIVO, no un criterio de exclusión.
2. Para cada factor, indica: "coincide", "brecha_leve" o "brecha_significativa".
3. Un nivel "alto" en referencia corresponde a decatipos 7-10, "medio" a 4-6, "bajo" a 1-3.
4. Una brecha leve es ±1 zona (ej: ref="alto", candidato=6). Significativa es ±2+ zonas.
5. Genera un análisis integrado con puntos de alineación, áreas de atención y recomendación.
6. Responde SOLO en JSON válido.`,
      messages: [{
        role: 'user',
        content: `Compara el siguiente perfil del candidato con el perfil de referencia del cargo "${jobPosition.name}".

PERFIL DEL CANDIDATO (decatipos):
${JSON.stringify(evaluation.decatipos, null, 2)}

PERFIL DE REFERENCIA DEL CARGO:
${JSON.stringify(referenceProfile, null, 2)}

Responde en este formato JSON exacto:
{
  "factores": [{"factor": "A", "candidato_score": 5, "referencia_nivel": "alto", "brecha": "coincide|leve|significativa"}],
  "puntos_alineacion": ["..."],
  "areas_atencion": ["..."],
  "recomendacion": "..."
}`
      }],
    });

    const textContent = aiResponse.content.find(c => c.type === 'text');
    let comparisonResult;
    try {
      const jsonStr = textContent?.text?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}';
      comparisonResult = JSON.parse(jsonStr);
    } catch {
      comparisonResult = { raw: textContent?.text, error: 'No se pudo parsear la respuesta de IA' };
    }

    // Save comparison
    const { data: comparison, error: compErr } = await supabase
      .from('pf16_cargo_comparisons')
      .insert({
        evaluation_id: id,
        job_position_id: evaluation.job_position_id,
        comparison_result: comparisonResult,
      })
      .select()
      .single();

    if (compErr) throw compErr;

    return NextResponse.json(comparison);
  } catch (err: unknown) {
    console.error('16PF Compare error:', err);
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
