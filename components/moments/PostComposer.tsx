'use client'

import { useState, useEffect } from 'react'
import { Send, Lock, ChevronDown, Trophy, Briefcase } from 'lucide-react'
import type { Community, Post, PostType } from './types'
import { POST_TYPES, POST_TYPE_CONFIG } from './types'

interface Props {
  communities:       Community[]
  selectedCommunity: string | null
  userRole:          string
  userId:            string
  onPostCreated:     (post: Post) => void
  // Optional: pre-fill from onboarding template
  prefillType?:      PostType
  prefillTitle?:     string
  prefillBody?:      string
  prefillCommunity?: string
}

interface Competency { id: string; name: string; dimension: string }
interface Position   { id: string; puesto: string; area: string | null }

const ADMIN_ROLES = new Set(['owner', 'admin', 'hr_specialist'])

function canPost(role: string, policy: string) {
  return policy !== 'admins_only' || ADMIN_ROLES.has(role)
}

const PLACEHOLDERS: Record<PostType, string> = {
  discussion:   '¿Qué quieres compartir con el equipo?',
  question:     '¿Qué quieres preguntarle al equipo?',
  announcement: 'Detalla el contenido del anuncio…',
  recognition:  '¿Por qué logro o actitud reconoces a esta persona?',
}

export default function PostComposer({
  communities,
  selectedCommunity,
  userRole,
  userId,
  onPostCreated,
  prefillType,
  prefillTitle,
  prefillBody,
  prefillCommunity,
}: Props) {
  const [activeType,       setActiveType]       = useState<PostType>(prefillType ?? 'discussion')
  const [communityId,      setCommunityId]      = useState(prefillCommunity ?? selectedCommunity ?? '')
  const [title,            setTitle]            = useState(prefillTitle ?? '')
  const [body,             setBody]             = useState(prefillBody ?? '')
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  // Recognition metadata
  const [competencies,     setCompetencies]     = useState<Competency[]>([])
  const [competencyId,     setCompetencyId]     = useState('')
  const [employeeIdInput,  setEmployeeIdInput]  = useState('')  // free text for now

  // Question metadata
  const [positions,        setPositions]        = useState<Position[]>([])
  const [jobPositionId,    setJobPositionId]    = useState('')

  const activeCommunity    = communities.find(c => c.id === communityId)
  const policy             = activeCommunity?.posting_policy ?? 'all_members'
  const hasPermission      = canPost(userRole, policy)
  const needsTitle         = activeType === 'announcement' || activeType === 'question'
  const effectiveCommunity = communityId || (selectedCommunity ?? '')

  // Lazy-load competencies when recognition is selected
  useEffect(() => {
    if (activeType !== 'recognition' || competencies.length > 0) return
    fetch('/api/moments/meta/competencies')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(json => setCompetencies(json.data ?? []))
  }, [activeType, competencies.length])

  // Lazy-load positions when question is selected
  useEffect(() => {
    if (activeType !== 'question' || positions.length > 0) return
    fetch('/api/moments/meta/positions')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(json => setPositions(json.data ?? []))
  }, [activeType, positions.length])

  function switchType(type: PostType) {
    setActiveType(type)
    setCompetencyId('')
    setJobPositionId('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || !effectiveCommunity || !hasPermission) return
    setLoading(true)
    setError(null)
    try {
      // Build metadata based on post type
      let metadata: Record<string, string | null> | undefined
      if (activeType === 'recognition') {
        metadata = {
          competency_id: competencyId   || null,
          employee_id:   employeeIdInput.trim() || null,
        }
      } else if (activeType === 'question') {
        metadata = { job_position_id: jobPositionId || null }
      }

      const res = await fetch('/api/moments/posts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          community_id: effectiveCommunity,
          post_type:    activeType,
          title:        needsTitle && title.trim() ? title.trim() : undefined,
          body:         body.trim(),
          metadata,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Error al publicar')
      }
      const { data } = await res.json()
      const community = communities.find(c => c.id === effectiveCommunity)
      onPostCreated({
        ...data,
        community_name: community?.name ?? 'Comunidad',
        is_mine:        true,
        post_type:      activeType,
      })
      setBody('')
      setTitle('')
      setCompetencyId('')
      setJobPositionId('')
      setEmployeeIdInput('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const selectClass = "w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3B6FCA]/30 focus:border-[#3B6FCA] transition-colors"

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Type tabs */}
      <div className="flex border-b border-slate-100">
        {POST_TYPES.map(type => {
          const cfg    = POST_TYPE_CONFIG[type]
          const active = activeType === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => switchType(type)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 ${
                active
                  ? 'border-[#3B6FCA] text-[#3B6FCA] bg-[#3B6FCA]/5'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{cfg.emoji}</span>
              <span className="hidden sm:inline">{cfg.label}</span>
            </button>
          )
        })}
      </div>

      <div className="p-4 flex flex-col gap-3">

        {/* Community picker */}
        <div className="relative">
          <select
            value={effectiveCommunity}
            onChange={e => setCommunityId(e.target.value)}
            className={selectClass}
            required
          >
            <option value="">Selecciona una comunidad…</option>
            {communities.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* No permission warning */}
        {effectiveCommunity && !hasPermission && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
            <Lock size={14} className="shrink-0" />
            Solo administradores pueden publicar en esta comunidad.
          </div>
        )}

        {/* ── Recognition: competency + employee pickers ── */}
        {activeType === 'recognition' && hasPermission && (
          <div className="flex flex-col gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <Trophy size={13} aria-hidden="true" />
              <p className="text-xs font-semibold">Detalles del reconocimiento</p>
            </div>
            <div className="relative">
              <select
                value={competencyId}
                onChange={e => setCompetencyId(e.target.value)}
                className={`${selectClass} bg-white border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20`}
              >
                <option value="">Competencia demostrada (opcional)…</option>
                {competencies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* ── Question: job position picker ── */}
        {activeType === 'question' && hasPermission && (
          <div className="flex flex-col gap-2 p-3 bg-violet-50 border border-violet-100 rounded-xl">
            <div className="flex items-center gap-1.5 text-violet-700">
              <Briefcase size={13} aria-hidden="true" />
              <p className="text-xs font-semibold">Dirigir al cargo experto</p>
            </div>
            <div className="relative">
              <select
                value={jobPositionId}
                onChange={e => setJobPositionId(e.target.value)}
                className={`${selectClass} bg-white border-violet-200 focus:border-violet-500 focus:ring-violet-500/20`}
              >
                <option value="">¿Quién podría responder mejor? (opcional)…</option>
                {positions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.puesto}{p.area ? ` · ${p.area}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Title — announcement / question */}
        {needsTitle && hasPermission && (
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={activeType === 'announcement' ? 'Título del anuncio' : 'Tu pregunta en una línea'}
            maxLength={200}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#1E2A45] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3B6FCA]/30 focus:border-[#3B6FCA] transition-colors"
          />
        )}

        {/* Body */}
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={hasPermission ? PLACEHOLDERS[activeType] : ''}
          disabled={!hasPermission}
          rows={3}
          maxLength={10_000}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-[#1E2A45] placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#3B6FCA]/30 focus:border-[#3B6FCA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1.5">
            <span aria-hidden="true">⚠️</span>{error}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 tabular-nums">
            {body.length > 0 ? `${body.length.toLocaleString('es')} / 10 000` : ''}
          </span>
          <button
            type="submit"
            disabled={!body.trim() || !effectiveCommunity || !hasPermission || loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#3B6FCA] text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-[#2d5db5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={13} />
            {loading ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </div>
    </form>
  )
}
