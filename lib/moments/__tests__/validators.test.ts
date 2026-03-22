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
  it('accepts valid payload', () => {
    const result = validatePostCreate({
      community_id: VALID_UUID,
      content:      'Hello world',
      is_anonymous: false,
    })
    expect(result.community_id).toBe(VALID_UUID)
    expect(result.content).toBe('Hello world')
    expect(result.is_anonymous).toBe(false)
  })

  it('defaults is_anonymous to false', () => {
    const result = validatePostCreate({ community_id: VALID_UUID, content: 'Hi' })
    expect(result.is_anonymous).toBe(false)
  })

  it('throws on missing community_id', () => {
    expect(() => validatePostCreate({ content: 'Hi' })).toThrow(ValidationError)
  })

  it('throws on invalid UUID', () => {
    expect(() => validatePostCreate({ community_id: 'not-a-uuid', content: 'Hi' }))
      .toThrow(ValidationError)
  })

  it('throws on empty content', () => {
    expect(() => validatePostCreate({ community_id: VALID_UUID, content: '' }))
      .toThrow(ValidationError)
  })

  it('throws on content exceeding 5000 chars', () => {
    expect(() => validatePostCreate({ community_id: VALID_UUID, content: 'x'.repeat(5001) }))
      .toThrow(ValidationError)
  })
})

// ── validateCommentCreate ────────────────────────────────────────────────

describe('validateCommentCreate', () => {
  it('accepts valid payload without parent', () => {
    const result = validateCommentCreate({ post_id: VALID_UUID, content: 'Great post!' })
    expect(result.post_id).toBe(VALID_UUID)
    expect(result.parent_id).toBeNull()
  })

  it('accepts valid payload with parent', () => {
    const parent = '223e4567-e89b-12d3-a456-426614174001'
    const result = validateCommentCreate({
      post_id:   VALID_UUID,
      content:   'Reply',
      parent_id: parent,
    })
    expect(result.parent_id).toBe(parent)
  })

  it('throws on missing post_id', () => {
    expect(() => validateCommentCreate({ content: 'Hi' })).toThrow(ValidationError)
  })

  it('throws on empty content', () => {
    expect(() => validateCommentCreate({ post_id: VALID_UUID, content: '  ' }))
      .toThrow(ValidationError)
  })

  it('throws on content exceeding 2000 chars', () => {
    expect(() => validateCommentCreate({ post_id: VALID_UUID, content: 'x'.repeat(2001) }))
      .toThrow(ValidationError)
  })

  it('throws on invalid parent_id UUID', () => {
    expect(() => validateCommentCreate({
      post_id: VALID_UUID, content: 'Hi', parent_id: 'bad-id',
    })).toThrow(ValidationError)
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
  it('accepts valid report', () => {
    const result = validateReportCreate({
      target_type: 'comment',
      target_id:   VALID_UUID,
      reason:      'Contenido ofensivo',
    })
    expect(result.target_type).toBe('comment')
    expect(result.reason).toBe('Contenido ofensivo')
  })

  it('throws on reason too short (< 5 chars)', () => {
    expect(() => validateReportCreate({
      target_type: 'post', target_id: VALID_UUID, reason: 'bad',
    })).toThrow(ValidationError)
  })

  it('throws on reason too long (> 500 chars)', () => {
    expect(() => validateReportCreate({
      target_type: 'post', target_id: VALID_UUID, reason: 'x'.repeat(501),
    })).toThrow(ValidationError)
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
