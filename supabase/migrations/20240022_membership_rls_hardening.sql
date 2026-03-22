-- ══════════════════════════════════════════════════════════════════════════
-- 20240022_membership_rls_hardening
--
-- P0: Elimina la política FOR ALL en user_memberships que permitía
--     auto-escalación de roles (INSERT owner / UPDATE propio rol).
--
-- P1: Reemplaza la función user_org_id() con versión que verifica vigencia
--     (valid_until IS NULL OR valid_until > now()).
--
-- Cambios:
--   1. DROP política FOR ALL "users_own_memberships"
--   2. CREATE política SELECT-only para usuarios autenticados
--   3. CREATE OR REPLACE función user_org_id() con filtro de vigencia
--   4. CREATE función auxiliar get_active_org_id() (alias documentado)
--   5. CREATE índice compuesto para performance del nuevo filtro
--
-- IMPORTANTE: INSERT/UPDATE/DELETE sobre user_memberships solo está
--   permitido a través de funciones SECURITY DEFINER o service_role.
--   Los usuarios autenticados NO pueden crear ni modificar membresías
--   directamente desde el cliente.
-- ══════════════════════════════════════════════════════════════════════════


-- ── 1. ELIMINAR POLÍTICA PELIGROSA FOR ALL ────────────────────────────────
--
-- Esta política cubría SELECT, INSERT, UPDATE y DELETE.
-- Un usuario autenticado podía ejecutar:
--   INSERT INTO user_memberships (user_id, organization_id, role)
--     VALUES (auth.uid(), <cualquier_org_id>, 'owner');
-- lo que constituía una auto-escalación de privilegios entre organizaciones.
--
DROP POLICY IF EXISTS "users_own_memberships" ON public.user_memberships;


-- ── 2. POLÍTICA SELECT MÍNIMA ─────────────────────────────────────────────
--
-- Los usuarios autenticados solo pueden VER sus propias membresías
-- que estén activas y no expiradas.
-- No se crean políticas INSERT / UPDATE / DELETE para el rol authenticated:
--   → INSERT/UPDATE de membresías solo vía funciones SECURITY DEFINER
--     o service_role (ej. onboarding, invitaciones, revocaciones).
--
CREATE POLICY "memberships_select_own_active"
  ON public.user_memberships
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND is_active = true
    AND (valid_until IS NULL OR valid_until > now())
  );

COMMENT ON POLICY "memberships_select_own_active" ON public.user_memberships IS
  'Los usuarios autenticados solo ven sus propias membresías activas y vigentes. '
  'INSERT/UPDATE/DELETE exclusivamente a través de funciones SECURITY DEFINER '
  'o llamadas con service_role — nunca directamente desde el cliente.';


-- ── 3. FUNCIÓN user_org_id() CON VIGENCIA OBLIGATORIA ────────────────────
--
-- Reemplaza la versión original de 20240001_foundation.sql (sin valid_until)
-- y confirma la versión de 20240016_moments_module.sql que ya tenía vigencia.
-- Al ser SECURITY DEFINER puede leer user_memberships sin RLS.
-- search_path fijo evita ataques de sustitución de esquema.
--
CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id
  FROM   public.user_memberships
  WHERE  user_id    = auth.uid()
    AND  is_active  = true
    AND  (valid_until IS NULL OR valid_until > now())
  ORDER BY created_at DESC
  LIMIT 1
$$;

COMMENT ON FUNCTION public.user_org_id() IS
  'Retorna el organization_id de la membresía activa y vigente del usuario actual. '
  'Filtra: is_active = true AND (valid_until IS NULL OR valid_until > now()). '
  'Retorna NULL si no existe membresía válida. '
  'SECURITY DEFINER — no expone user_memberships al llamador. '
  'Usada en todas las políticas RLS de aislamiento de tenant.';


-- ── 4. FUNCIÓN AUXILIAR get_active_org_id() ───────────────────────────────
--
-- Alias semánticamente descriptivo de user_org_id() para uso en código
-- nuevo. La función user_org_id() se mantiene por compatibilidad con
-- todas las políticas RLS existentes.
--
CREATE OR REPLACE FUNCTION public.get_active_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id
  FROM   public.user_memberships
  WHERE  user_id    = auth.uid()
    AND  is_active  = true
    AND  (valid_until IS NULL OR valid_until > now())
  ORDER BY created_at DESC
  LIMIT 1
$$;

COMMENT ON FUNCTION public.get_active_org_id() IS
  'Alias semánticamente descriptivo de user_org_id(). '
  'Úsala en código nuevo; user_org_id() se mantiene para compatibilidad '
  'con políticas RLS existentes.';


-- ── 5. ÍNDICE COMPUESTO PARA PERFORMANCE ─────────────────────────────────
--
-- Cubre el filtro (user_id, is_active, valid_until) que ahora usan
-- user_org_id(), get_active_org_id() y la política SELECT de membresías.
-- La condición parcial WHERE is_active = true reduce el tamaño del índice.
--
CREATE INDEX IF NOT EXISTS idx_memberships_active_valid
  ON public.user_memberships (user_id, is_active, valid_until)
  WHERE is_active = true;

COMMENT ON INDEX public.idx_memberships_active_valid IS
  'Índice parcial para búsquedas de membresías activas con vigencia. '
  'Cubre las consultas de user_org_id() y get_active_org_id().';


-- ── 6. ACTUALIZAR POLÍTICA DE organizations PARA INCLUIR VIGENCIA ─────────
--
-- La política "members_see_org" de 001_initial.sql solo filtraba is_active.
-- Se reemplaza para usar user_org_id() (que ya incluye vigencia).
--
DROP POLICY IF EXISTS "members_see_org" ON public.organizations;

CREATE POLICY "members_see_org"
  ON public.organizations
  FOR SELECT
  USING (
    id = public.user_org_id()
  );

COMMENT ON POLICY "members_see_org" ON public.organizations IS
  'Usuarios ven solo la organización de su membresía activa y vigente. '
  'Delega la verificación de vigencia a user_org_id().';


-- ── 7. ACTUALIZAR POLÍTICA org_update PARA INCLUIR VIGENCIA ──────────────
--
-- La política "org_update" de 20240015 no verificaba valid_until.
-- Se reemplaza para usar user_org_id().
--
DROP POLICY IF EXISTS "org_update" ON public.organizations;

CREATE POLICY "org_update"
  ON public.organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id
      FROM   public.user_memberships
      WHERE  user_id    = auth.uid()
        AND  role       IN ('owner', 'admin')
        AND  is_active  = true
        AND  (valid_until IS NULL OR valid_until > now())
    )
  );

COMMENT ON POLICY "org_update" ON public.organizations IS
  'Solo owners y admins con membresía activa y vigente pueden actualizar '
  'los datos de la organización.';
