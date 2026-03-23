// POST /api/16pf/evaluations/[id]/compare — Compare with job position reference profile
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRequestContext } from '@/lib/auth/requestContext';
import { toErrorResponse, ForbiddenError } from '@/lib/moments/errors';

const HR_ROLES = ['owner', 'admin', 'hr_specialist'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Resuelve sesión + membresía activa + valid_until en una sola llamada
    const { orgId, role } = await getRequestContext()

    if (!(HR_ROLES as readonly string[]).includes(role)) {
      throw new ForbiddenError('Se requiere rol de RR.HH. o superior')
    }

    const { id } = await params;
    const supabase = await createClient();

    // Obtener evaluación — filtro cross-tenant por orgId del contexto
    const { data: evaluation, error: evalErr } = await supabase
      .from('pf16_evaluations')
      .select('*, job_positions(name, profile_16pf_reference)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (evalErr) throw evalErr;
    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluación no encontrada en tu organización' }, { status: 404 });
    }

    if (!evaluation.decatipos) {
      return NextResponse.json({ error: 'La evaluación no tiene resultados aún' }, { status: 400 });
    }

    const jobPosition = evaluation.job_positions as any;
    if (!jobPosition?.profile_16pf_reference) {
      return NextResponse.json({ error: 'El cargo asociado no tiene perfil de referencia 16PF definido' }, { status: 400 });
    }

    const referenceProfile = jobPosition.profile_16pf_reference;

    // 3. Llamar a Claude para comparación usando nuestra utilidad de servidor
    const { callClaude } = await import('@/lib/ai/server');
    
    const { content: aiTextContent } = await callClaude([
      {
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
      }
    ], {
      system: `Eres un psicólogo organizacional especialista en evaluación 16PF con más de 15 años de experiencia. Tu tarea es comparar el perfil real de un candidato con el perfil de referencia de un cargo.

REGLAS IMPORTANTES:
1. El perfil de referencia es ORIENTATIVO, no un criterio de exclusión.
2. Para cada factor, indica: "coincide", "brecha_leve" o "brecha_significativa".
3. Un nivel "alto" en referencia corresponde a decatipos 7-10, "medio" a 4-6, "bajo" a 1-3.
4. Una brecha leve es ±1 zona (ej: ref="alto", candidato=6). Significativa es ±2+ zonas.
5. Genera un análisis integrado con puntos de alineación, áreas de atención y recomendación.
6. Responde SOLO en JSON válido.`
    });

    let comparisonResult;
    try {
      const jsonStr = aiTextContent?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}';
      comparisonResult = JSON.parse(jsonStr);
    } catch {
      comparisonResult = { raw: aiTextContent, error: 'No se pudo parsear la respuesta de la IA' };
    }

    // 4. Guardar la comparación
    const { data: comparison, error: compErr } = await supabase
      .from('pf16_cargo_comparisons')
      .insert({
        evaluation_id: id,
        job_position_id: evaluation.job_position_id,
        comparison_result: comparisonResult,
      })
      .select()
      .maybeSingle();

    if (compErr) throw compErr;

    // Saneamiento de respuesta (no devolver IDs innecesarios del server)
    return NextResponse.json(comparison);
  } catch (err: unknown) {
    console.error('[16PF Compare API] Error:', err);
    return toErrorResponse(err)
  }
}
