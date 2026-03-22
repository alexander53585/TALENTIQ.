/**
 * lib/auth/__tests__/admin-members.security.test.ts
 *
 * Tests de seguridad para GET /api/admin/members y PUT /api/admin/members.
 *
 * Cubre:
 * 1. Control de acceso — roles permitidos / denegados
 * 2. Aislamiento tenant — no se puede modificar membresía de otra org
 */
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks globales ────────────────────────────────────────────────────────────

vi.mock('@/lib/auth/requestContext', () => ({
  getRequestContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { getRequestContext } from '@/lib/auth/requestContext'
import { createClient }      from '@/lib/supabase/server'
import { NotAuthenticatedError } from '@/lib/moments/errors'

const mockGetCtx       = vi.mocked(getRequestContext)
const mockCreateClient = vi.mocked(createClient)

// ── UUIDs de fixture ──────────────────────────────────────────────────────────
const ORG_A       = 'aaaaaaaa-0000-0000-0000-000000000001'
const ORG_B       = 'bbbbbbbb-0000-0000-0000-000000000001'
const USER_A      = 'aaaaaaaa-1111-0000-0000-000000000001'
const MEMBER_ID_A = 'aaaaaaaa-3333-0000-0000-000000000001' // membership en ORG_A
const MEMBER_ID_B = 'bbbbbbbb-3333-0000-0000-000000000001' // membership en ORG_B

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGetReq(): NextRequest {
  return new NextRequest('http://localhost/api/admin/members', { method: 'GET' })
}

function makePutReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/members', {
    method:  'PUT',
    body:    JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

type ChainConfig = {
  membershipData?: unknown
  membershipError?: { message: string } | null
  updateData?: unknown
  updateError?: { message: string } | null
  profilesData?: unknown
}

/**
 * Crea un stub de Supabase que maneja las queries del endpoint admin/members.
 *
 * GET llama a:
 *   .from('user_memberships').select(...).eq(...).order(...)  → array (no single)
 *   .from('profiles').select(...).in(...)                     → array (no single)
 *
 * PUT llama a:
 *   .from('user_memberships').select(...).eq(...).eq(...).maybeSingle()  → busca target
 *   .from('user_memberships').update(...).eq(...).eq(...).select().single() → actualiza
 */
function makeSupabaseMock(cfg: ChainConfig = {}) {
  const {
    membershipData  = [],
    membershipError = null,
    updateData      = { id: MEMBER_ID_A, role: 'admin' },
    updateError     = null,
    profilesData    = [],
  } = cfg

  let callIndex = 0

  // Chain base que captura la llamada y responde de forma diferente
  // según sea la query de membresías, perfiles, verificación tenant o update.
  const makeChain = (tableName: string) => {
    const chain: Record<string, unknown> = {}

    chain.select   = () => chain
    chain.eq       = () => chain
    chain.order    = () => chain
    chain.limit    = () => chain
    chain.in       = () => chain
    chain.update   = () => chain

    // .maybeSingle() — usada en la verificación tenant del PUT
    chain.maybeSingle = async () => {
      return { data: cfg.membershipData ?? null }
    }

    // .single() — usada en el update final del PUT
    chain.single = async () => ({
      data:  updateData,
      error: updateError,
    })

    // Awaitable directo — usado en el GET (arrays sin .single())
    // Simula la resolución cuando se hace `await supabase.from(...).select(...).eq(...).order(...)`
    ;(chain as Record<string, unknown>).then = (
      resolve: (v: { data: unknown; error: unknown }) => void,
    ) => {
      callIndex++
      if (tableName === 'profiles') {
        return Promise.resolve(resolve({ data: profilesData, error: null }))
      }
      return Promise.resolve(
        resolve({ data: membershipData, error: membershipError }),
      )
    }

    return chain
  }

  return {
    from: (table: string) => makeChain(table),
  } as unknown as Awaited<ReturnType<typeof createClient>>
}

// ══════════════════════════════════════════════════════════════════════════════
// Suite 1: Control de acceso
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/admin/members — control de acceso', () => {

  it('GET sin autenticación → 401', async () => {
    // getRequestContext lanza NotAuthenticatedError (clase real) cuando no hay sesión.
    // Es importante usar la instancia real para que toErrorResponse() pueda
    // detectarla con instanceof MomentsError y devolver el código HTTP correcto.
    mockGetCtx.mockRejectedValue(new NotAuthenticatedError())
    // createClient no debería llamarse, pero lo proveemos igual
    mockCreateClient.mockResolvedValue(makeSupabaseMock())

    const { GET } = await import('../../../app/api/admin/members/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('GET con rol employee → 403 (no puede listar miembros)', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })
    mockCreateClient.mockResolvedValue(makeSupabaseMock())

    const { GET } = await import('../../../app/api/admin/members/route')
    const res = await GET()
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('GET con rol manager → 403 (no puede listar miembros)', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'manager' })
    mockCreateClient.mockResolvedValue(makeSupabaseMock())

    const { GET } = await import('../../../app/api/admin/members/route')
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('GET con rol hr_specialist → 403 (no puede listar miembros)', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'hr_specialist' })
    mockCreateClient.mockResolvedValue(makeSupabaseMock())

    const { GET } = await import('../../../app/api/admin/members/route')
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('GET con rol admin → 200 + lista de miembros', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'admin' })
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({
        membershipData: [{ id: MEMBER_ID_A, user_id: USER_A, role: 'admin', scope: null, is_active: true, created_at: '' }],
        profilesData:   [{ id: USER_A, email: 'admin@example.com' }],
      })
    )

    const { GET } = await import('../../../app/api/admin/members/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toBeDefined()
  })

  it('GET con rol owner → 200 + lista de miembros', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'owner' })
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({
        membershipData: [{ id: MEMBER_ID_A, user_id: USER_A, role: 'owner', scope: null, is_active: true, created_at: '' }],
        profilesData:   [],
      })
    )

    const { GET } = await import('../../../app/api/admin/members/route')
    const res = await GET()
    expect(res.status).toBe(200)
  })

})

