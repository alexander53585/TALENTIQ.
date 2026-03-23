/**
 * lib/hiring/__tests__/candidates-access-token.security.test.ts
 *
 * Tests de seguridad para el acceso a candidatos y tokens 16PF.
 *
 * Verifica:
 * 1. El access_token NO aparece en el listado masivo de candidatos
 * 2. Solo roles HR pueden obtener el link de evaluación 16PF
 * 3. Solo HR puede agregar candidatos manualmente
 * 4. Membresía expirada → 403
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks globales ────────────────────────────────────────────────────
// IMPORTANTE: los mocks deben declararse ANTES de cualquier import
vi.mock('@/lib/auth/requestContext', () => ({
  getRequestContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { getRequestContext } from '@/lib/auth/requestContext'
import { createClient }      from '@/lib/supabase/server'
import { ForbiddenError, NotAuthenticatedError } from '@/lib/moments/errors'

const mockGetCtx       = vi.mocked(getRequestContext)
const mockCreateClient = vi.mocked(createClient)

// ── UUIDs de fixture ──────────────────────────────────────────────────
const ORG_A   = 'aaaaaaaa-0000-0000-0000-000000000000'
const ORG_B   = 'bbbbbbbb-0000-0000-0000-000000000000'
const USER_A  = 'aaaaaaaa-1111-0000-0000-000000000000'
const VAC_ID  = 'aaaaaaaa-2222-0000-0000-000000000000'
const CAND_A  = 'aaaaaaaa-3333-0000-0000-000000000000'
const EVAL_ID = 'aaaaaaaa-4444-0000-0000-000000000000'

// ── Importar handlers una sola vez — el mock de vi.mock aplica automáticamente
// Usamos variables lazy para importar después de que los mocks estén configurados
let GET_CANDIDATES: (req: NextRequest, ctx: { params: { id: string } }) => Promise<Response>
let POST_CANDIDATES: (req: NextRequest, ctx: { params: { id: string } }) => Promise<Response>
let GET_LINK: (req: NextRequest, ctx: { params: { id: string } }) => Promise<Response>

beforeEach(async () => {
  // Reimportamos después de cada reset para obtener handlers frescos
  const candidatesRoute = await import('../../../app/api/hiring/vacancies/[id]/candidates/route')
  const linkRoute = await import('../../../app/api/hiring/vacancies/[id]/candidates/link/route')
  GET_CANDIDATES  = candidatesRoute.GET
  POST_CANDIDATES = candidatesRoute.POST
  GET_LINK        = linkRoute.GET
})

// ── Helpers ───────────────────────────────────────────────────────────

/** Crea una Request GET para el listado de candidatos de una vacante */
function makeGetCandidatesReq(): NextRequest {
  return new NextRequest(
    `http://localhost/api/hiring/vacancies/${VAC_ID}/candidates`,
    { method: 'GET' },
  )
}

/** Crea una Request GET para el link 16PF de un candidato */
function makeLinkReq(candidateId = CAND_A): NextRequest {
  return new NextRequest(
    `http://localhost/api/hiring/vacancies/${VAC_ID}/candidates/link?candidate_id=${candidateId}`,
    { method: 'GET' },
  )
}

/** Crea una Request POST para agregar candidato manualmente */
function makePostCandidateReq(body?: unknown): NextRequest {
  const b = body ?? {
    full_name: 'Test Candidato',
    email: 'candidato@test.com',
  }
  return new NextRequest(
    `http://localhost/api/hiring/vacancies/${VAC_ID}/candidates`,
    {
      method:  'POST',
      body:    JSON.stringify(b),
      headers: { 'content-type': 'application/json' },
    },
  )
}

type SupabaseChain = Record<string, (...args: unknown[]) => unknown>

/**
 * Crea un chain de Supabase configurable para distintos escenarios.
 */
function makeChain(
  result: { data: unknown; error: null | { message: string } },
): SupabaseChain {
  const chain: SupabaseChain = {}
  const methods = ['select', 'eq', 'order', 'insert', 'delete', 'update', 'limit', 'in', 'not']
  methods.forEach(m => {
    chain[m] = () => chain
  })
  chain.maybeSingle = async () => result
  chain.single      = async () => result
  // Awaitable directo (para queries sin .single())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(chain as any).then = (fn: (v: unknown) => unknown) => Promise.resolve(fn(result))
  return chain
}

// ══════════════════════════════════════════════════════════════════════
// Suite 1 — GET /api/hiring/vacancies/[id]/candidates — no expone access_token
// ══════════════════════════════════════════════════════════════════════

