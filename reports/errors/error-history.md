# Error History — KultuRH Project
> Memoria acumulativa de errores. Actualizado: 2026-03-23T03:58:15.893Z

## Resumen
- Total errores únicos: 13
- Activos: 8
- Resueltos: 5
- Total ocurrencias registradas: 26

## Top 20 Errores (por frecuencia)

| Signature | Módulo | Count | Estado | Último visto |
|---|---|---|---|---|
| Test FAIL: .claude/worktrees/agent-a49a3971/lib/mo | Vitest | 29 | active | 2026-03-23 |
| Test FAIL: .claude/worktrees/agent-a770881f/lib/mo | Vitest | 29 | active | 2026-03-23 |
| Test failed: .claude/worktrees/agent-a49a3971/lib/ | Vitest | 29 | active | 2026-03-23 |
| Test failed: .claude/worktrees/agent-a770881f/lib/ | Vitest | 29 | active | 2026-03-23 |
| TS2345: string|undefined not assignable to string  | app/api/**/route.ts | 6 | resolved | 2026-03-20 |
| TS7006: catch parameter implicitly has any type | app/api/**/route.ts | 5 | resolved | 2026-03-22 |
| TS2802: Set/Map iterator spread downlevelIteration | lib/16pf/engine.ts | 4 | resolved | 2026-03-15 |
| SQL: policy already exists for table | supabase/migrations/*.sql | 3 | resolved | 2026-03-22 |
| Test FAIL: .claude/worktrees/agent-a49a3971/lib/mo | Vitest | 1 | active | 2026-03-23 |
| Test FAIL: .claude/worktrees/agent-a770881f/lib/mo | Vitest | 1 | active | 2026-03-23 |
| Test failed: .claude/worktrees/agent-a49a3971/lib/ | Vitest | 1 | active | 2026-03-23 |
| Test failed: .claude/worktrees/agent-a770881f/lib/ | Vitest | 1 | active | 2026-03-23 |
| TS: await has no effect on params in Next.js 14 ro | app/api/16pf/evaluations/[id]/send/route.ts | 1 | resolved | 2026-03-22 |

## Reglas de Prevención

- **TS2802: Set/Map iterator spread downlevelIteration**: NEVER use spread on Set/Map. Always Array.from(). Check tsconfig target before using iterators.
- **TS2345: string|undefined not assignable to string in Supabas**: All Supabase query results are nullable. Always null-check before accessing properties.
- **SQL: policy already exists for table**: In SQL migrations: DROP POLICY IF EXISTS before CREATE POLICY. Use DO $$ blocks for idempotency.
- **TS7006: catch parameter implicitly has any type**: Always type catch as unknown. Use toErrorResponse(err) from lib/moments/errors.ts for API routes.
- **TS: await has no effect on params in Next.js 14 route handle**: In Next.js 14 App Router: params in route.ts are NOT promises. Never await params directly.

---
_Generado por `npm run errors:learn`_
