import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse, ForbiddenError, NotFoundError } from '@/lib/moments/errors'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verificar sesión, membresía activa y vigencia
    const { orgId, role } = await getRequestContext()

    // Solo owner, admin y hr_specialist pueden publicar vacantes
    const ALLOWED = ['owner', 'admin', 'hr_specialist'] as const
    if (!(ALLOWED as readonly string[]).includes(role)) {
      throw new ForbiddenError('Se requiere rol de RR.HH. o superior para publicar vacantes')
    }

    const { id } = await params
    const supabase = await createClient()

    // Validar que la vacante existe y pertenece a la organización
    const { data: current, error: checkErr } = await supabase
      .from('vacancies')
      .select('status, organization_id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (checkErr || !current) {
      throw new NotFoundError('Vacante no encontrada')
    }

    // Solo se puede publicar desde estado 'created' o 'ready'
    if (!['created', 'ready'].includes(current.status)) {
      return NextResponse.json(
        { error: `No se puede publicar desde el estado: ${current.status}` },
        { status: 422 }
      )
    }

    const { data, error } = await supabase
      .from('vacancies')
      .update({
        status: 'published',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err: unknown) {
    return toErrorResponse(err)
  }
}
