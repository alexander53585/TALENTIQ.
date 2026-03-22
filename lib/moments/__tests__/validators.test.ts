/**
 * Tests unitarios para lib/moments/validators.ts
 */
import { describe, it, expect } from 'vitest'
import { ValidationError } from '../errors'
import {
  validateCommunityCreate,
  validatePostCreate,
  validateCommentCreate,
  validateReactionCreate,
  validateReportCreate,
  validateReportResolve,
  validateFeaturePost,
  validateHidePost,
} from '../validators'

// ── validateCommunityCreate ─────────────────────────────────────────────

describe('validateCommunityCreate', () => {
  it('accepts valid payload', () => {
    const result = validateCommunityCreate({
      name:           'Engineering',
      description:    'For engineers',
      posting_policy: 'all_members',
      is_private:     false,
    })
    expect(result.name).toBe('Engineering')
    expect(result.posting_policy).toBe('all_members')
    expect(result.is_private).toBe(false)
  })

  it('trims whitespace from name', () => {
    const result = validateCommunityCreate({ name: '  HR Team  ', posting_policy: 'all_members' })
    expect(result.name).toBe('HR Team')
  })

  it('defaults posting_policy to all_members when omitted', () => {
    const result = validateCommunityCreate({ name: 'Test' })
    expect(result.posting_policy).toBe('all_members')
  })

  it('accepts null description', () => {
    const result = validateCommunityCreate({ name: 'Test', description: null })
    expect(result.description).toBeNull()
  })

  it('throws on missing name', () => {
    expect(() => validateCommunityCreate({ posting_policy: 'open' }))
      .toThrow(ValidationError)
  })

  it('throws on name too short', () => {
    expect(() => validateCommunityCreate({ name: 'A' }))
      .toThrow(ValidationError)
  })

  it('throws on name too long (> 80 chars)', () => {
    expect(() => validateCommunityCreate({ name: 'x'.repeat(81) }))
      .toThrow(ValidationError)
  })

  it('throws on invalid posting_policy', () => {
    expect(() => validateCommunityCreate({ name: 'Test', posting_policy: 'open' }))
      .toThrow(ValidationError)
  })

  it('throws on non-object body', () => {
    expect(() => validateCommunityCreate('not an object')).toThrow(ValidationError)
    expect(() => validateCommunityCreate(null)).toThrow(ValidationError)
  })
})

// ── validatePostCreate ───────────────────────────────────────────────────

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

describe('validatePostCreate', () => {
  const base = { community_id: VALID_UUID, post_type: 'discussion', body: 'Hello world' }

  it('accepts valid payload', () => {
    const result = validatePostCreate(base)
    expect(result.community_id).toBe(VALID_UUID)
    expect(result.post_type).toBe('discussion')
    expect(result.body).toBe('Hello world')
    expect(result.title).toBeNull()
  })

  it('accepts optional title', () => {
    const result = validatePostCreate({ ...base, title: 'My Title' })
    expect(result.title).toBe('My Title')
  })

  it('accepts all valid post_types', () => {
    const types = ['discussion', 'question', 'announcement', 'recognition']
    types.forEach(t => {
      const r = validatePostCreate({ ...base, post_type: t })
      expect(r.post_type).toBe(t)
    })
  })

  it('throws on missing post_type', () => {
    expect(() => validatePostCreate({ community_id: VALID_UUID, body: 'Hi' }))
      .toThrow(ValidationError)
  })

  it('throws on invalid post_type', () => {
    expect(() => validatePostCreate({ ...base, post_type: 'shout' }))
      .toThrow(ValidationError)
  })

  it('throws on missing community_id', () => {
    expect(() => validatePostCreate({ post_type: 'discussion', body: 'Hi' }))
      .toThrow(ValidationError)
  })

  it('throws on invalid UUID', () => {
    expect(() => validatePostCreate({ community_id: 'not-a-uuid', post_type: 'discussion', body: 'Hi' }))
      .toThrow(ValidationError)
  })

  it('throws on empty body', () => {
    expect(() => validatePostCreate({ ...base, body: '' }))
      .toThrow(ValidationError)
  })

  it('throws on body exceeding 10000 chars', () => {
    expect(() => validatePostCreate({ ...base, body: 'x'.repeat(10_001) }))
      .toThrow(ValidationError)
  })

  it('throws on title exceeding 200 chars', () => {
    expect(() => validatePostCreate({ ...base, title: 'x'.repeat(201) }))
      .toThrow(ValidationError)
  })
})

// ── validateCommentCreate ────────────────────────────────────────────────

describe('validateCommentCreate', () => {
  it('accepts valid payload without parent', () => {
    const result = validateCommentCreate({ post_id: VALID_UUID, body: 'Great post!' })
    expect(result.post_id).toBe(VALID_UUID)
    expect(result.body).toBe('Great post!')
    expect(result.parent_id).toBeNull()
  })

  it('accepts valid payload with parent', () => {
    const parent = '223e4567-e89b-12d3-a456-426614174001'
    const result = validateCommentCreate({ post_id: VALID_UUID, body: 'Reply', parent_id: parent })
    expect(result.parent_id).toBe(parent)
  })

  it('throws on missing post_id', () => {
    expect(() => validateCommentCreate({ body: 'Hi' })).toThrow(ValidationError)
  })

  it('throws on empty body', () => {
    expect(() => validateCommentCreate({ post_id: VALID_UUID, body: '  ' }))
      .toThrow(ValidationError)
  })

  it('throws on body exceeding 5000 chars', () => {
    expect(() => validateCommentCreate({ post_id: VALID_UUID, body: 'x'.repeat(5_001) }))
      .toThrow(ValidationError)
  })

  it('throws on invalid parent_id UUID', () => {
    expect(() => validateCommentCreate({ post_id: VALID_UUID, body: 'Hi', parent_id: 'bad-id' }))
      .toThrow(ValidationError)
  })
})

