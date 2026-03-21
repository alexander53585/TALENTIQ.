-- ══════════════════════════════════════════════════════════
-- 20240013_vacancies_public_fields
-- Agrega campos para el portal público de vacantes y
-- descripción pública independiente del ad_content
-- ══════════════════════════════════════════════════════════

-- Campos adicionales para el portal público
ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS location    text,
  ADD COLUMN IF NOT EXISTS modality    text CHECK (modality IN ('presencial', 'remoto', 'hibrido')),
  ADD COLUMN IF NOT EXISTS description text;

-- Índice para búsquedas por estado (ya existía idx_vacancies_status,
-- pero lo protegemos con IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_vacancies_status_published
  ON vacancies(status)
  WHERE status IN ('published', 'in_process');

COMMENT ON COLUMN vacancies.location    IS 'Ciudad o región donde se ejecuta el cargo (ej. "Bogotá", "Medellín - Remoto")';
COMMENT ON COLUMN vacancies.modality    IS 'Modalidad de trabajo: presencial | remoto | hibrido';
COMMENT ON COLUMN vacancies.description IS 'Descripción pública de la vacante para el portal de empleo. Si está vacía se usa ad_content.linkedin.';
