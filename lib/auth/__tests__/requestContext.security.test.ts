/**
 * lib/auth/__tests__/requestContext.security.test.ts
 *
 * Tests de seguridad para getRequestContext y getOrgId.
 *
 * Cubre:
 * 1. Vigencia de membresía — is_active, valid_until
 * 2. Roles válidos — OrgRole union
 * 3. Anti-escalación con getOrgId — membresías inactivas/expiradas retornan null
 */
import { describe, it, expect, vi } from 'vitest'

// ── Mocks globales ────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/foundation/orgId'
import { NotAuthenticatedError, ForbiddenError } from '@/lib/moments/errors'

const mockCreateClient = vi.mocked(createClient)

// ── UUIDs de fixture ──────────────────────────────────────────────────────────
const USER_A = 'aaaaaaaa-1111-0000-0000-000000000001'
const ORG_A  = 'aaaaaaaa-0000-0000-0000-000000000001'

// ── Helper: construye un mock de Supabase ─────────────────────────────────────

type ChainResult = { data: unknown; error: unknown }

/**
 * Crea un stub de Supabase suficiente para satisfacer la cadena
 * que usa getRequestContext:
 *   supabase.auth.getUser()
 *   supabase.from(...).select(...).eq(...).eq(...).order(...).limit(1).maybeSingle()
 */
function makeSupabaseMock(
  user: { id: string } | null,
  membershipResult: ChainResult,
) {
  const chain = {
    select:      () => chain,
    eq:          () => chain,
    order:       () => chain,
    limit:       () => chain,
    maybeSingle: async () => membershipResult,
    single:      async () => membershipResult,
  }

  return {
    auth: {
      getUser: async () => ({ data: { user } }),
    },
    from: () => chain,
  } as unknown as Awaited<ReturnType<typeof createClient>>
}

// ── Helper: construye un mock de Supabase para getOrgId ──────────────────────
// getOrgId recibe el cliente como parámetro directo (no usa createClient),
// así que lo instanciamos manualmente.

function makeOrgIdSupabaseMock(membershipData: { organization_id: string } | null) {
  const chain = {
    select:      () => chain,
    eq:          () => chain,
    or:          () => chain,
    order:       () => chain,
    limit:       () => chain,
    maybeSingle: async () => ({ data: membershipData }),
  }
  return { from: () => chain } as unknown as Parameters<typeof getOrgId>[0]
}

// ══════════════════════════════════════════════════════════════════════════════
// Suite 1: Vigencia de membresía
// ══════════════════════════════════════════════════════════════════════════════

describe('getRequestContext — vigencia de membresía', () => {

  it('sin sesión → lanza NotAuthenticatedError', async () => {
    // Usuario no autenticado: auth.getUser() retorna null
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock(null, { data: null, error: null })
    )

    const { getRequestContext } = await import('@/lib/auth/requestContext')
    await expect(getRequestContext()).rejects.toThrow(NotAuthenticatedError)
  })

  it('membresía con is_active = false → lanza ForbiddenError', async () => {
    // La query ya filtra .eq('is_active', true), así que si la membresía
    // está inactiva, maybeSingle() devuelve null (no hay filas)
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock(
        { id: USER_A },
        { data: null, error: null }, // ninguna membresía activa encontrada
      )
    )

    const { getRequestContext } = await import('@/lib/auth/requestContext')
    await expect(getRequestContext()).rejects.toThrow(ForbiddenError)
  })

  it('membresía con valid_until en el pasado → lanza ForbiddenError con "Membresía expirada"', async () => {
    // La membresía está activa pero su valid_until ya pasó
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // ayer

    mockCreateClient.mockResolvedValue(
      makeSupabaseMock(
        { id: USER_A },
        {
          data: {
            organization_id: ORG_A,
            role: 'employee',
            valid_until: pastDate,
          },
          error: null,
        },
      )
    )

    const { getRequestContext } = await import('@/lib/auth/requestContext')
    const err = await getRequestContext().catch(e => e)
    expect(err).toBeInstanceOf(ForbiddenError)
    expect(err.message).toBe('Membresía expirada')
  })

  it('membresía con valid_until = null → pasa (nunca expira)', async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock(
        { id: USER_A },
        {
          data: {
            organization_id: ORG_A,
            role: 'employee',
            valid_until: null,
          },
          error: null,
        },
      )
    )

    const { getRequestContext } = await import('@/lib/auth/requestContext')
    await expect(getRequestContext()).resolves.toMatchObject({
      userId: USER_A,
      orgId:  ORG_A,
      role:   'employee',
    })
  })

  it('membresía con valid_until en el futuro → pasa', async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() // en 30 días

    mockCreateClient.mockResolvedValue(
      makeSupabaseMock(
        { id: USER_A },
        {
          data: {
            organization_id: ORG_A,
            role: 'admin',
            valid_until: futureDate,
          },
          error: null,
        },
      )
    )

    const { getRequestContext } = await import('@/lib/auth/requestContext')
    await expect(getRequestContext()).resolves.toMatchObject({
      orgId: ORG_A,
      role:  'admin',
    })
  })

  it('múltiples membresías → usa la más reciente (ORDER BY created_at DESC LIMIT 1)', async () => {
    // El mock retorna un único resultado porque la query ya aplica
    // .order('created_at', { ascending: false }).limit(1).
    // Verificamos que el contexto resuelve con los datos de esa fila única.
    const ORG_RECIENTE = 'cccccccc-0000-0000-0000-000000000001'

    mockCreateClient.mockResolvedValue(
      makeSupabaseMock(
        { id: USER_A },
        {
          data: {
            organization_id: ORG_RECIENTE,
            role: 'manager',
            valid_until: null,
          },
          error: null,
        },
      )
    )

    const { getRequestContext } = await import('@/lib/auth/requestContext')
    const ctx = await getRequestContext()
    // La membresía más reciente (la única que devuelve el stub) es la que se usa
    expect(ctx.orgId).toBe(ORG_RECIENTE)
    expect(ctx.role).toBe('manager')
  })

})

