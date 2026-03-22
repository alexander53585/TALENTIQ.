'use client'

import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import type { Expert } from './types'

interface Props {
  postId: string
}

export default function ExpertSuggestions({ postId }: Props) {
  const [experts,  setExperts]  = useState<Expert[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetch(`/api/moments/posts/${postId}/experts`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(json => setExperts(json.data ?? []))
      .finally(() => setLoading(false))
  }, [postId])

  if (loading)             return null
  if (experts.length === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center gap-1.5 mb-2">
        <Users size={11} className="text-violet-500" aria-hidden="true" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Expertos sugeridos para responder
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {experts.map(e => (
          <div
            key={e.user_id}
            title={e.job_position_name ?? undefined}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 border border-violet-100 rounded-full text-xs"
          >
            <span
              className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center text-[9px] font-bold shrink-0"
              aria-hidden="true"
            >
              {e.full_name.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-violet-700 font-medium">{e.full_name.split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
