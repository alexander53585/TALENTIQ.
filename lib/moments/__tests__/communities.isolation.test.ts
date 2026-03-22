/**
 * Pruebas de aislamiento multiempresa para las rutas de comunidades.
 *
 * Estrategia: mockear getRequestContext y el cliente Supabase para
 * capturar los filtros que las rutas aplican a las queries, sin una BD real.
 *
 * Verificaciones clave:
 * 1. Todas las queries incluyen organization_id del contexto de sesión
 * 2. La ruta usa 404 cuando una comunidad de otra org es solicitada
 * 3. POST requiere rol admin → 403 si no lo es
 * 4. Join en comunidad privada bloqueado para non-admins
 * 5. organization_id inyectado en el body NUNCA se usa
 */
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ── UUIDs de fixture ──────────────────────────────────────────────────
const ORG_A  = 'aaaaaaaa-0000-0000-0000-000000000000'
const ORG_B  = 'bbbbbbbb-0000-0000-0000-000000000000'
const USER_A = 'aaaaaaaa-1111-0000-0000-000000000000'
const COMM_A = 'aaaaaaaa-2222-0000-0000-000000000000'
const COMM_B = 'bbbbbbbb-2222-0000-0000-000000000000'

// ── Mocks globales ────────────────────────────────────────────────────

