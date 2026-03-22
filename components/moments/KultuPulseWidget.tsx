'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Loader2 } from 'lucide-react'
import type { PulseData } from './types'

const DIMENSION_COLOR: Record<string, string> = {
  liderazgo:  'bg-[#3B6FCA]',
  técnica:    'bg-violet-500',
  cultural:   'bg-emerald-500',
  relacional: 'bg-amber-500',
}

function CompetencyBar({ name, count, max }: { name: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-600 truncate pr-2">{name}</span>
        <span className="text-[11px] font-semibold text-[#3B6FCA] shrink-0">{count}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#3B6FCA] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function KultuPulseWidget() {
  const [pulse,   setPulse]   = useState<PulseData | null>(null)
  const [window,  setWindow]  = useState<7 | 30>(7)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/moments/pulse?window=${window}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.data) setPulse(json.data as PulseData)
      })
      .finally(() => setLoading(false))
  }, [window])

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={13} className="text-[#3B6FCA]" aria-hidden="true" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">KultuPulse</p>
        </div>
        {/* Window toggle */}
        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
          {([7, 30] as const).map(w => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors ${
                window === w
                  ? 'bg-white text-[#3B6FCA] shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-xs">
          <Loader2 size={14} className="animate-spin" />
          Calculando…
        </div>
      ) : !pulse ? (
        <p className="text-xs text-slate-400 p-4 text-center">Sin datos disponibles</p>
      ) : (
        <div className="p-4 flex flex-col gap-4">

          {/* Stats strip */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#3B6FCA]/5 rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold text-[#3B6FCA] leading-none">{pulse.total_posts}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">publicaciones</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold text-emerald-600 leading-none">{pulse.total_recognitions}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">reconocimientos</p>
            </div>
          </div>

          {/* Community activity */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comunidades</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {pulse.active_communities} activas
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-200 inline-block" />
                  {pulse.inactive_communities} quietas
                </span>
              </div>
            </div>
            {pulse.top_communities.length > 0 ? (
              <ol className="flex flex-col gap-1.5" aria-label="Comunidades más activas">
                {pulse.top_communities.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-2 text-[11px]">
                    <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-slate-600 truncate">{c.name}</span>
                    <span className="text-slate-400 shrink-0">{c.post_count} posts</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[11px] text-slate-400">Sin actividad en este periodo</p>
            )}
          </div>

          {/* Top competencies */}
          {pulse.top_competencies.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Competencias reconocidas
              </p>
              <div className="flex flex-col gap-2">
                {pulse.top_competencies.map(c => (
                  <CompetencyBar
                    key={c.competency_id}
                    name={c.competency_name}
                    count={c.count}
                    max={pulse.top_competencies[0].count}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
