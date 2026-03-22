/**
 * lib/moments/validators.ts
 * Validadores estrictos de payload para la API de Moments.
 *
 * Sin dependencias externas (no zod) — validación manual con errores tipados.
 * Cada función recibe `unknown` y devuelve el tipo validado o lanza ValidationError.
 */
import { ValidationError } from '@/lib/moments/errors'

// ── Helpers ────────────────────────────────────────────────────────────

function requireString(
  value: unknown,
  field: string,
  opts?: { minLen?: number; maxLen?: number },
): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`El campo "${field}" es requerido y debe ser texto`, field)
  }
  const trimmed = value.trim()
  if (opts?.minLen && trimmed.length < opts.minLen) {
    throw new ValidationError(
      `"${field}" debe tener al menos ${opts.minLen} caracteres`,
      field,
    )
  }
  if (opts?.maxLen && trimmed.length > opts.maxLen) {
    throw new ValidationError(
      `"${field}" no puede superar ${opts.maxLen} caracteres`,
      field,
    )
  }
  return trimmed
}

function optionalString(
  value: unknown,
  field: string,
  opts?: { maxLen?: number },
): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') {
    throw new ValidationError(`"${field}" debe ser texto`, field)
  }
  const trimmed = value.trim()
  if (opts?.maxLen && trimmed.length > opts.maxLen) {
    throw new ValidationError(
      `"${field}" no puede superar ${opts.maxLen} caracteres`,
      field,
    )
  }
  return trimmed || null
}

function requireUUID(value: unknown, field: string): string {
  const str = requireString(value, field)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(str)) {
    throw new ValidationError(`"${field}" debe ser un UUID válido`, field)
  }
  return str
}

