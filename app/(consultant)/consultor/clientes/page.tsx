import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, Building2 } from 'lucide-react'

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

interface VacancyCountRow {
  organization_id: string
}

export default async function ConsultorClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('user_memberships')
    .select('organization_id, role, organizations(id, name, logo_url, plan)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const typedMemberships = (memberships as MembershipRow[] | null) ?? []
  const orgIds = typedMemberships.map((m) => m.organization_id)

  const { data: activeVacancies } = orgIds.length > 0
    ? await supabase
        .from('vacancies')
        .select('organization_id')
        .in('organization_id', orgIds)
        .eq('status', 'active')
    : { data: [] }

  const vacancyCountByOrg: Record<string, number> = {}
  for (const v of (activeVacancies as VacancyCountRow[] | null) ?? []) {
    vacancyCountByOrg[v.organization_id] = (vacancyCountByOrg[v.organization_id] ?? 0) + 1
  }

  const getOrg = (m: MembershipRow): OrgInfo | null => {
    if (!m.organizations) return null
    return Array.isArray(m.organizations) ? m.organizations[0] ?? null : m.organizations
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A45]">Clientes</h1>
        <p className="text-slate-500 text-sm mt-1">
          Organizaciones donde tienes membresía activa.
        </p>
      </div>

      {typedMemberships.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No tienes clientes asignados</p>
          <p className="text-slate-400 text-sm mt-1">
            Solicita acceso a una organización para comenzar.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {typedMemberships.map((m) => {
            const org = getOrg(m)
            const vacCount = vacancyCountByOrg[m.organization_id] ?? 0
            return (
              <div
                key={m.organization_id}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center text-[#3B6FCA] font-bold text-lg shrink-0">
                    {(org?.name?.[0] ?? 'E').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1E2A45] truncate">
                      {org?.name ?? 'Empresa sin nombre'}
                    </p>
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-[#3B6FCA] rounded-full text-xs capitalize mt-1">
                      {org?.plan ?? 'free'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-slate-600 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rol</span>
                    <span className="font-medium capitalize">{m.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vacantes activas</span>
                    <span className="font-medium text-[#00A99D]">{vacCount}</span>
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#3B6FCA] text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Ver workspace <ArrowRight size={14} />
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
