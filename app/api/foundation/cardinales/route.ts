import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/foundation/orgId'
import { calcReadiness } from '@/lib/foundation/readiness'

/* ── helpers ─────────────────────────────────────────── */
async function validateWeights(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
): Promise<{ valid: boolean; total: number }> {
  const { data } = await supabase
    .from('cardinal_competencies')
    .select('relative_weight')
    .eq('organization_id', orgId)
    .eq('is_active', true)
  const total = (data ?? []).reduce((s, c) => s + (c.relative_weight ?? 0), 0)
  return { valid: total === 100, total }
}

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

/* ── GET — lista todas las competencias cardinales ───── */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const { data, error } = await supabase
    .from('cardinal_competencies')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const weights = await validateWeights(supabase, orgId)
  return NextResponse.json({ data, weights })
}

/* ── POST — crear nueva competencia cardinal ─────────── */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body?.name) return NextResponse.json({ error: 'name es requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('cardinal_competencies')
    .insert({
      organization_id:    orgId,
      name:               body.name,
      definition:         body.definition ?? null,
      dimension:          body.dimension ?? null,
      relative_weight:    body.relative_weight ?? 0,
      min_level_expected: body.min_level_expected ?? 1,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const weights  = await validateWeights(supabase, orgId)
  const readiness = await syncReadiness(supabase, orgId)
  return NextResponse.json({ data, weights, readiness }, { status: 201 })
}

/* ── PUT — actualizar (batch o individual) ───────────── */
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  // Batch: array de {id, ...campos}
  const items: any[] = Array.isArray(body) ? body : [body]

  const results = await Promise.all(
    items.map(async (item) => {
      const { id, ...fields } = item
      if (!id) return { error: 'id requerido' }
      // Nunca permitir cambiar organization_id
      delete fields.organization_id
      const { data, error } = await supabase
        .from('cardinal_competencies')
        .update(fields)
        .eq('id', id)
        .eq('organization_id', orgId) // RLS extra
        .select()
        .single()
      return error ? { error: error.message } : { data }
    }),
  )

  const weights   = await validateWeights(supabase, orgId)
  const readiness = await syncReadiness(supabase, orgId)
  return NextResponse.json({ results, weights, readiness })
}

/* ── DELETE — eliminar por id ────────────────────────── */
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
    .from('cardinal_competencies')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const weights   = await validateWeights(supabase, orgId)
  const readiness = await syncReadiness(supabase, orgId)
  return NextResponse.json({ ok: true, weights, readiness })
}
