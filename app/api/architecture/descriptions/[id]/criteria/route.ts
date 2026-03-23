// PUT  /api/architecture/descriptions/[id]/criteria — guarda criterios de evaluación
// POST /api/architecture/descriptions/[id]/criteria — sugiere pesos con IA
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRequestContext } from '@/lib/auth/requestContext';
import {
  toErrorResponse,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/lib/moments/errors';

export interface EvalCriterion {
  type: string;
  label: string;
  weight: number;
}

// Tipos válidos de criterio de evaluación
const VALID_TYPES = [
  'quality',
  'kpi_okr',
  'project',
  'competency',
  'cardinal',
  'compliance',
  'milestone',
  'extraordinary_evidence',
] as const;

// Solo roles privilegiados pueden modificar o sugerir criterios
const HR_ROLES = ['owner', 'admin', 'hr_specialist'] as const;

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Resuelve sesión, membresía activa y valid_until en una sola llamada
    const { orgId, role } = await getRequestContext();

    // Solo roles HR pueden modificar criterios de evaluación
    if (!HR_ROLES.includes(role as typeof HR_ROLES[number])) {
      throw new ForbiddenError('Solo owner, admin o hr_specialist pueden modificar criterios');
    }

    const { id } = await params;
    const body = await request.json();
    const { criteria } = body as { criteria: EvalCriterion[] };

    // Validar: los pesos deben sumar 100
    const total = criteria.reduce((sum, c) => sum + (c.weight ?? 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      throw new ValidationError(`Los pesos deben sumar 100. Suma actual: ${total}`);
    }

    // Validar tipos permitidos
    for (const c of criteria) {
      if (!VALID_TYPES.includes(c.type as typeof VALID_TYPES[number])) {
        throw new ValidationError(`Tipo inválido: ${c.type}`, 'type');
      }
    }

    const supabase = await createClient();

    // Cross-tenant: solo actualiza si el cargo pertenece a la org del contexto
    const { data, error } = await supabase
      .from('job_positions')
      .update({ evaluation_criteria: criteria })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('id, evaluation_criteria')
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundError('Cargo no encontrado');

    return NextResponse.json(data);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// POST /api/architecture/descriptions/[id]/criteria — sugerencia IA de pesos
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Resuelve sesión y membresía activa — antes no verificaba membresía
    const { role } = await getRequestContext();

    // Solo roles HR pueden usar la sugerencia de IA
    if (!HR_ROLES.includes(role as typeof HR_ROLES[number])) {
      throw new ForbiddenError('Solo owner, admin o hr_specialist pueden usar la sugerencia de IA');
    }

    // id se recibe pero no se usa en el prompt; se mantiene para coherencia de ruta
    const { id: _id } = await params;
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

    let raw: string;
    try {
      raw = await aiComplete({
        messages: [{ role: 'user', content: prompt }],
        model: 'claude-sonnet-4-5',
        feature: 'suggest_eval_criteria',
      });
    } catch (aiErr) {
      // No exponer el error interno de la IA al cliente
      console.error('[criteria/suggest] Error del servicio de IA:', aiErr);
      throw new Error('El servicio de sugerencia no está disponible en este momento');
    }

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[criteria/suggest] La IA no devolvió JSON válido. Raw:', raw?.substring(0, 200));
      throw new Error('El servicio de sugerencia no está disponible en este momento');
    }

    let result: unknown;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('[criteria/suggest] Error al parsear JSON de la IA:', parseErr);
      throw new Error('El servicio de sugerencia no está disponible en este momento');
    }

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
