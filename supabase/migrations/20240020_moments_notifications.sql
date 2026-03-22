-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 20240020 — Moments in-app notifications
--
-- Stores persistent notifications for new comments and recognitions.
-- In-session events (new posts, reactions) are handled client-side via Realtime.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.moments_notifications (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id)  ON DELETE CASCADE,
  user_id             uuid        NOT NULL REFERENCES auth.users(id)            ON DELETE CASCADE,
  type                text        NOT NULL
    CHECK (type IN ('new_comment', 'recognition')),
  actor_id            uuid        REFERENCES auth.users(id),
  actor_display_name  text,                     -- denormalized: "Miembro del equipo"
  post_id             uuid,                     -- related post (for navigation)
  title               text,                     -- short display title
  body                text,                     -- first ~80 chars of content
  read_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_notif_title_len  CHECK (title IS NULL OR length(title) <= 200),
  CONSTRAINT chk_notif_body_len   CHECK (body  IS NULL OR length(body)  <= 200)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Notifications inbox for a user (unread first)
CREATE INDEX IF NOT EXISTS idx_moments_notif_inbox
  ON public.moments_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

-- Full inbox including read
CREATE INDEX IF NOT EXISTS idx_moments_notif_user_all
  ON public.moments_notifications (user_id, created_at DESC);

-- Org-level queries (admin overview)
CREATE INDEX IF NOT EXISTS idx_moments_notif_org
  ON public.moments_notifications (organization_id, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.moments_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "user_read_own_notifications"
  ON public.moments_notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update only their own notifications (mark as read)
CREATE POLICY "user_update_own_notifications"
  ON public.moments_notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- INSERT via service_role only (no direct client inserts)
-- The API uses service_role to insert notifications bypassing this policy.
-- No INSERT policy = anon/authenticated cannot insert directly.