// ── validateReactionCreate ───────────────────────────────────────────────

describe('validateReactionCreate', () => {
  it('accepts valid reaction', () => {
    const result = validateReactionCreate({
      target_type:   'post',
      target_id:     VALID_UUID,
      reaction_type: 'like',
    })
    expect(result.reaction_type).toBe('like')
    expect(result.target_type).toBe('post')
  })

  it('accepts all valid reaction types', () => {
    const types = ['like', 'celebrate', 'support', 'insightful', 'curious']
    types.forEach(t => {
      const r = validateReactionCreate({ target_type: 'post', target_id: VALID_UUID, reaction_type: t })
      expect(r.reaction_type).toBe(t)
    })
  })

  it('throws on invalid reaction_type', () => {
    expect(() => validateReactionCreate({
      target_type: 'post', target_id: VALID_UUID, reaction_type: 'angry',
    })).toThrow(ValidationError)
  })

  it('throws on invalid target_type', () => {
    expect(() => validateReactionCreate({
      target_type: 'community', target_id: VALID_UUID, reaction_type: 'like',
    })).toThrow(ValidationError)
  })

  it('throws on invalid target_id UUID', () => {
    expect(() => validateReactionCreate({
      target_type: 'post', target_id: 'bad', reaction_type: 'like',
    })).toThrow(ValidationError)
  })
})

// ── validateReportCreate ────────────────────────────────────────────────

describe('validateReportCreate', () => {
  it('accepts valid report with reason enum', () => {
    const result = validateReportCreate({ reason: 'spam' })
    expect(result.reason).toBe('spam')
    expect(result.detail).toBeNull()
  })

  it('accepts all valid reason values', () => {
    const reasons = ['spam', 'inappropriate', 'harassment', 'misinformation', 'other']
    reasons.forEach(r => {
      const result = validateReportCreate({ reason: r })
      expect(result.reason).toBe(r)
    })
  })

  it('accepts optional detail up to 2000 chars', () => {
    const result = validateReportCreate({ reason: 'harassment', detail: 'Detalle del reporte' })
    expect(result.detail).toBe('Detalle del reporte')
  })

  it('throws on invalid reason (free text)', () => {
    expect(() => validateReportCreate({ reason: 'Contenido ofensivo' })).toThrow(ValidationError)
  })

  it('throws on missing reason', () => {
    expect(() => validateReportCreate({})).toThrow(ValidationError)
  })

  it('throws on detail too long (> 2000 chars)', () => {
    expect(() => validateReportCreate({
      reason: 'spam', detail: 'x'.repeat(2001),
    })).toThrow(ValidationError)
  })
})

// ── validateReportResolve ───────────────────────────────────────────────

describe('validateReportResolve', () => {
  it('accepts dismiss resolution', () => {
    const result = validateReportResolve({ resolution: 'dismiss' })
    expect(result.resolution).toBe('dismiss')
    expect(result.notes).toBeNull()
  })

  it('accepts action resolution with notes', () => {
    const result = validateReportResolve({ resolution: 'action', notes: 'Post eliminado' })
    expect(result.resolution).toBe('action')
    expect(result.notes).toBe('Post eliminado')
  })

  it('throws on invalid resolution', () => {
    expect(() => validateReportResolve({ resolution: 'ignore' })).toThrow(ValidationError)
  })

  it('throws on missing resolution', () => {
    expect(() => validateReportResolve({})).toThrow(ValidationError)
  })

  it('throws on notes too long (> 2000 chars)', () => {
    expect(() => validateReportResolve({
      resolution: 'dismiss', notes: 'x'.repeat(2001),
    })).toThrow(ValidationError)
  })
})

// ── validateFeaturePost ─────────────────────────────────────────────────

describe('validateFeaturePost', () => {
  it('accepts featured=true', () => {
    expect(validateFeaturePost({ featured: true })).toEqual({ featured: true })
  })

  it('accepts featured=false', () => {
    expect(validateFeaturePost({ featured: false })).toEqual({ featured: false })
  })

  it('throws when featured is a string', () => {
    expect(() => validateFeaturePost({ featured: 'true' })).toThrow(ValidationError)
  })

  it('throws when featured is missing', () => {
    expect(() => validateFeaturePost({})).toThrow(ValidationError)
  })
})

// ── validateHidePost ────────────────────────────────────────────────────

describe('validateHidePost', () => {
  it('accepts hidden=true', () => {
    expect(validateHidePost({ hidden: true })).toEqual({ hidden: true })
  })

  it('accepts hidden=false', () => {
    expect(validateHidePost({ hidden: false })).toEqual({ hidden: false })
  })

  it('throws when hidden is a number', () => {
    expect(() => validateHidePost({ hidden: 1 })).toThrow(ValidationError)
  })

  it('throws when hidden is missing', () => {
    expect(() => validateHidePost({})).toThrow(ValidationError)
  })
})

// ── errors.ts — ValidationError field propagation ─────────────────────

describe('ValidationError', () => {
  it('carries field info', () => {
    const err = new ValidationError('bad name', 'name')
    expect(err.field).toBe('name')
    expect(err.status).toBe(422)
    expect(err.code).toBe('VALIDATION_ERROR')
  })
})
