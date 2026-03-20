-- ══════════════════════════════════════════════════════════
-- Strategic Documents — Schema + Storage Migration
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS strategic_documents (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          uuid REFERENCES auth.users(id),
  name             text NOT NULL,
  document_type    text NOT NULL DEFAULT 'other',
  -- strategic_plan | ethics_code | policy | manual | other
  storage_path     text NOT NULL,
  file_size        bigint,
  mime_type        text,
  ai_analysis      jsonb,
  utility_score    int CHECK (utility_score BETWEEN 1 AND 5),
  analyzed_at      timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategic_docs_org ON strategic_documents (organization_id);

ALTER TABLE strategic_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY docs_isolation ON strategic_documents
  USING  (organization_id = user_org_id())
  WITH CHECK (organization_id = user_org_id());

CREATE TRIGGER trg_strategic_docs_updated
  BEFORE UPDATE ON strategic_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Storage bucket ────────────────────────────────────────
-- Ejecutar DESPUÉS de crear la tabla (requiere Supabase Storage habilitado)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kulturh-docs',
  'kulturh-docs',
  false,
  10485760,  -- 10 MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
) ON CONFLICT (id) DO NOTHING;

-- RLS Storage: solo la organización propietaria accede
CREATE POLICY "org_owns_docs_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'kulturh-docs'
    AND (storage.foldername(name))[1] = (user_org_id())::text
  );

CREATE POLICY "org_owns_docs_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'kulturh-docs'
    AND (storage.foldername(name))[1] = (user_org_id())::text
  );

CREATE POLICY "org_owns_docs_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'kulturh-docs'
    AND (storage.foldername(name))[1] = (user_org_id())::text
  );
