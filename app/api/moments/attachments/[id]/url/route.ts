/**
 * GET /api/moments/attachments/[id]/url
 * Genera una URL firmada de corta duración para descargar un adjunto.
 *
 * Seguridad:
 * - Autenticación requerida
 * - Solo miembros de la misma organización que el adjunto
 * - La URL expira en SIGNED_URL_EXPIRY_SECONDS (1 hora por defecto)
 * - Auditoría de cada solicitud de URL
 * - 404 en lugar de 403 para evitar enumeración de IDs
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getOrgId }                  from '@/lib/foundation/orgId'
import {
  getSignedDownloadUrl,
  logStorageAudit,
  SIGNED_URL_EXPIRY_SECONDS,
  MomentsStorageError,
} from '@/lib/moments/storage'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // ── 1. Autenticación ─────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // ── 2. Resolución de org ──────────────────────────────────────────
    const orgId = await getOrgId(supabase, user.id)
    if (!orgId) return NextResponse.json({ error: 'Sin membresía activa' }, { status: 403 })

    const { id } = await params

    // ── 3. Buscar adjunto filtrando por organization_id ───────────────
    // El filtro .eq('organization_id', orgId) garantiza aislamiento:
    // si el adjunto pertenece a otra org, maybeSingle devuelve null → 404.
    const { data: attachment, error } = await supabase
      .from('moments_attachments')
      .select('id, storage_path, file_type, original_name, file_size_bytes, organization_id')
      .eq('id', id)
      .eq('organization_id', orgId)   // AISLAMIENTO TENANT
      .maybeSingle()

    if (error || !attachment) {
      // 404 — no revelamos si el recurso existe en otra org
      return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 })
    }

    // ── 4. Generar URL firmada (service_role, expira pronto) ──────────
    const signedUrl = await getSignedDownloadUrl(attachment.storage_path)

    // ── 5. Auditoría (fire-and-forget) ────────────────────────────────
    void logStorageAudit({
      orgId,
      actorId:  user.id,
      action:   'attachment.url_requested',
      targetId: attachment.id,
      metadata: { expires_in_seconds: SIGNED_URL_EXPIRY_SECONDS },
    })

    return NextResponse.json({
      data: {
        url:           signedUrl,
        expires_in:    SIGNED_URL_EXPIRY_SECONDS,
        file_type:     attachment.file_type,
        original_name: attachment.original_name,
        size_bytes:    attachment.file_size_bytes,
      },
    })

  } catch (err) {
    if (err instanceof MomentsStorageError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 500 })
    }
    console.error('[Moments Attachments] GET /url error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
