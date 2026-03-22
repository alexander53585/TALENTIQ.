'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  Community, Post, PostType, ReactionType, ReactionState,
  OnboardingSuggestions, PostTemplate,
} from './types'
import CommunitySidebar   from './CommunitySidebar'
import PostComposer       from './PostComposer'
import PostFeed           from './PostFeed'
import RightPanel         from './RightPanel'
import OnboardingBanner   from './OnboardingBanner'
import NotificationBell   from './NotificationBell'
import RealtimeStatus     from './RealtimeStatus'
import NewPostsBanner     from './NewPostsBanner'
import { useRealtimeMoments } from '@/lib/moments/useRealtimeMoments'
import { useUnreadCounts }    from '@/lib/moments/useUnreadCounts'
import type { RawPost, RawNotification } from '@/lib/moments/useRealtimeMoments'

interface Props {
  initialPosts:    Post[]
  communities:     Community[]
  userRole:        string
  userId:          string
  orgId:           string
  hasMoreInit:     boolean
  nextCursorInit:  string | null
  isOnboarding?:   boolean
}

export default function MomentsPage({
  initialPosts,
  communities,
  userRole,
  userId,
  orgId,
  hasMoreInit,
  nextCursorInit,
  isOnboarding,
}: Props) {
  const [posts,             setPosts]             = useState<Post[]>(initialPosts)
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null)
  const [filterType,        setFilterType]        = useState<PostType | null>(null)
  const [reactionStates,    setReactionStates]    = useState<Record<string, ReactionState>>({})
  const [loading,           setLoading]           = useState(false)
  const [hasMore,           setHasMore]           = useState(hasMoreInit)
  const [cursor,            setCursor]            = useState<string | null>(nextCursorInit)

  // ── Realtime ──────────────────────────────────────────────────────────
  const [pendingPosts,       setPendingPosts]       = useState<Post[]>([])
  const [latestNotif,        setLatestNotif]        = useState<RawNotification | null>(null)
  const selectedCommRef2     = useRef(selectedCommunity)
  selectedCommRef2.current   = selectedCommunity

  const { counts: unreadCounts, incrementUnread, markCommunityRead } =
    useUnreadCounts(communities)

  const { status: realtimeStatus } = useRealtimeMoments(orgId, userId, {
    onNewPost: useCallback((raw: RawPost) => {
      const enriched: Post = {
        id:             raw.id,
        community_id:   raw.community_id,
        post_type:      raw.post_type as Post['post_type'],
        title:          raw.title,
        body:           raw.body,
        is_pinned:      raw.is_pinned,
        is_locked:      raw.is_locked,
        created_at:     raw.created_at,
        author_id:      raw.author_id,
        metadata:       raw.metadata as Post['metadata'],
        is_mine:        false,
        community_name: communities.find(c => c.id === raw.community_id)?.name ?? 'Comunidad',
      }
      // If this community is currently selected, insert directly
      if (!selectedCommRef2.current || selectedCommRef2.current === raw.community_id) {
        setPendingPosts(prev => [enriched, ...prev])
      }
      // Always increment unread for that community (if not currently viewing it)
      if (selectedCommRef2.current !== raw.community_id) {
        incrementUnread(raw.community_id)
      }
    }, [communities, incrementUnread]),
    onNotification: useCallback((notif: RawNotification) => {
      setLatestNotif(notif)
    }, []),
  })

  // Onboarding
  const [onboardingData,    setOnboardingData]    = useState<OnboardingSuggestions | null>(null)
  const [onboardingName,    setOnboardingName]    = useState('')
  const [showOnboarding,    setShowOnboarding]    = useState(false)
  // Composer prefill from onboarding template
  const [prefillType,       setPrefillType]       = useState<PostType | undefined>()
  const [prefillTitle,      setPrefillTitle]      = useState<string | undefined>()
  const [prefillBody,       setPrefillBody]       = useState<string | undefined>()
  const [prefillCommunity,  setPrefillCommunity]  = useState<string | undefined>()
  const [composerKey,       setComposerKey]       = useState(0)  // force remount on prefill

  useEffect(() => {
    if (!isOnboarding) return
    fetch('/api/moments/onboarding-suggestions')
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.isOnboarding && json.data) {
          setOnboardingData(json.data)
          setOnboardingName(json.data.employee_name ?? '')
          setShowOnboarding(true)
        }
      })
  }, [isOnboarding])

  // Stable ref so callbacks don't recreate on every reaction state change
  const reactionStatesRef = useRef(reactionStates)
  reactionStatesRef.current = reactionStates

  const pinnedPosts = posts.filter(p => p.is_pinned)

  function handleUseTemplate(template: PostTemplate, communityId?: string) {
    setPrefillType(template.type)
    setPrefillTitle(template.title ?? undefined)
    setPrefillBody(template.body)
    setPrefillCommunity(communityId ?? selectedCommunity ?? undefined)
    setComposerKey(k => k + 1)  // remount composer with new prefill
  }

  // ── Community select (also marks as read) ─────────────────────────────
  const handleSelectCommunity = useCallback((id: string | null) => {
    setSelectedCommunity(id)
    if (id) markCommunityRead(id)
  }, [markCommunityRead])

  // ── Reveal pending posts ───────────────────────────────────────────────
  const handleRevealPending = useCallback(() => {
    setPosts(prev => [...pendingPosts, ...prev])
    setPendingPosts([])
  }, [pendingPosts])

  // ── Post created ──────────────────────────────────────────────────────
  const handlePostCreated = useCallback((post: Post) => {
    setPosts(prev => [post, ...prev])
  }, [])

  // ── Reactions (optimistic with rollback) ──────────────────────────────
  const handleReact = useCallback(async (
    postId:   string,
    reaction: ReactionType,
    current:  ReactionType | null,
  ) => {
    const isToggle = current === reaction

    // Snapshot for rollback
    const snapshot = reactionStatesRef.current[postId] ?? { myReaction: null, counts: {} }

    // Optimistic update
    setReactionStates(prev => {
      const old       = prev[postId] ?? { myReaction: null, counts: {} }
      const newCounts = { ...old.counts }
      if (isToggle) {
        newCounts[reaction] = Math.max(0, (newCounts[reaction] ?? 0) - 1)
        return { ...prev, [postId]: { myReaction: null, counts: newCounts } }
      }
      if (current) newCounts[current] = Math.max(0, (newCounts[current] ?? 0) - 1)
      newCounts[reaction] = (newCounts[reaction] ?? 0) + 1
      return { ...prev, [postId]: { myReaction: reaction, counts: newCounts } }
    })

    try {
      if (isToggle) {
        const res = await fetch(`/api/moments/posts/${postId}/reactions`, { method: 'DELETE' })
        if (!res.ok) throw new Error()
      } else {
        const res = await fetch(`/api/moments/posts/${postId}/reactions`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ reaction_type: reaction }),
        })
        if (!res.ok) throw new Error()
      }
    } catch {
      // Rollback
      setReactionStates(prev => ({ ...prev, [postId]: snapshot }))
    }
  }, [])

  // ── Feature / unfeature ───────────────────────────────────────────────
  const handleFeature = useCallback((postId: string, featured: boolean) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_pinned: featured } : p))
  }, [])

  // ── Hide ──────────────────────────────────────────────────────────────
  const handleHide = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }, [])

  // ── Load more ─────────────────────────────────────────────────────────
  const cursorRef            = useRef(cursor)
  cursorRef.current          = cursor
  const loadingRef           = useRef(loading)
  loadingRef.current         = loading
  const selectedCommRef      = useRef(selectedCommunity)
  selectedCommRef.current    = selectedCommunity
  const filterTypeRef        = useRef(filterType)
  filterTypeRef.current      = filterType

  const handleLoadMore = useCallback(async () => {
    if (!cursorRef.current || loadingRef.current) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ cursor: cursorRef.current, limit: '20' })
      if (selectedCommRef.current) params.set('communityId', selectedCommRef.current)
      if (filterTypeRef.current)   params.set('postType', filterTypeRef.current)

      const res = await fetch(`/api/moments/feed?${params}`)
      if (!res.ok) return

      const { data, nextCursor: nc, hasMore: hm } = await res.json()
      const enriched: Post[] = (data ?? []).map((p: Post) => ({
        ...p,
        is_mine:        p.author_id === userId,
        community_name: communities.find(c => c.id === p.community_id)?.name ?? 'Comunidad',
      }))
      setPosts(prev => [...prev, ...enriched])
      setCursor(nc ?? null)
      setHasMore(hm ?? false)
    } finally {
      setLoading(false)
    }
  }, [userId, communities])

  return (
    <div className="flex flex-col gap-4">

      {/* ── Header bar: realtime status + notifications ── */}
      <div className="flex items-center justify-end gap-3 -mb-1">
        <RealtimeStatus status={realtimeStatus} />
        <NotificationBell userId={userId} incomingNotif={latestNotif} />
      </div>

      {/* ── Mobile: horizontal community strip ── */}
      <div className="flex md:hidden gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        <button
          onClick={() => handleSelectCommunity(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !selectedCommunity
              ? 'bg-[#3B6FCA] text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-[#3B6FCA]/40'
          }`}
        >
          Todos
        </button>
        {communities.map(c => (
          <button
            key={c.id}
            onClick={() => handleSelectCommunity(selectedCommunity === c.id ? null : c.id)}
            className={`relative shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCommunity === c.id
                ? 'bg-[#3B6FCA] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-[#3B6FCA]/40'
            }`}
          >
            {c.name}
            {(unreadCounts[c.id] ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {unreadCounts[c.id]! > 9 ? '9+' : unreadCounts[c.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── 3-column layout ── */}
      <div className="flex gap-4 items-start">

        {/* Left: communities + filters (md+) */}
        <aside className="hidden md:block w-56 shrink-0 sticky top-4">
          <CommunitySidebar
            communities={communities}
            selected={selectedCommunity}
            filterType={filterType}
            onSelect={handleSelectCommunity}
            onFilterType={setFilterType}
            unreadCounts={unreadCounts}
          />
        </aside>

        {/* Center: composer + feed */}
        <main className="flex-1 min-w-0 flex flex-col gap-3">

          {/* Onboarding banner */}
          {showOnboarding && onboardingData && (
            <OnboardingBanner
              suggestions={onboardingData}
              employeeName={onboardingName}
              onUseTemplate={handleUseTemplate}
              onDismiss={() => setShowOnboarding(false)}
            />
          )}

          {/* New posts available banner */}
          <NewPostsBanner count={pendingPosts.length} onReveal={handleRevealPending} />

          <PostComposer
            key={composerKey}
            communities={communities}
            selectedCommunity={selectedCommunity}
            userRole={userRole}
            userId={userId}
            onPostCreated={handlePostCreated}
            prefillType={prefillType}
            prefillTitle={prefillTitle}
            prefillBody={prefillBody}
            prefillCommunity={prefillCommunity}
          />
          <PostFeed
            posts={posts}
            loading={loading}
            filterType={filterType}
            selectedCommunity={selectedCommunity}
            userRole={userRole}
            userId={userId}
            reactionStates={reactionStates}
            hasMore={hasMore}
            onReact={handleReact}
            onFeature={handleFeature}
            onHide={handleHide}
            onLoadMore={handleLoadMore}
          />
        </main>

        {/* Right: pinned + stats (lg+) */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-4">
          <RightPanel
            pinnedPosts={pinnedPosts}
            totalCommunities={communities.length}
          />
        </aside>
      </div>
    </div>
  )
}
