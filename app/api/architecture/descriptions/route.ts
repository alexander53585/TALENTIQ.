import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse, ForbiddenError } from '@/lib/moments/errors'

// Roles que pueden crear/modificar descripciones de arquitectura
const HR_ROLES = ['owner', 'admin', 'hr_specialist'] as const
// Solo owner y admin pueden eliminar descripciones
const ADMIN_ROLES = ['owner', 'admin'] as const

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await getRequestContext()

    // ?approved=true → Hiring: only show approved positions
    const onlyApproved = new URL(req.url).searchParams.get('approved') === 'true'

    const supabase = await createClient()

    let query = supabase
      .from('job_positions')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (onlyApproved) {
      query = query.eq('status', 'approved')
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return NextResponse.json({ data })

  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId, userId, role } = await getRequestContext()

    // Solo roles privilegiados pueden crear o modificar descripciones de cargos
    if (!HR_ROLES.includes(role as typeof HR_ROLES[number])) {
      throw new ForbiddenError('Solo owner, admin o hr_specialist pueden crear descripciones de cargos')
    }

    const supabase = await createClient()

    const body = await req.json()
    const { key, mode, puesto, area, status = 'active', data: posData } = body

    const { data, error } = await supabase
      .from('job_positions')
      .upsert({
        organization_id: orgId,
        user_id: userId,
        key,
        mode,
        puesto,
        area,
        status,
        data: posData,
      }, { onConflict: 'key' })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ data })

  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { orgId, role } = await getRequestContext()

    // Solo owner y admin pueden eliminar descripciones de cargos
    if (!ADMIN_ROLES.includes(role as typeof ADMIN_ROLES[number])) {
      throw new ForbiddenError('Solo owner o admin pueden eliminar descripciones de cargos')
    }

    const supabase = await createClient()

    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')
    if (!key) return NextResponse.json({ error: 'Missing key', code: 'VALIDATION_ERROR' }, { status: 400 })

    const { error } = await supabase
      .from('job_positions')
      .delete()
      .eq('key', key)
      .eq('organization_id', orgId)

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })

  } catch (err) {
    return toErrorResponse(err)
  }
}
