-- ══════════════════════════════════════════════════════════════════════
-- 20240021_moments_rls_hardening
-- RLS hardening for Moments module
--
-- Changes:
--   1. moments_community_members — add is_active column (table has NO status column)
--   2. Helper function user_can_see_community() to encapsulate private-community check
--   3. REPLACE moments_posts SELECT policy — enforce private community isolation
--   4. REPLACE moments_comments SELECT policy — enforce private community isolation via post
--   5. REPLACE moments_notifications SELECT / UPDATE policies — add org filter + FORCE RLS
--   6. Performance indexes on moments_posts and moments_notifications
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. moments_community_members — is_active column ──────────────────
--
-- NOTE: moments_community_members has NO "status" column.
-- Any code that references status = 'active' on this table is incorrect.
-- The canonical active-membership flag is is_active (added below).
-- Membership rows without an explicit is_active = false are considered active.
--
COMMENT ON TABLE public.moments_community_members IS
  'Membresía de usuarios en comunidades. '
  'IMPORTANT: this table has NO "status" column. '
  'Use is_active (boolean, DEFAULT true) to filter active memberships. '
  'Do NOT reference status = ''active'' on this table.';

ALTER TABLE public.moments_community_members
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ── 2. Helper: user_can_see_community ────────────────────────────────
--
-- Returns true if the current user is allowed to see content in the given
-- community within the given org:
--   - community is public (NOT is_private), OR
--   - user is an org admin (owner / admin / hr_specialist), OR
--   - user is an active member of that community
--
CREATE OR REPLACE FUNCTION public.user_can_see_community(p_community_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.moments_communities c
    WHERE c.id              = p_community_id
      AND c.organization_id = p_org_id
      AND (
        NOT c.is_private
        OR public.user_is_org_admin()
        OR EXISTS (
          SELECT 1 FROM public.moments_community_members mcm
          WHERE mcm.community_id    = c.id
            AND mcm.user_id         = auth.uid()
            AND mcm.is_active       = true
        )
      )
  )
$$;

-- ── 3. moments_posts SELECT — private community isolation ─────────────

DROP POLICY IF EXISTS "moments_posts_select" ON public.moments_posts;

CREATE POLICY "moments_posts_select" ON public.moments_posts
  FOR SELECT USING (
    organization_id = public.user_org_id()
    AND status      = 'published'
    AND public.user_can_see_community(community_id, organization_id)
  );

-- ── 4. moments_comments SELECT — private community isolation ──────────

DROP POLICY IF EXISTS "moments_comments_select" ON public.moments_comments;

CREATE POLICY "moments_comments_select" ON public.moments_comments
  FOR SELECT USING (
    organization_id = public.user_org_id()
    AND status      = 'active'
    AND public.user_can_see_community(
      (
        SELECT p.community_id
        FROM   public.moments_posts p
        WHERE  p.id              = post_id
          AND  p.organization_id = organization_id
        LIMIT  1
      ),
      organization_id
    )
  );

-- ── 5. moments_notifications — FORCE RLS + tighter policies ──────────

ALTER TABLE public.moments_notifications FORCE ROW LEVEL SECURITY;

-- Drop old policies (created in 20240020 without org filter)
DROP POLICY IF EXISTS "user_read_own_notifications"   ON public.moments_notifications;
DROP POLICY IF EXISTS "user_update_own_notifications" ON public.moments_notifications;

-- SELECT: own notifications scoped to current org
CREATE POLICY "user_read_own_notifications"
  ON public.moments_notifications
  FOR SELECT
  USING (
    user_id         = auth.uid()
    AND organization_id = public.user_org_id()
  );

-- UPDATE: mark-as-read scoped to current org
CREATE POLICY "user_update_own_notifications"
  ON public.moments_notifications
  FOR UPDATE
  USING (
    user_id         = auth.uid()
    AND organization_id = public.user_org_id()
  )
  WITH CHECK (
    user_id         = auth.uid()
    AND organization_id = public.user_org_id()
  );

-- ── 6. Performance indexes ────────────────────────────────────────────

-- Covers filtered queries on community feed (org + community + status + time)
CREATE INDEX IF NOT EXISTS idx_moments_posts_community_status
  ON public.moments_posts (organization_id, community_id, status, created_at DESC);

-- Covers notification inbox queries per user + org (supports read/unread filtering)
CREATE INDEX IF NOT EXISTS idx_moments_notifications_user_org
  ON public.moments_notifications (user_id, organization_id, read_at);
