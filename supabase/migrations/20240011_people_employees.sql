-- ══════════════════════════════════════════════════════════
-- employees — Módulo People (Core del nuevo empleado)
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  candidate_id uuid REFERENCES candidates(id) ON DELETE SET NULL,
  job_position_id uuid REFERENCES job_positions(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  hire_date date,
  status text DEFAULT 'onboarding' 
    CHECK (status IN ('onboarding', 'active', 'inactive', 'terminated')),
  onboarding_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employees for their org"
  ON employees FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_memberships WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can manage employees for their org"
  ON employees FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_memberships WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE INDEX idx_employees_org ON employees(organization_id);
