import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse, ForbiddenError, NotFoundError } from '@/lib/moments/errors'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verificar sesión, membresía activa y vigencia
    const { userId, orgId, role } = await getRequestContext()

    // Solo owner, admin y hr_specialist pueden disparar evaluaciones 16PF
    const ALLOWED = ['owner', 'admin', 'hr_specialist'] as const
    if (!(ALLOWED as readonly string[]).includes(role)) {
      throw new ForbiddenError('Se requiere rol de RR.HH. o superior para enviar evaluaciones 16PF')
    }

    const { id } = await params
    const supabase = await createClient()

    // Obtener candidato y validar acceso cross-tenant via vacante
    const { data: cand, error: candErr } = await supabase
      .from('candidates')
      .select('*, vacancies(id, job_position_id, organization_id)')
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

    // Actualizar consentimiento
    await supabase.from('candidates').update({ consent_16pf: true }).eq('id', id)

    // Crear la evaluación 16PF
    const { data: pf, error: pfErr } = await supabase
      .from('pf16_evaluations')
      .insert({
        organization_id: orgId,
        candidate_id: id,
        vacancy_id: vacancy.id,
        job_position_id: vacancy.job_position_id,
        evaluator_id: userId,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select('*, access_token')
      .single()

    if (pfErr) throw pfErr

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const link = baseUrl + '/16pf/' + pf.access_token

    return NextResponse.json({ success: true, pf16: pf, link })
  } catch (err: unknown) {
    return toErrorResponse(err)
  }
}
