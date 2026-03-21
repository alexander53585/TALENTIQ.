import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS for org creation
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    // Auth: verify user session via cookie
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Check if user already has an org
    const { data: existing } = await serviceClient
      .from('user_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (existing?.organization_id) {
      return NextResponse.json({ organizationId: existing.organization_id, alreadyExists: true })
    }

    const { companyName, sector } = await req.json()
    if (!companyName?.trim()) {
      return NextResponse.json({ error: 'Nombre de empresa requerido' }, { status: 400 })
    }

    const slug = companyName.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).slice(2, 6)

    // Create org using service role (bypasses RLS)
    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .insert({ name: companyName.trim(), slug, plan: 'free' })
      .select()
      .single()
    if (orgError) throw orgError

    // Create membership
    const { error: memError } = await serviceClient
      .from('user_memberships')
      .insert({
        user_id: user.id,
        organization_id: org.id,
        role: 'owner',
        scope: 'organization',
        is_active: true,
      })
    if (memError) throw memError

    // Create base org profile (without sector column if it doesn't exist yet)
    const { error: profError } = await serviceClient
      .from('organization_profiles')
      .insert({ organization_id: org.id })

    // Retry with sector if the base insert worked
    if (!profError && sector) {
      await serviceClient
        .from('organization_profiles')
        .update({ sector })
        .eq('organization_id', org.id)
        .then(() => {}) // ignore error if column doesn't exist
    }

    return NextResponse.json({ organizationId: org.id, success: true })
  } catch (err: any) {
    console.error('Onboarding error:', err)
    return NextResponse.json({ error: err.message || 'Error al crear la empresa' }, { status: 500 })
  }
}
