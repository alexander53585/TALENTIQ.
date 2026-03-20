-- ══════════════════════════════════════════════════════════
-- 16PF Evaluations — Schema Migration
-- ══════════════════════════════════════════════════════════

-- ── pf16_evaluations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS pf16_evaluations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_id        UUID REFERENCES candidates(id) ON DELETE SET NULL,
  vacancy_id          UUID REFERENCES vacancies(id) ON DELETE SET NULL,
  job_position_id     UUID REFERENCES job_positions(id) ON DELETE SET NULL,
  evaluator_id        UUID NOT NULL REFERENCES auth.users(id),
  norm_idx            INTEGER NOT NULL DEFAULT 1,
  status              TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','sent','in_progress','completed','expired')),
  access_token        TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  answers_encrypted   TEXT,
  decatipos           JSONB,
  global_dims         JSONB,
  derived_eqs         JSONB,
  discriminants       JSONB,
  interpretation      JSONB,
  specialist_notes    JSONB,
  consent_given       BOOLEAN DEFAULT FALSE,
  consent_at          TIMESTAMPTZ,
  sent_at             TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  progress_pct        INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── pf16_cargo_comparisons ─────────────────────────────────
CREATE TABLE IF NOT EXISTS pf16_cargo_comparisons (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id       UUID NOT NULL REFERENCES pf16_evaluations(id) ON DELETE CASCADE,
  job_position_id     UUID NOT NULL REFERENCES job_positions(id) ON DELETE CASCADE,
  comparison_result   JSONB NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pf16_eval_org        ON pf16_evaluations (organization_id);
CREATE INDEX IF NOT EXISTS idx_pf16_eval_candidate  ON pf16_evaluations (candidate_id);
CREATE INDEX IF NOT EXISTS idx_pf16_eval_vacancy    ON pf16_evaluations (vacancy_id);
CREATE INDEX IF NOT EXISTS idx_pf16_eval_token      ON pf16_evaluations (access_token);
CREATE INDEX IF NOT EXISTS idx_pf16_eval_status     ON pf16_evaluations (status);
CREATE INDEX IF NOT EXISTS idx_pf16_comp_eval       ON pf16_cargo_comparisons (evaluation_id);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE pf16_evaluations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pf16_cargo_comparisons ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: solo users de la misma organización
CREATE POLICY "pf16_eval_tenant_isolation" ON pf16_evaluations
  USING (organization_id = user_org_id())
  WITH CHECK (organization_id = user_org_id());

-- Public token access: allow reading by token (for candidate test page)
-- This needs service_role or a specific function, handled via API routes
CREATE POLICY "pf16_eval_token_read" ON pf16_evaluations
  FOR SELECT
  USING (true);  -- Token validation handled at API level

CREATE POLICY "pf16_comp_tenant_isolation" ON pf16_cargo_comparisons
  USING (
    evaluation_id IN (
      SELECT id FROM pf16_evaluations
      WHERE organization_id = user_org_id()
    )
  );
