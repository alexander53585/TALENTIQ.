/**
 * GET /api/moments/notifications
 *
 * Returns the current user's Moments notifications, newest first.
 *
 * Query params:
 *   limit    — 1–50 (default 20)
 *   unread   — "true" to return only unread
 *
 * Response:
 *   { data: Notification[], unread_count: number }
 *
 * Seguridad:
 *   - organization_id + user_id siempre del contexto de sesión
 *   - RLS garantiza aislamiento a nivel DB como segunda capa
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getRequestContext }         from '@/lib/auth/requestContext'
import { toErrorResponse }           from '@/lib/moments/errors'

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await getRequestContext()
    const supabase          = await createClient()
    const sp                = req.nextUrl.searchParams

    const limitRaw = parseInt(sp.get('limit') ?? '20', 10)
    const limit    = isNaN(limitRaw) ? 20 : Math.min(Math.max(1, limitRaw), 50)
    const unreadOnly = sp.get('unread') === 'true'

    let query = supabase
      .from('moments_notifications')
      .select(
        'id, type, actor_display_name, post_id, title, body, read_at, created_at',
        { count: 'exact' },
      )
      .eq('user_id', userId)          // user isolation
      .eq('organization_id', orgId)   // tenant isolation
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.is('read_at', null)
    }

    const { data, error, count } = await query
    if (error) throw error

    // Separate unread count query (always, regardless of filter)
    const { count: unreadCount } = await supabase
      .from('moments_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('organization_id', orgId)   // tenant isolation
      .is('read_at', null)

    return NextResponse.json({
      data:         data ?? [],
      unread_count: unreadCount ?? 0,
    })

  } catch (err) {
    return toErrorResponse(err)
  }
}
