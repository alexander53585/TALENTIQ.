-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);

-- User memberships table
CREATE TABLE IF NOT EXISTS public.user_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'hr_specialist', 'manager', 'employee')),
  scope text NOT NULL DEFAULT 'organization',
  is_active boolean NOT NULL DEFAULT true,
  valid_until timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;

-- Users can only see their own memberships
CREATE POLICY "users_own_memberships" ON public.user_memberships
  FOR ALL USING (auth.uid() = user_id);

-- Users can see organizations they belong to
CREATE POLICY "members_see_org" ON public.organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM public.user_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_id ON public.user_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_active ON public.user_memberships(user_id, is_active);
