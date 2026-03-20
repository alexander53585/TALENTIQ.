-- ══════════════════════════════════════════════════════════
-- job_positions — KultuValue + Competencies columns
-- ══════════════════════════════════════════════════════════

ALTER TABLE job_positions
  ADD COLUMN IF NOT EXISTS kultvalue_factors    jsonb,
  ADD COLUMN IF NOT EXISTS kultvalue_score      int,
  ADD COLUMN IF NOT EXISTS kultvalue_band       text,
  ADD COLUMN IF NOT EXISTS specific_competencies jsonb,
  ADD COLUMN IF NOT EXISTS cardinal_competencies_ids uuid[];

-- Index for band-based queries
CREATE INDEX IF NOT EXISTS idx_job_positions_band ON job_positions (kultvalue_band);
