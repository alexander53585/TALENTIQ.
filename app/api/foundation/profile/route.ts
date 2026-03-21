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
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await getOrgId(supabase, user.id)
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

    // Campos base — siempre disponibles
    const baseFields = [
      'mission', 'vision', 'purpose', 'values',
      'value_proposition', 'key_processes', 'critical_areas',
      'kultudna_summary', 'work_mode', 'org_structure', 'digital_maturity',
      'foundation_phase',
    ]
    // Campos de identidad — requieren migración 20240014
    const identityFields = ['sector', 'size', 'legal_structure']

    const patch: Record<string, unknown> = { organization_id: orgId }
    for (const k of baseFields) {
      if (k in body) patch[k] = body[k]
    }

    // Intentar incluir campos de identidad; si la columna no existe, se ignoran
    for (const k of identityFields) {
      if (k in body) patch[k] = body[k]
    }

    const { data, error } = await supabase
      .from('organization_profiles')
      .upsert(patch, { onConflict: 'organization_id' })
      .select()
      .single()

    // Si falla por columna inexistente, reintentar sin campos de identidad
    if (error?.code === '42703') {
      const safePatch: Record<string, unknown> = { organization_id: orgId }
      for (const k of baseFields) {
        if (k in body) safePatch[k] = body[k]
      }
      const { data: safeData, error: safeError } = await supabase
        .from('organization_profiles')
        .upsert(safePatch, { onConflict: 'organization_id' })
        .select()
        .single()
      if (safeError) return NextResponse.json({ error: safeError.message }, { status: 500 })

      const readiness = await calcReadiness(supabase, orgId)
      await supabase
        .from('organization_profiles')
        .update({ readiness_score: readiness.score, is_ready_for_architecture: readiness.isReady })
        .eq('organization_id', orgId)
      return NextResponse.json({ data: { ...safeData, ...readiness } })
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Recalcular readiness y persistirlo
    const readiness = await calcReadiness(supabase, orgId)
    await supabase
      .from('organization_profiles')
      .update({ readiness_score: readiness.score, is_ready_for_architecture: readiness.isReady })
      .eq('organization_id', orgId)

    return NextResponse.json({ data: { ...data, ...readiness } })
  } catch (err: any) {
    console.error('Foundation profile PUT error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
