import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import WorkspaceShell from '@/components/layout/WorkspaceShell'

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch membership + org in one query
  const { data: membership } = await supabase
    .from('user_memberships')
    .select('role, organization_id, organizations(name, plan, logo_url)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    const cookieStore = await cookies()
    const skipped = cookieStore.get('onboarding_skip')?.value
    if (!skipped) redirect('/onboarding')
  }

  const org = (Array.isArray(membership?.organizations)
    ? membership?.organizations[0]
    : membership?.organizations) as { name: string; plan: string; logo_url?: string | null } | null | undefined
  const orgName = org?.name ?? 'Mi empresa'
  const plan    = org?.plan ?? 'free'
  const logoUrl = org?.logo_url ?? null
  const role    = membership?.role ?? 'employee'

  return (
    <WorkspaceShell
      orgName={orgName}
      plan={plan}
      logoUrl={logoUrl}
      userEmail={user.email ?? ''}
      userRole={role}
    >
      {/* 
          Banner reubicado al Dashboard para evitar sobremontaje.
          Solo lo mostramos si no hay membresía.
      */}
      {children}
    </WorkspaceShell>
  )
}
