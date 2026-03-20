-- AI usage logging table
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature text NOT NULL DEFAULT 'general',
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Members can see their org's usage
CREATE POLICY "org_members_see_usage" ON public.ai_usage
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.user_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Users can insert their own usage records
CREATE POLICY "users_insert_own_usage" ON public.ai_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_org ON public.ai_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON public.ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON public.ai_usage(feature);
