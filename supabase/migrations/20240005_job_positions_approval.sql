-- ══════════════════════════════════════════════════════════
-- job_positions — Approval flow + 16PF reference profile
-- ══════════════════════════════════════════════════════════

ALTER TABLE job_positions
  ADD COLUMN IF NOT EXISTS status              text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','adjusted','approved','versioned','archived')),
  ADD COLUMN IF NOT EXISTS profile_16pf_reference jsonb,
  ADD COLUMN IF NOT EXISTS approval_history   jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review_notes       text,
  ADD COLUMN IF NOT EXISTS approved_by        uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at        timestamptz,
  ADD COLUMN IF NOT EXISTS version            int NOT NULL DEFAULT 1;

-- Index for Hiring: only list approved positions
CREATE INDEX IF NOT EXISTS idx_job_positions_status ON job_positions (status);
CREATE INDEX IF NOT EXISTS idx_job_positions_org_status ON job_positions (organization_id, status);
