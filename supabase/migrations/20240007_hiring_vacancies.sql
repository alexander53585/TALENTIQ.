-- ══════════════════════════════════════════════════════════
-- vacancies — Hiring Module Vacancies table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vacancies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  job_position_id uuid NOT NULL REFERENCES job_positions(id),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'created' 
    CHECK (status IN ('created', 'ready', 'published', 'in_process', 'closed', 'cancelled')),
  publication_channels jsonb DEFAULT '[]'::jsonb,
  ad_content jsonb DEFAULT '{}'::jsonb,
  evaluation_structure jsonb DEFAULT '{"16pf": 25, "competencies": 30, "technical": 20, "cultural": 15, "ethical": 10}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vacancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vacancies for their org"
  ON vacancies FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_memberships WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can insert vacancies for their org"
  ON vacancies FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_memberships WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can update vacancies for their org"
  ON vacancies FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_memberships WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE INDEX idx_vacancies_org ON vacancies(organization_id);
CREATE INDEX idx_vacancies_status ON vacancies(status);
