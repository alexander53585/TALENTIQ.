-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 20240019 — Moments differentiators
--
-- Adds:
--   1. GIN index on moments_posts.metadata  (competency / position queries)
--   2. is_best_answer  on moments_comments  (question quality signal)
--   3. Partial indexes for pulse metrics & recognition queries
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. GIN index on metadata — enables WHERE metadata @> '{"competency_id":"…"}'
CREATE INDEX IF NOT EXISTS idx_moments_posts_metadata_gin
  ON public.moments_posts USING gin (metadata)
  WHERE metadata IS NOT NULL;

-- 2. Best-answer flag on comments (question threads)
ALTER TABLE public.moments_comments
  ADD COLUMN IF NOT EXISTS is_best_answer boolean NOT NULL DEFAULT false;

-- Partial index: only rows that are best answers (typically ≤1 per post)
CREATE INDEX IF NOT EXISTS idx_moments_comments_best_answer
  ON public.moments_comments (organization_id, post_id)
  WHERE is_best_answer = true;

-- 3. Partial index for recognition pulse queries  (org + date, recognition only)
CREATE INDEX IF NOT EXISTS idx_moments_posts_recognition_pulse
  ON public.moments_posts (organization_id, created_at DESC)
  WHERE post_type = 'recognition' AND status = 'published';

-- 4. Partial index for general pulse stats  (org + status + date)
CREATE INDEX IF NOT EXISTS idx_moments_posts_pulse_window
  ON public.moments_posts (organization_id, created_at DESC, community_id)
  WHERE status = 'published';

-- ── RLS notes ────────────────────────────────────────────────────────────────
-- is_best_answer is controlled at the API layer (only post author or org admins
-- may set it). No new RLS policies are required — existing moments_comments
-- RLS already restricts mutations to the correct organization and user scope.
