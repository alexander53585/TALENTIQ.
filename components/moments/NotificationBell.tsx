'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck, X } from 'lucide-react'
import type { RawNotification } from '@/lib/moments/useRealtimeMoments'

interface StoredNotification {
  id:                 string
  type:               string
  actor_display_name: string | null
  post_id:            string | null
  title:              string | null
  body:               string | null
  read_at:            string | null
  created_at:         string
}

interface Props {
  userId:           string
  /** New notification pushed from realtime — adds to the inbox */
  incomingNotif?:   RawNotification | null
}

export default function NotificationBell({ userId, incomingNotif }: Props) {
  const [open,          setOpen]          = useState(false)
  const [notifications, setNotifications] = useState<StoredNotification[]>([])
  const [unread,        setUnread]        = useState(0)
  const [markingAll,    setMarkingAll]    = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // ── Fetch on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/moments/notifications?limit=20')
      .then(r => r.ok ? r.json() : { data: [], unread_count: 0 })
      .then(json => {
        setNotifications(json.data ?? [])
        setUnread(json.unread_count ?? 0)
      })
      .catch(() => {})
  }, [userId])

  // ── Inject incoming realtime notification ──────────────────────────────────
  useEffect(() => {
    if (!incomingNotif) return
    const n: StoredNotification = {
      id:                 incomingNotif.id,
      type:               incomingNotif.type,
      actor_display_name: incomingNotif.actor_display_name,
      post_id:            incomingNotif.post_id,
      title:              incomingNotif.title,
      body:               incomingNotif.body,
      read_at:            null,
      created_at:         incomingNotif.created_at,
    }
    setNotifications(prev => [n, ...prev].slice(0, 30))
    setUnread(c => c + 1)
  }, [incomingNotif])

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Mark single notification as read ──────────────────────────────────────
  async function markRead(id: string) {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n),
    )
    setUnread(c => Math.max(0, c - 1))
    await fetch(`/api/moments/notifications/${id}/read`, { method: 'POST' }).catch(() => {})
  }

  // ── Mark all as read ──────────────────────────────────────────────────────
  async function markAllRead() {
    setMarkingAll(true)
    try {
      await fetch('/api/moments/notifications/read-all', { method: 'POST' })
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      )
      setUnread(0)
    } finally {
      setMarkingAll(false)
    }
  }

  const typeEmoji = (type: string) =>
    type === 'recognition' ? '🏆' : '💬'

  const typeLabel = (type: string) =>
    type === 'recognition' ? 'Te reconocieron' : 'Comentario en tu post'

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={`Notificaciones${unread > 0 ? `, ${unread} no leídas` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none"
            aria-hidden="true"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Panel de notificaciones"
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-30 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-[#3B6FCA]" />
              <p className="text-sm font-semibold text-[#1E2A45]">Notificaciones</p>
              {unread > 0 && (
                <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                  {unread} nuevas
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={markingAll}
                  title="Marcar todas como leídas"
                  className="p-1 rounded-lg text-slate-400 hover:text-[#3B6FCA] hover:bg-[#3B6FCA]/5 transition-colors disabled:opacity-40"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <ul className="max-h-80 overflow-y-auto divide-y divide-slate-50" role="list">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-400">
                Sin notificaciones aún
              </li>
            ) : (
              notifications.map(n => (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-default ${
                    !n.read_at ? 'bg-[#3B6FCA]/3' : ''
                  }`}
                  onClick={() => { if (!n.read_at) markRead(n.id) }}
                >
                  <span className="text-base leading-none mt-0.5 shrink-0" aria-hidden="true">
                    {typeEmoji(n.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-xs font-semibold text-[#1E2A45]">
                        {n.title ?? typeLabel(n.type)}
                      </p>
                      {!n.read_at && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3B6FCA] shrink-0" aria-hidden="true" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{n.body}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {n.actor_display_name ?? 'Miembro del equipo'} ·{' '}
                      {new Date(n.created_at).toLocaleTimeString('es-ES', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
