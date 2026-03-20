import { SupabaseClient } from '@supabase/supabase-js'

export interface ReadinessResult {
  score: number
  isReady: boolean
  missingFields: string[]
}

export async function calcReadiness(
  supabase: SupabaseClient,
  orgId: string,
): Promise<ReadinessResult> {
  const missing: string[] = []

  const [profileRes, cardinalesRes, axesRes] = await Promise.all([
    supabase
      .from('organization_profiles')
      .select('mission, vision')
      .eq('organization_id', orgId)
      .maybeSingle(),

    supabase
      .from('cardinal_competencies')
      .select('id, relative_weight')
      .eq('organization_id', orgId)
      .eq('is_active', true),

    supabase
      .from('strategic_axes')
      .select('id')
      .eq('organization_id', orgId)
      .eq('is_active', true),
  ])

  const profile    = profileRes.data
  const cardinales = cardinalesRes.data ?? []
  const axes       = axesRes.data ?? []

  if (!profile?.mission) missing.push('mission')
  if (!profile?.vision)  missing.push('vision')

  if (cardinales.length < 3) {
    missing.push('cardinales_min_3')
  } else {
    const totalWeight = cardinales.reduce((s, c) => s + (c.relative_weight ?? 0), 0)
    if (totalWeight !== 100) missing.push('cardinales_pesos_100')
  }

  if (axes.length < 1) missing.push('ejes_estrategicos_min_1')

  const score  = missing.length === 0 ? 100 : Math.max(0, Math.round((1 - missing.length / 5) * 100))
  const isReady = missing.length === 0

  return { score, isReady, missingFields: missing }
}
