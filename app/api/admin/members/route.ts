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
  // Nota: Hacemos un join indirecto con auth.users si es posible, 
  // o confiamos en que los emails están en una tabla de perfiles.
  // Por ahora, traemos los IDs y buscaremos los emails.
  const { data: memberships, error: memError } = await supabase
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

  if (memError) return NextResponse.json({ error: memError.message }, { status: 500 })

  // Intentamos obtener emails de los perfiles de usuario si existen
  // Si no, devolvemos lo que tenemos
  const userIds = memberships.map(m => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', userIds)

  const data = memberships.map(m => ({
    ...m,
    email: profiles?.find(p => p.id === m.user_id)?.email || 'Usuario'
  }))

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
