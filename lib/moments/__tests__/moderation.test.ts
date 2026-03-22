/**
 * Pruebas de autorización y aislamiento para los endpoints de moderación.
 *
 * Cubre:
 * 1. canModeratePost / canResolveReport — tests de permiso puro por rol
 * 2. POST report — cualquier miembro puede reportar; cross-tenant → 404
 * 3. POST resolve — owner/admin siempre; hr_specialist solo si es community admin
 * 4. POST feature — owner/admin siempre; employee → 403; cross-tenant → 404
 * 5. POST hide — ocultar y restaurar; hr_specialist sin community admin → 403
 * 6. Aislamiento tenant — organization_id siempre del contexto de sesión
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Fixtures ──────────────────────────────────────────────────────────
const ORG_A    = 'aaaaaaaa-0000-0000-0000-000000000000'
const ORG_B    = 'bbbbbbbb-0000-0000-0000-000000000000'
const USER_A   = 'aaaaaaaa-1111-0000-0000-000000000000'
const POST_A   = 'aaaaaaaa-3333-0000-0000-000000000000'
const COMM_A   = 'aaaaaaaa-2222-0000-0000-000000000000'
const REPORT_A = 'aaaaaaaa-4444-0000-0000-000000000000'

// ── Mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/auth/requestContext', () => ({ getRequestContext: vi.fn() }))
vi.mock('@/lib/supabase/server',     () => ({ createClient: vi.fn() }))
vi.mock('@/lib/moments/audit',       () => ({ logMomentsAudit: vi.fn() }))

import { getRequestContext } from '@/lib/auth/requestContext'
import { createClient }      from '@/lib/supabase/server'

const mockGetCtx = vi.mocked(getRequestContext)
const mockClient = vi.mocked(createClient)

// ── Chain builder ─────────────────────────────────────────────────────

type ChainResult = { data: unknown; error: null | { code?: string; message?: string } }

function chain(
  result: ChainResult,
  eqLog?: Array<[string, unknown]>,
) {
  const c: Record<string, unknown> = {}
  const methods = ['select','eq','neq','order','limit','insert','delete','update','upsert','or','in']
  methods.forEach(m => {
    c[m] = (...args: unknown[]) => {
      if (m === 'eq' && eqLog) eqLog.push(args as [string, unknown])
      return c
    }
  })
  c.maybeSingle = async () => result
  c.single      = async () => result
  c.then        = (fn: (v: ChainResult) => unknown) => Promise.resolve(fn(result))
  return c
}

function makeClient(
  results: Record<string, ChainResult>,
  eqLog?: Array<[string, unknown]>,
) {
  return {
    from: (table: string) => chain(results[table] ?? { data: null, error: null }, eqLog),
  } as unknown as Awaited<ReturnType<typeof createClient>>
}

/**
 * Chain builder that returns different results for select vs mutating operations.
 * Mutation ops: update, insert, upsert, delete
 */
function chainWithOps(
  selectResult: ChainResult,
  mutateResult: ChainResult,
  eqLog?: Array<[string, unknown]>,
) {
  let isMutate = false
  const c: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'neq', 'order', 'limit', 'or', 'in']
  methods.forEach(m => {
    c[m] = (...args: unknown[]) => {
      if (m === 'eq' && eqLog) eqLog.push(args as [string, unknown])
      return c
    }
  })
  ;['update', 'insert', 'upsert', 'delete'].forEach(m => {
    c[m] = () => { isMutate = true; return c }
  })
  c.maybeSingle = async () => isMutate ? mutateResult : selectResult
  c.single      = async () => isMutate ? mutateResult : selectResult
  c.then        = (fn: (v: ChainResult) => unknown) => Promise.resolve(fn(isMutate ? mutateResult : selectResult))
  return c
}

/**
 * Client where each table can specify separate select/mutate results.
 */
