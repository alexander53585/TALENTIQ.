import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse } from '@/lib/moments/errors'
import { calcReadiness } from '@/lib/foundation/readiness'

async function syncReadiness(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
) {
  const r = await calcReadiness(supabase, orgId)
  await supabase
    .from('organization_profiles')
    .upsert(
      { organization_id: orgId, readiness_score: r.score, is_ready_for_architecture: r.isReady },
      { onConflict: 'organization_id' },
    )
  return r
}

/* ── GET ─────────────────────────────────────────────── */
export async function GET() {
  try {
    const { orgId } = await getRequestContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('strategic_axes')
      .select('*')
      .eq('organization_id', orgId)
      .order('priority', { ascending: true })

    if (error) throw new Error(error.message)
    return NextResponse.json({ data })

  } catch (err) {
    return toErrorResponse(err)
  }
}

/* ── POST ────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const { orgId } = await getRequestContext()
    const supabase = await createClient()

    const body = await req.json().catch(() => null)
    if (!body?.name) return NextResponse.json({ error: 'name es requerido', code: 'VALIDATION_ERROR' }, { status: 400 })

    const { data, error } = await supabase
      .from('strategic_axes')
      .insert({
        organization_id: orgId,
        name:            body.name,
        description:     body.description ?? null,
        priority:        body.priority ?? 1,
        is_active:       body.is_active ?? true,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    const readiness = await syncReadiness(supabase, orgId)
    return NextResponse.json({ data, readiness }, { status: 201 })

  } catch (err) {
    return toErrorResponse(err)
  }
}

/* ── PUT ─────────────────────────────────────────────── */
export async function PUT(req: NextRequest) {
  try {
    const { orgId } = await getRequestContext()
    const supabase = await createClient()

    const body = await req.json().catch(() => null)
    if (!body?.id) return NextResponse.json({ error: 'id requerido', code: 'VALIDATION_ERROR' }, { status: 400 })

    const { id, ...fields } = body
    delete fields.organization_id

    const { data, error } = await supabase
      .from('strategic_axes')
      .update(fields)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) throw new Error(error.message)

    const readiness = await syncReadiness(supabase, orgId)
    return NextResponse.json({ data, readiness })

  } catch (err) {
    return toErrorResponse(err)
  }
}

/* ── DELETE ──────────────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  try {
    const { orgId } = await getRequestContext()
    const supabase = await createClient()

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido', code: 'VALIDATION_ERROR' }, { status: 400 })

    const { error } = await supabase
      .from('strategic_axes')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)

    if (error) throw new Error(error.message)

    const readiness = await syncReadiness(supabase, orgId)
    return NextResponse.json({ ok: true, readiness })

  } catch (err) {
    return toErrorResponse(err)
  }
}
