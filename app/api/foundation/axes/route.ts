import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/foundation/orgId'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const { data, error } = await supabase
    .from('strategic_axes')
    .select('*')
    .eq('organization_id', orgId)
    .order('priority', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

/* ── POST ────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body?.name) return NextResponse.json({ error: 'name es requerido' }, { status: 400 })

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const readiness = await syncReadiness(supabase, orgId)
  return NextResponse.json({ data, readiness }, { status: 201 })
}

/* ── PUT ─────────────────────────────────────────────── */
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { id, ...fields } = body
  delete fields.organization_id

  const { data, error } = await supabase
    .from('strategic_axes')
    .update(fields)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const readiness = await syncReadiness(supabase, orgId)
  return NextResponse.json({ data, readiness })
}

/* ── DELETE ──────────────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { error } = await supabase
    .from('strategic_axes')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const readiness = await syncReadiness(supabase, orgId)
  return NextResponse.json({ ok: true, readiness })
}
