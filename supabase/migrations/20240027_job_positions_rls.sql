-- ══════════════════════════════════════════════════════════════════════════
-- 20240027_job_positions_rls
--
-- PROBLEMA CORREGIDO:
--   La tabla `job_positions` NO tiene Row Level Security habilitado en ninguna
--   de las migraciones existentes. La búsqueda sobre todas las migraciones
--   (`grep -r "job_positions" supabase/migrations/ | grep -i "row level\|rls\|policy"`)
--   no devuelve ningún resultado.
--
--   Consecuencia: cualquier usuario autenticado con acceso a PostgREST puede
--   leer, insertar, actualizar o eliminar job_positions de CUALQUIER
--   organización sin restricción de tenant. Esto es una brecha de aislamiento
--   multi-tenant crítica, especialmente porque job_positions contiene perfiles
--   de 16PF, competencias y criterios de evaluación sensibles.
--
--   Relación con 20240026: los CHECK constraints de cross-tenant que verifica
--   job_position_belongs_to_org() solo tienen efecto si RLS en job_positions
--   existe y filtra lecturas; sin RLS un atacante puede igualmente leer
--   perfiles de otras orgs mediante SELECT directo.
--
-- SOLUCIÓN:
--   1. Habilitar RLS en job_positions (ENABLE + FORCE para cubrir superusers
--      de aplicación que usen rol authenticated).
--   2. Crear política FOR ALL con aislamiento de tenant via user_org_id().
--      user_org_id() (definida en 20240001, reforzada en 20240022) verifica
--      is_active = true AND (valid_until IS NULL OR valid_until > now()).
--   3. Crear política SELECT separada para tokens de evaluación 16PF
--      (anon/service_role), si aplica — ver nota al pie.
--
-- IDEMPOTENCIA:
--   - ALTER TABLE ... ENABLE ROW LEVEL SECURITY es idempotente en PostgreSQL.
--   - DROP POLICY IF EXISTS antes de CREATE POLICY garantiza reaplicabilidad.
-- ══════════════════════════════════════════════════════════════════════════


-- ── 1. HABILITAR RLS EN job_positions ────────────────────────────────────
--
-- ENABLE: activa RLS para el rol authenticated y demás roles no superuser.
-- FORCE: también aplica RLS al owner de la tabla (rol de la aplicación),
--        cierra la brecha donde el rol postgres bypasea RLS por defecto.
--
ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_positions FORCE  ROW LEVEL SECURITY;


-- ── 2. POLÍTICA DE AISLAMIENTO DE TENANT (todas las operaciones) ──────────
--
-- Cubre SELECT, INSERT, UPDATE, DELETE para el rol authenticated.
-- user_org_id() retorna NULL si no hay membresía activa y vigente,
-- por lo que la comparación organization_id = NULL es siempre FALSE:
-- ningún usuario sin membresía válida puede acceder a job_positions.
--
-- WITH CHECK en la política FOR ALL también protege INSERT y UPDATE,
-- impidiendo que un usuario inserte/actualice job_positions con un
-- organization_id diferente al de su membresía activa.
--
DROP POLICY IF EXISTS "job_positions_tenant_isolation" ON public.job_positions;

CREATE POLICY "job_positions_tenant_isolation" ON public.job_positions
  FOR ALL
  USING  (organization_id = public.user_org_id())
  WITH CHECK (organization_id = public.user_org_id());

COMMENT ON POLICY "job_positions_tenant_isolation" ON public.job_positions IS
  'Aislamiento de tenant estricto: un usuario solo puede ver y modificar '
  'job_positions de su propia organización activa y vigente. '
  'Delega la verificación de vigencia (valid_until) a user_org_id() '
  '(SECURITY DEFINER, definida en 20240022_membership_rls_hardening). '
  'Aplica a SELECT, INSERT, UPDATE y DELETE. '
  'NOTA: las rutas de API que generan tokens 16PF para evaluadores externos '
  'deben usar service_role (bypass RLS) o una función SECURITY DEFINER '
  'dedicada si necesitan leer job_positions sin membresía activa.';


-- ── 3. ÍNDICE DE SOPORTE (si no existe) ───────────────────────────────────
--
-- El índice idx_job_positions_org_status de 20240005 cubre (organization_id, status).
-- Aquí se asegura la existencia de un índice simple en organization_id
-- para las consultas de RLS que solo filtran por org (sin filtro de status).
-- IF NOT EXISTS garantiza idempotencia.
--
CREATE INDEX IF NOT EXISTS idx_job_positions_org
  ON public.job_positions (organization_id);

COMMENT ON INDEX public.idx_job_positions_org IS
  'Índice de soporte para el filtro de RLS de aislamiento de tenant. '
  'Creado en 20240027; complementa idx_job_positions_org_status de 20240005.';
