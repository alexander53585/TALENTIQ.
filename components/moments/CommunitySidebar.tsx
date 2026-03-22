'use client'

import { Hash, Lock, ChevronRight } from 'lucide-react'
import type { Community, PostType } from './types'
import { POST_TYPES, POST_TYPE_CONFIG } from './types'

interface Props {
  communities:   Community[]
  selected:      string | null
  onSelect:      (id: string | null) => void
  filterType:    PostType | null
  onFilterType:  (t: PostType | null) => void
  unreadCounts?: Record<string, number>
}

export default function CommunitySidebar({ communities, selected, onSelect, filterType, onFilterType, unreadCounts = {} }: Props) {
  return (
    <div className="flex flex-col gap-3">

      {/* ── Comunidades ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Comunidades</p>
        </div>
        <nav className="py-1" aria-label="Comunidades">
          <button
            onClick={() => onSelect(null)}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
              selected === null
                ? 'text-[#3B6FCA] font-semibold bg-[#3B6FCA]/5'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="text-base leading-none">🏠</span>
            <span className="flex-1 text-left">Todos los posts</span>
            {selected === null && <ChevronRight size={13} className="shrink-0" />}
          </button>

          {communities.length === 0 && (
            <p className="px-4 py-3 text-xs text-slate-400">No hay comunidades activas.</p>
          )}

          {communities.map(c => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                selected === c.id
                  ? 'text-[#3B6FCA] font-semibold bg-[#3B6FCA]/5'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                selected === c.id ? 'bg-[#3B6FCA]/10' : 'bg-slate-100'
              }`}>
                {c.is_private
                  ? <Lock size={10} className={selected === c.id ? 'text-[#3B6FCA]' : 'text-slate-400'} />
                  : <Hash size={10} className={selected === c.id ? 'text-[#3B6FCA]' : 'text-slate-400'} />
                }
              </div>
              <span className="flex-1 text-left truncate">{c.name}</span>
              {(unreadCounts[c.id] ?? 0) > 0 ? (
                <span className="min-w-[18px] h-[18px] bg-[#3B6FCA] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none tabular-nums">
                  {unreadCounts[c.id]! > 99 ? '99+' : unreadCounts[c.id]}
                </span>
              ) : c.member_count > 0 ? (
                <span className="text-[10px] text-slate-400 tabular-nums">{c.member_count}</span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Filtros por tipo ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Filtrar por tipo</p>
        </div>
        <div className="py-1">
          <button
            onClick={() => onFilterType(null)}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
              filterType === null
                ? 'text-[#3B6FCA] font-semibold bg-[#3B6FCA]/5'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="text-base leading-none">✨</span>
            <span>Todos los tipos</span>
          </button>
          {POST_TYPES.map(type => {
            const cfg = POST_TYPE_CONFIG[type]
            return (
              <button
                key={type}
                onClick={() => onFilterType(type)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                  filterType === type
                    ? 'text-[#3B6FCA] font-semibold bg-[#3B6FCA]/5'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-base leading-none">{cfg.emoji}</span>
                <span>{cfg.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
