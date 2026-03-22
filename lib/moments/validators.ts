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

/** Matches moments_posts schema: post_type required, body (not content), title optional */
export interface ValidatedPostCreate {
  community_id: string
  post_type:    PostType
  title:        string | null
  body:         string
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

  const title = optionalString(body.title, 'title', { maxLen: 200 })
  const text  = requireString(body.body, 'body', { minLen: 1, maxLen: 10_000 })

  return { community_id, post_type: rawType as PostType, title, body: text }
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

export interface ValidatedReportCreate {
  target_type: TargetType
  target_id:   string
  reason:      string
}

export function validateReportCreate(body: unknown): ValidatedReportCreate {
  if (!isPlainObject(body)) throw new ValidationError('El cuerpo de la solicitud debe ser JSON')

  const rawTarget = body.target_type
  if (!VALID_TARGET_TYPES.has(rawTarget as TargetType)) {
    throw new ValidationError(
      `"target_type" debe ser: ${[...VALID_TARGET_TYPES].join(' | ')}`,
      'target_type',
    )
  }

  const target_id = requireUUID(body.target_id, 'target_id')
  const reason    = requireString(body.reason, 'reason', { minLen: 5, maxLen: 500 })

  return { target_type: rawTarget as TargetType, target_id, reason }
}
