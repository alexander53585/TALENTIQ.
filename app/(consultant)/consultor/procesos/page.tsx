import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Briefcase } from 'lucide-react'

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
  title: string
  status: string
  organization_id: string
  created_at: string
}

interface CandidateCountRow {
  vacancy_id: string
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active:   { label: 'Activa',    className: 'bg-teal-50 text-[#00A99D]' },
  open:     { label: 'Abierta',   className: 'bg-teal-50 text-[#00A99D]' },
  draft:    { label: 'Borrador',  className: 'bg-slate-100 text-slate-500' },
  closed:   { label: 'Cerrada',   className: 'bg-red-50 text-red-500' },
  archived: { label: 'Archivada', className: 'bg-slate-100 text-slate-400' },
}

export default async function ConsultorProcesosPage() {
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
        .select('id, title, status, organization_id, created_at')
        .in('organization_id', orgIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const typedVacancies = (vacancies as VacancyRow[] | null) ?? []
  const vacancyIds = typedVacancies.map((v) => v.id)

  const { data: candidates } = vacancyIds.length > 0
    ? await supabase
        .from('candidates')
        .select('vacancy_id')
        .in('vacancy_id', vacancyIds)
    : { data: [] }

  const candidateCountByVacancy: Record<string, number> = {}
  for (const c of (candidates as CandidateCountRow[] | null) ?? []) {
    if (c.vacancy_id) {
      candidateCountByVacancy[c.vacancy_id] = (candidateCountByVacancy[c.vacancy_id] ?? 0) + 1
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A45]">Procesos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Vacantes activas en todos tus clientes.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        {typedVacancies.length === 0 ? (
          <div className="py-10 text-center">
            <Briefcase size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No hay vacantes disponibles</p>
            <p className="text-slate-400 text-sm mt-1">
              Las vacantes de tus clientes aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left font-medium text-slate-400 pb-3 pr-4">Cliente</th>
                  <th className="text-left font-medium text-slate-400 pb-3 pr-4">Vacante</th>
                  <th className="text-left font-medium text-slate-400 pb-3 pr-4">Estado</th>
                  <th className="text-left font-medium text-slate-400 pb-3 pr-4">Candidatos</th>
                  <th className="text-left font-medium text-slate-400 pb-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {typedVacancies.map((v) => {
                  const statusInfo = STATUS_LABELS[v.status] ?? { label: v.status, className: 'bg-slate-100 text-slate-500' }
                  const candidateCount = candidateCountByVacancy[v.id] ?? 0
                  const date = new Date(v.created_at).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })
                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-4 text-slate-600">
                        {orgNameById[v.organization_id] ?? '—'}
                      </td>
                      <td className="py-3 pr-4 font-medium text-[#1E2A45]">
                        <Link
                          href="/hiring"
                          className="hover:text-[#3B6FCA] hover:underline transition-colors"
                        >
                          {v.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{candidateCount}</td>
                      <td className="py-3 text-slate-400">{date}</td>
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
