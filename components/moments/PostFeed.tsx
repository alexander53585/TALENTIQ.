'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import type { Post, PostType, ReactionType, ReactionState } from './types'
import PostCard from './PostCard'

interface Props {
  posts:             Post[]
  loading:           boolean
  filterType:        PostType | null
  selectedCommunity: string | null
  userRole:          string
  userId:            string
  reactionStates:    Record<string, ReactionState>
  hasMore:           boolean
  onReact:           (postId: string, reaction: ReactionType, current: ReactionType | null) => void
  onFeature:         (postId: string, featured: boolean) => void
  onHide:            (postId: string) => void
  onLoadMore:        () => void
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse" aria-hidden="true">
      <div className="flex gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 bg-slate-200 rounded w-2/5" />
          <div className="h-2.5 bg-slate-100 rounded w-1/4" />
        </div>
      </div>
      <div className="space-y-2.5">
        <div className="h-3 bg-slate-200 rounded w-full" />
        <div className="h-3 bg-slate-200 rounded w-5/6" />
        <div className="h-3 bg-slate-100 rounded w-3/4" />
      </div>
      <div className="flex gap-2 mt-5 pt-3 border-t border-slate-100">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="w-8 h-6 rounded-lg bg-slate-100" />
        ))}
      </div>
    </div>
  )
}

export default function PostFeed({
  posts, loading, filterType, selectedCommunity,
  userRole, userId, reactionStates,
  hasMore, onReact, onFeature, onHide, onLoadMore,
}: Props) {

  const visible = posts
    .filter(p => !selectedCommunity || p.community_id === selectedCommunity)
    .filter(p => !filterType         || p.post_type    === filterType)

  return (
    <section
      role="feed"
      aria-label="Publicaciones"
      aria-busy={loading}
      className="flex flex-col gap-3"
    >
      {/* Loading skeletons on initial load */}
      {loading && visible.length === 0 && (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      )}

      {/* Empty state */}
      {!loading && visible.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center" role="status">
          <p className="text-3xl mb-3" aria-hidden="true">💬</p>
          <p className="text-base font-semibold text-[#1E2A45] mb-1">
            {filterType
              ? 'No hay publicaciones de este tipo'
              : 'Todavía no hay publicaciones aquí'}
          </p>
          <p className="text-sm text-slate-400">
            {filterType
              ? 'Prueba cambiando el filtro de tipo'
              : 'Sé el primero en compartir algo con tu equipo'}
          </p>
        </div>
      )}

      {/* Posts */}
      {visible.map(post => (
        <PostCard
          key={post.id}
          post={post}
          userRole={userRole}
          userId={userId}
          reactionState={reactionStates[post.id] ?? { myReaction: null, counts: {} }}
          onReact={onReact}
          onFeature={onFeature}
          onHide={onHide}
        />
      ))}

      {/* Load more */}
      {hasMore && !loading && visible.length > 0 && (
        <button
          onClick={onLoadMore}
          className="w-full py-3 text-sm text-[#3B6FCA] font-medium bg-white rounded-2xl border border-slate-200 hover:bg-[#3B6FCA]/5 hover:border-[#3B6FCA]/30 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw size={13} aria-hidden="true" />
          Cargar más publicaciones
        </button>
      )}

      {/* Loading more */}
      {loading && visible.length > 0 && (
        <div className="flex items-center justify-center py-4 text-slate-400 gap-2 text-sm" aria-live="polite">
          <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          Cargando más…
        </div>
      )}
    </section>
  )
}
