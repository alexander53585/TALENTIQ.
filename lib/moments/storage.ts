/**
 * lib/moments/storage.ts
 * Helpers de almacenamiento seguro para adjuntos de Moments.
 * Toda operación de storage ocurre server-side con service_role.
 */
import { createServiceClient } from '@/lib/supabase/service'

// ── Constantes ────────────────────────────────────────────────────────
export const BUCKET = 'moments-attachments'
export const SIGNED_URL_EXPIRY_SECONDS = 3_600          // 1 hora
export const MAX_ATTACHMENTS_PER_POST    = 5
export const MAX_TOTAL_BYTES_PER_POST    = 50 * 1024 * 1024  // 50 MB

/** MIME → { extensión segura, límite de bytes, magic bytes esperados } */
const ALLOWED_MIME: Record<
  string,
  { ext: string; maxBytes: number; magic: number[] }
> = {
  'image/jpeg':      { ext: 'jpg',  maxBytes: 10 * 1024 * 1024, magic: [0xFF, 0xD8, 0xFF] },
  'image/png':       { ext: 'png',  maxBytes: 10 * 1024 * 1024, magic: [0x89, 0x50, 0x4E, 0x47] },
  'image/webp':      { ext: 'webp', maxBytes: 10 * 1024 * 1024, magic: [0x52, 0x49, 0x46, 0x46] },
  'application/pdf': { ext: 'pdf',  maxBytes: 20 * 1024 * 1024, magic: [0x25, 0x50, 0x44, 0x46] },
}

// Extensiones bloqueadas explícitamente (defensa en profundidad)
const BLOCKED_EXTENSIONS = new Set([
  'exe','bat','cmd','sh','ps1','msi','jar','js','ts','php','py',
  'rb','go','rs','c','cpp','h','dll','so','dylib','dmg','iso',
  'vbs','wsf','hta','pif','scr','cpl','inf','reg','lnk',
])

// ── Tipos ─────────────────────────────────────────────────────────────
export interface ValidatedFile {
  buffer:       ArrayBuffer
  mimeType:     string
  extension:    string      // server-generated, never from client
  sizeBytes:    number
  originalName: string      // display only, never for paths
}

export interface UploadResult {
  storagePath: string
  fileType:    string
  fileSizeBytes: number
}

// ── Validación ────────────────────────────────────────────────────────

/**
 * Valida MIME type declarado + magic bytes reales del buffer.
 * Rechaza si el tipo no está en whitelist o si los magic bytes no coinciden.
 * NUNCA confía en el filename del cliente para determinar el tipo.
 */
export function validateFile(
  buffer:       ArrayBuffer,
  declaredMime: string,
  originalName: string,
): ValidatedFile {
  // 1. Limpiar MIME (quitar charset etc.)
  const mime = declaredMime.toLowerCase().split(';')[0].trim()

  // 2. Verificar whitelist
  const allowed = ALLOWED_MIME[mime]
  if (!allowed) {
    throw new MomentsStorageError(
      `Tipo de archivo no permitido: ${mime}. Solo se aceptan: ${Object.keys(ALLOWED_MIME).join(', ')}`,
      'MIME_NOT_ALLOWED',
    )
  }

  // 3. Verificar tamaño
  if (buffer.byteLength > allowed.maxBytes) {
    const maxMB = Math.round(allowed.maxBytes / 1024 / 1024)
    throw new MomentsStorageError(
      `El archivo supera el límite de ${maxMB} MB para ${mime}`,
      'FILE_TOO_LARGE',
    )
  }

  if (buffer.byteLength === 0) {
    throw new MomentsStorageError('El archivo está vacío', 'FILE_EMPTY')
  }

  // 4. Verificar magic bytes (primeros N bytes del buffer real)
  const bytes = new Uint8Array(buffer)
  const { magic } = allowed
  const matches = magic.every((b, i) => bytes[i] === b)

  // WebP: también verificar bytes 8-11 = WEBP
  const isWebP = mime === 'image/webp'
    ? bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    : true

  if (!matches || !isWebP) {
    throw new MomentsStorageError(
      'El contenido del archivo no corresponde al tipo declarado',
      'MAGIC_MISMATCH',
    )
  }

  // 5. Verificar extensión del nombre original (display only — bloquear extensiones peligrosas)
  const clientExt = originalName.split('.').pop()?.toLowerCase() ?? ''
  if (BLOCKED_EXTENSIONS.has(clientExt)) {
    throw new MomentsStorageError(
      `Extensión de archivo no permitida: .${clientExt}`,
      'BLOCKED_EXTENSION',
    )
  }

  return {
    buffer,
    mimeType:     mime,
    extension:    allowed.ext,          // extensión controlada por servidor
    sizeBytes:    buffer.byteLength,
    originalName: originalName.slice(0, 255),
  }
}

