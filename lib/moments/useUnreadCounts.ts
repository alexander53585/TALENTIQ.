/**
 * lib/moments/useUnreadCounts.ts
 *
 * Tracks unread post counts per community for the current session.
 *
 * Strategy:
 *   - Counts are incremented in-memory when Realtime delivers a new post
 *     for a community the user is not currently viewing.
 *   - lastSeen timestamps are persisted in localStorage, allowing the
 *     GET /api/moments/unread endpoint to compute initial counts on load.
 *   - Selecting a community resets its counter and updates localStorage.
 */
'use client'

import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'moments_last_seen_v1'

// ── localStorage helpers ──────────────────────────────────────────────────────

function loadLastSeen(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveLastSeen(communityId: string, iso: string) {
  if (typeof window === 'undefined') return
  const data = loadLastSeen()
  data[communityId] = iso
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* storage full */ }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UnreadCountsHook {
  /** Current unread counts per community_id */
  counts: Record<string, number>
  /**
   * Call when a realtime post arrives for a community that is not selected.
   * Increments the unread counter for that community.
   */
  incrementUnread: (communityId: string) => void
  /**
   * Call when the user selects (views) a community.
   * Resets the unread counter and records the last-seen timestamp.
   */
  markCommunityRead: (communityId: string) => void
  /**
   * ISO timestamp of last-seen for a given community.
   * Used by the initial API fetch for server-side counts.
   */
  getLastSeen: (communityId: string) => string | null
}

export function useUnreadCounts(
  communities: { id: string }[],
): UnreadCountsHook {
  const [counts, setCounts] = useState<Record<string, number>>({})

  // On mount: fetch initial unread counts from API using localStorage timestamps
  useEffect(() => {
    if (communities.length === 0) return

    const lastSeen = loadLastSeen()
    const ids      = communities.map(c => c.id).filter(id => !!lastSeen[id])
    if (ids.length === 0) return

    const params = new URLSearchParams()
    ids.forEach(id => params.append('community', id))
    // Pass per-community since timestamps
    ids.forEach(id => params.append(`since_${id}`, lastSeen[id]))

    fetch(`/api/moments/unread?${params}`)
      .then(r => r.ok ? r.json() : { data: {} })
      .then(json => {
        const data = json.data as Record<string, number>
        if (data && typeof data === 'object') {
          setCounts(data)
        }
      })
      .catch(() => { /* non-critical */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])   // intentionally run once on mount

  const incrementUnread = useCallback((communityId: string) => {
    setCounts(prev => ({
      ...prev,
      [communityId]: (prev[communityId] ?? 0) + 1,
    }))
  }, [])

  const markCommunityRead = useCallback((communityId: string) => {
    setCounts(prev => {
      if (!prev[communityId]) return prev
      const next = { ...prev }
      delete next[communityId]
      return next
    })
    saveLastSeen(communityId, new Date().toISOString())
  }, [])

  const getLastSeen = useCallback((communityId: string): string | null => {
    return loadLastSeen()[communityId] ?? null
  }, [])

  return { counts, incrementUnread, markCommunityRead, getLastSeen }
}
