// PUT /api/architecture/descriptions/[id]/criteria
// Saves evaluation_criteria for a job position
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface EvalCriterion {
  type: string;
  label: string;
  weight: number;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { criteria } = body as { criteria: EvalCriterion[] };

    // Validate: weights must sum to 100
    const total = criteria.reduce((sum, c) => sum + (c.weight ?? 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      return NextResponse.json({ error: `Los pesos deben sumar 100. Suma actual: ${total}` }, { status: 422 });
    }

    // Validate types
    const VALID_TYPES = ['quality', 'kpi_okr', 'project', 'competency', 'cardinal', 'compliance', 'milestone', 'extraordinary_evidence'];
    for (const c of criteria) {
      if (!VALID_TYPES.includes(c.type)) {
        return NextResponse.json({ error: `Tipo inválido: ${c.type}` }, { status: 422 });
      }
    }

    // Authorization
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership) return NextResponse.json({ error: 'Sin membresía activa' }, { status: 403 });

    const { data, error } = await supabase
      .from('job_positions')
      .update({ evaluation_criteria: criteria })
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .select('id, evaluation_criteria')
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Cargo no encontrado' }, { status: 404 });

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/architecture/descriptions/[id]/criteria/suggest — AI weight suggestion
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { kultvalue_band, kultvalue_score, title, area, specific_competencies } = body;

    const { aiComplete } = await import('@/lib/ai/claude');

    const prompt = `Eres un experto en gestión del desempeño organizacional.

Para el cargo "${title || 'N/A'}" en el área "${area || 'N/A'}" con:
- Banda KultuValue: ${kultvalue_band || 'N/A'}
- Puntaje KultuValue: ${kultvalue_score || 'N/A'}
- Competencias específicas: ${JSON.stringify(specific_competencies || []).substring(0, 400)}

Sugiere los pesos (%) para los criterios de evaluación de desempeño.
Los pesos DEBEN sumar exactamente 100.
Solo incluye los tipos pertinentes para este cargo.

Tipos disponibles: quality, kpi_okr, project, competency, cardinal, compliance, milestone, extraordinary_evidence

Responde SOLO con JSON válido:
{
  "criteria": [
    { "type": "quality", "label": "Calidad del trabajo", "weight": 20 },
    { "type": "kpi_okr", "label": "KPIs / OKRs", "weight": 30 },
    ...
  ],
  "rationale": "Breve justificación de los pesos según el perfil del cargo."
}`;

    const raw = await aiComplete({
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-3-5-sonnet-latest',
      feature: 'suggest_eval_criteria',
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('La IA no devolvió JSON válido');
    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
