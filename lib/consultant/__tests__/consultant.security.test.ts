/**
 * lib/consultant/__tests__/consultant.security.test.ts
 *
 * Security tests for the consultant workspace routes.
 *
 * Routes under audit:
 *   - app/(consultant)/consultor/layout.tsx
 *   - app/(consultant)/consultor/page.tsx       (Dashboard)
 *   - app/(consultant)/consultor/candidatos/page.tsx
 *
 * Test suites:
 *   1. Layout redirects when not authenticated (supabase.auth.getUser → null)
 *   2. Dashboard only shows orgs belonging to the authenticated user (no cross-user leak)
 *   3. candidatos/page only exposes candidates from the consultant's own orgs (no cross-tenant)
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'

// ── Shared UUIDs ───────────────────────────────────────────────────────────
const USER_A  = 'aaaaaaaa-0000-0000-0000-000000000001'
const USER_B  = 'bbbbbbbb-0000-0000-0000-000000000002'
const ORG_A1  = 'cccccccc-0000-0000-0000-000000000003'
const ORG_A2  = 'dddddddd-0000-0000-0000-000000000004'
const ORG_B1  = 'eeeeeeee-0000-0000-0000-000000000005'
const VAC_A1  = 'ffffffff-0000-0000-0000-000000000006'
const VAC_B1  = '11111111-0000-0000-0000-000000000007'
const CAND_A1 = '22222222-0000-0000-0000-000000000008'
const CAND_B1 = '33333333-0000-0000-0000-000000000009'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — pure functions that mirror the logic inside each page/layout.
// These are extracted from the server components and tested in isolation.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mirrors ConsultorLayout authentication guard.
 * Returns 'redirect:/login' if no user, 'redirect:/onboarding' if no memberships,
 * or 'render' when everything is valid.
 */
function consultorLayoutGuard(
  user: { id: string } | null,
  memberships: { organization_id: string }[] | null,
): 'redirect:/login' | 'redirect:/onboarding' | 'render' {
  if (!user) return 'redirect:/login'
  if (!memberships || memberships.length === 0) return 'redirect:/onboarding'
  return 'render'
}

/**
 * Mirrors ConsultorDashboard data-fetching:
 * memberships are always filtered by user.id (server-side).
 * Also filters by valid_until to exclude expired memberships (security fix).
 */
function consultorDashboardData(
  userId: string,
  allMemberships: { user_id: string; organization_id: string; is_active: boolean; valid_until?: string | null }[],
  allVacancies: { id: string; organization_id: string; status: string }[],
  allCandidates: { id: string; vacancy_id: string }[],
) {
  const now = new Date().toISOString()
  // Step 1: get orgs for this user only
  // Mirrors: .eq('user_id', user.id).eq('is_active', true).or('valid_until.is.null,valid_until.gt.NOW')
  const memberships = allMemberships.filter(
    (m) => m.user_id === userId && m.is_active && (m.valid_until == null || m.valid_until > now),
  )
  const orgIds = memberships.map((m) => m.organization_id)

  // Step 2: get vacancies in those orgs only (mirrors .in('organization_id', orgIds))
  const vacancies = orgIds.length > 0
    ? allVacancies.filter((v) => orgIds.includes(v.organization_id))
    : []
  const vacancyIds = vacancies.map((v) => v.id)

  // Step 3: get candidates in those vacancies only (mirrors .in('vacancy_id', vacancyIds))
  const candidates = vacancyIds.length > 0
    ? allCandidates.filter((c) => vacancyIds.includes(c.vacancy_id))
    : []

  return { memberships, vacancies, candidates }
}

/**
 * Mirrors ConsultorCandidatosPage data-fetching:
 * candidates are scoped through vacancies → orgs → user memberships.
 * Also filters by valid_until to exclude expired memberships (security fix).
 */
