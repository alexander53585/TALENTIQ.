-- ══════════════════════════════════════════════════════════════════════════
-- 20240023_rls_vigencia_all_modules
--
-- Actualiza las políticas RLS de TODOS los módulos para usar user_org_id()
-- en su versión con vigencia (definida en 20240022_membership_rls_hardening).
--
-- CONTEXTO:
--   • Las migraciones originales (20240001–20240011) usaban subconsultas
--     directas sobre user_memberships con solo is_active = true, sin
--     verificar valid_until. Una membresía expirada seguía funcionando.
--   • La migración 20240022 reemplazó user_org_id() para incluir el filtro
--     de vigencia. Las políticas que ya usaban user_org_id() se benefician
--     automáticamente SIN necesidad de cambios (Foundation docs, 16pf, etc.).
--   • Este archivo reemplaza solo las políticas que aún usan subconsultas
--     directas (vacancies, candidates, employees, candidate_evaluations,
--     ai_usage) para consolidar toda la lógica en user_org_id().
--
-- Módulos cubiertos:
--   1. Foundation      — organization_profiles, cardinal_competencies,
--                        strategic_axes, strategic_documents
--                        (ya usan user_org_id() → COMMENT de conformidad)
--   2. Hiring          — vacancies, candidates
--   3. People          — employees
--   4. Candidate Evals — candidate_evaluations
--   5. 16PF            — pf16_evaluations, pf16_cargo_comparisons
--                        (ya usan user_org_id() → COMMENT de conformidad)
--   6. AI usage        — ai_usage
-- ══════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════
-- 1. MÓDULO FOUNDATION
--    Tablas: organization_profiles, cardinal_competencies, strategic_axes,
--            strategic_documents
--
--    Estado: las políticas creadas en 20240001 y 20240002 ya usan
--    user_org_id(). Tras la actualización de esa función en 20240022,
--    estas políticas verifican automáticamente la vigencia de la membresía.
--    Se recrean de forma idempotente para asegurar que existan con el
--    patrón canónico (USING + WITH CHECK).
-- ════════════════════════════════════════════════════════════════════════

-- ── organization_profiles ─────────────────────────────────────────────
DROP POLICY IF EXISTS org_profiles_isolation ON public.organization_profiles;

CREATE POLICY org_profiles_isolation
  ON public.organization_profiles
  FOR ALL
  USING  (organization_id = public.user_org_id())
  WITH CHECK (organization_id = public.user_org_id());

COMMENT ON POLICY org_profiles_isolation ON public.organization_profiles IS
  'Aislamiento de tenant. Delega verificación de vigencia a user_org_id() '
  '(actualizada en 20240022 para incluir valid_until).';

-- ── cardinal_competencies ─────────────────────────────────────────────
DROP POLICY IF EXISTS cardinales_isolation ON public.cardinal_competencies;

CREATE POLICY cardinales_isolation
  ON public.cardinal_competencies
  FOR ALL
  USING  (organization_id = public.user_org_id())
  WITH CHECK (organization_id = public.user_org_id());

COMMENT ON POLICY cardinales_isolation ON public.cardinal_competencies IS
  'Aislamiento de tenant. Delega verificación de vigencia a user_org_id() '
  '(actualizada en 20240022 para incluir valid_until).';

-- ── strategic_axes ────────────────────────────────────────────────────
DROP POLICY IF EXISTS axes_isolation ON public.strategic_axes;

CREATE POLICY axes_isolation
  ON public.strategic_axes
  FOR ALL
  USING  (organization_id = public.user_org_id())
  WITH CHECK (organization_id = public.user_org_id());

COMMENT ON POLICY axes_isolation ON public.strategic_axes IS
  'Aislamiento de tenant. Delega verificación de vigencia a user_org_id() '
  '(actualizada en 20240022 para incluir valid_until).';

-- ── strategic_documents ───────────────────────────────────────────────
DROP POLICY IF EXISTS docs_isolation ON public.strategic_documents;

CREATE POLICY docs_isolation
  ON public.strategic_documents
  FOR ALL
  USING  (organization_id = public.user_org_id())
  WITH CHECK (organization_id = public.user_org_id());

