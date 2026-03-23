import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ConsultorSignOutButton from './SignOutButton'

interface OrgInfo {
  id: string
  name: string
  plan?: string | null
}

interface MembershipRow {
  organization_id: string
  role: string
  organizations: OrgInfo | OrgInfo[] | null
}

export default async function ConsultorPerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('user_memberships')
    .select('organization_id, role, organizations(id, name, plan)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const typedMemberships = (memberships as MembershipRow[] | null) ?? []

  const getOrg = (m: MembershipRow): OrgInfo | null => {
    if (!m.organizations) return null
    return Array.isArray(m.organizations) ? m.organizations[0] ?? null : m.organizations
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A45]">Mi Perfil</h1>
        <p className="text-slate-500 text-sm mt-1">Información de tu cuenta de consultor.</p>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-[#1E2A45] mb-4">Cuenta</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-[#3B6FCA] flex items-center justify-center text-white text-xl font-bold">
            {(user.email?.[0] ?? 'C').toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-[#1E2A45]">{user.email}</p>
            <span className="inline-block text-xs bg-[#00A99D]/10 text-[#00A99D] px-2 py-0.5 rounded-full font-medium mt-1 border border-[#00A99D]/20">
              Consultor
            </span>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-400">Email</span>
            <span className="text-[#1E2A45] font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-400">ID de usuario</span>
            <span className="text-slate-500 font-mono text-xs">{user.id}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-400">Membresías activas</span>
            <span className="text-[#1E2A45] font-medium">{typedMemberships.length}</span>
          </div>
        </div>
      </div>

      {/* Organizations */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-[#1E2A45] mb-4">Organizaciones</h2>
        {typedMemberships.length === 0 ? (
          <p className="text-slate-400 text-sm">No tienes membresías activas.</p>
        ) : (
          <div className="space-y-2">
            {typedMemberships.map((m) => {
              const org = getOrg(m)
              return (
                <div
                  key={m.organization_id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#3B6FCA]/10 flex items-center justify-center text-[#3B6FCA] font-bold text-sm">
                      {(org?.name?.[0] ?? 'E').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1E2A45]">
                        {org?.name ?? 'Empresa sin nombre'}
                      </p>
                      <p className="text-xs text-slate-400 capitalize">{m.role}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-[#3B6FCA] rounded-full capitalize">
                    {org?.plan ?? 'free'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row gap-3">
        <Link
          href="/profile"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3B6FCA] text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          Ir a perfil de empresa <ArrowRight size={14} />
        </Link>
        <ConsultorSignOutButton />
      </div>
    </div>
  )
}
