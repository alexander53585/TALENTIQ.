-- ══════════════════════════════════════════════════════════
-- Foundation Module — Schema Migration
-- ══════════════════════════════════════════════════════════

-- ── organization_profiles ──────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_profiles (
  id                        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id           uuid UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Estrategia
  mission                   text,
  vision                    text,
  purpose                   text,
  values                    jsonb,
  value_proposition         text,
  key_processes             text[],
  critical_areas            text[],
  -- KultuDNA (generado por IA)
  kultudna_summary          text,
  -- Contexto organizacional
  work_mode                 text,          -- remoto | presencial | híbrido
  org_structure             text,          -- funcional | matricial | plana | holding
  digital_maturity          text,          -- básico | intermedio | avanzado | nativo
  -- Readiness
  readiness_score           int  DEFAULT 0,
  is_ready_for_architecture bool DEFAULT false,
  -- Auditoría
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

-- ── cardinal_competencies ──────────────────────────────────
CREATE TABLE IF NOT EXISTS cardinal_competencies (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  definition           text,
  dimension            text,          -- liderazgo | técnica | cultural | relacional
  relative_weight      int  DEFAULT 0, -- pesos deben sumar 100 por org
  min_level_expected   int  DEFAULT 1, -- N1-N5
  is_active            bool DEFAULT true,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- ── strategic_axes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS strategic_axes (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  priority        int  DEFAULT 1,
  is_active       bool DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── Índices ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_org_profiles_org    ON organization_profiles (organization_id);
CREATE INDEX IF NOT EXISTS idx_cardinales_org      ON cardinal_competencies  (organization_id);
CREATE INDEX IF NOT EXISTS idx_strategic_axes_org  ON strategic_axes         (organization_id);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE organization_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardinal_competencies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_axes         ENABLE ROW LEVEL SECURITY;

-- Helper: devuelve org_id del usuario activo
CREATE OR REPLACE FUNCTION user_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organization_id
  FROM   user_memberships
  WHERE  user_id   = auth.uid()
    AND  is_active = true
  LIMIT 1
$$;

-- Políticas: cada empresa solo accede a sus propios datos
CREATE POLICY org_profiles_isolation ON organization_profiles
  USING  (organization_id = user_org_id())
  WITH CHECK (organization_id = user_org_id());

CREATE POLICY cardinales_isolation ON cardinal_competencies
  USING  (organization_id = user_org_id())
  WITH CHECK (organization_id = user_org_id());

CREATE POLICY axes_isolation ON strategic_axes
  USING  (organization_id = user_org_id())
  WITH CHECK (organization_id = user_org_id());

-- ── Trigger: updated_at automático ────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_org_profiles_updated
  BEFORE UPDATE ON organization_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cardinales_updated
  BEFORE UPDATE ON cardinal_competencies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_axes_updated
  BEFORE UPDATE ON strategic_axes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
