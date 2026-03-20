import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Obtenemos su membresía actual
  const { data: membership, error } = await supabase
    .from('user_memberships')
    .select('*, organizations(*)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ user, membership })
}
