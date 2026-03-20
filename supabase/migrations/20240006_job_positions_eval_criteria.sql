-- ══════════════════════════════════════════════════════════
-- job_positions — evaluation_criteria for Performance module
-- ══════════════════════════════════════════════════════════

ALTER TABLE job_positions
  ADD COLUMN IF NOT EXISTS evaluation_criteria jsonb DEFAULT '[]'::jsonb;

-- Index for Performance to quickly find positions with criteria defined
CREATE INDEX IF NOT EXISTS idx_job_positions_has_criteria
  ON job_positions ((evaluation_criteria IS NOT NULL AND jsonb_array_length(evaluation_criteria) > 0));

COMMENT ON COLUMN job_positions.evaluation_criteria IS
  'Array of evaluation criteria with weights that sum to 100. Performance module reads this to auto-generate evaluation templates.';