function makeClientOps(
  tables: Record<string, { select: ChainResult; mutate?: ChainResult }>,
  eqLog?: Array<[string, unknown]>,
) {
  return {
    from: (table: string) => {
      const t = tables[table]
      if (!t) return chain({ data: null, error: null }, eqLog)
      return chainWithOps(t.select, t.mutate ?? t.select, eqLog)
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>
}

function makeRequest(body: unknown, postId = POST_A): NextRequest {
  return new NextRequest(`http://localhost/api/moments/posts/${postId}/report`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ══════════════════════════════════════════════════════════════════════
// 1. Funciones de permiso puras
// ══════════════════════════════════════════════════════════════════════

import { canModeratePost, canResolveReport, canReport, canFeaturePost } from '../permissions'
import type { OrgRole } from '@/lib/auth/requestContext'

describe('canModeratePost', () => {
  it('owner siempre puede', () => {
    expect(canModeratePost('owner', false)).toBe(true)
    expect(canModeratePost('owner', true)).toBe(true)
  })

  it('admin siempre puede', () => {
    expect(canModeratePost('admin', false)).toBe(true)
  })

  it('hr_specialist solo si es community admin', () => {
    expect(canModeratePost('hr_specialist', true)).toBe(true)
    expect(canModeratePost('hr_specialist', false)).toBe(false)
  })

  it('manager nunca puede', () => {
    expect(canModeratePost('manager', true)).toBe(false)
    expect(canModeratePost('manager', false)).toBe(false)
  })

  it('employee nunca puede', () => {
    expect(canModeratePost('employee', true)).toBe(false)
    expect(canModeratePost('employee', false)).toBe(false)
  })
})

describe('canResolveReport', () => {
  it('tiene mismas reglas que canModeratePost', () => {
    const roles: OrgRole[] = ['owner', 'admin', 'hr_specialist', 'manager', 'employee']
    for (const role of roles) {
      expect(canResolveReport(role, true)).toBe(canModeratePost(role, true))
      expect(canResolveReport(role, false)).toBe(canModeratePost(role, false))
    }
  })
})

describe('canReport', () => {
  it('cualquier rol puede reportar', () => {
    const roles: OrgRole[] = ['owner', 'admin', 'hr_specialist', 'manager', 'employee']
    roles.forEach(r => expect(canReport(r)).toBe(true))
  })
})

// ══════════════════════════════════════════════════════════════════════
// 2. POST /api/moments/posts/[id]/report
// ══════════════════════════════════════════════════════════════════════

import { POST as reportPost } from '../../../app/api/moments/posts/[id]/report/route'

describe('POST /api/moments/posts/[id]/report — aislamiento tenant', () => {
  it('usa orgId del contexto de sesión, nunca del body', async () => {
    const eqLog: Array<[string, unknown]> = []
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'employee' })
    mockClient.mockResolvedValue(makeClient({
      moments_posts:   { data: { id: POST_A, status: 'published' }, error: null },
      moments_reports: { data: { id: REPORT_A, reason: 'spam', status: 'pending', created_at: new Date().toISOString() }, error: null },
    }, eqLog))

    const req = makeRequest({ reason: 'spam', organization_id: ORG_B })
    const res = await reportPost(req, { params: { id: POST_A } })

    expect(res.status).toBe(201)
    const orgEqs = eqLog.filter(([col]) => col === 'organization_id')
    expect(orgEqs.every(([, val]) => val === ORG_A)).toBe(true)
    expect(orgEqs.some(([, val]) => val === ORG_B)).toBe(false)
  })

  it('devuelve 404 si el post pertenece a otra org', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'employee' })
    mockClient.mockResolvedValue(makeClient({
      moments_posts: { data: null, error: null },   // no encontrado en ORG_A
    }))

    const req = makeRequest({ reason: 'spam' }, POST_A)
    const res = await reportPost(req, { params: { id: POST_A } })

    expect(res.status).toBe(404)
  })

  it('devuelve 404 si el post no está publicado', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'employee' })
    mockClient.mockResolvedValue(makeClient({
      moments_posts: { data: { id: POST_A, status: 'removed' }, error: null },
    }))

    const req = makeRequest({ reason: 'inappropriate' })
    const res = await reportPost(req, { params: { id: POST_A } })

    expect(res.status).toBe(404)
  })

  it('devuelve 409 si el usuario ya reportó este post', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'employee' })
    mockClient.mockResolvedValue(makeClient({
      moments_posts:   { data: { id: POST_A, status: 'published' }, error: null },
      moments_reports: { data: null, error: { code: '23505', message: 'unique violation' } },
    }))

    const req = makeRequest({ reason: 'spam' })
    const res = await reportPost(req, { params: { id: POST_A } })

    expect(res.status).toBe(409)
  })

  it('devuelve 422 si reason es texto libre en lugar de enum', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'employee' })
    mockClient.mockResolvedValue(makeClient({ moments_posts: { data: { id: POST_A, status: 'published' }, error: null } }))

    const req = makeRequest({ reason: 'Contenido ofensivo' })
    const res = await reportPost(req, { params: { id: POST_A } })

    expect(res.status).toBe(422)
  })
})

// ══════════════════════════════════════════════════════════════════════
// 3. POST /api/moments/reports/[id]/resolve
// ══════════════════════════════════════════════════════════════════════

import { POST as resolveReport } from '../../../app/api/moments/reports/[id]/resolve/route'

