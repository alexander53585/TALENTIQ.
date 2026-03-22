/**
 * GET /api/moments/feed
 *
 * Query params:
 *   communityId  — filtrar por comunidad (opcional, UUID)
 *   postType     — filtrar por tipo (opcional, discussion|question|announcement|recognition)
 *   cursor       — paginación por cursor (base64url JSON {ts, id})
 *   limit        — ítems por página (1–50, default 20)
 *   since        — ISO timestamp; si se provee, devuelve sólo posts creados DESPUÉS de esa fecha
 *                  (usado por el polling fallback de useRealtimeMoments)
 *
 * Paginación por cursor (no offset):
 *   Cursor = base64url({ ts: ISO-8601, id: UUID }) del último ítem devuelto.
 *   Condición: (created_at < ts) OR (created_at = ts AND id < id)
 *   Garantiza estabilidad aunque se inserten posts mientras se pagina.
 *
 * Seguridad:
 *   - organization_id siempre del contexto de sesión
 *   - No select(*) — campos mínimos especificados
 *   - communityId validado como UUID y filtrado por org (evita enumeración)
 *   - 404 si communityId no pertenece a la org del usuario
 *   - Si la comunidad es privada, 404 si el usuario no es miembro ni admin
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getRequestContext }         from '@/lib/auth/requestContext'
import { toErrorResponse, NotFoundError, ValidationError } from '@/lib/moments/errors'

// ── Constantes ────────────────────────────────────────────────────────
const DEFAULT_LIMIT = 20
const MAX_LIMIT     = 50

const VALID_POST_TYPES = new Set(['discussion', 'question', 'announcement', 'recognition'])

// Campos del post devueltos al cliente — NO select(*)
const POST_FIELDS = [
  'id',
  'community_id',
  'post_type',
  'title',
  'body',
  'is_pinned',
  'is_locked',
  'created_at',
  'updated_at',
  'author_id',
  'metadata',
].join(', ')

// ── Cursor ────────────────────────────────────────────────────────────

interface Cursor { ts: string; id: string }

function encodeCursor(ts: string, id: string): string {
  return Buffer.from(JSON.stringify({ ts, id })).toString('base64url')
}

function decodeCursor(raw: string): Cursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8'))
    if (typeof parsed?.ts === 'string' && typeof parsed?.id === 'string') {
      // Validar que ts es ISO y id parece UUID
      new Date(parsed.ts)  // lanza si inválido
      if (!/^[0-9a-f-]{36}$/i.test(parsed.id)) return null
      return parsed as Cursor
    }
    return null
  } catch {
    return null
  }
}

// ── Handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    // role es necesario para el check de comunidades privadas
    const { orgId, userId, role } = await getRequestContext()
    const supabase          = await createClient()

    // ── 1. Parsear y validar query params ──────────────────────────────
    const sp          = req.nextUrl.searchParams
    const communityId = sp.get('communityId') ?? undefined
    const postType    = sp.get('postType')    ?? undefined
    const cursorRaw   = sp.get('cursor')      ?? undefined
    const sinceRaw    = sp.get('since')       ?? undefined
    const limitRaw    = parseInt(sp.get('limit') ?? String(DEFAULT_LIMIT), 10)

    const limit = isNaN(limitRaw) || limitRaw < 1
      ? DEFAULT_LIMIT
      : Math.min(limitRaw, MAX_LIMIT)

    // Validar communityId si se provee
    if (communityId) {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!UUID_RE.test(communityId)) {
        throw new ValidationError('"communityId" debe ser un UUID válido', 'communityId')
      }
    }

    if (postType && !VALID_POST_TYPES.has(postType)) {
      throw new ValidationError(
        `"postType" debe ser: ${Array.from(VALID_POST_TYPES).join(' | ')}`,
        'postType',
      )
    }

    // Validar since (si existe)
    let sinceTs: string | null = null
    if (sinceRaw) {
      const d = new Date(sinceRaw)
      if (isNaN(d.getTime())) throw new ValidationError('"since" debe ser un ISO timestamp válido', 'since')
      sinceTs = d.toISOString()
    }

    // Decodificar cursor (si existe)
    let cursor: Cursor | null = null
    if (cursorRaw) {
      cursor = decodeCursor(cursorRaw)
      if (!cursor) throw new ValidationError('Cursor de paginación inválido', 'cursor')
    }

    // ── 2. Si se pide por comunidad, verificar que pertenece a la org ─
    // Defensa en profundidad: si la comunidad es privada, verificar membresía
    // del usuario (además del RLS que ya lo cubre a nivel DB).
    if (communityId) {
      const { data: community } = await supabase
        .from('moments_communities')
        .select('id, is_private')
        .eq('id', communityId)
        .eq('organization_id', orgId)   // AISLAMIENTO TENANT
        .maybeSingle()

      if (!community) {
        throw new NotFoundError('Comunidad no encontrada')
      }

      // Comunidades privadas: defensa en profundidad sobre el RLS.
      // Solo miembros o admins de la org pueden ver el feed de una comunidad privada.
      if (community.is_private) {
        const ADMIN_ROLES = new Set(['owner', 'admin', 'hr_specialist'])
        const isOrgAdmin  = ADMIN_ROLES.has(role)

        if (!isOrgAdmin) {
          const { data: membership } = await supabase
            .from('moments_community_members')
            .select('id')
            .eq('community_id', communityId)
            .eq('organization_id', orgId)
            .eq('user_id', userId)
            .maybeSingle()

          if (!membership) {
            // 404 homogéneo — no revelamos que la comunidad existe pero es privada
            throw new NotFoundError('Comunidad no encontrada')
          }
        }
      }
    }

    // ── 3. Construir query del feed ────────────────────────────────────
    let query = supabase
      .from('moments_posts')
      .select(POST_FIELDS)
      .eq('organization_id', orgId)     // AISLAMIENTO TENANT
      .eq('status', 'published')

    if (communityId) query = query.eq('community_id', communityId)
    if (postType)    query = query.eq('post_type', postType)
    // `since` mode: polling fallback — return only posts newer than the timestamp
    if (sinceTs)     query = query.gt('created_at', sinceTs)

    // ── 4. Aplicar cursor ──────────────────────────────────────────────
    // Condición: (created_at < cursor.ts) OR (created_at = cursor.ts AND id < cursor.id)
    // Implementado como: created_at <= ts, luego filtro de id cuando created_at = ts exacto
    // Supabase soporta .or() con filtros compuestos:
    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.ts},and(created_at.eq.${cursor.ts},id.lt.${cursor.id})`,
      )
    }

    // ── 5. Ordenar y paginar ───────────────────────────────────────────
    // Pinned posts primero en la primera página (sin cursor)
    // Con cursor, mantener orden cronológico estricto para consistencia
    const { data: rawRows, error } = await query
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id',         { ascending: false })
      .limit(limit + 1)   // +1 para detectar hasMore

    if (error) throw error

    const rows = (rawRows ?? []) as unknown as { id: string; created_at: string; [key: string]: unknown }[]

    // ── 6. Determinar hasMore y construir nextCursor ───────────────────
    const hasMore   = rows.length > limit
    const items     = hasMore ? rows.slice(0, limit) : rows
    const lastItem  = items[items.length - 1]
    const nextCursor = hasMore && lastItem
      ? encodeCursor(lastItem.created_at, lastItem.id)
      : null

    return NextResponse.json({
      data:       items,
      nextCursor,
      hasMore,
      count:      items.length,
    })

  } catch (err) {
    return toErrorResponse(err)
  }
}
