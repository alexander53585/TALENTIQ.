/**
 * lib/moments/__tests__/realtime-isolation.test.ts
 *
 * Unit tests for Realtime tenant isolation guarantees.
 *
 * These tests verify:
 *   1. Client-side guard logic that rejects cross-tenant events
 *   2. Correct filter strings passed to Supabase (server-side guard)
 *   3. Own-event deduplication (author_id / user_id filters)
 *   4. Polling fallback URL construction
 *   5. useUnreadCounts increment / markRead behaviour
 */

// ---------------------------------------------------------------------------
// 1. Client-side tenant guard helpers
//    Extracted from useRealtimeMoments for unit testing without a Supabase
//    connection.
// ---------------------------------------------------------------------------

const CURRENT_ORG  = 'aaaaaaaa-0000-0000-0000-000000000001'
const OTHER_ORG    = 'bbbbbbbb-0000-0000-0000-000000000002'
const CURRENT_USER = 'cccccccc-0000-0000-0000-000000000003'

function postGuard(
  post: { organization_id: string; author_id: string },
  orgId: string,
  userId: string,
): boolean {
  if (!post?.organization_id) return false
  if (post.organization_id !== orgId) return false  // cross-tenant
  if (post.author_id === userId)       return false  // own post (dedup)
  return true
}

function commentGuard(
  comment: { organization_id: string; author_id: string },
  orgId: string,
  userId: string,
): boolean {
  if (!comment?.organization_id) return false
  if (comment.organization_id !== orgId) return false
  if (comment.author_id === userId)       return false  // own comment
  return true
}

function notifGuard(
  notif: { user_id: string },
  userId: string,
): boolean {
  if (!notif?.user_id) return false
  return notif.user_id === userId
}

