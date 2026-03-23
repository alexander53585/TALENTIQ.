-- ─────────────────────────────────────────────────────────────────────────────
-- 20240028_member_invitations.sql
-- Tabla de invitaciones para nuevos miembros a una organización
-- ─────────────────────────────────────────────────────────────────────────────

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabla principal de invitaciones
CREATE TABLE IF NOT EXISTS public.invitations (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid       NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email          text        NOT NULL,
  role           text        NOT NULL DEFAULT 'employee'
                             CHECK (role IN ('admin', 'hr_specialist', 'manager', 'employee')),
  token          text        UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  invited_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  status         text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  message        text,       -- Mensaje personal opcional del invitador
  expires_at     timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at     timestamptz DEFAULT now()
);

-- Solo puede haber una invitación pendiente por email+org
CREATE UNIQUE INDEX IF NOT EXISTS invitations_org_email_pending
  ON public.invitations(organization_id, lower(email))
  WHERE status = 'pending';

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Owner/admin pueden leer invitaciones de su organización
CREATE POLICY "admins_select_invitations" ON public.invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.user_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('owner', 'admin')
    )
  );

-- 2. Función segura para aceptar invitación (SECURITY DEFINER para bypassear RLS)
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite  public.invitations%ROWTYPE;
BEGIN
  -- Buscar y bloquear la invitación para evitar race conditions
  SELECT * INTO v_invite
  FROM public.invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invitación no encontrada, expirada o ya utilizada');
  END IF;

  -- Si el usuario ya tiene membresía activa en esta org, solo marcar aceptada
  IF EXISTS (
    SELECT 1 FROM public.user_memberships
    WHERE user_id = p_user_id
      AND organization_id = v_invite.organization_id
      AND is_active = true
  ) THEN
    UPDATE public.invitations SET status = 'accepted' WHERE id = v_invite.id;
    RETURN json_build_object('success', true, 'already_member', true,
                             'organization_id', v_invite.organization_id);
  END IF;

  -- Crear membresía con el rol especificado en la invitación
  INSERT INTO public.user_memberships (id, user_id, organization_id, role, scope, is_active, created_at)
  VALUES (gen_random_uuid(), p_user_id, v_invite.organization_id, v_invite.role, 'organization', true, now());

  -- Marcar invitación como aceptada
  UPDATE public.invitations SET status = 'accepted' WHERE id = v_invite.id;

  RETURN json_build_object(
    'success', true,
    'organization_id', v_invite.organization_id,
    'role', v_invite.role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(text, uuid) TO authenticated;

-- 3. Función pública para leer info básica de invitación (sin RLS, solo campos seguros)
CREATE OR REPLACE FUNCTION public.get_invitation_info(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite  public.invitations%ROWTYPE;
  v_org_name text;
BEGIN
  SELECT * INTO v_invite
  FROM public.invitations
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  IF v_invite.status != 'pending' THEN
    RETURN json_build_object('error', 'already_used', 'status', v_invite.status);
  END IF;

  IF v_invite.expires_at <= now() THEN
    RETURN json_build_object('error', 'expired');
  END IF;

  SELECT name INTO v_org_name FROM public.organizations WHERE id = v_invite.organization_id;

  RETURN json_build_object(
    'valid', true,
    'email', v_invite.email,
    'role', v_invite.role,
    'organization_name', COALESCE(v_org_name, 'tu organización'),
    'message', v_invite.message,
    'expires_at', v_invite.expires_at
  );
END;
$$;

-- Permitir a usuarios anónimos consultar info de invitación (necesario para la landing de aceptación)
GRANT EXECUTE ON FUNCTION public.get_invitation_info(text) TO anon, authenticated;
