/**
 * GET /api/moments/pulse
 *
 * Métricas de KultuPulse para el widget de la barra lateral.
 *
 * Query params:
 *   window — 7 (default) o 30 días
 *
 * Responde con:
 *   top_competencies     — competencias más reconocidas (últimos N días)
 *   top_communities      — comunidades con más actividad
 *   active_communities   — comunidades con ≥1 post en el periodo
 *   inactive_communities — comunidades sin posts en el periodo
 *   total_posts          — posts publicados en el periodo
 *   total_recognitions   — reconocimientos en el periodo
 *
 * Seguridad:
 *   - organization_id siempre del contexto de sesión
 *   - Sin datos de otras organizaciones
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getRequestContext }         from '@/lib/auth/requestContext'
import { toErrorResponse }           from '@/lib/moments/errors'

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await getRequestContext()
    const supabase  = await createClient()

    const rawWindow = req.nextUrl.searchParams.get('window')
    const window    = rawWindow === '30' ? 30 : 7
    const since     = new Date(Date.now() - window * 86_400_000).toISOString()

    // ── 1. Posts en ventana ────────────────────────────────────────────
    const { data: posts } = await supabase
      .from('moments_posts')
      .select('id, community_id, post_type, metadata, created_at')
      .eq('organization_id', orgId)
      .eq('status', 'published')
      .gte('created_at', since)

    const rows = posts ?? []

    // ── 2. Competencias más reconocidas ───────────────────────────────
    const competencyCount: Record<string, { name: string; count: number }> = {}

    for (const p of rows) {
      if (p.post_type !== 'recognition') continue
      const meta = p.metadata as Record<string, unknown> | null
      const cid  = meta?.competency_id  as string | null
      const cname = meta?.competency_name as string | null
      if (!cid || !cname) continue
      if (!competencyCount[cid]) competencyCount[cid] = { name: cname, count: 0 }
      competencyCount[cid].count++
    }

    const top_competencies = Object.entries(competencyCount)
      .map(([competency_id, { name: competency_name, count }]) => ({
        competency_id,
        competency_name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // ── 3. Comunidades más activas ────────────────────────────────────
    const communityPostCount: Record<string, number> = {}
    for (const p of rows) {
      communityPostCount[p.community_id] = (communityPostCount[p.community_id] ?? 0) + 1
    }

    const activeCommunityIds = new Set(Object.keys(communityPostCount))

    // Get community names for top 5
    const topCommunityIds = Object.entries(communityPostCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)

    const { data: commRows } = topCommunityIds.length > 0
      ? await supabase
          .from('moments_communities')
          .select('id, name')
          .eq('organization_id', orgId)
          .in('id', topCommunityIds)
      : { data: [] }

    const commNameMap = new Map((commRows ?? []).map(c => [c.id, c.name]))

    const top_communities = topCommunityIds.map(id => ({
      id,
      name:       commNameMap.get(id) ?? 'Comunidad',
      post_count: communityPostCount[id] ?? 0,
    }))

    // ── 4. Comunidades totales en org ────────────────────────────────
    const { count: totalCommunities } = await supabase
      .from('moments_communities')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('is_archived', false)

    const active_communities   = activeCommunityIds.size
    const inactive_communities = Math.max(0, (totalCommunities ?? 0) - active_communities)

    return NextResponse.json({
      data: {
        window_days:          window as 7 | 30,
        top_competencies,
        top_communities,
        active_communities,
        inactive_communities,
        total_posts:          rows.length,
        total_recognitions:   rows.filter(p => p.post_type === 'recognition').length,
      },
    })

  } catch (err) {
    return toErrorResponse(err)
  }
}
