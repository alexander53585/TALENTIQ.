'use client'

import { Pin, TrendingUp, Hash, MessageSquare } from 'lucide-react'
import type { Post } from './types'
import { POST_TYPE_CONFIG, formatRelativeTime } from './types'
import KultuPulseWidget from './KultuPulseWidget'

interface Props {
  pinnedPosts:      Post[]
  totalCommunities: number
}

export default function RightPanel({ pinnedPosts, totalCommunities }: Props) {
  return (
    <div className="flex flex-col gap-3">

      {/* ── Destacados ── */}
      {pinnedPosts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Pin size={13} className="text-[#3B6FCA]" aria-hidden="true" />
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Destacados</p>
          </div>
          <ul className="divide-y divide-slate-100" aria-label="Posts destacados">
            {pinnedPosts.slice(0, 5).map(post => {
              const cfg = POST_TYPE_CONFIG[post.post_type]
              return (
                <li key={post.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none mt-0.5 shrink-0" aria-hidden="true">{cfg.emoji}</span>
                    <div className="min-w-0">
                      {post.title ? (
                        <p className="text-xs font-semibold text-[#1E2A45] leading-snug line-clamp-2">{post.title}</p>
                      ) : (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {post.body.slice(0, 90)}{post.body.length > 90 ? '…' : ''}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {post.community_name} · {formatRelativeTime(post.created_at)}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* ── Stats rápidas ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp size={13} className="text-[#3B6FCA]" aria-hidden="true" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resumen</p>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center shrink-0">
              <Hash size={14} className="text-[#3B6FCA]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Comunidades activas</p>
              <p className="text-sm font-bold text-[#1E2A45]">{totalCommunities}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Pin size={14} className="text-amber-500" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Posts destacados</p>
              <p className="text-sm font-bold text-[#1E2A45]">{pinnedPosts.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <MessageSquare size={14} className="text-emerald-600" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Conversaciones hoy</p>
              <p className="text-sm font-bold text-[#1E2A45]">—</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KultuPulse ── */}
      <KultuPulseWidget />

    </div>
  )
}
