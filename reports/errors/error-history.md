# Error History — KultuRH Project
> Memoria acumulativa de errores. Actualizado: 2026-03-22T00:00:00.000Z

## Resumen
- Total errores únicos: 5
- Activos: 0
- Resueltos: 5
- Total ocurrencias registradas: 18

## Reglas de Prevención

- **TS2802: Set/Map iterator spread downlevelIteration**: NEVER use spread on Set/Map. Always Array.from(). Check tsconfig target before using iterators.
- **TS2345: string|undefined not assignable to string in Supabase result**: All Supabase query results are nullable. Always null-check before accessing properties.
- **SQL: policy already exists for table**: In SQL migrations: DROP POLICY IF EXISTS before CREATE POLICY. Use DO $$ blocks for idempotency.
- **TS7006: catch parameter implicitly has any type**: Always type catch as unknown. Use toErrorResponse(err) from lib/moments/errors.ts for API routes.
- **TS: await has no effect on params in Next.js 14 route handler**: In Next.js 14 App Router: params in route.ts are NOT promises. Never await params directly.

---
_Generado por `npm run errors:learn`_
