/**
 * GET /api/moments/unread
 *
 * Returns unread post counts per community for the requesting user,
 * based on per-community "last seen" timestamps passed in query params.
 *
 * Query params:
 *   community   — community UUID (repeatable, max 20)
 *   since_{id}  — ISO timestamp for that community's last-seen
 *
 * Response:
 *   { data: Record<communityId, number> }
 *
 * This is used once on page load to restore unread state across refreshes.
 * Real-time increments are handled client-side via useRealtimeMoments.
 *
 * Seguridad:
 *   - All community_ids validated against user's organization
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getRequestContext }         from '@/lib/auth/requestContext'
import { toErrorResponse }           from '@/lib/moments/errors'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_COMMUNITIES = 20

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await getRequestContext()
    const supabase  = await createClient()
    const sp        = req.nextUrl.searchParams

    // Collect community IDs + their since timestamps
    const communities = sp.getAll('community').filter(id => UUID_RE.test(id)).slice(0, MAX_COMMUNITIES)
    if (communities.length === 0) {
      return NextResponse.json({ data: {} })
    }

    // Verify all communities belong to this org (tenant isolation)
    const { data: validComms } = await supabase
      .from('moments_communities')
      .select('id')
      .eq('organization_id', orgId)
      .in('id', communities)

    const validIds = new Set((validComms ?? []).map(c => c.id))

    // Count new posts per community since last-seen timestamp
    const result: Record<string, number> = {}

    await Promise.all(
      Array.from(validIds).map(async (communityId) => {
        const sinceRaw = sp.get(`since_${communityId}`)
        if (!sinceRaw) return   // no timestamp = no baseline = skip

        // Validate the timestamp is parseable
        const since = new Date(sinceRaw)
        if (isNaN(since.getTime())) return

        const { count } = await supabase
          .from('moments_posts')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('community_id', communityId)
          .eq('status', 'published')
          .gt('created_at', since.toISOString())

        if (count && count > 0) {
          result[communityId] = count
        }
      }),
    )

    return NextResponse.json({ data: result })

  } catch (err) {
    return toErrorResponse(err)
  }
}
