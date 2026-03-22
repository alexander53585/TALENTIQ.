// POST /api/architecture/descriptions/[id]/profile16pf
// Genera el perfil de referencia 16PF para un cargo via IA
import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse, ForbiddenError, NotFoundError } from '@/lib/moments/errors'
import { createClient } from '@/lib/supabase/server'
import { aiComplete } from '@/lib/ai/claude'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar sesión, membresía activa y vigencia
    const { orgId, role } = await getRequestContext()

    // Solo owner, admin y hr_specialist pueden generar perfiles 16PF de referencia
    const ALLOWED = ['owner', 'admin', 'hr_specialist'] as const
    if (!(ALLOWED as readonly string[]).includes(role)) {
      throw new ForbiddenError('Se requiere rol de RR.HH. o superior para generar perfiles 16PF')
    }

    const { id } = await params
    const supabase = await createClient()

    // Obtener el cargo y validar cross-tenant simultáneamente
    const { data: pos, error: posErr } = await supabase
      .from('job_positions')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (posErr || !pos) {
      throw new NotFoundError('Cargo no encontrado en tu organización')
    }

    // Construir contexto para la IA
    const cargoContext = `
Cargo: ${pos.title || pos.name || 'Sin título'}
Área: ${pos.area || 'N/A'}
Misión: ${pos.mission || pos.resumen_ejecutivo || 'N/A'}
Funciones esenciales: ${JSON.stringify(pos.specific_competencies || pos.responsabilidades || [])}
Competencias conductuales: ${JSON.stringify(pos.competencias || [])}
KultuValue Score: ${pos.kultvalue_score || 'N/A'} | Banda: ${pos.kultvalue_band || 'N/A'}
    `.trim()

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
}`

    const raw = await aiComplete({
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-sonnet-4-5',
      feature: 'generate_16pf_profile',
    })

    // Parsear respuesta de IA
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('La IA no devolvió JSON válido')
    const profile = JSON.parse(jsonMatch[0])

    // Guardar en DB
    const { data: updated, error: saveErr } = await supabase
      .from('job_positions')
      .update({ profile_16pf_reference: profile })
      .eq('id', id)
      .select('id, profile_16pf_reference')
      .single()

    if (saveErr) throw saveErr

    return NextResponse.json(updated)
  } catch (err: unknown) {
    return toErrorResponse(err)
  }
}