// ══════════════════════════════════════════════════════════════════════════════
// Suite 2: Roles válidos
// ══════════════════════════════════════════════════════════════════════════════

describe('getRequestContext — roles válidos', () => {

  it("todos los roles válidos están presentes en OrgRole", async () => {
    // Verificación estática/estructural: construimos objetos conformes al tipo
    const roles: import('@/lib/auth/requestContext').OrgRole[] = [
      'owner',
      'admin',
      'hr_specialist',
      'manager',
      'employee',
    ]
    expect(roles).toHaveLength(5)
    expect(roles).toContain('owner')
    expect(roles).toContain('admin')
    expect(roles).toContain('hr_specialist')
    expect(roles).toContain('manager')
    expect(roles).toContain('employee')
  })

  it("role='owner' resuelve correctamente sin ForbiddenError", async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock(
        { id: USER_A },
        {
          data: {
            organization_id: ORG_A,
            role: 'owner',
            valid_until: null,
          },
          error: null,
        },
      )
    )

    const { getRequestContext } = await import('@/lib/auth/requestContext')
    const ctx = await getRequestContext()
    expect(ctx.role).toBe('owner')
    expect(ctx.orgId).toBe(ORG_A)
  })

})

// ══════════════════════════════════════════════════════════════════════════════
// Suite 3: Anti-escalación con getOrgId
// ══════════════════════════════════════════════════════════════════════════════

describe('getOrgId — anti-escalación', () => {

  it('membresía inactiva → retorna null (no el fallback a otra org)', async () => {
    // Cuando is_active = false, la query no devuelve filas → data = null
    const supabaseMock = makeOrgIdSupabaseMock(null)
    const result = await getOrgId(supabaseMock, USER_A)
    expect(result).toBeNull()
  })

  it('membresía expirada → retorna null', async () => {
    // valid_until en el pasado es filtrado por la query (.or('valid_until.is.null,...'))
    // El stub simula que la query no encuentra filas válidas → data = null
    const supabaseMock = makeOrgIdSupabaseMock(null)
    const result = await getOrgId(supabaseMock, USER_A)
    expect(result).toBeNull()
  })

  it('membresía activa y vigente → retorna el orgId correcto', async () => {
    const supabaseMock = makeOrgIdSupabaseMock({ organization_id: ORG_A })
    const result = await getOrgId(supabaseMock, USER_A)
    expect(result).toBe(ORG_A)
  })

  it('retorna null cuando data es undefined (sin filas)', async () => {
    // Simula el caso donde maybeSingle() devuelve { data: undefined }
    const chain = {
      select:      () => chain,
      eq:          () => chain,
      or:          () => chain,
      order:       () => chain,
      limit:       () => chain,
      maybeSingle: async () => ({ data: undefined }),
    }
    const supabaseMock = { from: () => chain } as unknown as Parameters<typeof getOrgId>[0]
    const result = await getOrgId(supabaseMock, USER_A)
    expect(result).toBeNull()
  })

})
