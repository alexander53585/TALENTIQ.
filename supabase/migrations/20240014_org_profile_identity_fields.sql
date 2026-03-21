-- ══════════════════════════════════════════════════════════
-- 20240014_org_profile_identity_fields
-- Agrega columnas de identidad organizacional a organization_profiles
-- sector, size, legal_structure (usados en Foundation Fase 1)
-- ══════════════════════════════════════════════════════════

ALTER TABLE organization_profiles
  ADD COLUMN IF NOT EXISTS sector          text,
  ADD COLUMN IF NOT EXISTS size            text,
  ADD COLUMN IF NOT EXISTS legal_structure text;
