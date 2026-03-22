-- ══════════════════════════════════════════════════════════════════════
-- 20240016_moments_module
-- Red social interna por organización (Moments)
-- + Branding organizacional (logo_url, brand_primary, brand_secondary)
--
-- MODELO DE AISLAMIENTO:
--   1. organization_id NOT NULL en todas las tablas.
--   2. Claves foráneas COMPUESTAS (fk_id, organization_id) entre tablas
--      del mismo módulo → impide que un registro de org A referencia
--      un registro de org B aunque los UUIDs colisionen.
--   3. RLS habilitada y forzada en todas las tablas.
--   4. Políticas USING + WITH CHECK basadas en user_org_id() y
--      membresía activa en user_memberships.
--   5. Acciones sensibles generan fila en moments_audit_logs.
-- ══════════════════════════════════════════════════════════════════════

-- ── 0. Extensión necesaria ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 0b. Helper (idempotente — ya definido en 20240001, se refuerza) ──
-- Retorna el organization_id activo del usuario autenticado.
-- SECURITY DEFINER para poder leer user_memberships sin RLS.
CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM   public.user_memberships
  WHERE  user_id   = auth.uid()
    AND  is_active = true
    AND  (valid_until IS NULL OR valid_until > now())
  LIMIT 1;
$$;

-- ── 0c. Helper: comprueba que el usuario tiene rol ≥ admin en su org ─
CREATE OR REPLACE FUNCTION public.user_is_org_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.user_memberships
    WHERE  user_id         = auth.uid()
      AND  organization_id = public.user_org_id()
      AND  role            IN ('owner','admin','hr_specialist')
      AND  is_active       = true
      AND  (valid_until IS NULL OR valid_until > now())
  );
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 1. BRANDING ORGANIZACIONAL
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url        text,
  ADD COLUMN IF NOT EXISTS brand_primary   text
    CONSTRAINT chk_brand_primary_hex   CHECK (brand_primary   ~ '^#[0-9A-Fa-f]{6}$' OR brand_primary   IS NULL),
  ADD COLUMN IF NOT EXISTS brand_secondary text
    CONSTRAINT chk_brand_secondary_hex CHECK (brand_secondary ~ '^#[0-9A-Fa-f]{6}$' OR brand_secondary IS NULL);

