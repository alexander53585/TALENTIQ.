'use client'

import { useState, useEffect } from 'react'
import { Send, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Comment } from './types'
import { formatRelativeTime } from './types'

interface Props {
  postId:     string
  isLocked:   boolean
  userId:     string
  isAuthor?:  boolean   // post author can mark best answer
  isQuestion?: boolean  // only question posts have best-answer feature
}

interface CommentWithBest extends Comment {
  is_best_answer?: boolean
}

export default function CommentSection({ postId, isLocked, userId, isAuthor, isQuestion }: Props) {
  const [comments,   setComments]   = useState<CommentWithBest[]>([])
  const [loading,    setLoading]    = useState(true)
  const [body,       setBody]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [bestLoading, setBestLoading] = useState<string | null>(null)  // comment id in flight

  const canMarkBest = isAuthor && isQuestion

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('moments_comments')
      .select('id, body, author_id, created_at, parent_comment_id, is_best_answer')
      .eq('post_id', postId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        setComments((data ?? []) as CommentWithBest[])
        setLoading(false)
      })
  }, [postId])

  async function handleBestAnswer(commentId: string, isCurrentlyBest: boolean) {
    setBestLoading(commentId)
    try {
      const res = await fetch(`/api/moments/posts/${postId}/best-answer`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ comment_id: isCurrentlyBest ? null : commentId }),
      })
      if (!res.ok) return
      // Update local state
      setComments(prev => prev.map(c => ({
        ...c,
        is_best_answer: isCurrentlyBest ? false : c.id === commentId,
      })))
    } finally {
      setBestLoading(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || isLocked) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/moments/posts/${postId}/comments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, body: body.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Error al comentar')
      }
      const { data } = await res.json()
      setComments(prev => [...prev, {
        id:                data.id,
        body:              data.body,
        author_id:         userId,
        created_at:        data.created_at,
        parent_comment_id: null,
      }])
      setBody('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al publicar comentario')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-slate-400" aria-live="polite" aria-busy="true">
        <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-[#3B6FCA] rounded-full animate-spin" />
        Cargando comentarios…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-slate-400 py-1" aria-live="polite">
          {isLocked ? 'Los comentarios están desactivados.' : 'Sé el primero en comentar.'}
        </p>
      ) : (
        <ol className="flex flex-col gap-2.5" aria-label="Comentarios">
          {comments.map(c => (
            <li
              key={c.id}
              className={`flex gap-2.5 ${c.is_best_answer ? 'relative' : ''}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                  c.author_id === userId
                    ? 'bg-[#3B6FCA] text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
                aria-hidden="true"
              >
                {c.author_id === userId ? 'Yo' : c.author_id.slice(-2).toUpperCase()}
              </div>
              <div className={`flex-1 rounded-xl px-3 py-2 ${
                c.is_best_answer
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-slate-50'
              }`}>
                <div className="flex items-center justify-between gap-1.5 mb-0.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#1E2A45]">
                      {c.author_id === userId ? 'Tú' : 'Miembro del equipo'}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatRelativeTime(c.created_at)}</span>
                    {c.is_best_answer && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-semibold">
                        <Star size={9} aria-hidden="true" />
                        Mejor respuesta
                      </span>
                    )}
                  </div>
                  {canMarkBest && (
                    <button
                      onClick={() => handleBestAnswer(c.id, !!c.is_best_answer)}
                      disabled={bestLoading === c.id}
                      title={c.is_best_answer ? 'Quitar como mejor respuesta' : 'Marcar como mejor respuesta'}
                      className={`shrink-0 p-0.5 rounded transition-colors ${
                        c.is_best_answer
                          ? 'text-emerald-600 hover:text-emerald-800'
                          : 'text-slate-300 hover:text-emerald-500'
                      } disabled:opacity-40`}
                      aria-label={c.is_best_answer ? 'Quitar como mejor respuesta' : 'Marcar como mejor respuesta'}
                    >
                      <Star size={13} fill={c.is_best_answer ? 'currentColor' : 'none'} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-700 leading-snug">{c.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* New comment input */}
      {!isLocked && (
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <div
            className="w-6 h-6 rounded-full bg-[#3B6FCA] flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
            aria-hidden="true"
          >
            Yo
          </div>
          <input
            type="text"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Escribe un comentario…"
            maxLength={5_000}
            disabled={submitting}
            aria-label="Nuevo comentario"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-[#1E2A45] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3B6FCA]/30 focus:border-[#3B6FCA] transition-colors"
          />
          <button
            type="submit"
            disabled={!body.trim() || submitting}
            aria-label="Enviar comentario"
            className="p-1.5 bg-[#3B6FCA] text-white rounded-xl disabled:opacity-40 hover:bg-[#2d5db5] transition-colors"
          >
            <Send size={14} />
          </button>
        </form>
      )}

      {error && (
        <p className="text-xs text-red-500" role="alert">⚠️ {error}</p>
      )}
    </div>
  )
}
