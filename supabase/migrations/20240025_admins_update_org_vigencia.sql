-- ══════════════════════════════════════════════════════════════════════════
-- 20240025_admins_update_org_vigencia
--
-- PROBLEMA CORREGIDO:
--   La política "org_update" de 20240015_rls_and_schema_fixes.sql verificaba
--   is_active = true pero NO verificaba valid_until. Una membresía de admin u
--   owner expirada (valid_until < now()) podía seguir modificando datos de la
--   organización.
--
--   La política de 20240022_membership_rls_hardening.sql añadió el filtro
--   valid_until al recrear org_update, pero aún usa una subquery inline en
--   lugar de delegar a user_org_id(). Además no incluye WITH CHECK, lo que
--   permite que el UPDATE cambie el `id` de la org hacia uno no autorizado.
--
-- SOLUCIÓN:
--   Reemplazar "org_update" con una versión que:
--     1. Usa user_org_id() (SECURITY DEFINER, verifica is_active Y valid_until)
--     2. Incluye WITH CHECK para blindar contra cambios de id cross-tenant
--     3. El control de rol (owner/admin) se delega a la capa API mediante
--        getRequestContext() + verificación de rol explícita
--
-- NOTA SOBRE ROLES:
--   user_org_id() no verifica el rol del usuario, solo la vigencia de la
--   membresía. El control de acceso por rol (solo owner/admin pueden hacer
--   UPDATE de org) se impone en el API layer. Este enfoque es consistente
--   con el patrón adoptado en todo el módulo de membresías desde 20240022.
-- ══════════════════════════════════════════════════════════════════════════


-- ── 1. REEMPLAZAR POLÍTICA org_update ────────────────────────────────────
--
-- Elimina la versión con subquery inline (de 20240015 y 20240022) y la
-- reemplaza con una que delega en user_org_id() ya endurecida.
-- Con WITH CHECK se evita que un UPDATE mueva el registro a otra org.
--
DROP POLICY IF EXISTS "org_update" ON public.organizations;

CREATE POLICY "org_update" ON public.organizations
  FOR UPDATE
  USING  (id = public.user_org_id())
  WITH CHECK (id = public.user_org_id());

COMMENT ON POLICY "org_update" ON public.organizations IS
  'Solo usuarios con membresía activa Y vigente (valid_until) pueden actualizar '
  'su organización. user_org_id() (SECURITY DEFINER, 20240022) verifica ambas '
  'condiciones. El control de rol owner/admin se realiza en la capa API '
  'mediante getRequestContext() antes de emitir el UPDATE.';


-- ── 2. RECREAR POLÍTICA org_create CON DOCUMENTACIÓN ─────────────────────
--
-- La política "org_create" original (20240015) usa `auth.uid() IS NOT NULL`,
-- lo que permite a CUALQUIER usuario autenticado crear una organización.
-- Se mantiene este comportamiento porque es requerido por el flujo de
-- onboarding: un usuario recién registrado aún no tiene organización ni
-- membresía, por lo que no es posible verificar membresía en ese momento.
--
-- CONTROL COMPENSATORIO:
--   La capa API (route de onboarding) inmediatamente después del INSERT crea
--   una membresía con rol 'owner' para el usuario creador, vinculando la org
--   al usuario de forma atómica. La creación directa de orgs sin onboarding
--   no otorga acceso operativo porque las demás políticas RLS requieren
--   membresía activa vía user_org_id().
--
DROP POLICY IF EXISTS "org_create" ON public.organizations;

CREATE POLICY "org_create" ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON POLICY "org_create" ON public.organizations IS
  'Permite a cualquier usuario autenticado crear una organización. '
  'Requerido por el flujo de onboarding donde el usuario aún no tiene membresía. '
  'Control compensatorio: la API de onboarding crea inmediatamente una membresía '
  'owner para el usuario creador. Crear una org sin membresía no otorga acceso '
  'a recursos protegidos por otras políticas RLS (user_org_id() retornaría NULL).';
