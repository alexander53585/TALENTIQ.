// POST /api/architecture/descriptions/[id]/profile16pf
// Generates the 16PF reference profile for a job position via AI
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiComplete } from '@/lib/ai/claude';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;

    const [{ data: pos, error: posErr }, { data: membership }] = await Promise.all([
      supabase.from('job_positions').select('*').eq('id', id).single(),
      supabase.from('user_memberships').select('organization_id, role').eq('user_id', user.id).eq('is_active', true).single(),
    ]);

    if (posErr || !pos) return NextResponse.json({ error: 'Cargo no encontrado' }, { status: 404 });
    if (!membership || pos.organization_id !== membership.organization_id) {
      return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
    }

    // Build context for AI
    const cargoContext = `
Cargo: ${pos.title || pos.name || 'Sin título'}
Área: ${pos.area || 'N/A'}
Misión: ${pos.mission || pos.resumen_ejecutivo || 'N/A'}
Funciones esenciales: ${JSON.stringify(pos.specific_competencies || pos.responsabilidades || [])}
Competencias conductuales: ${JSON.stringify(pos.competencias || [])}
KultuValue Score: ${pos.kultvalue_score || 'N/A'} | Banda: ${pos.kultvalue_band || 'N/A'}
    `.trim();

    const prompt = `Basado en estas funciones esenciales y competencias del cargo:

${cargoContext}

Sugiere el perfil de personalidad 16PF más adecuado para este rol.
Para cada factor del 16PF (A, B, C, E, F, G, H, I, L, M, N, O, Q1, Q2, Q3, Q4) indica:
- nivel_sugerido: "bajo" | "medio" | "alto"
- justificacion: máximo 1 oración explicando por qué ese nivel favorece el desempeño en este cargo.

IMPORTANTE: Este perfil es ORIENTATIVO, no un filtro de descarte. Su propósito es guiar la interpretación comparativa cuando un candidato complete el 16PF.

Responde SOLO con JSON válido en este formato exacto:
{
  "factores": [
    {"factor": "A", "nivel_sugerido": "alto", "justificacion": "..."},
    ...16 factores...
  ],
  "nota_metodologica": "Breve nota recordando que este perfil es referencial y orientativo, no un criterio de exclusión."
}`;

    const raw = await aiComplete({
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-sonnet-4-5',
      feature: 'generate_16pf_profile',
    });

    // Parse AI response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('La IA no devolvió JSON válido');
    const profile = JSON.parse(jsonMatch[0]);

    // Save to DB
    const { data: updated, error: saveErr } = await supabase
      .from('job_positions')
      .update({ profile_16pf_reference: profile })
      .eq('id', id)
      .select('id, profile_16pf_reference')
      .single();

    if (saveErr) throw saveErr;

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
