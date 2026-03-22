/**
 * lib/moments/useRealtimeMoments.ts
 *
 * Supabase Realtime subscriptions for the Moments feed.
 *
 * Tenant isolation (defense in depth):
 *   1. Server-side: `filter: organization_id=eq.{orgId}` — Supabase only
 *      sends events matching the filter before they reach the client.
 *   2. RLS on all moments_* tables: database rejects any row not belonging
 *      to the authenticated user's org.
 *   3. Client-side guard: every handler verifies `payload.new.organization_id`
 *      matches the known orgId before acting on the event.
 *
 * Polling fallback:
 *   If the Realtime subscription fails to reach SUBSCRIBED within 5 s,
 *   or if any channel errors out, a soft 30 s polling loop takes over.
 *   The loop is cleared automatically when Realtime reconnects.
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ── Public types ──────────────────────────────────────────────────────────────

export type ConnectionStatus = 'connecting' | 'live' | 'polling' | 'error'

export interface RawPost {
  id:              string
  organization_id: string
  community_id:    string
  post_type:       string
  title:           string | null
  body:            string
  is_pinned:       boolean
  is_locked:       boolean
  created_at:      string
  author_id:       string
  metadata:        unknown
}

export interface RawComment {
  id:              string
  organization_id: string
  post_id:         string
  author_id:       string
  body:            string
  created_at:      string
  is_best_answer:  boolean
}

export interface RawNotification {
  id:                 string
  user_id:            string
  type:               string
  actor_display_name: string | null
  post_id:            string | null
  title:              string | null
  body:               string | null
  created_at:         string
}

export interface RealtimeCallbacks {
  onNewPost?:       (post: RawPost)                => void
  onNewComment?:    (comment: RawComment)          => void
  onNotification?:  (notif: RawNotification)       => void
  onStatusChange?:  (status: ConnectionStatus)     => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONNECT_TIMEOUT_MS  = 5_000
const POLL_INTERVAL_MS    = 30_000
const TOTAL_CHANNELS      = 3   // posts + comments + notifications

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useRealtimeMoments(
  orgId:     string,
  userId:    string,
  callbacks: RealtimeCallbacks,
): { status: ConnectionStatus } {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')

  // Stable refs — never recreate the effect when callbacks change
  const cbRef           = useRef(callbacks)
  cbRef.current         = callbacks

  const statusRef       = useRef<ConnectionStatus>('connecting')
  const pollTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPollAtRef   = useRef<string>(new Date().toISOString())
  const subscribedCount = useRef(0)
  const channelsRef     = useRef<RealtimeChannel[]>([])

  useEffect(() => {
    if (!orgId || !userId) return

    const supabase = createClient()

    // ── Helpers ────────────────────────────────────────────────────────

    function updateStatus(s: ConnectionStatus) {
      if (statusRef.current === s) return
      statusRef.current = s
      setStatus(s)
      cbRef.current.onStatusChange?.(s)
    }

    function stopPolling() {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }

    function startPolling() {
      if (pollTimerRef.current) return   // already running
      updateStatus('polling')

      async function poll() {
        try {
          const since = lastPollAtRef.current
          lastPollAtRef.current = new Date().toISOString()

          const res = await fetch(
            `/api/moments/feed?since=${encodeURIComponent(since)}&limit=20`,
          )
          if (!res.ok) return
          const { data } = await res.json()

          for (const post of (data ?? []) as RawPost[]) {
            // Client-side tenant guard
            if (post.organization_id !== orgId) continue
            if (post.author_id === userId) continue   // own posts already added
            cbRef.current.onNewPost?.(post)
          }
        } catch {
          // Network error — keep polling quietly
        }
      }

      pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS)
    }

    function onChannelStatus(channelStatus: string) {
      if (channelStatus === 'SUBSCRIBED') {
        subscribedCount.current++
        if (subscribedCount.current >= TOTAL_CHANNELS) {
          stopPolling()
          updateStatus('live')
          lastPollAtRef.current = new Date().toISOString()
        }
      } else if (
        channelStatus === 'CHANNEL_ERROR' ||
        channelStatus === 'TIMED_OUT'
      ) {
        subscribedCount.current = 0
        updateStatus('error')
        startPolling()
      } else if (channelStatus === 'CLOSED') {
        subscribedCount.current = 0
        startPolling()
      }
    }

    // ── Channel 1: new posts (org-scoped) ──────────────────────────────
    //   filter applied server-side by Supabase before delivery
    const postChannel = supabase
      .channel(`moments-posts-${orgId}`)
      .on<RawPost>(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'moments_posts',
          filter: `organization_id=eq.${orgId}`,   // ← server-side filter
        },
        (payload) => {
          const post = payload.new
          if (!post?.id) return
          if (post.organization_id !== orgId) return  // client guard
          if (post.author_id === userId)       return  // own post (optimistic)
          cbRef.current.onNewPost?.(post)
        },
      )
      .subscribe(onChannelStatus)

    // ── Channel 2: new comments (org-scoped) ───────────────────────────
    const commentChannel = supabase
      .channel(`moments-comments-${orgId}`)
      .on<RawComment>(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'moments_comments',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          const comment = payload.new
          if (!comment?.id) return
          if (comment.organization_id !== orgId) return
          if (comment.author_id === userId)       return  // own comment
          cbRef.current.onNewComment?.(comment)
        },
      )
      .subscribe(onChannelStatus)

    // ── Channel 3: personal notifications ──────────────────────────────
    //   filter by user_id — RLS also enforces this at DB level
    const notifChannel = supabase
      .channel(`moments-notif-${userId}`)
      .on<RawNotification>(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'moments_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notif = payload.new
          if (!notif?.id) return
          if (notif.user_id !== userId) return    // client guard
          cbRef.current.onNotification?.(notif)
        },
      )
      .subscribe(onChannelStatus)

    channelsRef.current = [postChannel, commentChannel, notifChannel]

    // Start polling as safety net if channels don't connect in time
    const connectTimeout = setTimeout(() => {
      if (statusRef.current === 'connecting') startPolling()
    }, CONNECT_TIMEOUT_MS)

    return () => {
      clearTimeout(connectTimeout)
      stopPolling()
      channelsRef.current.forEach(ch => supabase.removeChannel(ch))
      channelsRef.current     = []
      subscribedCount.current = 0
    }
  }, [orgId, userId])   // only re-run if user/org changes

  return { status }
}
