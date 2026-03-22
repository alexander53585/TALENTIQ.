'use client'

import { ArrowUp } from 'lucide-react'

interface Props {
  count:     number
  onReveal:  () => void
}

/**
 * Classic "N new posts" banner shown at the top of the feed
 * when realtime delivers new posts. Clicking it inserts them
 * into the feed without disrupting the reading position.
 */
export default function NewPostsBanner({ count, onReveal }: Props) {
  if (count === 0) return null

  return (
    <button
      onClick={onReveal}
      className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#3B6FCA] text-white text-sm font-semibold rounded-2xl shadow-md hover:bg-[#2d5db5] transition-colors animate-in slide-in-from-top-2 duration-200"
      aria-live="polite"
      aria-label={`${count} nueva${count !== 1 ? 's' : ''} publicación${count !== 1 ? 'es' : ''} — haz clic para verlas`}
    >
      <ArrowUp size={14} aria-hidden="true" />
      {count === 1
        ? '1 nueva publicación'
        : `${count} nuevas publicaciones`}
    </button>
  )
}
