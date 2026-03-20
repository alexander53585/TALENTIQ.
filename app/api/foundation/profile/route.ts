import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/foundation/orgId'
import { calcReadiness } from '@/lib/foundation/readiness'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const { data, error } = await supabase
    .from('organization_profiles')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  // Campos permitidos — nunca sobreescribir organization_id desde el cliente
  const allowed = [
    'mission', 'vision', 'purpose', 'values',
    'value_proposition', 'key_processes', 'critical_areas',
    'kultudna_summary', 'work_mode', 'org_structure', 'digital_maturity',
    'sector', 'size', 'legal_structure',
  ]
  const patch: Record<string, unknown> = { organization_id: orgId }
  for (const k of allowed) {
    if (k in body) patch[k] = body[k]
  }

  const { data, error } = await supabase
    .from('organization_profiles')
    .upsert(patch, { onConflict: 'organization_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recalcular readiness y persistirlo
  const readiness = await calcReadiness(supabase, orgId)
  await supabase
    .from('organization_profiles')
    .update({
      readiness_score:           readiness.score,
      is_ready_for_architecture: readiness.isReady,
    })
    .eq('organization_id', orgId)

  return NextResponse.json({ data: { ...data, ...readiness } })
}