function optionalUUID(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null
  return requireUUID(value, field)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// ── Tipos de payload ───────────────────────────────────────────────────

/** Matches moments_communities.posting_policy CHECK constraint in DB */
export type PostingPolicy = 'all_members' | 'admins_only'
const VALID_POSTING_POLICIES = new Set<PostingPolicy>(['all_members', 'admins_only'])

/** Matches moments_posts.post_type CHECK constraint in DB */
export type PostType = 'discussion' | 'question' | 'announcement' | 'recognition'
const VALID_POST_TYPES = new Set<PostType>(['discussion', 'question', 'announcement', 'recognition'])

export type ReactionType = 'like' | 'celebrate' | 'support' | 'insightful' | 'curious'
const VALID_REACTION_TYPES = new Set<ReactionType>([
  'like', 'celebrate', 'support', 'insightful', 'curious',
])

export type TargetType = 'post' | 'comment'
const VALID_TARGET_TYPES = new Set<TargetType>(['post', 'comment'])

// ── Validadores de entidades ───────────────────────────────────────────

export interface ValidatedCommunityCreate {
  name:           string
  description:    string | null
  posting_policy: PostingPolicy
  is_private:     boolean
}

export function validateCommunityCreate(body: unknown): ValidatedCommunityCreate {
  if (!isPlainObject(body)) throw new ValidationError('El cuerpo de la solicitud debe ser JSON')

  const name        = requireString(body.name, 'name', { minLen: 2, maxLen: 80 })
  const description = optionalString(body.description, 'description', { maxLen: 500 })

  const rawPolicy   = body.posting_policy ?? 'all_members'
  if (!VALID_POSTING_POLICIES.has(rawPolicy as PostingPolicy)) {
    throw new ValidationError(
      `"posting_policy" debe ser uno de: ${[...VALID_POSTING_POLICIES].join(', ')}`,
      'posting_policy',
    )
  }

  const is_private = body.is_private === true

  return { name, description, posting_policy: rawPolicy as PostingPolicy, is_private }
}

// ────────────────────────────────────────────────────────────────────────

// ── Post metadata ─────────────────────────────────────────────────────────────

export interface ValidatedRecognitionMeta {
  competency_id: string | null
  employee_id:   string | null
}

export interface ValidatedQuestionMeta {
  job_position_id: string | null
}

export type ValidatedPostMeta = ValidatedRecognitionMeta | ValidatedQuestionMeta | null

function validateRecognitionMeta(raw: unknown): ValidatedRecognitionMeta {
  if (!isPlainObject(raw)) return { competency_id: null, employee_id: null }
  return {
    competency_id: optionalUUID(raw.competency_id, 'metadata.competency_id'),
    employee_id:   optionalUUID(raw.employee_id,   'metadata.employee_id'),
  }
}

function validateQuestionMeta(raw: unknown): ValidatedQuestionMeta {
  if (!isPlainObject(raw)) return { job_position_id: null }
  return {
    job_position_id: optionalUUID(raw.job_position_id, 'metadata.job_position_id'),
  }
}

export function validatePostMeta(postType: PostType, raw: unknown): ValidatedPostMeta {
  if (postType === 'recognition') return validateRecognitionMeta(raw)
  if (postType === 'question')    return validateQuestionMeta(raw)
  return null
}

// ── Post create ───────────────────────────────────────────────────────────────

/** Matches moments_posts schema: post_type required, body (not content), title optional */
export interface ValidatedPostCreate {
  community_id: string
  post_type:    PostType
  title:        string | null
  body:         string
  metadata:     ValidatedPostMeta
}

export function validatePostCreate(body: unknown): ValidatedPostCreate {
  if (!isPlainObject(body)) throw new ValidationError('El cuerpo de la solicitud debe ser JSON')

  const community_id = requireUUID(body.community_id, 'community_id')

  const rawType = body.post_type
  if (!VALID_POST_TYPES.has(rawType as PostType)) {
    throw new ValidationError(
      `"post_type" debe ser: ${[...VALID_POST_TYPES].join(' | ')}`,
      'post_type',
    )
  }

  const postType = rawType as PostType
  const title    = optionalString(body.title, 'title', { maxLen: 200 })
  const text     = requireString(body.body, 'body', { minLen: 1, maxLen: 10_000 })
  const metadata = validatePostMeta(postType, body.metadata)

  return { community_id, post_type: postType, title, body: text, metadata }
}

// ────────────────────────────────────────────────────────────────────────

/** Matches moments_comments schema: body (not content), max 5000, parent_id optional */
export interface ValidatedCommentCreate {
  post_id:   string
  body:      string
  parent_id: string | null
}

export function validateCommentCreate(body: unknown): ValidatedCommentCreate {
  if (!isPlainObject(body)) throw new ValidationError('El cuerpo de la solicitud debe ser JSON')

  const post_id  = requireUUID(body.post_id, 'post_id')
  const text     = requireString(body.body, 'body', { minLen: 1, maxLen: 5_000 })
  const parent_id = optionalUUID(body.parent_id, 'parent_id')

  return { post_id, body: text, parent_id }
}

// ────────────────────────────────────────────────────────────────────────

export interface ValidatedReactionCreate {
  target_type:  TargetType
  target_id:    string
  reaction_type: ReactionType
}

export function validateReactionCreate(body: unknown): ValidatedReactionCreate {
  if (!isPlainObject(body)) throw new ValidationError('El cuerpo de la solicitud debe ser JSON')

  const rawTarget = body.target_type
  if (!VALID_TARGET_TYPES.has(rawTarget as TargetType)) {
    throw new ValidationError(
      `"target_type" debe ser: ${[...VALID_TARGET_TYPES].join(' | ')}`,
      'target_type',
    )
  }

  const target_id = requireUUID(body.target_id, 'target_id')

  const rawReaction = body.reaction_type
  if (!VALID_REACTION_TYPES.has(rawReaction as ReactionType)) {
    throw new ValidationError(
      `"reaction_type" debe ser uno de: ${[...VALID_REACTION_TYPES].join(', ')}`,
      'reaction_type',
    )
  }

  return {
    target_type:   rawTarget   as TargetType,
    target_id,
    reaction_type: rawReaction as ReactionType,
  }
}

// ────────────────────────────────────────────────────────────────────────

/** Matches moments_reports.reason CHECK constraint in DB */
export type ReportReason = 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'other'
const VALID_REPORT_REASONS = new Set<ReportReason>([
  'spam', 'inappropriate', 'harassment', 'misinformation', 'other',
])

/** target_type / target_id come from the URL — body only needs reason + detail */
export interface ValidatedReportCreate {
  reason: ReportReason
  detail: string | null
}

export function validateReportCreate(body: unknown): ValidatedReportCreate {
  if (!isPlainObject(body)) throw new ValidationError('El cuerpo de la solicitud debe ser JSON')

  const rawReason = body.reason
  if (!VALID_REPORT_REASONS.has(rawReason as ReportReason)) {
    throw new ValidationError(
      `"reason" debe ser uno de: ${[...VALID_REPORT_REASONS].join(', ')}`,
      'reason',
    )
  }

  const detail = optionalString(body.detail, 'detail', { maxLen: 2_000 })

  return { reason: rawReason as ReportReason, detail }
}

// ────────────────────────────────────────────────────────────────────────

export type ReportResolution = 'dismiss' | 'action'
const VALID_RESOLUTIONS = new Set<ReportResolution>(['dismiss', 'action'])

export interface ValidatedReportResolve {
  resolution: ReportResolution
  notes:      string | null
}

export function validateReportResolve(body: unknown): ValidatedReportResolve {
  if (!isPlainObject(body)) throw new ValidationError('El cuerpo de la solicitud debe ser JSON')

  const rawRes = body.resolution
  if (!VALID_RESOLUTIONS.has(rawRes as ReportResolution)) {
    throw new ValidationError(
      `"resolution" debe ser: ${[...VALID_RESOLUTIONS].join(' | ')}`,
      'resolution',
    )
  }

  const notes = optionalString(body.notes, 'notes', { maxLen: 2_000 })

  return { resolution: rawRes as ReportResolution, notes }
}

// ────────────────────────────────────────────────────────────────────────

export interface ValidatedFeaturePost {
  featured: boolean
}

export function validateFeaturePost(body: unknown): ValidatedFeaturePost {
  if (!isPlainObject(body)) throw new ValidationError('El cuerpo de la solicitud debe ser JSON')
  if (typeof body.featured !== 'boolean') {
    throw new ValidationError('"featured" debe ser un booleano', 'featured')
  }
  return { featured: body.featured }
}

// ────────────────────────────────────────────────────────────────────────

export interface ValidatedHidePost {
  hidden: boolean
}

export function validateHidePost(body: unknown): ValidatedHidePost {
  if (!isPlainObject(body)) throw new ValidationError('El cuerpo de la solicitud debe ser JSON')
  if (typeof body.hidden !== 'boolean') {
    throw new ValidationError('"hidden" debe ser un booleano', 'hidden')
  }
  return { hidden: body.hidden }
}

// ────────────────────────────────────────────────────────────────────────

export interface ValidatedBestAnswer {
  comment_id: string | null   // null = unmark current best answer
}

export function validateBestAnswer(body: unknown): ValidatedBestAnswer {
  if (!isPlainObject(body)) throw new ValidationError('El cuerpo de la solicitud debe ser JSON')
  const comment_id = optionalUUID(body.comment_id, 'comment_id')
  return { comment_id }
}