function makeResolveRequest(body: unknown, reportId = REPORT_A): NextRequest {
  return new NextRequest(`http://localhost/api/moments/reports/${reportId}/resolve`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

describe('POST /api/moments/reports/[id]/resolve — permisos por rol', () => {
  const pendingReport = { id: REPORT_A, status: 'pending', target_type: 'post', target_id: POST_A }
  const post          = { community_id: COMM_A }
  const resolvedData  = { id: REPORT_A, status: 'dismissed', reviewed_at: new Date().toISOString() }

  it('owner puede resolver cualquier reporte', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'owner' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_reports:           { select: { data: pendingReport, error: null }, mutate: { data: resolvedData, error: null } },
      moments_posts:             { select: { data: post, error: null } },
      moments_community_members: { select: { data: null, error: null } },
    }))

    const req = makeResolveRequest({ resolution: 'dismiss' })
    const res = await resolveReport(req, { params: { id: REPORT_A } })

    expect(res.status).toBe(200)
  })

  it('employee recibe 403', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'employee' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_reports:           { select: { data: pendingReport, error: null } },
      moments_posts:             { select: { data: post, error: null } },
      moments_community_members: { select: { data: null, error: null } },
    }))

    const req = makeResolveRequest({ resolution: 'dismiss' })
    const res = await resolveReport(req, { params: { id: REPORT_A } })

    expect(res.status).toBe(403)
  })

  it('hr_specialist puede resolver si es community admin', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'hr_specialist' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_reports:           { select: { data: pendingReport, error: null }, mutate: { data: { id: REPORT_A, status: 'actioned', reviewed_at: new Date().toISOString() }, error: null } },
      moments_posts:             { select: { data: post, error: null } },
      moments_community_members: { select: { data: { role: 'admin' }, error: null } },
    }))

    const req = makeResolveRequest({ resolution: 'action', notes: 'Post eliminado' })
    const res = await resolveReport(req, { params: { id: REPORT_A } })

    expect(res.status).toBe(200)
  })

  it('hr_specialist sin community admin recibe 403', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'hr_specialist' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_reports:           { select: { data: pendingReport, error: null } },
      moments_posts:             { select: { data: post, error: null } },
      moments_community_members: { select: { data: null, error: null } },
    }))

    const req = makeResolveRequest({ resolution: 'dismiss' })
    const res = await resolveReport(req, { params: { id: REPORT_A } })

    expect(res.status).toBe(403)
  })

  it('devuelve 409 si el reporte ya fue resuelto', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'admin' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_reports:           { select: { data: { ...pendingReport, status: 'dismissed' }, error: null } },
      moments_posts:             { select: { data: post, error: null } },
      moments_community_members: { select: { data: null, error: null } },
    }))

    const req = makeResolveRequest({ resolution: 'dismiss' })
    const res = await resolveReport(req, { params: { id: REPORT_A } })

    expect(res.status).toBe(409)
  })

  it('devuelve 404 si el reporte no existe en la org', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'admin' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_reports: { select: { data: null, error: null } },
    }))

    const req = makeResolveRequest({ resolution: 'dismiss' })
    const res = await resolveReport(req, { params: { id: REPORT_A } })

    expect(res.status).toBe(404)
  })
})

// ══════════════════════════════════════════════════════════════════════
// 4. POST /api/moments/posts/[id]/feature
// ══════════════════════════════════════════════════════════════════════

import { POST as featurePost } from '../../../app/api/moments/posts/[id]/feature/route'

function makeFeatureRequest(body: unknown, postId = POST_A): NextRequest {
  return new NextRequest(`http://localhost/api/moments/posts/${postId}/feature`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

describe('POST /api/moments/posts/[id]/feature — permisos y aislamiento', () => {
  const publishedPost = { id: POST_A, status: 'published', community_id: COMM_A }
  const pinnedPost    = { id: POST_A, is_pinned: true, updated_at: new Date().toISOString() }

  it('admin puede destacar un post', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'admin' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_posts:             { select: { data: publishedPost, error: null }, mutate: { data: pinnedPost, error: null } },
      moments_community_members: { select: { data: null, error: null } },
    }))

    const req = makeFeatureRequest({ featured: true })
    const res = await featurePost(req, { params: { id: POST_A } })

    expect(res.status).toBe(200)
  })

  it('employee recibe 403', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'employee' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_posts:             { select: { data: publishedPost, error: null } },
      moments_community_members: { select: { data: null, error: null } },
    }))

    const req = makeFeatureRequest({ featured: true })
    const res = await featurePost(req, { params: { id: POST_A } })

    expect(res.status).toBe(403)
  })

  it('hr_specialist con community admin puede destacar', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'hr_specialist' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_posts:             { select: { data: publishedPost, error: null }, mutate: { data: pinnedPost, error: null } },
      moments_community_members: { select: { data: { role: 'admin' }, error: null } },
    }))

    const req = makeFeatureRequest({ featured: true })
    const res = await featurePost(req, { params: { id: POST_A } })

    expect(res.status).toBe(200)
  })

  it('hr_specialist sin community admin recibe 403', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'hr_specialist' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_posts:             { select: { data: publishedPost, error: null } },
      moments_community_members: { select: { data: null, error: null } },
    }))

    const req = makeFeatureRequest({ featured: true })
    const res = await featurePost(req, { params: { id: POST_A } })

    expect(res.status).toBe(403)
  })

  it('devuelve 404 si el post es de otra org', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'admin' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_posts:             { select: { data: null, error: null } },
      moments_community_members: { select: { data: null, error: null } },
    }))

    const req = makeFeatureRequest({ featured: false })
    const res = await featurePost(req, { params: { id: POST_A } })

    expect(res.status).toBe(404)
  })

  it('devuelve 422 si featured no es booleano', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'admin' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_posts:             { select: { data: publishedPost, error: null } },
      moments_community_members: { select: { data: null, error: null } },
    }))

    const req = makeFeatureRequest({ featured: 'yes' })
    const res = await featurePost(req, { params: { id: POST_A } })

    expect(res.status).toBe(422)
  })
})

