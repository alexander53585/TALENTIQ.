-- ══════════════════════════════════════════════════════════
-- 20240012_pf16_rls_hardening
-- Hardening de seguridad para la tabla pf16_evaluations
-- ══════════════════════════════════════════════════════════

-- 1) Eliminar la política global que permite SELECT público (crítico para multitenancy)
DROP POLICY IF EXISTS "pf16_eval_token_read" ON pf16_evaluations;

-- 2) Asegurar que pf16_evaluations use aislamiento estricto por organization_id
-- Si la política pf16_eval_tenant_isolation ya existe, la recreamos para mayor seguridad
DROP POLICY IF EXISTS "pf16_eval_tenant_isolation" ON pf16_evaluations;

CREATE POLICY "pf16_eval_tenant_isolation" ON pf16_evaluations
  FOR ALL
  USING (organization_id = user_org_id())
  WITH CHECK (organization_id = user_org_id());

-- 3) Hardening para pf16_cargo_comparisons
DROP POLICY IF EXISTS "pf16_comp_tenant_isolation" ON pf16_cargo_comparisons;

CREATE POLICY "pf16_comp_tenant_isolation" ON pf16_cargo_comparisons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pf16_evaluations
      WHERE pf16_evaluations.id = pf16_cargo_comparisons.evaluation_id
      AND pf16_evaluations.organization_id = user_org_id()
    )
  );

-- 4) Nota sobre acceso por token:
-- El acceso público mediante access_token para candidatos DEBE realizarse 
-- únicamente a través de API Routes usando el `service_role` de Supabase
-- con filtrado explícito por token, evitando exponer RLS de forma global.

COMMENT ON TABLE pf16_evaluations IS 'Tabla de evaluaciones 16PF con RLS endurecido. Acceso público solo vía API service_role por token.';
