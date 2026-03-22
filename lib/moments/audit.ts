/**
 * lib/moments/audit.ts
 * Registro de auditoría para acciones sensibles en Moments.
 *
 * Usa service_role para escribir en moments_audit_logs sin restricciones RLS.
 * Fire-and-forget: los errores de auditoría se loguean pero no interrumpen el flujo.
 */
import { createServerClient } from '@supabase/ssr'

export interface AuditEntry {
  actor_id:    string
  org_id:      string
  action:      string
  target_type: string
  target_id:   string
  metadata?:   Record<string, unknown>
}

/**
 * Inserta una entrada de auditoría sin bloquear la respuesta.
 * Si falla, registra el error en consola pero no lanza excepción.
 */
export function logMomentsAudit(entry: AuditEntry): void {
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  )

  client
    .from('moments_audit_logs')
    .insert({
      organization_id: entry.org_id,
      actor_id:        entry.actor_id,
      action:          entry.action,
      target_type:     entry.target_type,
      target_id:       entry.target_id,
      metadata:        entry.metadata ?? {},
    })
    .then(({ error }) => {
      if (error) {
        console.error('[Moments Audit] Error al registrar auditoría:', entry.action, error)
      }
    })
}
