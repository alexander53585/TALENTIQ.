-- ══════════════════════════════════════════════════════════════════════════
-- 20240026_cross_tenant_constraints
--
-- PROBLEMA CORREGIDO:
--   Las tablas `vacancies` y `candidates` tienen FK simple hacia job_positions
--   y vacancies respectivamente, pero sin garantía de que el recurso
--   referenciado pertenezca a la misma organización.
--
--   Escenario de ataque:
--     1. Actor malicioso con membresía en Org A conoce el UUID de un
--        job_position de Org B (por enumeración o fuga de datos).
--     2. Crea una vacancy en Org A con job_position_id apuntando a Org B.
--     3. RLS permite el INSERT (organization_id es el propio) pero la FK
--        no valida la pertenencia a la misma org.
--     4. Resultado: datos de Org B quedan referenciados desde Org A.
--
-- SOLUCIÓN:
--   Se agregan CHECK constraints respaldados por funciones SECURITY DEFINER
--   que verifican la pertenencia organizacional en tiempo de escritura.
--   No se usan FKs compuestas (requieren cambio de PK en tablas referenciadas)
--   ni triggers (mayor complejidad operativa).
--
-- IDEMPOTENCIA:
--   Todas las operaciones usan DO/EXCEPTION o IF NOT EXISTS para que la
--   migración sea reaplicable sin errores.
-- ══════════════════════════════════════════════════════════════════════════


-- ── 1. FUNCIÓN: verifica que job_position pertenece a una org ─────────────
--
-- SECURITY DEFINER: puede leer job_positions sin depender del RLS del
-- contexto del llamador. search_path fijo previene ataques de sustitución
-- de esquema. STABLE: no modifica datos, puede ser cacheada por sesión.
--
CREATE OR REPLACE FUNCTION public.job_position_belongs_to_org(
  p_job_position_id uuid,
  p_organization_id uuid
) RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.job_positions
    WHERE  id              = p_job_position_id
      AND  organization_id = p_organization_id
  )
$$;

COMMENT ON FUNCTION public.job_position_belongs_to_org(uuid, uuid) IS
  'Verifica que el job_position identificado por p_job_position_id pertenece '
  'a la organización p_organization_id. SECURITY DEFINER con search_path fijo. '
  'Usada en el CHECK constraint vacancies_job_position_same_org.';


-- ── 2. FUNCIÓN: verifica que vacancy pertenece a una org ─────────────────
--
-- Mismas consideraciones de seguridad que la función anterior.
--
CREATE OR REPLACE FUNCTION public.vacancy_belongs_to_org(
  p_vacancy_id      uuid,
  p_organization_id uuid
) RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.vacancies
    WHERE  id              = p_vacancy_id
      AND  organization_id = p_organization_id
  )
$$;

COMMENT ON FUNCTION public.vacancy_belongs_to_org(uuid, uuid) IS
  'Verifica que la vacancy identificada por p_vacancy_id pertenece '
  'a la organización p_organization_id. SECURITY DEFINER con search_path fijo. '
  'Usada en el CHECK constraint candidates_vacancy_same_org.';


-- ── 3. CHECK constraint en vacancies: job_position debe ser de la misma org
--
-- job_position_id es NOT NULL en vacancies (ver 20240007_hiring_vacancies.sql),
-- por lo tanto no es necesario manejar el caso NULL aquí.
-- Se usa DO/EXCEPTION para idempotencia: si el constraint ya existe, se omite.
--
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   information_schema.table_constraints
    WHERE  table_schema    = 'public'
      AND  table_name      = 'vacancies'
      AND  constraint_name = 'vacancies_job_position_same_org'
  ) THEN
    ALTER TABLE public.vacancies
      ADD CONSTRAINT vacancies_job_position_same_org
      CHECK (public.job_position_belongs_to_org(job_position_id, organization_id));

    RAISE NOTICE 'Constraint vacancies_job_position_same_org creado correctamente.';
  ELSE
    RAISE NOTICE 'Constraint vacancies_job_position_same_org ya existe, se omite.';
  END IF;
END $$;


-- ── 4. CHECK constraint en candidates: vacancy debe ser de la misma org ───
--
-- IMPORTANTE: vacancy_id en candidates es NULLABLE (ver 20240008_hiring_candidates.sql):
--   vacancy_id uuid REFERENCES vacancies(id) ON DELETE CASCADE
-- Un candidato puede existir sin estar asociado a una vacante (ej. candidatos
-- de bolsa de talento). Por tanto el constraint permite NULL explícitamente.
--
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   information_schema.table_constraints
    WHERE  table_schema    = 'public'
      AND  table_name      = 'candidates'
      AND  constraint_name = 'candidates_vacancy_same_org'
  ) THEN
    ALTER TABLE public.candidates
      ADD CONSTRAINT candidates_vacancy_same_org
      CHECK (
        vacancy_id IS NULL
        OR public.vacancy_belongs_to_org(vacancy_id, organization_id)
      );

    RAISE NOTICE 'Constraint candidates_vacancy_same_org creado correctamente.';
  ELSE
    RAISE NOTICE 'Constraint candidates_vacancy_same_org ya existe, se omite.';
  END IF;
END $$;