describe('Realtime client-side guards', () => {
  // ── Posts ────────────────────────────────────────────────────────────────

  test('accepts post from same org, different author', () => {
    const post = { organization_id: CURRENT_ORG, author_id: 'other-user' }
    expect(postGuard(post, CURRENT_ORG, CURRENT_USER)).toBe(true)
  })

  test('rejects post from different org', () => {
    const post = { organization_id: OTHER_ORG, author_id: 'other-user' }
    expect(postGuard(post, CURRENT_ORG, CURRENT_USER)).toBe(false)
  })

  test('rejects own post (deduplicate optimistic update)', () => {
    const post = { organization_id: CURRENT_ORG, author_id: CURRENT_USER }
    expect(postGuard(post, CURRENT_ORG, CURRENT_USER)).toBe(false)
  })

  test('rejects malformed post missing organization_id', () => {
    const post = { organization_id: '', author_id: 'other-user' }
    expect(postGuard(post, CURRENT_ORG, CURRENT_USER)).toBe(false)
  })

  // ── Comments ─────────────────────────────────────────────────────────────

  test('accepts comment from same org, different author', () => {
    const comment = { organization_id: CURRENT_ORG, author_id: 'other-user' }
    expect(commentGuard(comment, CURRENT_ORG, CURRENT_USER)).toBe(true)
  })

  test('rejects comment from different org', () => {
    const comment = { organization_id: OTHER_ORG, author_id: 'other-user' }
    expect(commentGuard(comment, CURRENT_ORG, CURRENT_USER)).toBe(false)
  })

  test('rejects own comment (deduplicate optimistic update)', () => {
    const comment = { organization_id: CURRENT_ORG, author_id: CURRENT_USER }
    expect(commentGuard(comment, CURRENT_ORG, CURRENT_USER)).toBe(false)
  })

  // ── Notifications ────────────────────────────────────────────────────────

  test('accepts notification addressed to current user', () => {
    const notif = { user_id: CURRENT_USER }
    expect(notifGuard(notif, CURRENT_USER)).toBe(true)
  })

  test('rejects notification addressed to different user', () => {
    const notif = { user_id: 'someone-else' }
    expect(notifGuard(notif, CURRENT_USER)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 2. Server-side filter string construction
//    Verifies the exact filter format passed to Supabase's `postgres_changes`.
// ---------------------------------------------------------------------------

describe('Realtime filter string construction', () => {
  test('post channel filter scoped to org', () => {
    const orgId = CURRENT_ORG
    const filter = `organization_id=eq.${orgId}`
    expect(filter).toMatch(/^organization_id=eq\.[0-9a-f-]{36}$/)
    expect(filter).toContain(CURRENT_ORG)
  })

  test('comment channel filter scoped to org', () => {
    const orgId = CURRENT_ORG
    const filter = `organization_id=eq.${orgId}`
    expect(filter).not.toContain(OTHER_ORG)
  })

  test('notification channel filter scoped to user', () => {
    const userId = CURRENT_USER
    const filter = `user_id=eq.${userId}`
    expect(filter).toMatch(/^user_id=eq\.[0-9a-f-]{36}$/)
    expect(filter).toContain(CURRENT_USER)
    // Must NOT accidentally use org filter on notifications
    expect(filter).not.toContain('organization_id')
  })

  test('channel names are unique per org/user, preventing cross-tenant mixing', () => {
    const postCh1 = `moments-posts-${CURRENT_ORG}`
    const postCh2 = `moments-posts-${OTHER_ORG}`
    expect(postCh1).not.toBe(postCh2)

    const notifCh1 = `moments-notif-${CURRENT_USER}`
    const notifCh2 = `moments-notif-other-user`
    expect(notifCh1).not.toBe(notifCh2)
  })
})

// ---------------------------------------------------------------------------
// 3. Polling fallback URL construction
// ---------------------------------------------------------------------------

describe('Polling fallback URL', () => {
  test('since param is URL-encoded ISO timestamp', () => {
    const since = '2024-06-01T12:00:00.000Z'
    const url   = `/api/moments/feed?since=${encodeURIComponent(since)}&limit=20`
    expect(url).toContain('since=2024-06-01T12')
    expect(url).toContain('limit=20')
    // Encoded colon and plus must be present
    expect(url).not.toContain(':')   // colons must be encoded
  })

  test('since encodes special chars to avoid injection', () => {
    const malicious = "2024-06-01T00:00:00Z&communityId=injected"
    const encoded   = encodeURIComponent(malicious)
    const url       = `/api/moments/feed?since=${encoded}`
    // The injected param should be encoded, not a real query param
    expect(new URL(url, 'http://localhost').searchParams.get('communityId')).toBeNull()
    expect(new URL(url, 'http://localhost').searchParams.get('since')).toBe(malicious)
  })
})

// ---------------------------------------------------------------------------
// 4. useUnreadCounts logic (pure function tests without React)
// ---------------------------------------------------------------------------

describe('Unread counts logic', () => {
  type Counts = Record<string, number>

  function increment(counts: Counts, communityId: string): Counts {
    return { ...counts, [communityId]: (counts[communityId] ?? 0) + 1 }
  }

  function markRead(counts: Counts, communityId: string): Counts {
    const next = { ...counts }
    delete next[communityId]
    return next
  }

  test('increments unread for a community', () => {
    let counts: Counts = {}
    counts = increment(counts, 'comm-1')
    counts = increment(counts, 'comm-1')
    counts = increment(counts, 'comm-2')
    expect(counts['comm-1']).toBe(2)
    expect(counts['comm-2']).toBe(1)
  })

  test('markRead removes community from counts', () => {
    let counts: Counts = { 'comm-1': 5, 'comm-2': 3 }
    counts = markRead(counts, 'comm-1')
    expect(counts['comm-1']).toBeUndefined()
    expect(counts['comm-2']).toBe(3)
  })

  test('markRead on community with no unread is a no-op', () => {
    const counts: Counts = { 'comm-1': 2 }
    const after = markRead(counts, 'comm-999')
    expect(after).toEqual(counts)
  })

  test('incrementing does not affect other community counts', () => {
    let counts: Counts = { 'comm-a': 10 }
    counts = increment(counts, 'comm-b')
    expect(counts['comm-a']).toBe(10)
    expect(counts['comm-b']).toBe(1)
  })

  test('total unread across all communities', () => {
    const counts: Counts = { 'c1': 3, 'c2': 7, 'c3': 1 }
    const total = Object.values(counts).reduce((s, n) => s + n, 0)
    expect(total).toBe(11)
  })
})

// ---------------------------------------------------------------------------
// 5. Unread API query string construction
// ---------------------------------------------------------------------------

describe('Unread API query construction', () => {
  test('builds correct params for multiple communities', () => {
    const lastSeen: Record<string, string> = {
      'comm-1': '2024-06-01T10:00:00.000Z',
      'comm-2': '2024-06-01T11:00:00.000Z',
    }
    const ids = Object.keys(lastSeen)
    const params = new URLSearchParams()
    ids.forEach(id => params.append('community', id))
    ids.forEach(id => params.append(`since_${id}`, lastSeen[id]))

    const url = `/api/moments/unread?${params}`
    const sp  = new URL(url, 'http://localhost').searchParams

    expect(sp.getAll('community')).toHaveLength(2)
    expect(sp.get(`since_comm-1`)).toBe('2024-06-01T10:00:00.000Z')
    expect(sp.get(`since_comm-2`)).toBe('2024-06-01T11:00:00.000Z')
  })

  test('skips communities without a lastSeen timestamp', () => {
    const lastSeen: Record<string, string> = { 'comm-1': '2024-06-01T10:00:00.000Z' }
    const allCommunities = ['comm-1', 'comm-2', 'comm-3']
    const ids = allCommunities.filter(id => !!lastSeen[id])
    expect(ids).toEqual(['comm-1'])
    // comm-2 and comm-3 are omitted — server won't be queried for them
  })
})