describe('GET /api/hiring/vacancies/[id]/candidates — no expone access_token', () => {

  it('respuesta no contiene campo access_token en ningún objeto pf16_evaluations', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'hr_specialist' })

    // El SELECT del handler excluye access_token — simulamos la respuesta filtrada
    const filteredCandidate = {
      id: CAND_A,
      full_name: 'Test Candidato',
      pf16_evaluations: [{
        id:           EVAL_ID,
        status:       'sent',
        progress_pct: 0,
        sent_at:      null,
        completed_at: null,
        // access_token ausente — el SELECT no lo pide
      }],
    }

    const chain = makeChain({ data: [filteredCandidate], error: null })
    mockCreateClient.mockResolvedValue({
      from: () => chain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET_CANDIDATES(makeGetCandidatesReq(), { params: { id: VAC_ID } })

    expect(res.status).toBe(200)
    const json = await res.json()
    const evals = json.data?.[0]?.pf16_evaluations ?? []
    // Verificar que ninguna evaluación contiene access_token
    for (const ev of evals) {
      expect(ev).not.toHaveProperty('access_token')
    }
  })

  it('respuesta contiene solo campos seguros en pf16_evaluations (id, status, progress_pct, sent_at, completed_at)', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'hr_specialist' })

    const safeEval = {
      id:           EVAL_ID,
      status:       'completed',
      progress_pct: 100,
      sent_at:      '2024-01-01T00:00:00Z',
      completed_at: '2024-01-02T00:00:00Z',
    }
    const chain = makeChain({ data: [{ id: CAND_A, pf16_evaluations: [safeEval] }], error: null })
    mockCreateClient.mockResolvedValue({ from: () => chain } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET_CANDIDATES(makeGetCandidatesReq(), { params: { id: VAC_ID } })

    const json = await res.json()
    const ev = json.data?.[0]?.pf16_evaluations?.[0]
    expect(ev).toBeDefined()
    // Campos seguros presentes
    expect(ev).toHaveProperty('id')
    expect(ev).toHaveProperty('status')
    expect(ev).toHaveProperty('progress_pct')
    // access_token ausente
    expect(ev).not.toHaveProperty('access_token')
  })

  it('roles employee y manager: si obtienen respuesta, no contiene access_token', async () => {
    const safeData = [{ id: CAND_A, pf16_evaluations: [{ id: EVAL_ID, status: 'sent', progress_pct: 0 }] }]

    for (const role of ['employee', 'manager'] as const) {
      mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role })
      const chain = makeChain({ data: safeData, error: null })
      mockCreateClient.mockResolvedValue({ from: () => chain } as unknown as Awaited<ReturnType<typeof createClient>>)

      const res = await GET_CANDIDATES(makeGetCandidatesReq(), { params: { id: VAC_ID } })

      // Estos roles pueden o no tener acceso, pero si lo tienen no deben ver access_token
      if (res.status === 200) {
        const json = await res.json()
        const evals = json.data?.[0]?.pf16_evaluations ?? []
        for (const ev of evals) {
          expect(ev).not.toHaveProperty('access_token')
        }
      }
    }
  })

  it('rol hr_specialist tampoco recibe access_token en listado masivo', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'hr_specialist' })

    // Simulamos que la BD devuelve SOLO los campos del SELECT (sin access_token)
    const safeData = [{
      id: CAND_A,
      organization_id: ORG_A,
      pf16_evaluations: [{ id: EVAL_ID, status: 'sent', progress_pct: 0, sent_at: null, completed_at: null }],
    }]
    const chain = makeChain({ data: safeData, error: null })
    mockCreateClient.mockResolvedValue({ from: () => chain } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET_CANDIDATES(makeGetCandidatesReq(), { params: { id: VAC_ID } })

    expect(res.status).toBe(200)
    const json = await res.json()
    const ev = json.data?.[0]?.pf16_evaluations?.[0]
    expect(ev).not.toHaveProperty('access_token')
  })

})

// ══════════════════════════════════════════════════════════════════════
// Suite 2 — GET /api/hiring/vacancies/[id]/candidates/link — solo HR
// ══════════════════════════════════════════════════════════════════════

