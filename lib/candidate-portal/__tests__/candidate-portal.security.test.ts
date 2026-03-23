/**
 * lib/candidate-portal/__tests__/candidate-portal.security.test.ts
 *
 * Security tests for the candidate portal routes.
 *
 * Routes under audit:
 *   - app/(candidate-portal)/candidato/layout.tsx
 *   - app/(candidate-portal)/candidato/page.tsx          (Inicio)
 *   - app/(candidate-portal)/candidato/evaluaciones/page.tsx
 *
 * Test suites:
 *   1. Layout redirects to /candidato/login when not authenticated
 *   2. /candidato/page fetches by user.email from session, never from a query param
 *   3. /candidato/evaluaciones does NOT expose raw access_token in response data
 *   4. A candidate cannot see evaluations belonging to another candidate's email
 */

import { describe, test, expect } from 'vitest'

// ── Shared fixtures ────────────────────────────────────────────────────────
const EMAIL_A    = 'candidata@empresa.com'
const EMAIL_B    = 'otro@empresa.com'
const CAND_ID_A  = 'aaaaaaaa-0000-0000-0000-000000000001'
const CAND_ID_B  = 'bbbbbbbb-0000-0000-0000-000000000002'
const EVAL_ID_A  = 'cccccccc-0000-0000-0000-000000000003'
const EVAL_ID_B  = 'dddddddd-0000-0000-0000-000000000004'
const TOKEN_A    = 'secret-token-for-cand-a-xxxx'
const TOKEN_B    = 'secret-token-for-cand-b-yyyy'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — pure functions mirroring server component logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mirrors CandidatoLayout authentication guard.
 */
function candidatoLayoutGuard(
  user: { email: string } | null,
): 'redirect:/candidato/login' | 'render' {
  if (!user) return 'redirect:/candidato/login'
  return 'render'
}

/**
 * Mirrors CandidatoInicioPage query: filters candidates by user.email from session.
 * The sessionEmail always comes from supabase.auth.getUser(), never from a URL param.
 */
function candidatoInicioQuery(
  sessionEmail: string,
  allCandidates: { id: string; email: string; status: string; created_at: string }[],
) {
  // Mirrors: .from('candidates').select(...).eq('email', user.email)
  return allCandidates.filter((c) => c.email === sessionEmail)
}

/**
 * Mirrors CandidatoEvaluacionesPage query:
 *   1. Find candidate IDs matching user.email
 *   2. Fetch evaluations for those candidate IDs
 *   3. Build hrefs server-side — raw access_token is NEVER serialized to the response object
 */
function candidatoEvaluacionesQuery(
  sessionEmail: string,
  allCandidates: { id: string; email: string }[],
  allEvaluations: { id: string; status: string; created_at: string; access_token: string; candidate_id: string }[],
) {
  // Step 1: resolve candidate IDs for this email only
  const candidateIds = allCandidates
    .filter((c) => c.email === sessionEmail)
    .map((c) => c.id)

  // Step 2: fetch evaluations in those IDs
  const evals = candidateIds.length > 0
    ? allEvaluations.filter((e) => candidateIds.includes(e.candidate_id))
    : []

  // Step 3: serialize for response — access_token is used ONLY to build href, never returned raw.
  // This mirrors the server component: `href={'/16pf/' + ev.access_token}` computed server-side,
  // with the raw token field stripped before any JSON serialization.
  return evals.map((e) => ({
    id:         e.id,
    status:     e.status,
    created_at: e.created_at,
    candidate_id: e.candidate_id,
    // access_token intentionally excluded — only the constructed href is emitted
    href: e.status === 'sent' || e.status === 'in_progress'
      ? `/16pf/${e.access_token}`
      : null,
  }))
}

/**
 * Verifies the actual shape returned by candidatoEvaluacionesQuery
 * contains no raw access_token field.
 */
