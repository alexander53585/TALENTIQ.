import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConsultantShell from '@/components/layout/ConsultantShell'

interface OrgInfo {
  id: string
  name: string
  logo_url?: string | null
  plan?: string | null
}

interface MembershipRow {
  organization_id: string
  role: string
  organizations: OrgInfo | OrgInfo[] | null
}

export default async function ConsultorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('user_memberships')
    .select('organization_id, role, organizations(id, name, logo_url, plan)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .or('valid_until.is.null,valid_until.gt.' + new Date().toISOString())

  if (!memberships || memberships.length === 0) {
    redirect('/onboarding')
  }

  // Serialize for client component
  const serialized = (memberships as MembershipRow[]).map((m) => ({
    organization_id: m.organization_id,
    role: m.role,
    organizations: Array.isArray(m.organizations)
      ? m.organizations[0] ?? null
      : m.organizations,
  }))

  return (
    <ConsultantShell memberships={serialized} userEmail={user.email ?? ''}>
      {children}
    </ConsultantShell>
  )
}
