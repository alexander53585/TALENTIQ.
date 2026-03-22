'use client'

import { useState, useRef, useEffect } from 'react'
import { Pin, Lock, MessageCircle, MoreHorizontal, Flag, Star, EyeOff, AlertCircle, Trophy, Briefcase } from 'lucide-react'
import type { Post, ReactionType, ReactionState } from './types'
import { POST_TYPE_CONFIG, REACTIONS, REPORT_REASONS, formatRelativeTime, isRecognitionMeta, isQuestionMeta } from './types'
import CommentSection    from './CommentSection'
import ExpertSuggestions from './ExpertSuggestions'

interface Props {
  post:           Post
  userRole:       string
  userId:         string
  reactionState:  ReactionState
  onReact:        (postId: string, reaction: ReactionType, current: ReactionType | null) => void
  onFeature:      (postId: string, featured: boolean) => void
  onHide:         (postId: string) => void
}

const BODY_LIMIT = 320
const ADMIN_ROLES = new Set(['owner', 'admin', 'hr_specialist'])

export default function PostCard({ post, userRole, userId, reactionState, onReact, onFeature, onHide }: Props) {
  const [expanded,      setExpanded]      = useState(false)
  const [showComments,  setShowComments]  = useState(false)
  const [menuOpen,      setMenuOpen]      = useState(false)
  const [moderating,    setModerating]    = useState(false)
  const [reportOpen,    setReportOpen]    = useState(false)
  const [reportReason,  setReportReason]  = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportDone,    setReportDone]    = useState(false)
  const [modError,      setModError]      = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const cfg          = POST_TYPE_CONFIG[post.post_type]
  const canModerate  = ADMIN_ROLES.has(userRole)
  const truncated    = post.body.length > BODY_LIMIT && !expanded

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleModerate(action: 'feature' | 'unfeature' | 'hide') {
    setModerating(true)
    setModError(null)
    try {
      if (action === 'feature' || action === 'unfeature') {
        const res = await fetch(`/api/moments/posts/${post.id}/feature`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ featured: action === 'feature' }),
        })
        if (!res.ok) throw new Error('No se pudo actualizar el destacado')
        onFeature(post.id, action === 'feature')
      } else {
        const res = await fetch(`/api/moments/posts/${post.id}/hide`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ hidden: true }),
        })
        if (!res.ok) throw new Error('No se pudo ocultar el post')
        onHide(post.id)
      }
      setMenuOpen(false)
    } catch (err: unknown) {
      setModError(err instanceof Error ? err.message : 'Error al moderar')
    } finally {
      setModerating(false)
    }
  }

  async function handleReport(e: React.FormEvent) {
    e.preventDefault()
    if (!reportReason) return
    setReportLoading(true)
    try {
      await fetch(`/api/moments/posts/${post.id}/report`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reason: reportReason }),
      })
      setReportDone(true)
    } finally {
      setReportLoading(false)
    }
  }

  return (
    <article
      role="article"
      aria-label={`Publicación: ${cfg.label}${post.title ? ` — ${post.title}` : ''}`}
      className={`bg-white rounded-2xl border transition-all duration-200 ${
        post.is_pinned
          ? 'border-[#3B6FCA]/30 shadow-md shadow-[#3B6FCA]/5'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="p-4 sm:p-5">

        {/* ── Header ── */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold select-none ${
              post.is_mine ? 'bg-[#3B6FCA] text-white' : 'bg-slate-200 text-slate-600'
            }`}
            aria-hidden="true"
          >
            {post.is_mine ? 'Yo' : post.author_id.slice(-2).toUpperCase()}
          </div>

          {/* Meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
              <span className="font-semibold text-[#1E2A45]">
                {post.is_mine ? 'Tú' : 'Miembro del equipo'}
              </span>
              <span aria-hidden="true">·</span>
              <time dateTime={post.created_at}>{formatRelativeTime(post.created_at)}</time>
              <span aria-hidden="true">·</span>
              <span className="truncate text-slate-400">{post.community_name}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.badgeClass}`}>
                <span aria-hidden="true">{cfg.emoji}</span>{cfg.label}
              </span>
              {post.is_pinned && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#3B6FCA]/10 text-[#3B6FCA]">
                  <Pin size={9} aria-hidden="true" />Destacado
                </span>
              )}
              {post.is_locked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                  <Lock size={9} aria-hidden="true" />Cerrado
                </span>
              )}
            </div>
          </div>

          {/* ⋯ menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Opciones del post"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20">
                {canModerate && (
                  <>
                    <button
                      role="menuitem"
                      onClick={() => handleModerate(post.is_pinned ? 'unfeature' : 'feature')}
                      disabled={moderating}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      <Star size={14} className={post.is_pinned ? 'text-[#3B6FCA]' : ''} aria-hidden="true" />
                      {post.is_pinned ? 'Quitar destacado' : 'Destacar post'}
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => handleModerate('hide')}
                      disabled={moderating}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      <EyeOff size={14} aria-hidden="true" />Ocultar post
                    </button>
                    <div className="border-t border-slate-100 my-1" role="separator" />
                  </>
                )}
                {!post.is_mine && !reportDone && (
                  <button
                    role="menuitem"
                    onClick={() => { setReportOpen(true); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Flag size={14} aria-hidden="true" />Reportar post
                  </button>
                )}
                {reportDone && (
                  <div className="px-4 py-2 text-xs text-slate-400 flex items-center gap-2">
                    <AlertCircle size={13} aria-hidden="true" />Ya fue reportado
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Moderation error ── */}
        {modError && (
          <p className="mb-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5" role="alert">
            ⚠️ {modError}
          </p>
        )}

        {/* ── Recognition metadata badge ── */}
        {post.post_type === 'recognition' && isRecognitionMeta(post.metadata) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.metadata.competency_name && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Trophy size={10} aria-hidden="true" />
                {post.metadata.competency_name}
              </span>
            )}
            {post.metadata.employee_name && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                🏅 {post.metadata.employee_name}
              </span>
            )}
          </div>
        )}

        {/* ── Question job-position tag ── */}
        {post.post_type === 'question' && isQuestionMeta(post.metadata) && post.metadata.job_position_name && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-violet-50 text-violet-700 border border-violet-100">
              <Briefcase size={10} aria-hidden="true" />
              Para: {post.metadata.job_position_name}
            </span>
          </div>
        )}

        {/* ── Title ── */}
        {post.title && (
          <h3 className="text-base font-bold text-[#1E2A45] mb-2 leading-snug">{post.title}</h3>
        )}

        {/* ── Body ── */}
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          {truncated ? post.body.slice(0, BODY_LIMIT) + '…' : post.body}
        </p>
        {post.body.length > BODY_LIMIT && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-1 text-sm text-[#3B6FCA] font-medium hover:underline focus:outline-none focus-visible:underline"
          >
            {expanded ? 'Ver menos' : 'Ver más'}
          </button>
        )}

        {/* ── Reaction + comments bar ── */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100 flex-wrap">
          {REACTIONS.map(r => {
            const isActive = reactionState.myReaction === r.type
            const count    = reactionState.counts[r.type] ?? 0
            return (
              <button
                key={r.type}
                onClick={() => onReact(post.id, r.type, reactionState.myReaction)}
                title={r.label}
                aria-pressed={isActive}
                aria-label={`${r.label}${count > 0 ? `, ${count}` : ''}`}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                  isActive
                    ? 'bg-[#3B6FCA]/10 text-[#3B6FCA] font-semibold ring-1 ring-[#3B6FCA]/20'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span aria-hidden="true">{r.emoji}</span>
                {count > 0 && <span className="tabular-nums">{count}</span>}
              </button>
            )
          })}

          <div className="flex-1" />

          <button
            onClick={() => setShowComments(v => !v)}
            aria-expanded={showComments}
            aria-controls={`comments-${post.id}`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              showComments
                ? 'bg-slate-100 text-[#1E2A45] font-medium'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <MessageCircle size={13} aria-hidden="true" />
            <span>{showComments ? 'Ocultar' : 'Comentarios'}</span>
          </button>
        </div>
      </div>

      {/* ── Expert suggestions (question with job_position) ── */}
      {post.post_type === 'question' && isQuestionMeta(post.metadata) && post.metadata.job_position_id && (
        <div className="px-4 sm:px-5 pb-3">
          <ExpertSuggestions postId={post.id} />
        </div>
      )}

      {/* ── Comments ── */}
      {showComments && (
        <div id={`comments-${post.id}`} className="px-4 sm:px-5 pb-4 border-t border-slate-100 pt-3">
          <CommentSection
            postId={post.id}
            isLocked={post.is_locked}
            userId={userId}
            isAuthor={post.is_mine}
            isQuestion={post.post_type === 'question'}
          />
        </div>
      )}

      {/* ── Report form (inline) ── */}
      {reportOpen && (
        <div className="px-4 sm:px-5 pb-4 border-t border-slate-100 pt-3">
          {reportDone ? (
            <p className="text-sm text-emerald-600 flex items-center gap-2 py-2" role="status">
              ✅ Reporte enviado. Gracias por mantener la comunidad.
            </p>
          ) : (
            <form onSubmit={handleReport} className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-[#1E2A45]">Reportar este post</p>
              <fieldset>
                <legend className="sr-only">Motivo del reporte</legend>
                <div className="grid grid-cols-2 gap-2">
                  {REPORT_REASONS.map(r => (
                    <label
                      key={r.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                        reportReason === r.value
                          ? 'border-[#3B6FCA] bg-[#3B6FCA]/5 text-[#3B6FCA] font-medium'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="report_reason"
                        value={r.value}
                        checked={reportReason === r.value}
                        onChange={() => setReportReason(r.value)}
                        className="sr-only"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!reportReason || reportLoading}
                  className="px-4 py-1.5 text-sm bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-40 transition-colors"
                >
                  {reportLoading ? 'Enviando…' : 'Enviar reporte'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </article>
  )
}