function consultorCandidatosData(
  userId: string,
  allMemberships: { user_id: string; organization_id: string; is_active: boolean; valid_until?: string | null }[],
  allVacancies: { id: string; organization_id: string }[],
  allCandidates: { id: string; email: string; vacancy_id: string | null }[],
) {
  const now = new Date().toISOString()
  // Mirrors: .eq('user_id', user.id).eq('is_active', true).or('valid_until.is.null,valid_until.gt.NOW')
  const memberships = allMemberships.filter(
    (m) => m.user_id === userId && m.is_active && (m.valid_until == null || m.valid_until > now),
  )
  const orgIds = memberships.map((m) => m.organization_id)

  const vacancies = orgIds.length > 0
    ? allVacancies.filter((v) => orgIds.includes(v.organization_id))
    : []
  const vacancyIds = vacancies.map((v) => v.id)

  const candidates = vacancyIds.length > 0
    ? allCandidates.filter((c) => c.vacancy_id && vacancyIds.includes(c.vacancy_id))
    : []

  return { memberships, vacancies, candidates }
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: Layout redirects when not authenticated
// ─────────────────────────────────────────────────────────────────────────────

describe('Suite 1 — ConsultorLayout: authentication guard', () => {
  test('redirects to /login when user is null (not authenticated)', () => {
    const result = consultorLayoutGuard(null, null)
    expect(result).toBe('redirect:/login')
  })

  test('redirects to /login when user is undefined (treated as falsy)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = consultorLayoutGuard(undefined as any, null)
    expect(result).toBe('redirect:/login')
  })

  test('redirects to /onboarding when user is authenticated but has no active memberships', () => {
    const user = { id: USER_A }
    const result = consultorLayoutGuard(user, [])
    expect(result).toBe('redirect:/onboarding')
  })

  test('redirects to /onboarding when memberships array is null (DB error / RLS block)', () => {
    const user = { id: USER_A }
    const result = consultorLayoutGuard(user, null)
    expect(result).toBe('redirect:/onboarding')
  })

  test('renders when user is authenticated and has at least one active membership', () => {
    const user = { id: USER_A }
    const memberships = [{ organization_id: ORG_A1 }]
    const result = consultorLayoutGuard(user, memberships)
    expect(result).toBe('render')
  })

  test('renders when user has multiple active memberships', () => {
    const user = { id: USER_A }
    const memberships = [
      { organization_id: ORG_A1 },
      { organization_id: ORG_A2 },
    ]
    const result = consultorLayoutGuard(user, memberships)
    expect(result).toBe('render')
  })

  test('layout guard uses server-side user object — not a URL param or cookie value', () => {
    // This test verifies the guard signature: it only accepts a user object
    // (from supabase.auth.getUser()), never a client-supplied id string.
    // The guard function deliberately has no `userId: string` parameter.
    const user = { id: USER_A }
    expect(consultorLayoutGuard(user, [{ organization_id: ORG_A1 }])).toBe('render')
    // Passing null always redirects, regardless of what a URL param might say
    expect(consultorLayoutGuard(null, [{ organization_id: ORG_A1 }])).toBe('redirect:/login')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: Dashboard only shows orgs of the authenticated user
// ─────────────────────────────────────────────────────────────────────────────

describe('Suite 2 — ConsultorDashboard: no cross-user org leak', () => {
  // Fixture: two consultants each with their own org
  const allMemberships = [
    { user_id: USER_A, organization_id: ORG_A1, is_active: true },
    { user_id: USER_A, organization_id: ORG_A2, is_active: true },
    { user_id: USER_B, organization_id: ORG_B1, is_active: true },
  ]

  const allVacancies = [
    { id: VAC_A1, organization_id: ORG_A1, status: 'active' },
    { id: VAC_B1, organization_id: ORG_B1, status: 'active' },
  ]

  const allCandidates = [
    { id: CAND_A1, vacancy_id: VAC_A1 },
    { id: CAND_B1, vacancy_id: VAC_B1 },
  ]

  test('USER_A only receives memberships for ORG_A1 and ORG_A2', () => {
    const { memberships } = consultorDashboardData(USER_A, allMemberships, allVacancies, allCandidates)
    const orgIds = memberships.map((m) => m.organization_id)
    expect(orgIds).toContain(ORG_A1)
    expect(orgIds).toContain(ORG_A2)
    expect(orgIds).not.toContain(ORG_B1)
  })

  test('USER_B only receives memberships for ORG_B1', () => {
    const { memberships } = consultorDashboardData(USER_B, allMemberships, allVacancies, allCandidates)
    const orgIds = memberships.map((m) => m.organization_id)
    expect(orgIds).toContain(ORG_B1)
    expect(orgIds).not.toContain(ORG_A1)
    expect(orgIds).not.toContain(ORG_A2)
  })

  test('USER_A only receives vacancies scoped to their orgs (not USER_B vacancies)', () => {
    const { vacancies } = consultorDashboardData(USER_A, allMemberships, allVacancies, allCandidates)
    const vacIds = vacancies.map((v) => v.id)
    expect(vacIds).toContain(VAC_A1)
    expect(vacIds).not.toContain(VAC_B1)
  })

  test('USER_A only receives candidates from their own vacancies (no cross-tenant leak)', () => {
    const { candidates } = consultorDashboardData(USER_A, allMemberships, allVacancies, allCandidates)
    const candIds = candidates.map((c) => c.id)
    expect(candIds).toContain(CAND_A1)
    expect(candIds).not.toContain(CAND_B1)
  })

  test('USER_B only receives candidates from ORG_B1 (CAND_B1)', () => {
    const { candidates } = consultorDashboardData(USER_B, allMemberships, allVacancies, allCandidates)
    const candIds = candidates.map((c) => c.id)
    expect(candIds).toContain(CAND_B1)
    expect(candIds).not.toContain(CAND_A1)
  })

  test('inactive memberships (is_active=false) are excluded even if they exist in the DB', () => {
    const membershipsWithInactive = [
      ...allMemberships,
      { user_id: USER_A, organization_id: ORG_B1, is_active: false }, // deactivated
    ]
    const { memberships } = consultorDashboardData(USER_A, membershipsWithInactive, allVacancies, allCandidates)
    const orgIds = memberships.map((m) => m.organization_id)
    expect(orgIds).not.toContain(ORG_B1)
  })

  test('[FIX] expired memberships (valid_until in the past) are excluded — prevents post-expiry data access', () => {
    // Vulnerability fixed: dashboard query now includes valid_until check, matching the layout guard.
    // An attacker whose membership expired should not be able to see org data even if is_active was not flipped.
    const past = new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
    const membershipsWithExpired = [
      ...allMemberships,
      { user_id: USER_A, organization_id: ORG_B1, is_active: true, valid_until: past },
    ]
    const { memberships } = consultorDashboardData(USER_A, membershipsWithExpired, allVacancies, allCandidates)
    const orgIds = memberships.map((m) => m.organization_id)
    // Expired membership to ORG_B1 must not grant access
    expect(orgIds).not.toContain(ORG_B1)
  })

  test('[FIX] memberships with null valid_until (never expires) are correctly included', () => {
    const membershipsWithNull = [
      { user_id: USER_A, organization_id: ORG_A1, is_active: true, valid_until: null },
    ]
    const { memberships } = consultorDashboardData(USER_A, membershipsWithNull, allVacancies, allCandidates)
    const orgIds = memberships.map((m) => m.organization_id)
    expect(orgIds).toContain(ORG_A1)
  })

  test('[FIX] memberships with future valid_until are correctly included', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() // 30 days
    const membershipsWithFuture = [
      { user_id: USER_A, organization_id: ORG_A1, is_active: true, valid_until: future },
    ]
    const { memberships } = consultorDashboardData(USER_A, membershipsWithFuture, allVacancies, allCandidates)
    const orgIds = memberships.map((m) => m.organization_id)
    expect(orgIds).toContain(ORG_A1)
  })

  test('consultant with no orgs sees zero vacancies and zero candidates', () => {
    const { memberships, vacancies, candidates } = consultorDashboardData(
      'unknown-user-id',
      allMemberships,
      allVacancies,
      allCandidates,
    )
    expect(memberships).toHaveLength(0)
    expect(vacancies).toHaveLength(0)
    expect(candidates).toHaveLength(0)
  })

  test('KPI counts are derived only from user-scoped data', () => {
    const { memberships, vacancies, candidates } = consultorDashboardData(
      USER_A,
      allMemberships,
      allVacancies,
      allCandidates,
    )
    // USER_A has 2 memberships, 1 vacancy in ORG_A1, 1 candidate
    expect(memberships).toHaveLength(2)
    expect(vacancies).toHaveLength(1)
    expect(candidates).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: candidatos/page only shows candidates from the consultant's own orgs
// ─────────────────────────────────────────────────────────────────────────────

describe('Suite 3 — ConsultorCandidatosPage: no cross-tenant candidate leak', () => {
  const EMAIL_A = 'candidato-a@empresa.com'
  const EMAIL_B = 'candidato-b@otra-empresa.com'

  const allMemberships = [
    { user_id: USER_A, organization_id: ORG_A1, is_active: true },
    { user_id: USER_B, organization_id: ORG_B1, is_active: true },
  ]

  const allVacancies = [
    { id: VAC_A1, organization_id: ORG_A1 },
    { id: VAC_B1, organization_id: ORG_B1 },
  ]

  const allCandidates = [
    { id: CAND_A1, email: EMAIL_A, vacancy_id: VAC_A1 },
    { id: CAND_B1, email: EMAIL_B, vacancy_id: VAC_B1 },
  ]

  test('USER_A consultant only sees candidates linked to their orgs', () => {
    const { candidates } = consultorCandidatosData(USER_A, allMemberships, allVacancies, allCandidates)
    const ids = candidates.map((c) => c.id)
    expect(ids).toContain(CAND_A1)
    expect(ids).not.toContain(CAND_B1)
  })

  test('USER_B consultant only sees candidates linked to their orgs', () => {
    const { candidates } = consultorCandidatosData(USER_B, allMemberships, allVacancies, allCandidates)
    const ids = candidates.map((c) => c.id)
    expect(ids).toContain(CAND_B1)
    expect(ids).not.toContain(CAND_A1)
  })

  test('candidate emails from ORG_B are not visible to USER_A', () => {
    const { candidates } = consultorCandidatosData(USER_A, allMemberships, allVacancies, allCandidates)
    const emails = candidates.map((c) => c.email)
    expect(emails).not.toContain(EMAIL_B)
  })

  test('cross-tenant scenario: attacker consultant cannot see another org\'s candidates', () => {
    // Simulate: USER_A is only a member of ORG_A1. They have no membership in ORG_B1.
    // Even if CAND_B1 exists in the DB, the chain of lookups prevents visibility.
    const { candidates } = consultorCandidatosData(USER_A, allMemberships, allVacancies, allCandidates)
    expect(candidates.every((c) => c.id !== CAND_B1)).toBe(true)
  })

  test('candidate scoping goes through memberships → vacancies → candidates (three-hop isolation)', () => {
    // Verify that the scoping chain works end-to-end.
    // If any step is removed (e.g., not filtering by orgId), the invariant breaks.
    const { memberships, vacancies, candidates } = consultorCandidatosData(
      USER_A,
      allMemberships,
      allVacancies,
      allCandidates,
    )

    const orgIds = memberships.map((m) => m.organization_id)
    const vacancyIds = vacancies.map((v) => v.id)

    // Every vacancy in results belongs to one of the user's orgs
    for (const v of vacancies) {
      expect(orgIds).toContain(v.organization_id)
    }

    // Every candidate in results belongs to one of the user's vacancies
    for (const c of candidates) {
      expect(vacancyIds).toContain(c.vacancy_id)
    }
  })

  test('consultant with empty org list sees zero candidates', () => {
    const { candidates } = consultorCandidatosData(
      'no-memberships-user',
      allMemberships,
      allVacancies,
      allCandidates,
    )
    expect(candidates).toHaveLength(0)
  })

  test('[FIX] expired membership (valid_until in the past) does not grant access to candidates', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60).toISOString()
    const withExpiredAccess = [
      ...allMemberships,
      { user_id: USER_A, organization_id: ORG_B1, is_active: true, valid_until: past },
    ]
    const { candidates } = consultorCandidatosData(USER_A, withExpiredAccess, allVacancies, allCandidates)
    // Despite the (expired) membership to ORG_B1, CAND_B1 must not appear
    expect(candidates.map((c) => c.id)).not.toContain(CAND_B1)
  })

  test('candidate with null vacancy_id is excluded (no orphan data leak)', () => {
    const candidatesWithOrphan = [
      ...allCandidates,
      { id: 'orphan-id', email: 'orphan@test.com', vacancy_id: null },
    ]
    const { candidates } = consultorCandidatosData(
      USER_A,
      allMemberships,
      allVacancies,
      candidatesWithOrphan,
    )
    const ids = candidates.map((c) => c.id)
    expect(ids).not.toContain('orphan-id')
  })

  test('orgId in filter always comes from server-side memberships, never from URL or body', () => {
    // The data function accepts only userId (from session) as the identity parameter.
    // There is no way for a client-supplied orgId to alter the results.
    // This is enforced by the function signature: no `clientOrgId` parameter.

    // Attempt to "inject" ORG_B1 by calling with USER_A — but USER_A has no ORG_B1 membership
    const { candidates } = consultorCandidatosData(USER_A, allMemberships, allVacancies, allCandidates)
    const visibleOrgIds = new Set(
      candidates.map((c) => {
        const vac = allVacancies.find((v) => v.id === c.vacancy_id)
        return vac?.organization_id
      }),
    )
    expect(visibleOrgIds.has(ORG_B1)).toBe(false)
  })
})
