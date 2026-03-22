import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse } from '@/lib/moments/errors'
import { calcReadiness } from '@/lib/foundation/readiness'

export async function GET() {
  try {
    const { orgId } = await getRequestContext()
    const supabase = await createClient()

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

  } catch (err) {
    return toErrorResponse(err)
  }
}
