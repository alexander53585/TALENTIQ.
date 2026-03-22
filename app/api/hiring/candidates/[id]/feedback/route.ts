import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse, ForbiddenError, NotFoundError } from '@/lib/moments/errors'
import { createClient } from '@/lib/supabase/server'
import { aiComplete } from '@/lib/ai/claude'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verificar sesión, membresía activa y vigencia
    const { userId, orgId, role } = await getRequestContext()

    // Solo owner, admin y hr_specialist pueden generar feedback de candidatos
    const ALLOWED = ['owner', 'admin', 'hr_specialist'] as const
    if (!(ALLOWED as readonly string[]).includes(role)) {
      throw new ForbiddenError('Se requiere rol de RR.HH. o superior para generar feedback')
    }

    const { id } = await params
    const supabase = await createClient()

    // Obtener candidato con validación cross-tenant via vacante
    const { data: cand, error: candErr } = await supabase
      .from('candidates')
      .select('*, vacancies(title, evaluation_structure, organization_id, job_positions(kultvalue_band))')
      .eq('id', id)
      .single()

    if (candErr || !cand) {
      throw new NotFoundError('Candidato no encontrado')
    }

    // Validación cross-tenant: la vacante del candidato debe pertenecer a la organización del usuario
    const vacancy = cand.vacancies as any
    if (!vacancy || vacancy.organization_id !== orgId) {
      throw new NotFoundError('Candidato no encontrado')
    }

    // Obtener puntuaciones del candidato
    const { data: evals } = await supabase
      .from('candidate_evaluations')
      .select('evaluation_type, score, notes')
      .eq('candidate_id', id)

    const scoresList =
      evals
        ?.map(
          (e) => `${e.evaluation_type}: ${e.score}% ${e.notes ? `(${e.notes})` : ''}`
        )
        .join('\n') || 'Ninguno cargado'

    const prompt = `Eres un coach de empleabilidad empático, humano y constructivo en KultuRH.
Tienes a un candidato para el cargo "${vacancy.title}".
Sus puntuaciones (Scores por componente):
${scoresList}

Su KultuFit Score Final fue: ${cand.kultufit_score}%
Bandas relativas KultuValue de la empresa: ${vacancy.job_positions?.kultvalue_band || 'Desconocida'}

Tu misión es crearle un KultuFeedback, un informe de retroalimentación 100% empático para un candidato que NO fue seleccionado. Construye sobre lo positivo, señala brechas técnicas o blandas como "áreas de oportunidad" y dale recomendaciones para empleabilidad futura.

Devuelve SOLO un JSON estricto con esta estructura exacta:
{
  "fortalezas_observadas": ["fuerza1", "fuerza2"],
  "brechas_identificadas": ["brecha1", "brecha2"],
  "recomendaciones_empleabilidad": ["rec1", "rec2"],
  "invitacion_ecosistema": "Frase de despedida agradeciendo e invitando a seguir conectado con nuestra cultura."
}
No añadas saludos ni explicaciones fuera del JSON. Solo JSON.`

    const raw = await aiComplete({
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-sonnet-4-5',
      feature: 'candidate_feedback',
    })

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('La IA no devolvió JSON válido')

    const interpretationData = JSON.parse(jsonMatch[0])

    // Guardar feedback
    const { data, error } = await supabase
      .from('candidate_evaluations')
      .insert({
        candidate_id: id,
        evaluation_type: 'feedback',
        conducted_by: userId,
        ai_interpretation: JSON.stringify(interpretationData, null, 2),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, feedback: data })
  } catch (err: unknown) {
    return toErrorResponse(err)
  }
}