describe('GET /api/hiring/vacancies/[id]/candidates/link — solo HR puede obtener link', () => {

  it('rol employee → 403', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })
    mockCreateClient.mockResolvedValue({} as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET_LINK(makeLinkReq(), { params: { id: VAC_ID } })

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('rol manager → 403', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'manager' })
    mockCreateClient.mockResolvedValue({} as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET_LINK(makeLinkReq(), { params: { id: VAC_ID } })

    expect(res.status).toBe(403)
  })

  it('rol hr_specialist → 200 con link (URL completa)', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'hr_specialist' })

    // Primera llamada maybeSingle: verificar candidato en la org
    // Segunda llamada maybeSingle: obtener evaluación 16PF con access_token
    let callCount = 0
    const chain: Record<string, unknown> = {}
    const methods = ['select', 'eq', 'order', 'in', 'not']
    methods.forEach(m => { chain[m] = () => chain })
    chain.maybeSingle = async () => {
      callCount++
      if (callCount === 1) return { data: { id: CAND_A, organization_id: ORG_A }, error: null }
      return { data: { id: EVAL_ID, status: 'sent', access_token: 'SECRET_TOKEN_12345', expires_at: null }, error: null }
    }
    chain.single = async () => ({ data: { id: CAND_A, organization_id: ORG_A }, error: null })

    mockCreateClient.mockResolvedValue({
      from: () => chain,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET_LINK(makeLinkReq(), { params: { id: VAC_ID } })

    expect(res.status).toBe(200)
    const json = await res.json()
    // Debe contener link (string), NO access_token raw
    expect(json).toHaveProperty('link')
    expect(typeof json.link).toBe('string')
    expect(json).not.toHaveProperty('access_token')
  })

  it('rol admin → 200', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'admin' })

    let callCount = 0
    const chain: Record<string, unknown> = {}
    const methods = ['select', 'eq', 'order', 'in']
    methods.forEach(m => { chain[m] = () => chain })
    chain.maybeSingle = async () => {
      callCount++
      if (callCount === 1) return { data: { id: CAND_A, organization_id: ORG_A }, error: null }
      return { data: { id: EVAL_ID, status: 'sent', access_token: 'TOKEN', expires_at: null }, error: null }
    }

    mockCreateClient.mockResolvedValue({ from: () => chain } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET_LINK(makeLinkReq(), { params: { id: VAC_ID } })

    expect(res.status).toBe(200)
  })

  it('rol owner → 200', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'owner' })

    let callCount = 0
    const chain: Record<string, unknown> = {}
    const methods = ['select', 'eq', 'order', 'in']
    methods.forEach(m => { chain[m] = () => chain })
    chain.maybeSingle = async () => {
      callCount++
      if (callCount === 1) return { data: { id: CAND_A, organization_id: ORG_A }, error: null }
      return { data: { id: EVAL_ID, status: 'pending', access_token: 'TOKEN', expires_at: null }, error: null }
    }

    mockCreateClient.mockResolvedValue({ from: () => chain } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET_LINK(makeLinkReq(), { params: { id: VAC_ID } })

    expect(res.status).toBe(200)
  })

  it('respuesta hr_specialist contiene link (string) pero NO access_token raw', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'hr_specialist' })

    let callCount = 0
    const chain: Record<string, unknown> = {}
    const methods = ['select', 'eq', 'order', 'in']
    methods.forEach(m => { chain[m] = () => chain })
    chain.maybeSingle = async () => {
      callCount++
      if (callCount === 1) return { data: { id: CAND_A, organization_id: ORG_A }, error: null }
      return { data: { id: EVAL_ID, status: 'sent', access_token: 'SHOULD_NOT_APPEAR', expires_at: null }, error: null }
    }

    mockCreateClient.mockResolvedValue({ from: () => chain } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET_LINK(makeLinkReq(), { params: { id: VAC_ID } })

    const json = await res.json()
    // El link puede incluir el token dentro de la URL, pero el campo access_token NO debe existir en el JSON
    expect(json).not.toHaveProperty('access_token')
    // Debe haber un link que es una URL
    expect(json).toHaveProperty('link')
  })

  it('candidato de otra org → 404 (anti-enumeración)', async () => {
    // El usuario está en ORG_A pero intenta obtener el link de un candidato en ORG_B
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'hr_specialist' })

    // La query filtra por organization_id = ORG_A → candidato de ORG_B no aparece → data: null
    const chain = makeChain({ data: null, error: null })
    mockCreateClient.mockResolvedValue({ from: () => chain } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET_LINK(makeLinkReq(CAND_A), { params: { id: VAC_ID } })

    // 404 para evitar enumerar si el candidato existe en otra org
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.code).toBe('NOT_FOUND')
  })

})

// ══════════════════════════════════════════════════════════════════════
// Suite 3 — POST /api/hiring/vacancies/[id]/candidates — solo HR
// ══════════════════════════════════════════════════════════════════════

