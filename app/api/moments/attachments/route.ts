/**
 * POST /api/moments/attachments
 * Sube un adjunto a un post de Moments.
 *
 * Seguridad:
 * - Autenticación requerida (sesión Supabase)
 * - organization_id resuelto desde user_memberships (nunca del cliente)
 * - Validación MIME + magic bytes en servidor
 * - Path generado en servidor con UUID (nunca del cliente)
 * - Límite de archivos por post (MAX_ATTACHMENTS_PER_POST)
 * - Límite de tamaño total por post (MAX_TOTAL_BYTES_PER_POST)
 * - Auditoría de cada subida en moments_audit_logs
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getOrgId }                  from '@/lib/foundation/orgId'
import {
  validateFile,
  buildStoragePath,
  uploadToStorage,
  logStorageAudit,
  MomentsStorageError,
  MAX_ATTACHMENTS_PER_POST,
  MAX_TOTAL_BYTES_PER_POST,
} from '@/lib/moments/storage'

export async function POST(req: NextRequest) {
  try {
    // ── 1. Autenticación ─────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // ── 2. Resolución de org (server-side, nunca del cliente) ─────────
    const orgId = await getOrgId(supabase, user.id)
    if (!orgId) return NextResponse.json({ error: 'Sin membresía activa' }, { status: 403 })

    // ── 3. Parsear multipart/form-data ────────────────────────────────
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Formato de solicitud inválido (se espera multipart/form-data)' }, { status: 400 })
    }

    const file     = formData.get('file')
    const postId   = formData.get('post_id')
    const commentId = formData.get('comment_id')   // opcional

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Campo "file" requerido' }, { status: 400 })
    }
    if (!postId || typeof postId !== 'string') {
      return NextResponse.json({ error: 'Campo "post_id" requerido' }, { status: 400 })
    }

    // ── 4. Verificar que el post pertenece a la org del usuario ───────
    const { data: post, error: postErr } = await supabase
      .from('moments_posts')
      .select('id, organization_id, is_locked')
      .eq('id', postId)
      .eq('organization_id', orgId)   // aislamiento tenant
      .eq('status', 'published')
      .maybeSingle()

    if (postErr || !post) {
      // 404 para evitar enumeración
      return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })
    }
    if (post.is_locked) {
      return NextResponse.json({ error: 'El post está bloqueado y no acepta adjuntos' }, { status: 422 })
    }

    // ── 5. Verificar límite de archivos por post ──────────────────────
    const { count: existingCount, error: countErr } = await supabase
      .from('moments_attachments')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('organization_id', orgId)

    if (countErr) throw countErr
    if ((existingCount ?? 0) >= MAX_ATTACHMENTS_PER_POST) {
      return NextResponse.json(
        { error: `El post ya tiene el máximo de ${MAX_ATTACHMENTS_PER_POST} adjuntos` },
        { status: 422 },
      )
    }

    // ── 6. Verificar tamaño total acumulado por post ──────────────────
    const { data: existing, error: sizeErr } = await supabase
      .from('moments_attachments')
      .select('file_size_bytes')
      .eq('post_id', postId)
      .eq('organization_id', orgId)

    if (sizeErr) throw sizeErr
    const totalExisting = (existing ?? []).reduce((sum, a) => sum + (a.file_size_bytes ?? 0), 0)
    if (totalExisting + file.size > MAX_TOTAL_BYTES_PER_POST) {
      const remainMB = Math.floor((MAX_TOTAL_BYTES_PER_POST - totalExisting) / 1024 / 1024)
      return NextResponse.json(
        { error: `Tamaño total del post excedería el límite. Espacio restante: ~${remainMB} MB` },
        { status: 422 },
      )
    }

    // ── 7. Leer buffer y validar MIME + magic bytes ───────────────────
    const buffer = await file.arrayBuffer()
    const validated = validateFile(buffer, file.type, file.name)

    // ── 8. Construir path (server-generated, nunca del cliente) ───────
    const storagePath = buildStoragePath(orgId, postId, validated.extension)

    // ── 9. Subir al bucket privado vía service_role ───────────────────
    await uploadToStorage(storagePath, validated.buffer, validated.mimeType)

    // ── 10. Registrar en moments_attachments ──────────────────────────
    const { data: attachment, error: insertErr } = await supabase
      .from('moments_attachments')
      .insert({
        organization_id: orgId,
        post_id:         postId,
        comment_id:      commentId && typeof commentId === 'string' ? commentId : null,
        uploaded_by:     user.id,
        file_name:       `${crypto.randomUUID()}.${validated.extension}`,  // nombre en storage
        original_name:   validated.originalName,                            // nombre display
        file_type:       validated.mimeType,
        file_size_bytes: validated.sizeBytes,
        storage_path:    storagePath,
      })
      .select('id, file_type, file_size_bytes, original_name, created_at')
      .single()

    if (insertErr) {
      // Si falla el insert, limpiar el objeto ya subido
      try { await (await import('@/lib/moments/storage')).deleteFromStorage(storagePath) } catch {}
      throw insertErr
    }

    // ── 11. Auditoría (fire-and-forget) ───────────────────────────────
    void logStorageAudit({
      orgId,
      actorId:  user.id,
      action:   'attachment.upload',
      targetId: attachment.id,
      metadata: {
        post_id:    postId,
        file_type:  validated.mimeType,
        size_bytes: validated.sizeBytes,
        path:       storagePath,
      },
    })

    return NextResponse.json({ data: attachment }, { status: 201 })

  } catch (err) {
    if (err instanceof MomentsStorageError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 422 })
    }
    console.error('[Moments Attachments] POST error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
