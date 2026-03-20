import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/foundation/orgId'
import { calcReadiness } from '@/lib/foundation/readiness'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ score: 0, isReady: false, missingFields: ['no_organization'] })

  const readiness = await calcReadiness(supabase, orgId)

  // Persistir score en paralelo (fire-and-forget)
  void supabase
    .from('organization_profiles')
    .upsert(
      {
        organization_id:           orgId,
        readiness_score:           readiness.score,
        is_ready_for_architecture: readiness.isReady,
      },
      { onConflict: 'organization_id' },
    )

  return NextResponse.json(readiness)
}
