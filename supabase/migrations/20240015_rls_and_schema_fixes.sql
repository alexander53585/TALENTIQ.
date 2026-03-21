-- ══════════════════════════════════════════════════════════
-- 20240015_rls_and_schema_fixes
-- 1) RLS: Permite a usuarios autenticados crear organizaciones
-- 2) Columnas identidad en organization_profiles (sector, size, legal_structure)
-- 3) Columna de persistencia de fase en Foundation
-- ══════════════════════════════════════════════════════════

-- 1. INSERT policy para organizations (faltaba — bloqueaba el onboarding)
DROP POLICY IF EXISTS "org_create" ON public.organizations;
CREATE POLICY "org_create" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE policy para dueños/admins
DROP POLICY IF EXISTS "org_update" ON public.organizations;
CREATE POLICY "org_update" ON public.organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM public.user_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

-- 2. Columnas de identidad organizacional en Foundation Fase 1
ALTER TABLE organization_profiles
  ADD COLUMN IF NOT EXISTS sector          text,
  ADD COLUMN IF NOT EXISTS size            text,
  ADD COLUMN IF NOT EXISTS legal_structure text;

-- 3. Persistencia de fase actual de Foundation en DB
ALTER TABLE organization_profiles
  ADD COLUMN IF NOT EXISTS foundation_phase int DEFAULT 1;