/**
 * Construye la ruta de storage.
 * Nunca incluye datos del cliente en el path.
 * Formato: org/{org_id}/moments/{post_id}/{uuid}.{ext}
 */
export function buildStoragePath(
  orgId:  string,
  postId: string,
  ext:    string,
): string {
  const uuid = crypto.randomUUID()
  return `org/${orgId}/moments/${postId}/${uuid}.${ext}`
}

// ── Storage operations (service_role) ────────────────────────────────

/**
 * Sube un archivo al bucket privado.
 * Usa service_role → bypasea RLS de storage.
 */
export async function uploadToStorage(
  path:       string,
  buffer:     ArrayBuffer,
  mimeType:   string,
): Promise<void> {
  const service = createServiceClient()
  const { error } = await service.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType:  mimeType,
      cacheControl: '3600',
      upsert:       false,   // nunca sobreescribir
    })
  if (error) throw new MomentsStorageError(`Error subiendo archivo: ${error.message}`, 'UPLOAD_FAILED')
}

/**
 * Genera una URL firmada de corta duración para descarga.
 * El cliente nunca accede al bucket directamente.
 */
export async function getSignedDownloadUrl(
  storagePath: string,
  expiresIn = SIGNED_URL_EXPIRY_SECONDS,
): Promise<string> {
  const service = createServiceClient()
  const { data, error } = await service.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn)
  if (error || !data?.signedUrl) {
    throw new MomentsStorageError(`Error generando URL firmada: ${error?.message}`, 'SIGNED_URL_FAILED')
  }
  return data.signedUrl
}

/**
 * Borra un objeto del bucket (service_role).
 */
export async function deleteFromStorage(storagePath: string): Promise<void> {
  const service = createServiceClient()
  const { error } = await service.storage
    .from(BUCKET)
    .remove([storagePath])
  if (error) throw new MomentsStorageError(`Error borrando archivo: ${error.message}`, 'DELETE_FAILED')
}

// ── Auditoría ─────────────────────────────────────────────────────────

/**
 * Registra una acción en moments_audit_logs.
 * Fire-and-forget: los errores no bloquean la operación principal.
 */
export async function logStorageAudit(params: {
  orgId:      string
  actorId:    string
  action:     'attachment.upload' | 'attachment.delete' | 'attachment.url_requested'
  targetId:   string
  metadata?:  Record<string, unknown>
}): Promise<void> {
  try {
    const service = createServiceClient()
    await service.from('moments_audit_logs').insert({
      organization_id: params.orgId,
      actor_id:        params.actorId,
      action:          params.action,
      target_type:     'attachment',
      target_id:       params.targetId,
      metadata:        params.metadata ?? null,
    })
  } catch {
    // No bloquear la operación principal si el log falla
    console.error('[Moments Audit] Error registrando acción:', params.action)
  }
}

// ── Error personalizado ───────────────────────────────────────────────
export class MomentsStorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'MomentsStorageError'
  }
}
