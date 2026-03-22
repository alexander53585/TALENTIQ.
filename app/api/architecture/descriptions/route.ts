import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse } from '@/lib/moments/errors'

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
    const { orgId, userId } = await getRequestContext()
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
    const { orgId } = await getRequestContext()
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
