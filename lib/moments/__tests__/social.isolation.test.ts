/**
 * Pruebas de aislamiento y autorización para las rutas de interacción social.
 *
 * Cubre:
 * 1. Feed — filtro por org, validación de cursor, communityId de otra org → 404
 * 2. Posts — posting_policy, rate limit, sanitización XSS, cross-tenant
 * 3. Comentarios — post bloqueado, post de otra org → 404, rate limit
 * 4. Reacciones POST — cross-tenant, UPSERT logic
 * 5. Reacciones DELETE — reacción no existente → 404, cross-tenant
 * 6. Sanitización XSS — payloads maliciosos
 * 7. Cursor — encode/decode, cursos inválidos
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { _resetStore } from '../rateLimit'
import { sanitizeText, sanitizeTitle } from '../sanitize'

// ── Fixtures ──────────────────────────────────────────────────────────
const ORG_A  = 'aaaaaaaa-0000-0000-0000-000000000000'
const ORG_B  = 'bbbbbbbb-0000-0000-0000-000000000000'
const USER_A = 'aaaaaaaa-1111-0000-0000-000000000000'
const POST_A = 'aaaaaaaa-3333-0000-0000-000000000000'
const POST_B = 'bbbbbbbb-3333-0000-0000-000000000000'
const COMM_A = 'aaaaaaaa-2222-0000-0000-000000000000'
const COMM_B = 'bbbbbbbb-2222-0000-0000-000000000000'

// ── Mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/auth/requestContext', () => ({ getRequestContext: vi.fn() }))
vi.mock('@/lib/supabase/server',     () => ({ createClient: vi.fn() }))

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

// ══════════════════════════════════════════════════════════════════════
// sanitize.ts — XSS prevention (no DB needed)
// ══════════════════════════════════════════════════════════════════════

describe('sanitizeText — XSS prevention', () => {
  it('elimina tags script', () => {
    expect(sanitizeText('<script>alert(1)</script>hola')).toBe('hola')
  })

  it('elimina tags HTML genéricos', () => {
    expect(sanitizeText('<b>negrita</b>')).toBe('negrita')
  })

  it('elimina protocolos peligrosos', () => {
    expect(sanitizeText('javascript:alert(1)')).not.toContain('javascript:')
    expect(sanitizeText('vbscript:foo')).not.toContain('vbscript:')
  })

  it('elimina event handlers inline', () => {
    expect(sanitizeText('texto onclick=steal()')).not.toContain('onclick=')
    expect(sanitizeText('texto onerror=bad')).not.toContain('onerror=')
  })

  it('preserva texto normal y saltos de línea', () => {
    const text = 'Hola mundo\nCómo estás\nBien gracias'
    expect(sanitizeText(text)).toBe(text)
  })

  it('colapsa saltos excesivos (máx 3 consecutivos)', () => {
    const input = 'a\n\n\n\n\n\nb'
    expect(sanitizeText(input)).toBe('a\n\n\nb')
  })

  it('elimina iframe y object', () => {
    expect(sanitizeText('<iframe src="evil"/>')).not.toContain('iframe')
    expect(sanitizeText('<object data="x"/>')).not.toContain('object')
  })
})

describe('sanitizeTitle', () => {
  it('colapsa saltos de línea en una sola línea', () => {
    expect(sanitizeTitle('Título\nCon\nSaltos')).toBe('Título Con Saltos')
  })

  it('trunca al máximo especificado', () => {
    expect(sanitizeTitle('x'.repeat(300), 200)).toHaveLength(200)
  })

  it('elimina HTML del título', () => {
    expect(sanitizeTitle('<b>Título</b>')).toBe('Título')
  })
})

// ══════════════════════════════════════════════════════════════════════
// rateLimit.ts — in-memory sliding window
// ══════════════════════════════════════════════════════════════════════

describe('checkRateLimit', () => {
  beforeEach(() => _resetStore())

  it('permite hasta el límite máximo de posts sin lanzar', async () => {
    const { checkRateLimit } = await import('../rateLimit')
    // Límite: 10 posts/hora — 10 llamadas no deben lanzar
    for (let i = 0; i < 10; i++) {
      expect(() => checkRateLimit(USER_A, 'post')).not.toThrow()
    }
  })

  it('lanza ConflictError al superar el límite', async () => {
    const { checkRateLimit } = await import('../rateLimit')
    const { ConflictError } = await import('../errors')

    for (let i = 0; i < 10; i++) checkRateLimit(USER_A, 'post')

    expect(() => checkRateLimit(USER_A, 'post')).toThrow(ConflictError)
  })

  it('usuarios distintos tienen límites independientes', async () => {
    const { checkRateLimit } = await import('../rateLimit')
    const userB = 'bbbbbbbb-1111-0000-0000-000000000000'

    for (let i = 0; i < 10; i++) checkRateLimit(USER_A, 'post')

    // User B no se ve afectado por los intentos de User A
    expect(() => checkRateLimit(userB, 'post')).not.toThrow()
  })

  it('rollback revierte el último intento', async () => {
    const { checkRateLimit, rollbackRateLimit } = await import('../rateLimit')
    const user = 'cccccccc-1111-0000-0000-000000000000'

    for (let i = 0; i < 10; i++) checkRateLimit(user, 'post')
    rollbackRateLimit(user, 'post')

    // Después del rollback, hay espacio para un intento más
    expect(() => checkRateLimit(user, 'post')).not.toThrow()
  })
})

// ══════════════════════════════════════════════════════════════════════
// GET /api/moments/feed — aislamiento y cursor
// ══════════════════════════════════════════════════════════════════════

describe('GET /api/moments/feed — aislamiento', () => {
  it('siempre filtra por orgId de sesión', async () => {
    const { GET } = await import('../../../app/api/moments/feed/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    const eqLog: Array<[string, unknown]> = []
    mockClient.mockResolvedValue(makeClient({ moments_posts: { data: [], error: null } }, eqLog))

    await GET(new NextRequest('http://localhost/api/moments/feed'))

    expect(eqLog).toContainEqual(['organization_id', ORG_A])
    expect(eqLog).not.toContainEqual(['organization_id', ORG_B])
  })

  it('communityId de otra org devuelve 404', async () => {
    const { GET } = await import('../../../app/api/moments/feed/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    // Community lookup devuelve null (no encontrada en org A)
    const eqLog: Array<[string, unknown]> = []
    mockClient.mockResolvedValue(makeClient({
      moments_communities: { data: null, error: null },
    }, eqLog))

    const url = `http://localhost/api/moments/feed?communityId=${COMM_B}`
    const res = await GET(new NextRequest(url))

    expect(res.status).toBe(404)
    // Verificar que se buscó la comunidad con el orgId de sesión
    expect(eqLog).toContainEqual(['organization_id', ORG_A])
  })

  it('devuelve 422 para communityId que no es UUID', async () => {
    const { GET } = await import('../../../app/api/moments/feed/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })
    mockClient.mockResolvedValue(makeClient({}))

    const res = await GET(new NextRequest('http://localhost/api/moments/feed?communityId=not-a-uuid'))
    expect(res.status).toBe(422)
  })

  it('devuelve 422 para cursor malformado', async () => {
    const { GET } = await import('../../../app/api/moments/feed/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })
    mockClient.mockResolvedValue(makeClient({}))

    const res = await GET(new NextRequest('http://localhost/api/moments/feed?cursor=not-valid-base64'))
    expect(res.status).toBe(422)
  })

  it('devuelve 422 para postType inválido', async () => {
    const { GET } = await import('../../../app/api/moments/feed/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })
    mockClient.mockResolvedValue(makeClient({}))

    const res = await GET(new NextRequest('http://localhost/api/moments/feed?postType=shout'))
    expect(res.status).toBe(422)
  })

  it('aplica limit máximo de 50 aunque el cliente pida más', async () => {
    const { GET } = await import('../../../app/api/moments/feed/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    let capturedLimit = 0
    const captureChain: Record<string, unknown> = {}
    const methods = ['select','eq','order','or']
    methods.forEach(m => { captureChain[m] = () => captureChain })
    captureChain.limit = (n: number) => { capturedLimit = n; return captureChain }
    captureChain.then  = (fn: (v: { data: []; error: null }) => unknown) =>
      Promise.resolve(fn({ data: [], error: null }))

    mockClient.mockResolvedValue({
      from: () => captureChain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    await GET(new NextRequest('http://localhost/api/moments/feed?limit=999'))
    // limit+1 (para detectar hasMore) pero con max 50 → máximo 51
    expect(capturedLimit).toBeLessThanOrEqual(51)
  })
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/moments/posts — aislamiento y posting_policy
// ══════════════════════════════════════════════════════════════════════

describe('POST /api/moments/posts — autorización', () => {
  beforeEach(() => _resetStore())

  const validBody = {
    community_id: COMM_A,
    post_type:    'discussion',
    body:         'Hola equipo',
  }

  function makePostRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/moments/posts', {
      method: 'POST',
      body:   JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    })
  }

  it('bloquea post de empleado en comunidad admins_only', async () => {
    const { POST } = await import('../../../app/api/moments/posts/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    mockClient.mockResolvedValue(makeClient({
      moments_communities: {
        data: { id: COMM_A, posting_policy: 'admins_only', is_archived: false, is_private: false },
        error: null,
      },
    }))

    const res = await POST(makePostRequest(validBody))
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('FORBIDDEN')
  })

  it('permite post de admin en comunidad admins_only', async () => {
    const { POST } = await import('../../../app/api/moments/posts/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'admin' })

    const postData = { id: POST_A, post_type: 'discussion', body: 'Hola', created_at: '' }
    const insertedValues: Record<string, unknown>[] = []

    const communities = chain({
      data: { id: COMM_A, posting_policy: 'admins_only', is_archived: false },
      error: null,
    })
    const posts = chain({ data: postData, error: null })
    posts.insert = (v: unknown) => { insertedValues.push(v as Record<string, unknown>); return posts }

    mockClient.mockResolvedValue({
      from: (table: string) =>
        table === 'moments_communities' ? communities : posts,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await POST(makePostRequest(validBody))
    expect(res.status).toBe(201)
    expect(insertedValues[0]).toMatchObject({ organization_id: ORG_A })
  })

  it('devuelve 404 si la comunidad pertenece a otra org', async () => {
    const { POST } = await import('../../../app/api/moments/posts/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'admin' })

    // Community lookup devuelve null (no está en org A)
    mockClient.mockResolvedValue(makeClient({
      moments_communities: { data: null, error: null },
    }))

    const res = await POST(makePostRequest({ ...validBody, community_id: COMM_B }))
    expect(res.status).toBe(404)
  })

  it('organization_id inyectado en el body es ignorado', async () => {
    const { POST } = await import('../../../app/api/moments/posts/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'admin' })

    const insertedValues: Record<string, unknown>[] = []
    const postData = { id: POST_A, post_type: 'discussion', body: 'ok', created_at: '' }

    const communities = chain({
      data: { id: COMM_A, posting_policy: 'all_members', is_archived: false },
      error: null,
    })
    const posts = chain({ data: postData, error: null })
    posts.insert = (v: unknown) => { insertedValues.push(v as Record<string, unknown>); return posts }

    mockClient.mockResolvedValue({
      from: (t: string) => t === 'moments_communities' ? communities : posts,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    await POST(makePostRequest({ ...validBody, organization_id: ORG_B }))

    expect(insertedValues[0]?.organization_id).toBe(ORG_A)
    expect(insertedValues[0]?.organization_id).not.toBe(ORG_B)
  })

  it('sanitiza XSS del body antes de insertar', async () => {
    const { POST } = await import('../../../app/api/moments/posts/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'admin' })

    const insertedValues: Record<string, unknown>[] = []
    const postData = { id: POST_A, post_type: 'discussion', body: 'ok', created_at: '' }

    const communities = chain({
      data: { id: COMM_A, posting_policy: 'all_members', is_archived: false },
      error: null,
    })
    const posts = chain({ data: postData, error: null })
    posts.insert = (v: unknown) => { insertedValues.push(v as Record<string, unknown>); return posts }

    mockClient.mockResolvedValue({
      from: (t: string) => t === 'moments_communities' ? communities : posts,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const xssBody = { ...validBody, body: '<script>alert("xss")</script>contenido legítimo' }
    await POST(makePostRequest(xssBody))

    const stored = insertedValues[0]?.body as string
    expect(stored).not.toContain('<script>')
    expect(stored).toContain('contenido legítimo')
  })

  it('devuelve 409 al superar rate limit de posts', async () => {
    const { POST } = await import('../../../app/api/moments/posts/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'admin' })

    const communities = chain({
      data: { id: COMM_A, posting_policy: 'all_members', is_archived: false },
      error: null,
    })
    const postData = { id: POST_A, post_type: 'discussion', body: 'ok', created_at: '' }
    const posts = chain({ data: postData, error: null })
    posts.insert = () => posts

    mockClient.mockResolvedValue({
      from: (t: string) => t === 'moments_communities' ? communities : posts,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    // Agotar el rate limit (10 posts)
    for (let i = 0; i < 10; i++) {
      await POST(makePostRequest(validBody))
    }

    const res = await POST(makePostRequest(validBody))
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('RATE_LIMIT_EXCEEDED')
  })
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/moments/posts/[id]/comments
// ══════════════════════════════════════════════════════════════════════

describe('POST /posts/[id]/comments — aislamiento y restricciones', () => {
  beforeEach(() => _resetStore())

  function commentReq(postId: string, body: unknown): NextRequest {
    return new NextRequest(
      `http://localhost/api/moments/posts/${postId}/comments`,
      { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } },
    )
  }

  it('devuelve 404 si el post pertenece a otra org', async () => {
    const { POST } = await import('../../../app/api/moments/posts/[id]/comments/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    const eqLog: Array<[string, unknown]> = []
    mockClient.mockResolvedValue(makeClient({
      moments_posts: { data: null, error: null },
    }, eqLog))

    const res = await POST(
      commentReq(POST_B, { post_id: POST_B, body: 'Hola' }),
      { params: { id: POST_B } },
    )

    expect(res.status).toBe(404)
    expect(eqLog).toContainEqual(['organization_id', ORG_A])
  })

  it('devuelve 409 si el post está bloqueado', async () => {
    const { POST } = await import('../../../app/api/moments/posts/[id]/comments/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    mockClient.mockResolvedValue(makeClient({
      moments_posts: { data: { id: POST_A, is_locked: true, status: 'published' }, error: null },
    }))

    const res = await POST(
      commentReq(POST_A, { post_id: POST_A, body: 'Hola' }),
      { params: { id: POST_A } },
    )

    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('POST_LOCKED')
  })

  it('devuelve 422 si post_id del body no coincide con URL', async () => {
    const { POST } = await import('../../../app/api/moments/posts/[id]/comments/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })
    mockClient.mockResolvedValue(makeClient({}))

    const res = await POST(
      commentReq(POST_A, { post_id: POST_B, body: 'Hola' }),  // post_id diferente a URL
      { params: { id: POST_A } },
    )

    expect(res.status).toBe(422)
  })

  it('sanitiza XSS del comentario antes de insertar', async () => {
    const { POST } = await import('../../../app/api/moments/posts/[id]/comments/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    const insertedValues: Record<string, unknown>[] = []
    const commentData = { id: 'ccc', post_id: POST_A, body: 'ok', created_at: '' }

    let callCount = 0
    const c = chain({ data: null, error: null })
    c.maybeSingle = async () => {
      callCount++
      if (callCount === 1) return { data: { id: POST_A, is_locked: false, status: 'published' }, error: null }
      return { data: null, error: null } // no parent
    }
    const comments = chain({ data: commentData, error: null })
    comments.insert = (v: unknown) => { insertedValues.push(v as Record<string, unknown>); return comments }

    mockClient.mockResolvedValue({
      from: (t: string) =>
        t === 'moments_posts' ? c :
        t === 'moments_comments' ? comments : chain({ data: null, error: null }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const xssPayload = { post_id: POST_A, body: '<img onerror="steal()" src=x>texto legítimo' }
    await POST(commentReq(POST_A, xssPayload), { params: { id: POST_A } })

    const stored = insertedValues[0]?.body as string
    expect(stored).not.toContain('onerror=')
    expect(stored).toContain('texto legítimo')
  })
})

// ══════════════════════════════════════════════════════════════════════
// POST + DELETE /api/moments/posts/[id]/reactions
// ══════════════════════════════════════════════════════════════════════

describe('POST /posts/[id]/reactions — aislamiento', () => {
  beforeEach(() => _resetStore())

  function reactionReq(postId: string, body: unknown): NextRequest {
    return new NextRequest(
      `http://localhost/api/moments/posts/${postId}/reactions`,
      { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } },
    )
  }

  it('devuelve 404 si el post pertenece a otra org', async () => {
    const { POST } = await import('../../../app/api/moments/posts/[id]/reactions/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    const eqLog: Array<[string, unknown]> = []
    mockClient.mockResolvedValue(makeClient({
      moments_posts: { data: null, error: null },
    }, eqLog))

    const res = await POST(
      reactionReq(POST_B, { reaction_type: 'like' }),
      { params: { id: POST_B } },
    )

    expect(res.status).toBe(404)
    expect(eqLog).toContainEqual(['organization_id', ORG_A])
  })

  it('fuerza target_type = post (no acepta del cliente)', async () => {
    const { POST } = await import('../../../app/api/moments/posts/[id]/reactions/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    const upsertedValues: Record<string, unknown>[] = []
    const postChain = chain({ data: { id: POST_A, status: 'published' }, error: null })
    const reactionData = { id: 'rrr', reaction_type: 'like', created_at: '' }
    const reactionChain = chain({ data: reactionData, error: null })
    reactionChain.upsert = (v: unknown) => { upsertedValues.push(v as Record<string, unknown>); return reactionChain }

    mockClient.mockResolvedValue({
      from: (t: string) =>
        t === 'moments_posts' ? postChain : reactionChain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    await POST(
      reactionReq(POST_A, { reaction_type: 'like', target_type: 'comment' }),  // intento de override
      { params: { id: POST_A } },
    )

    // target_type siempre 'post', nunca 'comment' (viene de la URL)
    expect(upsertedValues[0]?.target_type).toBe('post')
    expect(upsertedValues[0]?.target_id).toBe(POST_A)
  })
})

describe('DELETE /posts/[id]/reactions — aislamiento', () => {
  it('devuelve 404 si el post pertenece a otra org', async () => {
    const { DELETE } = await import('../../../app/api/moments/posts/[id]/reactions/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    const eqLog: Array<[string, unknown]> = []
    mockClient.mockResolvedValue(makeClient({
      moments_posts: { data: null, error: null },
    }, eqLog))

    const res = await DELETE(
      new NextRequest(`http://localhost/api/moments/posts/${POST_B}/reactions`, { method: 'DELETE' }),
      { params: { id: POST_B } },
    )

    expect(res.status).toBe(404)
    expect(eqLog).toContainEqual(['organization_id', ORG_A])
  })

  it('devuelve 404 si el usuario no tiene reacción en el post', async () => {
    const { DELETE } = await import('../../../app/api/moments/posts/[id]/reactions/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    let callCount = 0
    const c = chain({ data: null, error: null })
    c.maybeSingle = async () => {
      callCount++
      if (callCount === 1) return { data: { id: POST_A, status: 'published' }, error: null }
      return { data: null, error: null }  // reacción no encontrada
    }

    mockClient.mockResolvedValue({
      from: () => c,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await DELETE(
      new NextRequest(`http://localhost/api/moments/posts/${POST_A}/reactions`, { method: 'DELETE' }),
      { params: { id: POST_A } },
    )

    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('NOT_FOUND')
  })
})

// ══════════════════════════════════════════════════════════════════════
// Cursor encode/decode — propiedades
// ══════════════════════════════════════════════════════════════════════

describe('Cursor pagination utilities', () => {
  it('cursor válido es aceptado por el feed', async () => {
    const { GET } = await import('../../../app/api/moments/feed/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    // Simular un cursor válido: base64url({ ts: ISO, id: UUID })
    const ts = new Date().toISOString()
    const id = POST_A
    const cursor = Buffer.from(JSON.stringify({ ts, id })).toString('base64url')

    const eqLog: Array<[string, unknown]> = []
    const feedChain: Record<string, unknown> = {}
    const methods = ['select','eq','order','limit','or']
    methods.forEach(m => { feedChain[m] = (...args: unknown[]) => { if (m === 'eq' && eqLog) eqLog.push(args as [string, unknown]); return feedChain } })
    feedChain.then = (fn: (v: { data: []; error: null }) => unknown) =>
      Promise.resolve(fn({ data: [], error: null }))

    mockClient.mockResolvedValue({
      from: () => feedChain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET(new NextRequest(`http://localhost/api/moments/feed?cursor=${cursor}`))

    // No debe dar error por cursor malformado
    expect(res.status).not.toBe(422)
  })

  it('hasMore = false cuando se devuelven ≤ limit ítems', async () => {
    const { GET } = await import('../../../app/api/moments/feed/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    const twoItems = [
      { id: 'a1', community_id: COMM_A, post_type: 'discussion', title: null, body: 'x', is_pinned: false, is_locked: false, created_at: '2024-01-02T00:00:00Z', updated_at: '2024-01-02T00:00:00Z', author_id: USER_A },
      { id: 'a2', community_id: COMM_A, post_type: 'discussion', title: null, body: 'y', is_pinned: false, is_locked: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', author_id: USER_A },
    ]

    const feedChain: Record<string, unknown> = {}
    const methods = ['select','eq','order','limit','or']
    methods.forEach(m => { feedChain[m] = () => feedChain })
    feedChain.then = (fn: (v: { data: typeof twoItems; error: null }) => unknown) =>
      Promise.resolve(fn({ data: twoItems, error: null }))

    mockClient.mockResolvedValue({
      from: () => feedChain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET(new NextRequest('http://localhost/api/moments/feed?limit=20'))
    const json = await res.json()

    expect(json.hasMore).toBe(false)
    expect(json.nextCursor).toBeNull()
    expect(json.data).toHaveLength(2)
  })

  it('hasMore = true y nextCursor presente cuando hay más ítems', async () => {
    const { GET } = await import('../../../app/api/moments/feed/route')
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    // Con limit=2, devolver 3 ítems (limit+1) indica hasMore
    const threeItems = Array.from({ length: 3 }, (_, i) => ({
      id: `id-${i}`,
      community_id: COMM_A,
      post_type: 'discussion',
      title: null,
      body: `body ${i}`,
      is_pinned: false,
      is_locked: false,
      created_at: `2024-01-0${3 - i}T00:00:00Z`,
      updated_at: `2024-01-0${3 - i}T00:00:00Z`,
      author_id: USER_A,
    }))

    const feedChain: Record<string, unknown> = {}
    const methods = ['select','eq','order','or']
    methods.forEach(m => { feedChain[m] = () => feedChain })
    feedChain.limit = () => feedChain
    feedChain.then  = (fn: (v: { data: typeof threeItems; error: null }) => unknown) =>
      Promise.resolve(fn({ data: threeItems, error: null }))

    mockClient.mockResolvedValue({
      from: () => feedChain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET(new NextRequest('http://localhost/api/moments/feed?limit=2'))
    const json = await res.json()

    expect(json.hasMore).toBe(true)
    expect(json.nextCursor).toBeTruthy()
    expect(json.data).toHaveLength(2)  // solo limit ítems, no limit+1
  })
})