// ══════════════════════════════════════════════════════════════════════════════

describe('PUT /api/admin/members — control de acceso', () => {

  it('PUT con rol hr_specialist → 403', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'hr_specialist' })
    mockCreateClient.mockResolvedValue(makeSupabaseMock())

    const { PUT } = await import('../../../app/api/admin/members/route')
    const res = await PUT(makePutReq({ id: MEMBER_ID_A, role: 'employee' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('PUT con rol employee → 403', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })
    mockCreateClient.mockResolvedValue(makeSupabaseMock())

    const { PUT } = await import('../../../app/api/admin/members/route')
    const res = await PUT(makePutReq({ id: MEMBER_ID_A, role: 'manager' }))
    expect(res.status).toBe(403)
  })

  it('PUT con rol manager → 403', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'manager' })
    mockCreateClient.mockResolvedValue(makeSupabaseMock())

    const { PUT } = await import('../../../app/api/admin/members/route')
    const res = await PUT(makePutReq({ id: MEMBER_ID_A, role: 'employee' }))
    expect(res.status).toBe(403)
  })

  it('PUT owner asignando rol owner → 200', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'owner' })
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({
        membershipData: { id: MEMBER_ID_A, organization_id: ORG_A },
        updateData:     { id: MEMBER_ID_A, role: 'owner' },
      })
    )

    const { PUT } = await import('../../../app/api/admin/members/route')
    const res = await PUT(makePutReq({ id: MEMBER_ID_A, role: 'owner' }))
    expect(res.status).toBe(200)
  })

  it('PUT admin intentando asignar rol owner → 403 (solo owner puede crear owners)', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'admin' })
    mockCreateClient.mockResolvedValue(makeSupabaseMock())

    const { PUT } = await import('../../../app/api/admin/members/route')
    const res = await PUT(makePutReq({ id: MEMBER_ID_A, role: 'owner' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('PUT con rol inválido en body → 422', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'owner' })
    mockCreateClient.mockResolvedValue(makeSupabaseMock())

    const { PUT } = await import('../../../app/api/admin/members/route')
    const res = await PUT(makePutReq({ id: MEMBER_ID_A, role: 'superadmin' }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('PUT sin id en body → 422', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'admin' })
    mockCreateClient.mockResolvedValue(makeSupabaseMock())

    const { PUT } = await import('../../../app/api/admin/members/route')
    const res = await PUT(makePutReq({ role: 'employee' })) // falta id
    expect(res.status).toBe(422)
  })

})

// ══════════════════════════════════════════════════════════════════════════════
// Suite 2: Aislamiento tenant
// ══════════════════════════════════════════════════════════════════════════════

describe('PUT /api/admin/members — aislamiento tenant', () => {

  it('PUT intenta modificar membership de otra org → 404', async () => {
    // El caller es admin de ORG_A pero intenta modificar MEMBER_ID_B (ORG_B)
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'admin' })

    // La query con .eq('organization_id', ORG_A) no encuentra el membership de ORG_B
    // → maybeSingle() retorna { data: null }
    const chain = {
      select:      () => chain,
      eq:          () => chain,
      order:       () => chain,
      limit:       () => chain,
      update:      () => chain,
      maybeSingle: async () => ({ data: null }),
      single:      async () => ({ data: null, error: null }),
      // Awaitable para el GET (no aplica aquí, pero necesario para tipado)
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve(resolve({ data: [], error: null })),
    }

    mockCreateClient.mockResolvedValue({
      from: () => chain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const { PUT } = await import('../../../app/api/admin/members/route')
    // body.id apunta a un membership de ORG_B — la query en ORG_A no lo encuentra
    const res = await PUT(makePutReq({ id: MEMBER_ID_B, role: 'employee' }))

    // 404 para evitar revelar si el membership existe en otra organización
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.code).toBe('NOT_FOUND')
  })

  it('GET filtra membresías estrictamente por orgId de sesión, no del cliente', async () => {
    // Verificamos que la query usa el orgId resuelto por getRequestContext,
    // no cualquier valor que pueda venir de la request.
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'admin' })

    const eqArgs: Array<[string, unknown]> = []
    const chain = {
      select: () => chain,
      eq:     (...args: unknown[]) => {
        eqArgs.push(args as [string, unknown])
        return chain
      },
      order: () => chain,
      in:    () => chain,
      then:  (resolve: (v: unknown) => void) =>
        Promise.resolve(resolve({ data: [], error: null })),
    }

    mockCreateClient.mockResolvedValue({
      from: () => chain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const { GET } = await import('../../../app/api/admin/members/route')
    await GET()

    // La query debe filtrar por organization_id = ORG_A (del contexto de sesión)
    expect(eqArgs).toContainEqual(['organization_id', ORG_A])
    // No debe filtrar por ORG_B bajo ningún concepto
    expect(eqArgs).not.toContainEqual(['organization_id', ORG_B])
  })

})
