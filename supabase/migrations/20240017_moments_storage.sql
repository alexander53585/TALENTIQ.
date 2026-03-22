-- ══════════════════════════════════════════════════════════════════════
-- 20240017_moments_storage
-- Bucket privado para adjuntos de Moments + políticas storage.objects
-- + columna original_name en moments_attachments
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Bucket privado ─────────────────────────────────────────────────
-- MIME types y tamaño máximo controlados a nivel de bucket (segunda capa).
-- La primera capa de validación ocurre en la API route.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'moments-attachments',
  'moments-attachments',
  false,                                    -- PRIVADO: acceso solo vía signed URLs
  20971520,                                 -- 20 MB máximo absoluto por archivo
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public            = false,
  file_size_limit   = 20971520,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf'];

-- ── 2. Columna original_name en moments_attachments ──────────────────
-- Guardamos el nombre original del cliente (solo display, nunca para paths).
ALTER TABLE public.moments_attachments
  ADD COLUMN IF NOT EXISTS original_name text
    CONSTRAINT chk_original_name_len CHECK (char_length(original_name) <= 255);

-- ── 3. Políticas sobre storage.objects ───────────────────────────────
-- Estructura de path: org/{organization_id}/moments/{post_id}/{uuid}.{ext}
-- Extracción: split_part(name, '/', N) donde N=2 → org_id

-- Función helper: extrae organization_id del path del objeto
-- (evita repetir la expresión en cada policy)
CREATE OR REPLACE FUNCTION storage.moments_path_org_id(object_name text)
RETURNS uuid
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN split_part(object_name, '/', 1) = 'org'
     AND split_part(object_name, '/', 3) = 'moments'
    THEN split_part(object_name, '/', 2)::uuid
    ELSE NULL
  END;
$$;

-- ── SELECT (download / signed URL validation) ────────────────────────
-- Solo miembros activos de la organización propietaria del archivo.
-- RLS de storage.objects aplica cuando Supabase verifica el signed URL.
DROP POLICY IF EXISTS "moments_storage_select" ON storage.objects;
CREATE POLICY "moments_storage_select" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'moments-attachments'
    AND storage.moments_path_org_id(name) IS NOT NULL
    AND storage.moments_path_org_id(name) = public.user_org_id()
  );

-- ── INSERT (subida vía service_role desde API route) ─────────────────
-- La API route usa service_role → bypasea RLS en storage.
-- Esta policy es defensa en profundidad si alguien usa el anon key.
DROP POLICY IF EXISTS "moments_storage_insert" ON storage.objects;
CREATE POLICY "moments_storage_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'moments-attachments'
    -- El path debe pertenecer a la org del usuario autenticado
    AND storage.moments_path_org_id(name) = public.user_org_id()
    -- El path debe tener exactamente 5 segmentos: org/{id}/moments/{post_id}/{file}
    AND array_length(string_to_array(name, '/'), 1) = 5
  );

-- ── UPDATE (prohibido — los archivos son inmutables) ─────────────────
DROP POLICY IF EXISTS "moments_storage_update" ON storage.objects;
-- Sin policy de UPDATE → nadie puede actualizar un objeto existente.
-- Para "reemplazar" un archivo se elimina y sube de nuevo.

-- ── DELETE ───────────────────────────────────────────────────────────
-- El uploader o un admin de la org puede borrar.
-- Verificamos contra moments_attachments para el ownership.
DROP POLICY IF EXISTS "moments_storage_delete" ON storage.objects;
CREATE POLICY "moments_storage_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'moments-attachments'
    AND storage.moments_path_org_id(name) = public.user_org_id()
    AND (
      public.user_is_org_admin()
      OR EXISTS (
        SELECT 1
        FROM   public.moments_attachments ma
        WHERE  ma.storage_path     = name
          AND  ma.organization_id  = public.user_org_id()
          AND  ma.uploaded_by      = auth.uid()
      )
    )
  );

-- ── 4. Índice adicional para lookups por storage_path ────────────────
CREATE INDEX IF NOT EXISTS idx_moments_att_storage_path
  ON public.moments_attachments (storage_path);

-- ── 5. Limpieza de objetos huérfanos (referencia para pg_cron opcional) ──
-- Si se borra un post/comment con adjuntos, los registros de
-- moments_attachments se eliminan por FK ON DELETE CASCADE.
-- El objeto en storage queda huérfano → limpiar con pg_cron o webhook.
-- Ejemplo de job (requiere pg_cron extension):
/*
SELECT cron.schedule(
  'cleanup-orphan-attachments',
  '0 3 * * *',  -- diario a las 3 AM
  $$
    DELETE FROM storage.objects
    WHERE bucket_id = 'moments-attachments'
      AND NOT EXISTS (
        SELECT 1 FROM public.moments_attachments ma
        WHERE ma.storage_path = storage.objects.name
      );
  $$
);
*/

COMMENT ON COLUMN public.moments_attachments.storage_path IS
  'Path en bucket moments-attachments. Formato: org/{org_id}/moments/{post_id}/{uuid}.{ext}';
COMMENT ON COLUMN public.moments_attachments.original_name IS
  'Nombre original del archivo enviado por el cliente. Solo para display, nunca para paths.';