COMMENT ON POLICY docs_isolation ON public.strategic_documents IS
  'Aislamiento de tenant. Delega verificación de vigencia a user_org_id() '
  '(actualizada en 20240022 para incluir valid_until).';


-- ════════════════════════════════════════════════════════════════════════
-- 2. MÓDULO HIRING — vacancies
--
--    Problema: las 3 políticas originales (20240007) usan subconsulta
--    directa sobre user_memberships con solo is_active = true.
--    Se reemplazan por una política FOR ALL que usa user_org_id().
-- ════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view vacancies for their org"   ON public.vacancies;
DROP POLICY IF EXISTS "Users can insert vacancies for their org" ON public.vacancies;
DROP POLICY IF EXISTS "Users can update vacancies for their org" ON public.vacancies;

CREATE POLICY "tenant_isolation_vigencia"
  ON public.vacancies
  FOR ALL
  USING  (organization_id = public.user_org_id())
  WITH CHECK (organization_id = public.user_org_id());

COMMENT ON POLICY "tenant_isolation_vigencia" ON public.vacancies IS
  'Reemplaza las 3 políticas originales de 20240007 que usaban subconsultas '
  'directas sin verificar valid_until. Delega vigencia a user_org_id().';


-- ════════════════════════════════════════════════════════════════════════
-- 3. MÓDULO HIRING — candidates
--
--    Problema: las 2 políticas originales (20240008) usan subconsulta
--    directa sobre user_memberships con solo is_active = true.
--    La política FOR ALL cubría SELECT, INSERT, UPDATE y DELETE pero
--    era redundante con la política SELECT-only.
--    Se consolida en una política FOR ALL usando user_org_id().
-- ════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view candidates for their org"   ON public.candidates;
DROP POLICY IF EXISTS "Users can manage candidates for their org" ON public.candidates;

CREATE POLICY "tenant_isolation_vigencia"
  ON public.candidates
  FOR ALL
  USING  (organization_id = public.user_org_id())
  WITH CHECK (organization_id = public.user_org_id());

COMMENT ON POLICY "tenant_isolation_vigencia" ON public.candidates IS
  'Reemplaza las 2 políticas originales de 20240008 que usaban subconsultas '
  'directas sin verificar valid_until. Delega vigencia a user_org_id().';


-- ════════════════════════════════════════════════════════════════════════
-- 4. MÓDULO PEOPLE — employees
--
--    Problema: las 2 políticas originales (20240011) usan subconsulta
--    directa sobre user_memberships con solo is_active = true.
--    Se consolida en una política FOR ALL usando user_org_id().
-- ════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view employees for their org"   ON public.employees;
DROP POLICY IF EXISTS "Users can manage employees for their org" ON public.employees;

CREATE POLICY "tenant_isolation_vigencia"
  ON public.employees
  FOR ALL
  USING  (organization_id = public.user_org_id())
  WITH CHECK (organization_id = public.user_org_id());

COMMENT ON POLICY "tenant_isolation_vigencia" ON public.employees IS
  'Reemplaza las 2 políticas originales de 20240011 que usaban subconsultas '
  'directas sin verificar valid_until. Delega vigencia a user_org_id().';


-- ════════════════════════════════════════════════════════════════════════
-- 5. MÓDULO CANDIDATE EVALUATIONS — candidate_evaluations
--
--    Problema: las 2 políticas originales (20240010) usan subconsultas
--    anidadas (candidates → user_memberships) con solo is_active = true.
--    candidate_evaluations NO tiene organization_id propio; hereda la
--    organización a través de candidates.
--    Se reemplaza con verificación a través de la tabla candidates que
--    ya usa user_org_id() post-20240023.
-- ════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view evaluations for their org candidates"
  ON public.candidate_evaluations;
DROP POLICY IF EXISTS "Users can manage evaluations for their org candidates"
  ON public.candidate_evaluations;

