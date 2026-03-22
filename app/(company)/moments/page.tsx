import { redirect }  from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MomentsPage      from '@/components/moments/MomentsPage'
import type { Community, Post } from '@/components/moments/types'

export const metadata = { title: 'Moments · KultuRH' }

export default async function MomentsRoute() {
  const supabase = await createClient()

  // ── 1. Auth & membership ──────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('user_memberships')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) redirect('/onboarding')

  const { organization_id: orgId, role } = membership

  // ── 2. Check onboarding status (non-blocking — just a flag) ──────────
  const { data: employeeRow } = await supabase
    .from('employees')
    .select('status')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle()

  const isOnboarding = employeeRow?.status === 'onboarding'

  // ── 3. Communities ────────────────────────────────────────────────────
  const { data: commRows } = await supabase
    .from('moments_communities')
    .select('id, name, description, posting_policy, is_private')
    .eq('organization_id', orgId)
    .eq('is_archived', false)
    .order('name', { ascending: true })

  // Member counts per community
  const communityIds = (commRows ?? []).map(c => c.id)
  const memberCounts: Record<string, number> = {}

  if (communityIds.length > 0) {
    const { data: countRows } = await supabase
      .from('moments_community_members')
      .select('community_id')
      .in('community_id', communityIds)
      .eq('status', 'active')

    for (const r of countRows ?? []) {
      memberCounts[r.community_id] = (memberCounts[r.community_id] ?? 0) + 1
    }
  }

  const communities: Community[] = (commRows ?? []).map(c => ({
    id:             c.id,
    name:           c.name,
    description:    c.description ?? null,
    posting_policy: c.posting_policy as Community['posting_policy'],
    is_private:     c.is_private,
    member_count:   memberCounts[c.id] ?? 0,
  }))

  // ── 4. Initial posts ──────────────────────────────────────────────────
  const LIMIT = 20

  const { data: postRows } = await supabase
    .from('moments_posts')
    .select('id, community_id, post_type, title, body, is_pinned, is_locked, created_at, author_id, metadata')
    .eq('organization_id', orgId)
    .eq('status', 'published')
    .order('is_pinned',  { ascending: false })
    .order('created_at', { ascending: false })
    .order('id',         { ascending: false })
    .limit(LIMIT + 1)

  const rows    = postRows ?? []
  const hasMore = rows.length > LIMIT
  const items   = hasMore ? rows.slice(0, LIMIT) : rows

  // Compute nextCursor for client-side pagination
  const lastItem   = items[items.length - 1]
  const nextCursor = hasMore && lastItem
    ? Buffer.from(JSON.stringify({ ts: lastItem.created_at, id: lastItem.id })).toString('base64url')
    : null

  // Enrich posts
  const commMap = new Map(communities.map(c => [c.id, c.name]))

  const initialPosts: Post[] = items.map(p => ({
    id:             p.id,
    community_id:   p.community_id,
    community_name: commMap.get(p.community_id) ?? 'Comunidad',
    post_type:      p.post_type as Post['post_type'],
    title:          p.title ?? null,
    body:           p.body,
    is_pinned:      p.is_pinned ?? false,
    is_locked:      p.is_locked ?? false,
    created_at:     p.created_at,
    author_id:      p.author_id,
    is_mine:        p.author_id === user.id,
    metadata:       (p.metadata ?? null) as Post['metadata'],
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#1E2A45]">Moments</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          El muro de tu equipo — comparte, celebra y conecta.
        </p>
      </div>
      <MomentsPage
        initialPosts={initialPosts}
        communities={communities}
        userRole={role}
        userId={user.id}
        orgId={orgId}
        hasMoreInit={hasMore}
        nextCursorInit={nextCursor}
        isOnboarding={isOnboarding}
      />
    </div>
  )
}
