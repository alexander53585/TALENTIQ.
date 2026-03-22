export type PostType     = 'discussion' | 'question' | 'announcement' | 'recognition'
export type ReactionType = 'like' | 'celebrate' | 'support' | 'insightful' | 'curious'

export interface Community {
  id:             string
  name:           string
  description:    string | null
  posting_policy: 'all_members' | 'admins_only'
  is_private:     boolean
  member_count:   number
  /** Whether the current user is an active member of this community. */
  is_member?:     boolean
}

// ── Post metadata types ───────────────────────────────────────────────────────

export interface RecognitionMeta {
  competency_id:   string | null
  competency_name: string | null
  employee_id:     string | null
  employee_name:   string | null
}

export interface QuestionMeta {
  job_position_id:   string | null
  job_position_name: string | null
}

export type PostMeta = RecognitionMeta | QuestionMeta

export function isRecognitionMeta(m: PostMeta | null | undefined): m is RecognitionMeta {
  return !!m && 'competency_id' in m
}

export function isQuestionMeta(m: PostMeta | null | undefined): m is QuestionMeta {
  return !!m && 'job_position_id' in m
}

// ─────────────────────────────────────────────────────────────────────────────

export interface Post {
  id:             string
  community_id:   string
  community_name: string
  post_type:      PostType
  title:          string | null
  body:           string
  is_pinned:      boolean
  is_locked:      boolean
  created_at:     string
  author_id:      string
  is_mine:        boolean
  metadata?:      PostMeta | null
}

export interface Comment {
  id:                 string
  body:               string
  author_id:          string
  created_at:         string
  parent_comment_id:  string | null
}

export interface ReactionState {
  myReaction: ReactionType | null
  counts:     Partial<Record<ReactionType, number>>
}

export const POST_TYPES: PostType[] = ['discussion', 'question', 'announcement', 'recognition']

export const POST_TYPE_CONFIG: Record<PostType, {
  label:      string
  emoji:      string
  badgeClass: string
}> = {
  discussion:   { label: 'Discusión',     emoji: '💬', badgeClass: 'bg-blue-50   text-blue-600   border border-blue-100'   },
  question:     { label: 'Pregunta',      emoji: '❓', badgeClass: 'bg-violet-50 text-violet-600 border border-violet-100' },
  announcement: { label: 'Anuncio',       emoji: '📢', badgeClass: 'bg-amber-50  text-amber-600  border border-amber-100'  },
  recognition:  { label: 'Reconocimto.', emoji: '🏆', badgeClass: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
}

export const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like',       emoji: '👍', label: 'Me gusta'    },
  { type: 'celebrate',  emoji: '🎉', label: 'Celebrar'    },
  { type: 'support',    emoji: '🤝', label: 'Apoyo'       },
  { type: 'insightful', emoji: '💡', label: 'Interesante' },
  { type: 'curious',    emoji: '🤔', label: 'Curioso'     },
]

export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: 'spam',          label: '🚫 Spam'          },
  { value: 'inappropriate', label: '⚠️ Inapropiado'  },
  { value: 'harassment',    label: '😤 Acoso'         },
  { value: 'misinformation',label: '🤥 Desinformación'},
  { value: 'other',         label: '❓ Otro'           },
]

export function formatRelativeTime(dateStr: string): string {
  const diff    = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours   = Math.floor(diff / 3_600_000)
  const days    = Math.floor(diff / 86_400_000)
  if (minutes < 1)  return 'ahora mismo'
  if (minutes < 60) return `hace ${minutes} min`
  if (hours   < 24) return `hace ${hours} h`
  if (days    < 7)  return `hace ${days} d`
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

// ── Analytics / KultuPulse ────────────────────────────────────────────────────

export interface PulseCompetency {
  competency_id:   string
  competency_name: string
  count:           number
}

export interface PulseCommunity {
  id:         string
  name:       string
  post_count: number
}

export interface PulseData {
  window_days:          7 | 30
  top_competencies:     PulseCompetency[]
  top_communities:      PulseCommunity[]
  active_communities:   number
  inactive_communities: number
  total_posts:          number
  total_recognitions:   number
}

// ── Experts ───────────────────────────────────────────────────────────────────

export interface Expert {
  user_id:           string
  full_name:         string
  job_position_name: string | null
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export interface PostTemplate {
  type:  PostType
  title: string
  body:  string
}

export interface OnboardingSuggestions {
  communities:    { id: string; name: string; member_count: number }[]
  post_templates: PostTemplate[]
}

/** base64url encode for cursor (browser-safe) */
export function encodeCursor(ts: string, id: string): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify({ ts, id }))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
