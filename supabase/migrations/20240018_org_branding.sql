-- Branding global de empresa
-- Agrega logo_url a organizations y política RLS para que solo
-- owner/admin puedan actualizar su propia organización.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url text
    CHECK (logo_url IS NULL OR (
      length(logo_url) <= 1000
      AND logo_url LIKE 'https://%'
    ));

-- Política: miembros owner/admin pueden actualizar su propia org
CREATE POLICY "admins_update_org" ON public.organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM public.user_memberships
      WHERE user_id     = auth.uid()
        AND is_active   = true
        AND role        IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM public.user_memberships
      WHERE user_id     = auth.uid()
        AND is_active   = true
        AND role        IN ('owner', 'admin')
    )
  );
