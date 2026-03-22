import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse, ForbiddenError } from '@/lib/moments/errors'

// Roles que pueden crear/gestionar vacantes
const CAN_MANAGE_VACANCIES = ['owner', 'admin', 'hr_specialist'] as const

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await getRequestContext()
    const supabase = await createClient()

    const status = request.nextUrl.searchParams.get('status')
    let query = supabase
      .from('vacancies')
      .select('*, job_positions(title, puesto)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({ data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId, role } = await getRequestContext()

    // Solo owner, admin y hr_specialist pueden crear vacantes
    if (!(CAN_MANAGE_VACANCIES as readonly string[]).includes(role)) {
      throw new ForbiddenError('Se requiere rol de RR.HH. o superior para crear vacantes')
    }

    const supabase = await createClient()
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Body inválido', code: 'VALIDATION_ERROR' }, { status: 400 })

    const { job_position_id, title, ad_content, evaluation_structure, publication_channels } = body

    if (!job_position_id || !title) {
      return NextResponse.json({ error: 'job_position_id y title son obligatorios', code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('vacancies')
      .insert({
        organization_id: orgId,
        job_position_id,
        title,
        ad_content:           ad_content           ?? {},
        evaluation_structure: evaluation_structure  ?? { '16pf': 25, competencies: 30, technical: 20, cultural: 15, ethical: 10 },
        publication_channels: publication_channels  ?? [],
        created_by: userId,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
