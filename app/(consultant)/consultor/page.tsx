import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2, Briefcase, Users, ArrowRight } from 'lucide-react'

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

interface VacancyRow {
  id: string
  title: string
  status: string
  organization_id: string
}

interface CandidateRow {
  id: string
  vacancy_id: string | null
}

export default async function ConsultorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('user_memberships')
    .select('organization_id, role, organizations(id, name, plan)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const orgIds = (memberships as MembershipRow[] | null)
    ?.map((m) => m.organization_id) ?? []

  const { data: vacancies } = orgIds.length > 0
    ? await supabase
        .from('vacancies')
        .select('id, title, status, organization_id')
        .in('organization_id', orgIds)
    : { data: [] }

  const vacancyIds = (vacancies as VacancyRow[] | null)?.map((v) => v.id) ?? []

  const { data: candidates } = vacancyIds.length > 0
    ? await supabase
        .from('candidates')
        .select('id, vacancy_id')
        .in('vacancy_id', vacancyIds)
    : { data: [] }

  const activeVacancies = (vacancies as VacancyRow[] | null)?.filter(
    (v) => v.status === 'active' || v.status === 'open'
  ) ?? []

  const typedMemberships = (memberships as MembershipRow[] | null) ?? []
  const typedCandidates = (candidates as CandidateRow[] | null) ?? []

  const getOrg = (m: MembershipRow): OrgInfo | null => {
    if (!m.organizations) return null
    return Array.isArray(m.organizations) ? m.organizations[0] ?? null : m.organizations
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A45]">Dashboard Consultor</h1>
        <p className="text-slate-500 text-sm mt-1">Resumen de tus clientes y procesos activos.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#3B6FCA]">
              <Building2 size={18} />
            </div>
            <span className="text-sm text-slate-500 font-medium">Clientes activos</span>
          </div>
          <p className="text-3xl font-bold text-[#1E2A45]">{typedMemberships.length}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#00A99D]">
              <Briefcase size={18} />
            </div>
            <span className="text-sm text-slate-500 font-medium">Procesos abiertos</span>
          </div>
          <p className="text-3xl font-bold text-[#1E2A45]">{activeVacancies.length}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users size={18} />
            </div>
            <span className="text-sm text-slate-500 font-medium">Candidatos en pipeline</span>
          </div>
          <p className="text-3xl font-bold text-[#1E2A45]">{typedCandidates.length}</p>
        </div>
      </div>

      {/* Clients table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#1E2A45]">Clientes recientes</h2>
          <Link
            href="/consultor/clientes"
            className="text-sm text-[#3B6FCA] hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>

        {typedMemberships.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No tienes clientes asignados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left font-medium text-slate-400 pb-3 pr-4">Empresa</th>
                  <th className="text-left font-medium text-slate-400 pb-3 pr-4">Rol</th>
                  <th className="text-left font-medium text-slate-400 pb-3 pr-4">Plan</th>
                  <th className="text-left font-medium text-slate-400 pb-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {typedMemberships.map((m) => {
                  const org = getOrg(m)
                  return (
                    <tr key={m.organization_id}>
                      <td className="py-3 pr-4 font-medium text-[#1E2A45]">
                        {org?.name ?? 'Empresa sin nombre'}
                      </td>
                      <td className="py-3 pr-4 capitalize text-slate-600">{m.role}</td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 bg-blue-50 text-[#3B6FCA] rounded-full text-xs capitalize">
                          {org?.plan ?? 'free'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href="/dashboard"
                            className="text-xs text-[#3B6FCA] hover:underline flex items-center gap-1"
                          >
                            Ir al workspace <ArrowRight size={12} />
                          </Link>
                          <Link
                            href="/consultor/procesos"
                            className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
                          >
                            Ver procesos
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
