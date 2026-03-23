import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CandidatePortalShell from '@/components/layout/CandidatePortalShell'

export default async function CandidatoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/candidato/login')

  return (
    <CandidatePortalShell userEmail={user.email ?? ''}>
      {children}
    </CandidatePortalShell>
  )
}
