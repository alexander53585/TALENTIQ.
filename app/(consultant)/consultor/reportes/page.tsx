import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BarChart3, TrendingUp, Users, Briefcase, Clock } from 'lucide-react'

interface OrgInfo {
  id: string
  name: string
}

interface MembershipRow {
  organization_id: string
  organizations: OrgInfo | OrgInfo[] | null
}

interface VacancyRow {
  id: string
  status: string
  organization_id: string
}

interface CandidateCountRow {
  vacancy_id: string
}

export default async function ConsultorReportesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('user_memberships')
    .select('organization_id, organizations(id, name)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const typedMemberships = (memberships as MembershipRow[] | null) ?? []
  const orgIds = typedMemberships.map((m) => m.organization_id)

  const orgNameById: Record<string, string> = {}
  for (const m of typedMemberships) {
    const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations
    if (org) orgNameById[m.organization_id] = org.name
  }

  const { data: vacancies } = orgIds.length > 0
    ? await supabase
        .from('vacancies')
        .select('id, status, organization_id')
        .in('organization_id', orgIds)
    : { data: [] }

  const typedVacancies = (vacancies as VacancyRow[] | null) ?? []
  const vacancyIds = typedVacancies.map((v) => v.id)

  const { data: candidates } = vacancyIds.length > 0
    ? await supabase
        .from('candidates')
        .select('vacancy_id')
        .in('vacancy_id', vacancyIds)
    : { data: [] }

  const typedCandidates = (candidates as CandidateCountRow[] | null) ?? []

  // Build per-org metrics
  const metricsById: Record<string, { open: number; closed: number; candidates: number }> = {}
  for (const orgId of orgIds) {
    metricsById[orgId] = { open: 0, closed: 0, candidates: 0 }
  }

  for (const v of typedVacancies) {
    if (!metricsById[v.organization_id]) continue
    if (v.status === 'active' || v.status === 'open') {
      metricsById[v.organization_id].open += 1
    } else if (v.status === 'closed' || v.status === 'archived') {
      metricsById[v.organization_id].closed += 1
    }
  }

  const vacancyCandidateCount: Record<string, string> = {}
  for (const v of typedVacancies) {
    vacancyCandidateCount[v.id] = v.organization_id
  }

  for (const c of typedCandidates) {
    const orgId = c.vacancy_id ? vacancyCandidateCount[c.vacancy_id] : null
    if (orgId && metricsById[orgId]) {
      metricsById[orgId].candidates += 1
    }
  }

  const totalCandidates = typedCandidates.length
  const totalOpen = typedVacancies.filter((v) => v.status === 'active' || v.status === 'open').length
  const totalClosed = typedVacancies.filter((v) => v.status === 'closed' || v.status === 'archived').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A45]">Reportes</h1>
        <p className="text-slate-500 text-sm mt-1">Métricas agregadas de todos tus clientes.</p>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
          <Users size={24} className="mx-auto text-[#3B6FCA] mb-2" />
          <p className="text-2xl font-bold text-[#1E2A45]">{totalCandidates}</p>
          <p className="text-xs text-slate-400 mt-0.5">Total candidatos</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
          <Briefcase size={24} className="mx-auto text-[#00A99D] mb-2" />
          <p className="text-2xl font-bold text-[#1E2A45]">{totalOpen}</p>
          <p className="text-xs text-slate-400 mt-0.5">Vacantes abiertas</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
          <TrendingUp size={24} className="mx-auto text-green-500 mb-2" />
          <p className="text-2xl font-bold text-[#1E2A45]">{totalClosed}</p>
          <p className="text-xs text-slate-400 mt-0.5">Vacantes cerradas</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
          <BarChart3 size={24} className="mx-auto text-indigo-500 mb-2" />
          <p className="text-2xl font-bold text-[#1E2A45]">{typedMemberships.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Clientes activos</p>
        </div>
      </div>

      {/* Per-client breakdown */}
      {typedMemberships.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-[#1E2A45] mb-4">Desglose por cliente</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left font-medium text-slate-400 pb-3 pr-6">Cliente</th>
                  <th className="text-left font-medium text-slate-400 pb-3 pr-6">Candidatos</th>
                  <th className="text-left font-medium text-slate-400 pb-3 pr-6">Vacantes abiertas</th>
                  <th className="text-left font-medium text-slate-400 pb-3">Vacantes cerradas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {typedMemberships.map((m) => {
                  const metrics = metricsById[m.organization_id]
                  return (
                    <tr key={m.organization_id}>
                      <td className="py-3 pr-6 font-medium text-[#1E2A45]">
                        {orgNameById[m.organization_id] ?? '—'}
                      </td>
                      <td className="py-3 pr-6 text-slate-600">{metrics?.candidates ?? 0}</td>
                      <td className="py-3 pr-6">
                        <span className="px-2 py-0.5 bg-teal-50 text-[#00A99D] rounded-full text-xs">
                          {metrics?.open ?? 0}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs">
                          {metrics?.closed ?? 0}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Coming soon banner */}
      <div className="bg-[#1A2B5E] rounded-2xl p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#3B6FCA] flex items-center justify-center shrink-0">
          <Clock size={22} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold">Analytics avanzados — Próximamente</p>
          <p className="text-blue-200 text-sm mt-0.5">
            Gráficas de embudo de contratación, tiempo de reclutamiento, NPS cultural y más.
          </p>
        </div>
      </div>
    </div>
  )
}