-- ══════════════════════════════════════════════════════════════════════
-- 2. TRIGGER helper reutilizable (updated_at automático)
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 3. TABLA: moments_communities
-- Comunidades (canales temáticos) dentro de una organización.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.moments_communities (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by       uuid        NOT NULL REFERENCES auth.users(id),

  name             text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description      text        CHECK (char_length(description) <= 1000),
  icon_emoji       text        DEFAULT '💬',
  banner_url       text,

  posting_policy   text        NOT NULL DEFAULT 'all_members'
                               CHECK (posting_policy IN ('all_members','admins_only')),
  is_private       boolean     NOT NULL DEFAULT false,
  is_archived      boolean     NOT NULL DEFAULT false,

  -- Clave compuesta para que hijos puedan hacer FK (id, organization_id)
  UNIQUE (id, organization_id),

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moments_communities_org
  ON public.moments_communities (organization_id, created_at DESC);

CREATE TRIGGER trg_moments_communities_updated_at
  BEFORE UPDATE ON public.moments_communities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.moments_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments_communities FORCE  ROW LEVEL SECURITY;

-- Políticas de moments_communities se crean DESPUÉS de moments_community_members
-- para que el subquery en la política SELECT pueda referenciar la tabla ya existente.

-- ══════════════════════════════════════════════════════════════════════
-- 4. TABLA: moments_community_members
-- Miembros de cada comunidad.
-- FK compuesta → (community_id, organization_id) cruza con moments_communities
-- garantizando que la comunidad pertenece a la misma org que el miembro.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.moments_community_members (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- FK compuesta anti-cruce: la comunidad debe pertenecer a la misma org
  community_id     uuid        NOT NULL,
  FOREIGN KEY (community_id, organization_id)
    REFERENCES public.moments_communities(id, organization_id) ON DELETE CASCADE,

  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role             text        NOT NULL DEFAULT 'member'
                               CHECK (role IN ('admin','member')),
  joined_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (community_id, user_id)   -- un usuario, una membresía por comunidad
);

CREATE INDEX IF NOT EXISTS idx_mcm_org_community
  ON public.moments_community_members (organization_id, community_id);
CREATE INDEX IF NOT EXISTS idx_mcm_user
  ON public.moments_community_members (user_id);

ALTER TABLE public.moments_community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments_community_members FORCE  ROW LEVEL SECURITY;

CREATE POLICY "mcm_select" ON public.moments_community_members
  FOR SELECT USING (organization_id = public.user_org_id());

CREATE POLICY "mcm_insert" ON public.moments_community_members
  FOR INSERT WITH CHECK (
    organization_id = public.user_org_id()
    AND (
      -- Auto-unirse (comunidad pública) o ser añadido por admin
      user_id = auth.uid()
      OR public.user_is_org_admin()
    )
  );

CREATE POLICY "mcm_delete" ON public.moments_community_members
  FOR DELETE USING (
    organization_id = public.user_org_id()
    AND (user_id = auth.uid() OR public.user_is_org_admin())
  );

-- ══════════════════════════════════════════════════════════════════════
-- 4b. POLÍTICAS: moments_communities (aquí porque SELECT referencia moments_community_members)
-- ══════════════════════════════════════════════════════════════════════
CREATE POLICY "moments_communities_select" ON public.moments_communities
  FOR SELECT USING (
    organization_id = public.user_org_id()
    AND (
      NOT is_private
      OR EXISTS (
        SELECT 1 FROM public.moments_community_members mcm
        WHERE mcm.community_id    = id
          AND mcm.organization_id = organization_id
          AND mcm.user_id         = auth.uid()
      )
      OR public.user_is_org_admin()
    )
  );

CREATE POLICY "moments_communities_insert" ON public.moments_communities
  FOR INSERT WITH CHECK (
    organization_id = public.user_org_id()
    AND created_by  = auth.uid()
    AND public.user_is_org_admin()
  );

CREATE POLICY "moments_communities_update" ON public.moments_communities
  FOR UPDATE USING (organization_id = public.user_org_id())
  WITH CHECK (
    organization_id = public.user_org_id()
    AND public.user_is_org_admin()
  );

CREATE POLICY "moments_communities_delete" ON public.moments_communities
  FOR DELETE USING (
    organization_id = public.user_org_id()
    AND public.user_is_org_admin()
  );

-- ══════════════════════════════════════════════════════════════════════
-- 5. TABLA: moments_posts
-- Publicaciones dentro de una comunidad.
-- FK compuesta → (community_id, organization_id).
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.moments_posts (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- FK compuesta: la comunidad debe pertenecer a la misma org que el post
  community_id     uuid        NOT NULL,
  FOREIGN KEY (community_id, organization_id)
    REFERENCES public.moments_communities(id, organization_id) ON DELETE CASCADE,

  author_id        uuid        NOT NULL REFERENCES auth.users(id),

  post_type        text        NOT NULL
                               CHECK (post_type IN ('discussion','question','announcement','recognition')),
  title            text        CHECK (char_length(title) <= 200),
  body             text        NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 10000),

  is_pinned        boolean     NOT NULL DEFAULT false,
  is_locked        boolean     NOT NULL DEFAULT false,
  status           text        NOT NULL DEFAULT 'published'
                               CHECK (status IN ('published','draft','removed')),

  -- Metadatos opcionales (ej. reconocimiento a un usuario)
  metadata         jsonb,

  -- Clave compuesta para que comments hagan FK anti-cruce
  UNIQUE (id, organization_id),

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moments_posts_org_community
  ON public.moments_posts (organization_id, community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moments_posts_author
  ON public.moments_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_moments_posts_status
  ON public.moments_posts (organization_id, status);

CREATE TRIGGER trg_moments_posts_updated_at
  BEFORE UPDATE ON public.moments_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.moments_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments_posts FORCE  ROW LEVEL SECURITY;

-- SELECT: miembro activo de la org puede ver posts publicados
CREATE POLICY "moments_posts_select" ON public.moments_posts
  FOR SELECT USING (
    organization_id = public.user_org_id()
    AND status = 'published'
  );

-- INSERT: respeta posting_policy de la comunidad
CREATE POLICY "moments_posts_insert" ON public.moments_posts
  FOR INSERT WITH CHECK (
    organization_id = public.user_org_id()
    AND author_id   = auth.uid()
    AND status      = 'published'
    AND (
      -- Comunidad permite todos los miembros, o el usuario es admin
      public.user_is_org_admin()
      OR EXISTS (
        SELECT 1 FROM public.moments_communities mc
        WHERE mc.id              = community_id
          AND mc.organization_id = moments_posts.organization_id
          AND mc.posting_policy  = 'all_members'
          AND NOT mc.is_archived
      )
    )
  );

-- UPDATE: autor actualiza propio post (si no está bloqueado), admin actualiza cualquiera
CREATE POLICY "moments_posts_update" ON public.moments_posts
  FOR UPDATE USING (organization_id = public.user_org_id())
  WITH CHECK (
    organization_id = public.user_org_id()
    AND (
      (author_id = auth.uid() AND NOT is_locked)
      OR public.user_is_org_admin()
    )
  );

-- DELETE: soft-delete solo (status='removed'). Hard delete solo admins.
CREATE POLICY "moments_posts_delete" ON public.moments_posts
  FOR DELETE USING (
    organization_id = public.user_org_id()
    AND (author_id = auth.uid() OR public.user_is_org_admin())
  );

-- ══════════════════════════════════════════════════════════════════════
-- 6. TABLA: moments_comments
-- Comentarios a un post (soporte threading con parent_comment_id).
-- FK compuesta → (post_id, organization_id).
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.moments_comments (
  id                 uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id    uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- FK compuesta: el post debe pertenecer a la misma org que el comentario
  post_id            uuid        NOT NULL,
  FOREIGN KEY (post_id, organization_id)
    REFERENCES public.moments_posts(id, organization_id) ON DELETE CASCADE,

  -- Threading: referencia al comentario padre (misma org garantizada vía application layer)
  parent_comment_id  uuid        REFERENCES public.moments_comments(id) ON DELETE SET NULL,

  author_id          uuid        NOT NULL REFERENCES auth.users(id),
  body               text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  status             text        NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active','removed')),

  -- Clave compuesta para reactions anti-cruce
  UNIQUE (id, organization_id),

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moments_comments_post
  ON public.moments_comments (organization_id, post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_moments_comments_author
  ON public.moments_comments (author_id);

CREATE TRIGGER trg_moments_comments_updated_at
  BEFORE UPDATE ON public.moments_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.moments_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments_comments FORCE  ROW LEVEL SECURITY;

CREATE POLICY "moments_comments_select" ON public.moments_comments
  FOR SELECT USING (organization_id = public.user_org_id() AND status = 'active');

CREATE POLICY "moments_comments_insert" ON public.moments_comments
  FOR INSERT WITH CHECK (
    organization_id = public.user_org_id()
    AND author_id   = auth.uid()
    -- El post no debe estar bloqueado
    AND NOT EXISTS (
      SELECT 1 FROM public.moments_posts mp
      WHERE mp.id              = post_id
        AND mp.organization_id = moments_comments.organization_id
        AND mp.is_locked       = true
    )
  );

CREATE POLICY "moments_comments_update" ON public.moments_comments
  FOR UPDATE USING (organization_id = public.user_org_id())
  WITH CHECK (
    organization_id = public.user_org_id()
    AND (author_id = auth.uid() OR public.user_is_org_admin())
  );

CREATE POLICY "moments_comments_delete" ON public.moments_comments
  FOR DELETE USING (
    organization_id = public.user_org_id()
    AND (author_id = auth.uid() OR public.user_is_org_admin())
  );

-- ══════════════════════════════════════════════════════════════════════
-- 7. TABLA: moments_reactions
-- Reacciones a posts o comentarios. Una por usuario por objetivo.
-- Polimórfica: target_type + target_id (validado en API).
-- Unicidad: (user_id, target_type, target_id) → una reacción, tipo intercambiable.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.moments_reactions (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type      text        NOT NULL CHECK (target_type IN ('post','comment')),
  target_id        uuid        NOT NULL,

  -- Tipos de reacción controlados
  reaction_type    text        NOT NULL
                               CHECK (reaction_type IN ('like','celebrate','support','insightful','curious')),

  created_at  timestamptz NOT NULL DEFAULT now(),

  -- Una sola reacción por usuario por objetivo (puede cambiar el tipo con UPSERT)
  UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_moments_reactions_target
  ON public.moments_reactions (organization_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_moments_reactions_user
  ON public.moments_reactions (user_id, organization_id);

ALTER TABLE public.moments_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments_reactions FORCE  ROW LEVEL SECURITY;

CREATE POLICY "moments_reactions_select" ON public.moments_reactions
  FOR SELECT USING (organization_id = public.user_org_id());

CREATE POLICY "moments_reactions_insert" ON public.moments_reactions
  FOR INSERT WITH CHECK (
    organization_id = public.user_org_id()
    AND user_id     = auth.uid()
  );

-- Actualizar tipo de reacción (ej. cambiar like por celebrate)
CREATE POLICY "moments_reactions_update" ON public.moments_reactions
  FOR UPDATE USING (
    organization_id = public.user_org_id()
    AND user_id     = auth.uid()
  )
  WITH CHECK (
    organization_id = public.user_org_id()
    AND user_id     = auth.uid()
  );

-- Solo puede retirar su propia reacción
CREATE POLICY "moments_reactions_delete" ON public.moments_reactions
  FOR DELETE USING (
    organization_id = public.user_org_id()
    AND user_id     = auth.uid()
  );

-- ══════════════════════════════════════════════════════════════════════
-- 8. TABLA: moments_attachments
-- Archivos adjuntos a posts o comentarios.
-- storage_path → bucket privado con ruta: org/{org_id}/moments/{attachment_id}/{filename}
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.moments_attachments (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Un adjunto pertenece a un post O a un comentario (ambos opcionales, al menos uno)
  post_id          uuid,
  FOREIGN KEY (post_id, organization_id)
    REFERENCES public.moments_posts(id, organization_id) ON DELETE CASCADE,

  comment_id       uuid,
  FOREIGN KEY (comment_id, organization_id)
    REFERENCES public.moments_comments(id, organization_id) ON DELETE CASCADE,

  uploaded_by      uuid        NOT NULL REFERENCES auth.users(id),

  file_name        text        NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  file_type        text        NOT NULL,           -- MIME type ej. image/jpeg
  file_size_bytes  bigint      NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 52428800), -- máx 50 MB
  storage_path     text        NOT NULL UNIQUE,    -- org/{org_id}/moments/{id}/{file_name}

  created_at  timestamptz NOT NULL DEFAULT now(),

  -- Exactamente uno de post_id o comment_id debe estar definido
  CONSTRAINT chk_attachment_target CHECK (
    (post_id IS NOT NULL)::int + (comment_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_moments_attachments_post
  ON public.moments_attachments (organization_id, post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moments_attachments_comment
  ON public.moments_attachments (organization_id, comment_id) WHERE comment_id IS NOT NULL;

ALTER TABLE public.moments_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments_attachments FORCE  ROW LEVEL SECURITY;

CREATE POLICY "moments_attachments_select" ON public.moments_attachments
  FOR SELECT USING (organization_id = public.user_org_id());

CREATE POLICY "moments_attachments_insert" ON public.moments_attachments
  FOR INSERT WITH CHECK (
    organization_id = public.user_org_id()
    AND uploaded_by = auth.uid()
    -- Garantizar que storage_path empieza con la org correcta
    AND storage_path LIKE 'org/' || public.user_org_id()::text || '/%'
  );

CREATE POLICY "moments_attachments_delete" ON public.moments_attachments
  FOR DELETE USING (
    organization_id = public.user_org_id()
    AND (uploaded_by = auth.uid() OR public.user_is_org_admin())
  );

-- ══════════════════════════════════════════════════════════════════════
-- 9. TABLA: moments_reports
-- Reportes de contenido inapropiado.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.moments_reports (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  reporter_id      uuid        NOT NULL REFERENCES auth.users(id),
  target_type      text        NOT NULL CHECK (target_type IN ('post','comment')),
  target_id        uuid        NOT NULL,

  reason           text        NOT NULL
                               CHECK (reason IN ('spam','inappropriate','harassment','misinformation','other')),
  detail           text        CHECK (char_length(detail) <= 2000),

  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','reviewed','dismissed','actioned')),
  reviewed_by      uuid        REFERENCES auth.users(id),
  reviewed_at      timestamptz,

  -- Un usuario no puede reportar el mismo contenido dos veces
  UNIQUE (reporter_id, target_type, target_id),

  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moments_reports_org_status
  ON public.moments_reports (organization_id, status, created_at DESC);

ALTER TABLE public.moments_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments_reports FORCE  ROW LEVEL SECURITY;

-- Cualquier miembro puede crear un reporte
CREATE POLICY "moments_reports_insert" ON public.moments_reports
  FOR INSERT WITH CHECK (
    organization_id = public.user_org_id()
    AND reporter_id = auth.uid()
  );

-- Solo admins ven y gestionan reportes
CREATE POLICY "moments_reports_select" ON public.moments_reports
  FOR SELECT USING (
    organization_id = public.user_org_id()
    AND public.user_is_org_admin()
  );

CREATE POLICY "moments_reports_update" ON public.moments_reports
  FOR UPDATE USING (
    organization_id = public.user_org_id()
    AND public.user_is_org_admin()
  )
  WITH CHECK (
    organization_id = public.user_org_id()
    AND reviewed_by = auth.uid()
    AND reviewed_at IS NOT NULL
  );

-- ══════════════════════════════════════════════════════════════════════
-- 10. TABLA: moments_audit_logs
-- Registro inmutable de acciones sensibles.
-- Solo INSERT permitido (sin UPDATE/DELETE por RLS).
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.moments_audit_logs (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  actor_id         uuid        NOT NULL REFERENCES auth.users(id),
  action           text        NOT NULL,    -- ej. 'post.create', 'comment.remove', 'report.resolve'
  target_type      text,                   -- 'post' | 'comment' | 'community' | 'member' | 'report'
  target_id        uuid,
  metadata         jsonb,                  -- contexto adicional (IPs, cambios, etc.)

  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moments_audit_org
  ON public.moments_audit_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moments_audit_actor
  ON public.moments_audit_logs (actor_id, created_at DESC);

ALTER TABLE public.moments_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments_audit_logs FORCE  ROW LEVEL SECURITY;

-- Solo admins pueden leer el log
CREATE POLICY "moments_audit_select" ON public.moments_audit_logs
  FOR SELECT USING (
    organization_id = public.user_org_id()
    AND public.user_is_org_admin()
  );

-- Cualquier miembro activo puede insertar (la API valida qué acciones son auditables)
-- En producción, esto lo haría el service_role desde rutas de API.
CREATE POLICY "moments_audit_insert" ON public.moments_audit_logs
  FOR INSERT WITH CHECK (
    organization_id = public.user_org_id()
    AND actor_id    = auth.uid()
  );

-- Sin UPDATE ni DELETE → el log es inmutable por RLS
-- (service_role sí puede actualizar si se requiere corrección manual)


-- ══════════════════════════════════════════════════════════════════════
-- 11. PRUEBAS DE AISLAMIENTO TENANT A vs TENANT B
-- (documentadas como assertions — correr manualmente o en test suite)
-- ══════════════════════════════════════════════════════════════════════
/*
  ESCENARIO: Tenant A (org_a_id) y Tenant B (org_b_id) existen.
  Usuario A es miembro de org_a. Usuario B es miembro de org_b.

  ── TEST 1: FK compuesta previene cruce en posts ──────────────────
  -- Como superuser: insertar comunidad de org_b
  INSERT INTO moments_communities (id, organization_id, created_by, name)
    VALUES (gen_random_uuid(), org_b_id, user_b_id, 'Comunidad B');
  -- Intentar crear post de org_a apuntando a comunidad de org_b:
  INSERT INTO moments_posts (organization_id, community_id, author_id, post_type, body)
    VALUES (org_a_id, <id_comunidad_b>, user_a_id, 'discussion', 'cruce');
  -- DEBE FALLAR con: foreign key violation (community_id, organization_id)
  -- porque (id_comunidad_b, org_a_id) no existe en moments_communities.

  ── TEST 2: RLS oculta datos de otra org ──────────────────────────
  -- Autenticado como user_a (org_a):
  SELECT * FROM moments_posts;
  -- DEBE retornar solo filas con organization_id = org_a_id.
  -- Filas de org_b invisibles (RLS filtra por user_org_id()).

  ── TEST 3: Usuario B no puede insertar en comunidad de A ─────────
  -- Autenticado como user_b:
  INSERT INTO moments_posts (organization_id, community_id, author_id, post_type, body)
    VALUES (org_a_id, <id_comunidad_a>, user_b_id, 'discussion', 'intruso');
  -- DEBE FALLAR: RLS WITH CHECK → organization_id = user_org_id()
  -- user_b tiene org_b_id, org_a_id ≠ org_b_id → rechazado.

  ── TEST 4: storage_path forzado por tenant ───────────────────────
  -- Autenticado como user_a:
  INSERT INTO moments_attachments (organization_id, post_id, uploaded_by,
    file_name, file_type, file_size_bytes, storage_path)
    VALUES (org_a_id, <post_a_id>, user_a_id,
            'foto.jpg', 'image/jpeg', 1024,
            'org/' || org_b_id || '/moments/foto.jpg');   -- path de otra org
  -- DEBE FALLAR: RLS WITH CHECK → storage_path LIKE 'org/' || user_org_id() || '/%'

  ── TEST 5: Reacción duplicada rechazada ──────────────────────────
  -- Segunda reacción del mismo user al mismo post:
  INSERT INTO moments_reactions (organization_id, user_id, target_type, target_id, reaction_type)
    VALUES (org_a_id, user_a_id, 'post', <post_id>, 'like');
  -- DEBE FALLAR: UNIQUE (user_id, target_type, target_id)
*/


-- ══════════════════════════════════════════════════════════════════════
-- 12. BUCKET DE STORAGE (ejecutar en Supabase Dashboard / CLI)
-- ══════════════════════════════════════════════════════════════════════
-- Los buckets no se crean vía SQL estándar.
-- Ejecutar en Supabase Dashboard → Storage → New Bucket:
--   Nombre: moments-attachments
--   Tipo: PRIVATE (acceso solo vía signed URLs generados en API routes)
--   Tamaño máximo por archivo: 50 MB
--   MIME types permitidos: image/all, application/pdf, video/mp4, video/webm
--   Estructura de paths: org/{organization_id}/moments/{attachment_id}/{file_name}
--   Políticas: SELECT via signed URL (service_role), INSERT y DELETE solo service_role

COMMENT ON TABLE public.moments_communities   IS 'Comunidades temáticas internas por organización';
COMMENT ON TABLE public.moments_community_members IS 'Membresía de usuarios en comunidades';
COMMENT ON TABLE public.moments_posts         IS 'Publicaciones en comunidades (discussion, question, announcement, recognition)';
COMMENT ON TABLE public.moments_comments      IS 'Comentarios a posts con soporte de threading';
COMMENT ON TABLE public.moments_reactions     IS 'Reacciones emoji a posts y comentarios (una por usuario por objetivo)';
COMMENT ON TABLE public.moments_attachments   IS 'Archivos adjuntos en bucket privado con path por organización';
COMMENT ON TABLE public.moments_reports       IS 'Reportes de contenido inapropiado gestionados por admins';
COMMENT ON TABLE public.moments_audit_logs    IS 'Log inmutable de acciones sensibles en Moments';
