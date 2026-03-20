import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/foundation/orgId'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  // Obtenemos los miembros de la organización
  const { data, error } = await supabase
    .from('user_memberships')
    .select(`
      id,
      user_id,
      role,
      scope,
      is_active,
      created_at
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body?.id || !body?.role) {
    return NextResponse.json({ error: 'id y role son requeridos' }, { status: 400 })
  }

  // Solo owner o admin pueden cambiar roles
  const { data: myMembership } = await supabase
    .from('user_memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', orgId)
    .single()

  if (!['owner', 'admin'].includes(myMembership?.role)) {
    return NextResponse.json({ error: 'No tienes permisos para cambiar roles' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('user_memberships')
    .update({ role: body.role })
    .eq('id', body.id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