// ══════════════════════════════════════════════════════════════════════
// 5. POST /api/moments/posts/[id]/hide
// ══════════════════════════════════════════════════════════════════════

import { POST as hidePost } from '../../../app/api/moments/posts/[id]/hide/route'

function makeHideRequest(body: unknown, postId = POST_A): NextRequest {
  return new NextRequest(`http://localhost/api/moments/posts/${postId}/hide`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

describe('POST /api/moments/posts/[id]/hide — soft-delete y restauración', () => {
  const publishedPost = { id: POST_A, status: 'published', community_id: COMM_A }
  const removedPost   = { id: POST_A, status: 'removed',   community_id: COMM_A }

  it('admin puede ocultar un post (hidden=true → status=removed)', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'admin' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_posts:             { select: { data: publishedPost, error: null }, mutate: { data: { id: POST_A, status: 'removed', updated_at: new Date().toISOString() }, error: null } },
      moments_community_members: { select: { data: null, error: null } },
    }))

    const req = makeHideRequest({ hidden: true })
    const res = await hidePost(req, { params: { id: POST_A } })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('removed')
  })

  it('admin puede restaurar un post oculto (hidden=false → status=published)', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'admin' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_posts:             { select: { data: removedPost, error: null }, mutate: { data: { id: POST_A, status: 'published', updated_at: new Date().toISOString() }, error: null } },
      moments_community_members: { select: { data: null, error: null } },
    }))

    const req = makeHideRequest({ hidden: false })
    const res = await hidePost(req, { params: { id: POST_A } })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('published')
  })

  it('employee recibe 403', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'employee' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_posts:             { select: { data: publishedPost, error: null } },
      moments_community_members: { select: { data: null, error: null } },
    }))

    const req = makeHideRequest({ hidden: true })
    const res = await hidePost(req, { params: { id: POST_A } })

    expect(res.status).toBe(403)
  })

  it('hr_specialist sin community admin recibe 403', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'hr_specialist' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_posts:             { select: { data: publishedPost, error: null } },
      moments_community_members: { select: { data: null, error: null } },
    }))

    const req = makeHideRequest({ hidden: true })
    const res = await hidePost(req, { params: { id: POST_A } })

    expect(res.status).toBe(403)
  })

  it('devuelve 404 si el post no existe en la org', async () => {
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'admin' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_posts:             { select: { data: null, error: null } },
      moments_community_members: { select: { data: null, error: null } },
    }))

    const req = makeHideRequest({ hidden: true })
    const res = await hidePost(req, { params: { id: POST_A } })

    expect(res.status).toBe(404)
  })

  it('usa organization_id del contexto, nunca del body', async () => {
    const eqLog: Array<[string, unknown]> = []
    mockGetCtx.mockResolvedValue({ orgId: ORG_A, userId: USER_A, role: 'admin' })
    mockClient.mockResolvedValue(makeClientOps({
      moments_posts:             { select: { data: publishedPost, error: null }, mutate: { data: { id: POST_A, status: 'removed', updated_at: new Date().toISOString() }, error: null } },
      moments_community_members: { select: { data: null, error: null } },
    }, eqLog))

    const req = makeHideRequest({ hidden: true, organization_id: ORG_B })
    await hidePost(req, { params: { id: POST_A } })

    const orgEqs = eqLog.filter(([col]) => col === 'organization_id')
    expect(orgEqs.length).toBeGreaterThan(0)
    expect(orgEqs.every(([, val]) => val === ORG_A)).toBe(true)
    expect(orgEqs.some(([, val]) => val === ORG_B)).toBe(false)
  })
})
