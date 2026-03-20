-- ══════════════════════════════════════════════════════════
-- hiring candidates update — adapt to Pipeline requirements
-- ══════════════════════════════════════════════════════════

-- Remove old constraint
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_status_check;

-- Rename and update columns
ALTER TABLE candidates 
  RENAME COLUMN first_name TO full_name;

ALTER TABLE candidates 
  DROP COLUMN IF EXISTS last_name,
  DROP COLUMN IF EXISTS resume_url;

ALTER TABLE candidates 
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS cv_storage_path text,
  ADD COLUMN IF NOT EXISTS kultfit_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS consent_16pf boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_history jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes jsonb DEFAULT '{"specialist": [], "manager": []}'::jsonb;

-- Modify default status
ALTER TABLE candidates ALTER COLUMN status SET DEFAULT 'received';

-- Re-apply new constraint
ALTER TABLE candidates ADD CONSTRAINT candidates_status_check 
  CHECK (status IN ('received', 'reviewing', 'evaluated', 'interviewed', 'finalist', 'offer', 'hired', 'discarded', 'reserved'));