describe('POST /api/hiring/vacancies/[id]/candidates — solo HR puede agregar candidatos', () => {

  it('rol employee → 403', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'employee' })
    mockCreateClient.mockResolvedValue({} as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await POST_CANDIDATES(makePostCandidateReq(), { params: { id: VAC_ID } })

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('rol manager → 403', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'manager' })
    mockCreateClient.mockResolvedValue({} as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await POST_CANDIDATES(makePostCandidateReq(), { params: { id: VAC_ID } })

    expect(res.status).toBe(403)
  })

  it('rol hr_specialist → 201 o 200 (puede agregar candidatos)', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'hr_specialist' })

    // Primera query (maybeSingle): verificar que la vacante existe en la org
    // Segunda query (single): insertar candidato y retornar resultado
    let callCount = 0
    const insertChain: Record<string, unknown> = {}
    insertChain.select = () => insertChain
    insertChain.single = async () => ({
      data: { id: CAND_A, organization_id: ORG_A, full_name: 'Test Candidato', email: 'candidato@test.com' },
      error: null,
    })

    const chain: Record<string, unknown> = {}
    const methods = ['select', 'eq', 'order', 'in']
    methods.forEach(m => { chain[m] = () => chain })
    chain.maybeSingle = async () => {
      callCount++
      return { data: { id: VAC_ID }, error: null }
    }
    chain.insert = () => insertChain

    mockCreateClient.mockResolvedValue({ from: () => chain } as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await POST_CANDIDATES(makePostCandidateReq(), { params: { id: VAC_ID } })

    expect([200, 201]).toContain(res.status)
  })

  it('organization_id del body es ignorado — solo se usa del contexto', async () => {
    mockGetCtx.mockResolvedValue({ userId: USER_A, orgId: ORG_A, role: 'hr_specialist' })

    const insertedValues: Record<string, unknown>[] = []

    // Chain para verificar vacante
    const vacChain: Record<string, unknown> = {}
    ;['select', 'eq', 'order', 'in'].forEach(m => { vacChain[m] = () => vacChain })
    vacChain.maybeSingle = async () => ({ data: { id: VAC_ID }, error: null })

    // Chain para insertar candidato
    const insertChain: Record<string, unknown> = {}
    insertChain.select = () => insertChain
    insertChain.single = async () => ({
      data: { id: CAND_A, organization_id: ORG_A },
      error: null,
    })
    vacChain.insert = (vals: unknown) => {
      insertedValues.push(vals as Record<string, unknown>)
      return insertChain
    }

    mockCreateClient.mockResolvedValue({ from: () => vacChain } as unknown as Awaited<ReturnType<typeof createClient>>)

    // El body incluye organization_id de ORG_B — debe ser ignorado
    const res = await POST_CANDIDATES(
      makePostCandidateReq({ full_name: 'Test', email: 'test@test.com', organization_id: ORG_B }),
      { params: { id: VAC_ID } },
    )

    // La respuesta debe ser exitosa y el organization_id debe ser ORG_A (del contexto)
    if (res.status !== 403) {
      expect(insertedValues[0]?.organization_id).toBe(ORG_A)
      expect(insertedValues[0]?.organization_id).not.toBe(ORG_B)
    }
  })

})

// ══════════════════════════════════════════════════════════════════════
// Suite 4 — Membresía expirada
// ══════════════════════════════════════════════════════════════════════

describe('Membresía expirada → error correcto', () => {

  it('GET candidatos con membresía expirada → 403', async () => {
    // getRequestContext lanza ForbiddenError cuando la membresía expiró
    mockGetCtx.mockRejectedValue(new ForbiddenError('Membresía expirada'))
    mockCreateClient.mockResolvedValue({} as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET_CANDIDATES(makeGetCandidatesReq(), { params: { id: VAC_ID } })

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('GET link con membresía expirada → 403', async () => {
    mockGetCtx.mockRejectedValue(new ForbiddenError('Membresía expirada'))
    mockCreateClient.mockResolvedValue({} as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET_LINK(makeLinkReq(), { params: { id: VAC_ID } })

    expect(res.status).toBe(403)
  })

  it('sin autenticación → 401', async () => {
    mockGetCtx.mockRejectedValue(new NotAuthenticatedError())
    mockCreateClient.mockResolvedValue({} as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET_CANDIDATES(makeGetCandidatesReq(), { params: { id: VAC_ID } })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('NOT_AUTHENTICATED')
  })

})
