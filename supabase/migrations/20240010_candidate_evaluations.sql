-- ══════════════════════════════════════════════════════════
-- candidate_evaluations — KultuFit Scoring System
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS candidate_evaluations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  evaluation_type text NOT NULL 
    CHECK (evaluation_type IN ('16pf', 'competencies', 'technical', 'cultural', 'ethical', 'feedback')),
  conducted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  score numeric(4,2),
  raw_data text, -- Almacenaremos string cifrado o JSONB textificado si es 16PF
  ai_interpretation text,
  notes text,
  conducted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Índices de búsqueda
CREATE INDEX idx_cand_eval_candidate ON candidate_evaluations(candidate_id);
CREATE INDEX idx_cand_eval_type ON candidate_evaluations(evaluation_type);

-- RLS
ALTER TABLE candidate_evaluations ENABLE ROW LEVEL SECURITY;

-- Select policy: Usuarios de la misma organización del candidato pueden ver, 
-- pero OJO: raw_data y ai_interpretation se recomienda filtrarlos en el backend.
CREATE POLICY "Users can view evaluations for their org candidates"
  ON candidate_evaluations FOR SELECT
  USING (
    candidate_id IN (
      SELECT id FROM candidates WHERE organization_id IN (
        SELECT organization_id FROM user_memberships WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can manage evaluations for their org candidates"
  ON candidate_evaluations FOR ALL
  USING (
    candidate_id IN (
      SELECT id FROM candidates WHERE organization_id IN (
        SELECT organization_id FROM user_memberships WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
