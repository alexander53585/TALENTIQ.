/**
 * lib/moments/notifications.ts
 *
 * Fire-and-forget notification sender using service_role (bypasses RLS).
 * Same pattern as audit.ts — errors are logged but never surface to callers.
 *
 * Call sites:
 *   - POST /api/moments/posts/[id]/comments → notify post author
 *   - POST /api/moments/posts              → notify recognised employee
 */
import { createServerClient } from '@supabase/ssr'

export type NotificationType = 'new_comment' | 'recognition'

export interface NotificationInput {
  organization_id:    string
  user_id:            string        // recipient
  type:               NotificationType
  actor_id?:          string        // who triggered it
  actor_display_name?: string       // denormalized display name
  post_id?:           string
  title?:             string
  body?:              string        // content preview, max 80 chars
}

function serviceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  )
}

/**
 * Sends a notification. Fire-and-forget — never throws.
 */
export function sendMomentsNotification(input: NotificationInput): void {
  const client = serviceClient()

  client
    .from('moments_notifications')
    .insert({
      organization_id:    input.organization_id,
      user_id:            input.user_id,
      type:               input.type,
      actor_id:           input.actor_id           ?? null,
      actor_display_name: input.actor_display_name ?? 'Miembro del equipo',
      post_id:            input.post_id             ?? null,
      title:              input.title               ?? null,
      body:               input.body
        ? input.body.slice(0, 200)
        : null,
    })
    .then(({ error }) => {
      if (error) {
        console.error('[Moments Notifications] Error al enviar notificación:', input.type, error)
      }
    })
}
