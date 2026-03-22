/**
 * DELETE /api/moments/attachments/[id]
 * Elimina un adjunto del storage y de la base de datos.
 *
 * Seguridad:
 * - Autenticación requerida
 * - Solo el uploader o un admin/owner de la org puede borrar
 * - Elimina primero el registro en DB, luego el objeto en storage
 * - 404 para evitar enumeración de IDs de otras organizaciones
 * - Auditoría del borrado
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getOrgId }                  from '@/lib/foundation/orgId'
import {
  deleteFromStorage,
  logStorageAudit,
  MomentsStorageError,
} from '@/lib/moments/storage'

const ADMIN_ROLES = new Set(['owner', 'admin', 'hr_specialist'])

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // ── 1. Autenticación ─────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // ── 2. Resolución de org y rol ────────────────────────────────────
    const orgId = await getOrgId(supabase, user.id)
    if (!orgId) return NextResponse.json({ error: 'Sin membresía activa' }, { status: 403 })

    const { data: membership } = await supabase
      .from('user_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .maybeSingle()

    const isAdmin = membership ? ADMIN_ROLES.has(membership.role) : false

    const { id } = await params

    // ── 3. Buscar adjunto filtrando por organization_id ───────────────
    const { data: attachment, error: findErr } = await supabase
      .from('moments_attachments')
      .select('id, storage_path, uploaded_by, organization_id')
      .eq('id', id)
      .eq('organization_id', orgId)   // AISLAMIENTO TENANT
      .maybeSingle()

    if (findErr || !attachment) {
      return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 })
    }

    // ── 4. Verificar ownership: uploader o admin ──────────────────────
    const isOwner = attachment.uploaded_by === user.id
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Sin permiso para eliminar este adjunto' }, { status: 403 })
    }

    // ── 5. Eliminar registro en DB primero (si falla el storage, el dato queda)
    // Orden intencional: DB primero → si el storage falla, queda un objeto
    // huérfano que el job de limpieza puede detectar. Al revés quedaría una
    // fila DB apuntando a un objeto inexistente.
    const { error: deleteDbErr } = await supabase
      .from('moments_attachments')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)

    if (deleteDbErr) throw deleteDbErr

    // ── 6. Eliminar objeto del bucket (service_role) ──────────────────
    try {
      await deleteFromStorage(attachment.storage_path)
    } catch (storageErr) {
      // El registro DB ya fue eliminado. Loguear para limpieza manual/job.
      console.error('[Moments Attachments] Storage delete failed (objeto huérfano):', {
        id,
        path: attachment.storage_path,
        error: storageErr,
      })
    }

    // ── 7. Auditoría ──────────────────────────────────────────────────
    void logStorageAudit({
      orgId,
      actorId:  user.id,
      action:   'attachment.delete',
      targetId: id,
      metadata: {
        storage_path: attachment.storage_path,
        deleted_by_admin: isAdmin && !isOwner,
      },
    })

    return NextResponse.json({ ok: true })

  } catch (err) {
    if (err instanceof MomentsStorageError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 500 })
    }
    console.error('[Moments Attachments] DELETE error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
