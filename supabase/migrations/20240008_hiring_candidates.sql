-- ══════════════════════════════════════════════════════════
-- candidates — Hiring candidates table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  vacancy_id uuid REFERENCES vacancies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'screening', 'interview', '16pf', 'offer', 'hired', 'rejected')),
  resume_url text,
  kultufit_score numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view candidates for their org"
  ON candidates FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_memberships WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can manage candidates for their org"
  ON candidates FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_memberships WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE INDEX idx_candidates_org ON candidates(organization_id);
CREATE INDEX idx_candidates_vacancy ON candidates(vacancy_id);
