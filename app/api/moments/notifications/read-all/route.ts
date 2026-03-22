/**
 * POST /api/moments/notifications/read-all
 *
 * Marks all unread notifications as read for the current user.
 * RLS + explicit user_id filter guarantee tenant/user isolation.
 */
import { NextResponse }    from 'next/server'
import { createClient }    from '@/lib/supabase/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse } from '@/lib/moments/errors'

export async function POST() {
  try {
    const { userId, orgId } = await getRequestContext()
    const supabase          = await createClient()

    const { error } = await supabase
      .from('moments_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('organization_id', orgId)   // tenant isolation
      .is('read_at', null)

    if (error) throw error

    return NextResponse.json({ data: { ok: true } })

  } catch (err) {
    return toErrorResponse(err)
  }
}