CREATE POLICY "tenant_isolation_vigencia"
  ON public.candidate_evaluations
  FOR ALL
  USING (
    candidate_id IN (
      SELECT id
      FROM   public.candidates
      WHERE  organization_id = public.user_org_id()
    )
  );

COMMENT ON POLICY "tenant_isolation_vigencia" ON public.candidate_evaluations IS
  'Reemplaza las 2 políticas originales de 20240010. candidate_evaluations no '
  'tiene organization_id propio; el aislamiento se delega a candidates, que a '
  'su vez usa user_org_id() (con vigencia desde 20240022). '
  'WITH CHECK omitido intencionalmente: no hay organization_id directo en esta '
  'tabla para usar en WITH CHECK. El control de inserción se garantiza por la '
  'FK a candidates (que ya está aislada).';


-- ════════════════════════════════════════════════════════════════════════
-- 6. MÓDULO 16PF — pf16_evaluations, pf16_cargo_comparisons
--
--    Estado: la política "pf16_eval_tenant_isolation" fue reemplazada en
--    20240012_pf16_rls_hardening con user_org_id(). Tras la actualización
--    de esa función en 20240022, estas políticas ya verifican vigencia
--    automáticamente.
--    Se recrean de forma idempotente para consolidar el patrón y documentar
--    la conformidad.
-- ════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "pf16_eval_tenant_isolation"  ON public.pf16_evaluations;
DROP POLICY IF EXISTS "pf16_eval_token_read"         ON public.pf16_evaluations;

CREATE POLICY "pf16_eval_tenant_isolation"
  ON public.pf16_evaluations
  FOR ALL
  USING  (organization_id = public.user_org_id())
  WITH CHECK (organization_id = public.user_org_id());

COMMENT ON POLICY "pf16_eval_tenant_isolation" ON public.pf16_evaluations IS
  'Recreada para documentar conformidad con vigencia. '
  'La política "pf16_eval_token_read" (FOR SELECT USING true) fue eliminada: '
  'el acceso por access_token de candidatos debe realizarse exclusivamente '
  'a través de API Routes con service_role, nunca mediante RLS pública. '
  'Ver 20240012_pf16_rls_hardening para contexto original.';

DROP POLICY IF EXISTS "pf16_comp_tenant_isolation" ON public.pf16_cargo_comparisons;

CREATE POLICY "pf16_comp_tenant_isolation"
  ON public.pf16_cargo_comparisons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM   public.pf16_evaluations e
      WHERE  e.id              = pf16_cargo_comparisons.evaluation_id
        AND  e.organization_id = public.user_org_id()
    )
  );

COMMENT ON POLICY "pf16_comp_tenant_isolation" ON public.pf16_cargo_comparisons IS
  'Aislamiento por tenant a través de pf16_evaluations. '
  'user_org_id() ya incluye verificación de vigencia desde 20240022.';


-- ════════════════════════════════════════════════════════════════════════
-- 7. MÓDULO AI USAGE — ai_usage
--
--    Problema: la política "org_members_see_usage" (002_ai_usage) usa
--    subconsulta directa sobre user_memberships con solo is_active = true.
--    Se reemplaza para usar user_org_id() con vigencia.
--
--    La política "users_insert_own_usage" (solo verifica auth.uid() = user_id)
--    se mantiene — no requiere cambio de vigencia ya que cualquier usuario
--    autenticado puede registrar su propio uso.
-- ════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "org_members_see_usage" ON public.ai_usage;

CREATE POLICY "org_members_see_usage"
  ON public.ai_usage
  FOR SELECT
  USING (organization_id = public.user_org_id());

COMMENT ON POLICY "org_members_see_usage" ON public.ai_usage IS
  'Reemplaza la política original de 002_ai_usage que usaba subconsulta '
  'directa sin verificar valid_until. Delega vigencia a user_org_id().';

-- La política de INSERT no cambia pero se documenta:
COMMENT ON POLICY "users_insert_own_usage" ON public.ai_usage IS
  'Permite a usuarios autenticados insertar sus propios registros de uso. '
  'No requiere verificación de vigencia — el registro de uso es propio del '
  'usuario y no depende de la membresía activa del tenant.';
