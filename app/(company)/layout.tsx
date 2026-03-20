import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: membership } = await supabase
    .from('user_memberships')
    .select('id, organization_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (!membership) {
    // Permitir si eligió "configurar más tarde"
    const cookieStore = await cookies()
    const skipped = cookieStore.get('onboarding_skip')?.value
    if (!skipped) {
      redirect('/onboarding')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FC' }}>
      {!membership && (
        <div style={{ background: '#FFF8E1', borderBottom: '1px solid #FFD54F', padding: '10px 24px', textAlign: 'center', fontSize: 13, color: '#795548', fontFamily: "'Inter', sans-serif" }}>
          Tu perfil de empresa está incompleto.{' '}
          <a href="/onboarding" style={{ color: '#3366FF', fontWeight: 600, textDecoration: 'none' }}>Configurar ahora →</a>
        </div>
      )}
      <main>{children}</main>
    </div>
  )
}
