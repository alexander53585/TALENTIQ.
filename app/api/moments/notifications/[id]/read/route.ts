/**
 * POST /api/moments/notifications/[id]/read
 *
 * Marks a single notification as read (sets read_at = now()).
 * Users can only mark their own notifications — enforced by RLS and
 * by the explicit user_id filter.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getRequestContext }         from '@/lib/auth/requestContext'
import { toErrorResponse, NotFoundError } from '@/lib/moments/errors'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId, orgId } = await getRequestContext()
    const { id }            = await params
    const supabase          = await createClient()

    const { data, error } = await supabase
      .from('moments_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)          // user isolation
      .eq('organization_id', orgId)   // tenant isolation
      .is('read_at', null)            // idempotent: only update if not already read
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) throw new NotFoundError('Notificación no encontrada')

    return NextResponse.json({ data: { id } })

  } catch (err) {
    return toErrorResponse(err)
  }
}
