import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse, ForbiddenError, NotFoundError } from '@/lib/moments/errors'

// Roles que pueden modificar vacantes
const CAN_MANAGE_VACANCIES = ['owner', 'admin', 'hr_specialist'] as const

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await getRequestContext()
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('vacancies')
      .select('*, job_positions(*)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new NotFoundError('Vacante no encontrada en tu organización')

    return NextResponse.json(data)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orgId, role } = await getRequestContext()

    // Solo owner, admin y hr_specialist pueden editar vacantes
    if (!(CAN_MANAGE_VACANCIES as readonly string[]).includes(role)) {
      throw new ForbiddenError('Se requiere rol de RR.HH. o superior para editar vacantes')
    }

    const { id } = await params
    const supabase = await createClient()
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Body inválido', code: 'VALIDATION_ERROR' }, { status: 400 })

    const allowedFields = ['title', 'status', 'publication_channels', 'ad_content', 'evaluation_structure']
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    for (const key of allowedFields) {
      if (body[key] !== undefined) updateData[key] = body[key]
    }

    const { data, error } = await supabase
      .from('vacancies')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new NotFoundError('Vacante no encontrada en tu organización')

    return NextResponse.json(data)
  } catch (err) {
    return toErrorResponse(err)
  }
}