vi.mock('@/lib/auth/requestContext', () => ({
  getRequestContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { getRequestContext } from '@/lib/auth/requestContext'
import { createClient }      from '@/lib/supabase/server'

const mockGetCtx       = vi.mocked(getRequestContext)
const mockCreateClient = vi.mocked(createClient)

// ── Helpers ───────────────────────────────────────────────────────────

function makeReq(method = 'GET', body?: unknown): NextRequest {
  const init: RequestInit = { method }
  if (body) {
    init.body    = JSON.stringify(body)
    init.headers = { 'content-type': 'application/json' }
  }
  return new NextRequest('http://localhost/api/moments/communities', init as RequestInit & { signal?: AbortSignal })
}

type SupabaseChain = Record<string, (...args: unknown[]) => unknown>

/**
 * Crea un chain de Supabase que registra todos los .eq() calls
 * y resuelve .maybeSingle() / .single() con `result`.
 */
function makeChain(
  result: { data: unknown; error: null | { code: string } },
  eqLog?: Array<[string, unknown]>,
): SupabaseChain {
  const chain: SupabaseChain = {}
  const methods = ['select', 'eq', 'order', 'insert', 'delete', 'update', 'limit']
  methods.forEach(m => {
    chain[m] = (...args: unknown[]) => {
      if (m === 'eq' && eqLog) eqLog.push(args as [string, unknown])
      return chain
    }
  })
  chain.maybeSingle = async () => result
  chain.single      = async () => result
  // For awaiting the chain directly (insert without .single())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(chain as any).then = (fn: (v: unknown) => unknown) => Promise.resolve(fn(result))
  return chain
}

// ══════════════════════════════════════════════════════════════════════
// GET /api/moments/communities
// ══════════════════════════════════════════════════════════════════════

describe('GET /api/moments/communities — aislamiento', () => {
  it('filtra siempre por el orgId de la sesión, nunca del cliente', async () => {
    const { GET } = await import('../../../app/api/moments/communities/route')

    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'admin' })

    const eqLog: Array<[string, unknown]> = []
    const chain = makeChain({ data: [], error: null }, eqLog)

    mockCreateClient.mockResolvedValue({
      from: () => chain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    await GET(makeReq())

    expect(eqLog).toContainEqual(['organization_id', ORG_A])
    expect(eqLog).not.toContainEqual(['organization_id', ORG_B])
  })
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/moments/communities — autorización por rol
// ══════════════════════════════════════════════════════════════════════

describe('POST /api/moments/communities — control de acceso', () => {
  const validBody = { name: 'Mi Comunidad', posting_policy: 'all_members', is_private: false }

  const NON_ADMIN_ROLES = ['manager', 'employee'] as const
  NON_ADMIN_ROLES.forEach(role => {
    it(`devuelve 403 para rol "${role}"`, async () => {
      const { POST } = await import('../../../app/api/moments/communities/route')

      mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role })
      mockCreateClient.mockResolvedValue({} as unknown as Awaited<ReturnType<typeof createClient>>)

      const res = await POST(makeReq('POST', validBody))

      expect(res.status).toBe(403)
      expect((await res.json()).code).toBe('FORBIDDEN')
    })
  })

  const ADMIN_ROLES = ['owner', 'admin', 'hr_specialist'] as const
  ADMIN_ROLES.forEach(role => {
    it(`permite crear comunidad para rol "${role}"`, async () => {
      const { POST } = await import('../../../app/api/moments/communities/route')

      mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role })

      const insertedValues: Record<string, unknown>[] = []
      const communityData = { id: COMM_A, name: 'Mi Comunidad', created_at: '' }

      const chain = makeChain({ data: communityData, error: null })
      const originalInsert = chain.insert
      chain.insert = (vals: unknown) => {
        insertedValues.push(vals as Record<string, unknown>)
        return chain
      }

      mockCreateClient.mockResolvedValue({
        from: () => chain,
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      const res = await POST(makeReq('POST', validBody))

      expect(res.status).toBe(201)
      // organization_id proviene del contexto de sesión, nunca del body
      expect(insertedValues[0]).toMatchObject({ organization_id: ORG_A })
      expect(insertedValues[0]?.organization_id).not.toBe(ORG_B)
    })
  })

  it('ignora organization_id inyectado en el body', async () => {
    const { POST } = await import('../../../app/api/moments/communities/route')

    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'admin' })

    const insertedValues: Record<string, unknown>[] = []
    const communityData = { id: COMM_A, name: 'X', created_at: '' }
    const chain = makeChain({ data: communityData, error: null })
    chain.insert = (vals: unknown) => {
      insertedValues.push(vals as Record<string, unknown>)
      return chain
    }
    mockCreateClient.mockResolvedValue({
      from: () => chain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    // Cliente intenta inyectar organization_id de org B
    await POST(makeReq('POST', { ...validBody, organization_id: ORG_B }))

    expect(insertedValues[0]?.organization_id).toBe(ORG_A)
    expect(insertedValues[0]?.organization_id).not.toBe(ORG_B)
  })
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/moments/communities/[id]/join
// ══════════════════════════════════════════════════════════════════════

describe('POST /communities/[id]/join — aislamiento multiempresa', () => {
  function joinReq(commId: string): NextRequest {
    return new NextRequest(
      `http://localhost/api/moments/communities/${commId}/join`,
      { method: 'POST' },
    )
  }

  it('devuelve 404 cuando la comunidad pertenece a otra org', async () => {
    const { POST } = await import('../../../app/api/moments/communities/[id]/join/route')

    // User A (org A) intenta unirse a comunidad de org B
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'admin' })

    const eqLog: Array<[string, unknown]> = []
    // maybeSingle retorna null → comunidad de org B no está en org A
    const chain = makeChain({ data: null, error: null }, eqLog)

    mockCreateClient.mockResolvedValue({
      from: () => chain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await POST(joinReq(COMM_B), { params: { id: COMM_B } })

    expect(res.status).toBe(404)
    // La query usó el orgId de sesión (ORG_A), no el de la comunidad B
    expect(eqLog).toContainEqual(['organization_id', ORG_A])
  })

  it('bloquea join en comunidad privada para non-admin', async () => {
    const { POST } = await import('../../../app/api/moments/communities/[id]/join/route')

    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    // Comunidad existe, es privada
    const chain = makeChain({
      data: { id: COMM_A, name: 'Privada', is_private: true, is_archived: false },
      error: null,
    })
    mockCreateClient.mockResolvedValue({
      from: () => chain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await POST(joinReq(COMM_A), { params: { id: COMM_A } })

    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('FORBIDDEN')
  })

  it('permite join en comunidad privada para admin', async () => {
    const { POST } = await import('../../../app/api/moments/communities/[id]/join/route')

    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'admin' })

    let callCount = 0
    const chain = makeChain({ data: null, error: null })
    chain.maybeSingle = async () => {
      callCount++
      if (callCount === 1)
        return { data: { id: COMM_A, name: 'Privada', is_private: true, is_archived: false }, error: null }
      return { data: null, error: null } // no es miembro aún
    }
    chain.insert = () => chain   // insert no lanza error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(chain as any).then = (fn: (v: unknown) => unknown) => Promise.resolve(fn({ error: null }))

    mockCreateClient.mockResolvedValue({
      from: () => chain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await POST(joinReq(COMM_A), { params: { id: COMM_A } })

    // Admin puede unirse a comunidad privada — NO debe ser 403
    expect(res.status).not.toBe(403)
  })

  it('devuelve 409 si el usuario ya es miembro', async () => {
    const { POST } = await import('../../../app/api/moments/communities/[id]/join/route')

    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    let callCount = 0
    const chain = makeChain({ data: null, error: null })
    chain.maybeSingle = async () => {
      callCount++
      if (callCount === 1) return { data: { id: COMM_A, name: 'Pública', is_private: false, is_archived: false }, error: null }
      return { data: { id: 'existing-membership' }, error: null } // ya es miembro
    }

    mockCreateClient.mockResolvedValue({
      from: () => chain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await POST(joinReq(COMM_A), { params: { id: COMM_A } })

    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('ALREADY_MEMBER')
  })
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/moments/communities/[id]/leave
// ══════════════════════════════════════════════════════════════════════

describe('POST /communities/[id]/leave — aislamiento multiempresa', () => {
  function leaveReq(commId: string): NextRequest {
    return new NextRequest(
      `http://localhost/api/moments/communities/${commId}/leave`,
      { method: 'POST' },
    )
  }

  it('devuelve 404 cuando la comunidad pertenece a otra org', async () => {
    const { POST } = await import('../../../app/api/moments/communities/[id]/leave/route')

    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    const eqLog: Array<[string, unknown]> = []
    const chain = makeChain({ data: null, error: null }, eqLog)

    mockCreateClient.mockResolvedValue({
      from: () => chain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await POST(leaveReq(COMM_B), { params: { id: COMM_B } })

    expect(res.status).toBe(404)
    // La query usó el orgId de sesión (ORG_A)
    expect(eqLog).toContainEqual(['organization_id', ORG_A])
  })

  it('devuelve 404 si el usuario no es miembro de la comunidad', async () => {
    const { POST } = await import('../../../app/api/moments/communities/[id]/leave/route')

    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })

    let callCount = 0
    const chain = makeChain({ data: null, error: null })
    chain.maybeSingle = async () => {
      callCount++
      if (callCount === 1) return { data: { id: COMM_A, name: 'X' }, error: null }
      return { data: null, error: null } // no es miembro
    }

    mockCreateClient.mockResolvedValue({
      from: () => chain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await POST(leaveReq(COMM_A), { params: { id: COMM_A } })

    expect(res.status).toBe(404)
  })
})

// ══════════════════════════════════════════════════════════════════════
// toErrorResponse — errores tipados mapean correctamente a HTTP
// ══════════════════════════════════════════════════════════════════════

describe('toErrorResponse — mapping HTTP', () => {
  it.each([
    ['NotAuthenticatedError', 401, 'NOT_AUTHENTICATED'],
    ['ForbiddenError',        403, 'FORBIDDEN'],
    ['NotFoundError',         404, 'NOT_FOUND'],
    ['ValidationError',       422, 'VALIDATION_ERROR'],
    ['ConflictError',         409, 'CONFLICT'],
  ])('%s → %i', async (name, status, code) => {
    const {
      toErrorResponse,
      NotAuthenticatedError,
      ForbiddenError,
      NotFoundError,
      ValidationError,
      ConflictError,
    } = await import('../errors')

    const errorMap: Record<string, Error> = {
      NotAuthenticatedError: new NotAuthenticatedError(),
      ForbiddenError:        new ForbiddenError(),
      NotFoundError:         new NotFoundError(),
      ValidationError:       new ValidationError('bad input'),
      ConflictError:         new ConflictError('conflict'),
    }

    const res = toErrorResponse(errorMap[name])
    expect(res.status).toBe(status)
    expect((await res.json()).code).toBe(code)
  })

  it('errores inesperados → 500 genérico (nunca expone detalles internos)', async () => {
    const { toErrorResponse } = await import('../errors')
    const res = toErrorResponse(new Error('DB connection lost'))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.code).toBe('INTERNAL_ERROR')
    expect(json.error).not.toContain('DB connection')
  })
})