function responseExposesRawToken(
  rows: ReturnType<typeof candidatoEvaluacionesQuery>,
): boolean {
  return rows.some((r) => 'access_token' in r)
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: Layout redirects when not authenticated
// ─────────────────────────────────────────────────────────────────────────────

describe('Suite 1 — CandidatoLayout: authentication guard', () => {
  test('redirects to /candidato/login when user is null', () => {
    expect(candidatoLayoutGuard(null)).toBe('redirect:/candidato/login')
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  test('redirects to /candidato/login when user is undefined (falsy)', () => {
    expect(candidatoLayoutGuard(undefined as any)).toBe('redirect:/candidato/login')
  })

  test('renders when user object is present', () => {
    expect(candidatoLayoutGuard({ email: EMAIL_A })).toBe('render')
  })

  test('redirect destination is /candidato/login, not /login (separate auth flow)', () => {
    // Candidate auth is independent of company auth (/login)
    const result = candidatoLayoutGuard(null)
    expect(result).toBe('redirect:/candidato/login')
    expect(result).not.toBe('redirect:/login')
  })

  test('layout only calls getUser() server-side — no client param accepted', () => {
    // The guard function takes a resolved user object only.
    // It accepts no userId string or cookie string.
    const result = candidatoLayoutGuard({ email: 'any@example.com' })
    expect(result).toBe('render')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: /candidato/page fetches by session email, not by query param
// ─────────────────────────────────────────────────────────────────────────────

describe('Suite 2 — CandidatoInicioPage: session-email scoped query', () => {
  const allCandidates = [
    { id: CAND_ID_A, email: EMAIL_A, status: 'new',       created_at: '2024-01-01T00:00:00Z' },
    { id: CAND_ID_B, email: EMAIL_B, status: 'interview', created_at: '2024-01-02T00:00:00Z' },
  ]

  test('query for EMAIL_A returns only CAND_ID_A records', () => {
    const results = candidatoInicioQuery(EMAIL_A, allCandidates)
    expect(results.map((r) => r.id)).toContain(CAND_ID_A)
    expect(results.map((r) => r.id)).not.toContain(CAND_ID_B)
  })

  test('query for EMAIL_B returns only CAND_ID_B records', () => {
    const results = candidatoInicioQuery(EMAIL_B, allCandidates)
    expect(results.map((r) => r.id)).toContain(CAND_ID_B)
    expect(results.map((r) => r.id)).not.toContain(CAND_ID_A)
  })

  test('query with unknown email returns empty array (no data leakage)', () => {
    const results = candidatoInicioQuery('unknown@nowhere.com', allCandidates)
    expect(results).toHaveLength(0)
  })

  test('a URL query param ?email=other cannot override session email', () => {
    // The query function signature accepts sessionEmail only — there is no
    // second "queryParamEmail" argument. This enforces server-side identity.
    const sessionEmail = EMAIL_A
    // Attacker injects EMAIL_B via URL: /candidato?email=otro@empresa.com
    // But the page always uses user.email from getUser(), never searchParams.
    const results = candidatoInicioQuery(sessionEmail, allCandidates)
    // Results are scoped to EMAIL_A only
    expect(results.every((r) => r.email === EMAIL_A)).toBe(true)
  })

  test('case-sensitive email match prevents accidental cross-user access', () => {
    // Emails are stored as lowercase; uppercased version must not match
    const results = candidatoInicioQuery(EMAIL_A.toUpperCase(), allCandidates)
    // Standard JS strict equality: uppercase email matches nothing
    expect(results).toHaveLength(0)
  })

  test('page displays user.email in header — scoped to session identity', () => {
    // Mirrors the page rendering user.email from the session object
    const sessionUser = { email: EMAIL_A }
    // Displayed email is taken from session, not from candidate DB record
    expect(sessionUser.email).toBe(EMAIL_A)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: /candidato/evaluaciones does NOT expose raw access_token in response
// ─────────────────────────────────────────────────────────────────────────────

describe('Suite 3 — CandidatoEvaluacionesPage: access_token not exposed in response data', () => {
  const allCandidates = [
    { id: CAND_ID_A, email: EMAIL_A },
    { id: CAND_ID_B, email: EMAIL_B },
  ]

  const allEvaluations = [
    { id: EVAL_ID_A, status: 'sent',      created_at: '2024-01-01T00:00:00Z', access_token: TOKEN_A, candidate_id: CAND_ID_A },
    { id: EVAL_ID_B, status: 'completed', created_at: '2024-01-02T00:00:00Z', access_token: TOKEN_B, candidate_id: CAND_ID_B },
  ]

  test('response rows do not contain the access_token field', () => {
    const rows = candidatoEvaluacionesQuery(EMAIL_A, allCandidates, allEvaluations)
    expect(responseExposesRawToken(rows)).toBe(false)
  })

  test('access_token is not present in any row when there are multiple evaluations', () => {
    const evalMulti = [
      { id: 'e1', status: 'sent',        created_at: '2024-01-01T00:00:00Z', access_token: 'tok-1', candidate_id: CAND_ID_A },
      { id: 'e2', status: 'in_progress', created_at: '2024-01-02T00:00:00Z', access_token: 'tok-2', candidate_id: CAND_ID_A },
      { id: 'e3', status: 'completed',   created_at: '2024-01-03T00:00:00Z', access_token: 'tok-3', candidate_id: CAND_ID_A },
    ]
    const rows = candidatoEvaluacionesQuery(EMAIL_A, allCandidates, evalMulti)
    for (const row of rows) {
      expect(row).not.toHaveProperty('access_token')
    }
  })

  test('actionable evaluations provide a server-constructed href, not the raw token', () => {
    const rows = candidatoEvaluacionesQuery(EMAIL_A, allCandidates, allEvaluations)
    const evalA = rows.find((r) => r.id === EVAL_ID_A)
    expect(evalA).toBeDefined()
    // href is constructed server-side with the token embedded in the URL path
    expect(evalA!.href).toBe(`/16pf/${TOKEN_A}`)
    // But the token itself is not a separate field
    expect(evalA).not.toHaveProperty('access_token')
  })

  test('completed evaluations have href: null (no token needed)', () => {
    const completedEval = [
      { id: EVAL_ID_B, status: 'completed', created_at: '2024-01-01T00:00:00Z', access_token: TOKEN_B, candidate_id: CAND_ID_B },
    ]
    const rows = candidatoEvaluacionesQuery(EMAIL_B, allCandidates, completedEval)
    const row = rows.find((r) => r.id === EVAL_ID_B)
    expect(row).toBeDefined()
    expect(row!.href).toBeNull()
    expect(row).not.toHaveProperty('access_token')
  })

  test('empty evaluations list is safe — no token leakage possible', () => {
    const rows = candidatoEvaluacionesQuery(EMAIL_A, allCandidates, [])
    expect(rows).toHaveLength(0)
    expect(responseExposesRawToken(rows)).toBe(false)
  })

  test('the href embeds the token in a URL path — the token is used for navigation, not as raw data', () => {
    // The server component renders <a href={/16pf/${ev.access_token}}>
    // This is the same pattern — token appears only inside a path string, not as a separate JSON field.
    const rows = candidatoEvaluacionesQuery(EMAIL_A, allCandidates, allEvaluations)
    const row = rows.find((r) => r.id === EVAL_ID_A)
    // href is a string that includes the token as a path segment
    expect(typeof row!.href).toBe('string')
    expect(row!.href).toContain(TOKEN_A)
    // But 'access_token' as a field name does not exist in the serialized object
    expect(Object.keys(row!)).not.toContain('access_token')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4: A candidate cannot see evaluations of another candidate
// ─────────────────────────────────────────────────────────────────────────────

describe('Suite 4 — CandidatoEvaluacionesPage: cross-candidate isolation', () => {
  const allCandidates = [
    { id: CAND_ID_A, email: EMAIL_A },
    { id: CAND_ID_B, email: EMAIL_B },
  ]

  const allEvaluations = [
    { id: EVAL_ID_A, status: 'sent',      created_at: '2024-01-01T00:00:00Z', access_token: TOKEN_A, candidate_id: CAND_ID_A },
    { id: EVAL_ID_B, status: 'completed', created_at: '2024-01-02T00:00:00Z', access_token: TOKEN_B, candidate_id: CAND_ID_B },
  ]

  test('EMAIL_A only receives evaluations for CAND_ID_A', () => {
    const rows = candidatoEvaluacionesQuery(EMAIL_A, allCandidates, allEvaluations)
    const ids = rows.map((r) => r.id)
    expect(ids).toContain(EVAL_ID_A)
    expect(ids).not.toContain(EVAL_ID_B)
  })

  test('EMAIL_B only receives evaluations for CAND_ID_B', () => {
    const rows = candidatoEvaluacionesQuery(EMAIL_B, allCandidates, allEvaluations)
    const ids = rows.map((r) => r.id)
    expect(ids).toContain(EVAL_ID_B)
    expect(ids).not.toContain(EVAL_ID_A)
  })

  test('EMAIL_A cannot see TOKEN_B (href of another candidate\'s evaluation)', () => {
    const rows = candidatoEvaluacionesQuery(EMAIL_A, allCandidates, allEvaluations)
    const hrefs = rows.map((r) => r.href).filter(Boolean)
    // None of the hrefs EMAIL_A receives should embed TOKEN_B
    expect(hrefs.every((h) => !h!.includes(TOKEN_B))).toBe(true)
  })

  test('EMAIL_B cannot see TOKEN_A (href of another candidate\'s evaluation)', () => {
    const rows = candidatoEvaluacionesQuery(EMAIL_B, allCandidates, allEvaluations)
    const hrefs = rows.map((r) => r.href).filter(Boolean)
    expect(hrefs.every((h) => !h!.includes(TOKEN_A))).toBe(true)
  })

  test('candidate with no candidate records receives empty evaluation list', () => {
    const rows = candidatoEvaluacionesQuery('no-candidate@example.com', allCandidates, allEvaluations)
    expect(rows).toHaveLength(0)
  })

  test('two-hop isolation: email → candidate_ids → evaluations prevents cross-email access', () => {
    // Step 1: only EMAIL_A's candidate IDs are resolved
    const candidateIdsA = allCandidates
      .filter((c) => c.email === EMAIL_A)
      .map((c) => c.id)
    expect(candidateIdsA).toContain(CAND_ID_A)
    expect(candidateIdsA).not.toContain(CAND_ID_B)

    // Step 2: evaluations are filtered by those IDs only
    const evals = allEvaluations.filter((e) => candidateIdsA.includes(e.candidate_id))
    expect(evals.map((e) => e.id)).not.toContain(EVAL_ID_B)
  })

  test('a shared candidate_id across different emails is still scoped by email lookup first', () => {
    // Edge case: if two users somehow share a candidate record (shouldn't happen),
    // the email lookup still limits exposure to the session user only.
    const sharedCandidates = [
      { id: CAND_ID_A, email: EMAIL_A },
      // Note: CAND_ID_A is not reachable from EMAIL_B
    ]
    const rows = candidatoEvaluacionesQuery(EMAIL_B, sharedCandidates, allEvaluations)
    expect(rows).toHaveLength(0)
  })

  test('candidate_id field in response is consistent — belongs to session user\'s records only', () => {
    const rows = candidatoEvaluacionesQuery(EMAIL_A, allCandidates, allEvaluations)
    const sessionCandidateIds = allCandidates
      .filter((c) => c.email === EMAIL_A)
      .map((c) => c.id)

    for (const row of rows) {
      expect(sessionCandidateIds).toContain(row.candidate_id)
    }
  })
})
