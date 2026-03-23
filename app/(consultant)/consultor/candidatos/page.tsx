import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users } from 'lucide-react'
import ConsultorCandidatosClient from './CandidatosClient'

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
  organization_id: string
}

interface CandidateRow {
  id: string
  name: string
  email: string
  status: string
  created_at: string
  vacancy_id: string | null
}

export interface CandidateDisplay {
  id: string
  name: string
  email: string
  status: string
  created_at: string
  vacancyTitle: string
  orgName: string
  orgId: string
}

export interface OrgOption {
  id: string
  name: string
}

export default async function ConsultorCandidatosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('user_memberships')
    .select('organization_id, organizations(id, name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .or('valid_until.is.null,valid_until.gt.' + new Date().toISOString())

  const typedMemberships = (memberships as MembershipRow[] | null) ?? []
  const orgIds = typedMemberships.map((m) => m.organization_id)

  const orgNameById: Record<string, string> = {}
  const orgOptions: OrgOption[] = []
  for (const m of typedMemberships) {
    const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations
    if (org) {
      orgNameById[m.organization_id] = org.name
      orgOptions.push({ id: m.organization_id, name: org.name })
    }
  }

  const { data: vacancies } = orgIds.length > 0
    ? await supabase
        .from('vacancies')
        .select('id, title, organization_id')
        .in('organization_id', orgIds)
    : { data: [] }

  const typedVacancies = (vacancies as VacancyRow[] | null) ?? []
  const vacancyById: Record<string, VacancyRow> = {}
  for (const v of typedVacancies) vacancyById[v.id] = v

  const vacancyIds = typedVacancies.map((v) => v.id)

  const { data: candidates } = vacancyIds.length > 0
    ? await supabase
        .from('candidates')
        .select('id, name, email, status, created_at, vacancy_id')
        .in('vacancy_id', vacancyIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const display: CandidateDisplay[] = ((candidates as CandidateRow[] | null) ?? []).map((c) => {
    const vacancy = c.vacancy_id ? vacancyById[c.vacancy_id] : null
    const orgId = vacancy?.organization_id ?? ''
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      status: c.status,
      created_at: c.created_at,
      vacancyTitle: vacancy?.title ?? '—',
      orgName: orgId ? (orgNameById[orgId] ?? '—') : '—',
      orgId,
    }
  })

  if (display.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2A45]">Candidatos</h1>
          <p className="text-slate-500 text-sm mt-1">Vista unificada de candidatos en todos tus clientes.</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No hay candidatos registrados</p>
          <p className="text-slate-400 text-sm mt-1">
            Los candidatos de tus clientes aparecerán aquí.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A45]">Candidatos</h1>
        <p className="text-slate-500 text-sm mt-1">Vista unificada de candidatos en todos tus clientes.</p>
      </div>
      <ConsultorCandidatosClient candidates={display} orgOptions={orgOptions} />
    </div>
  )
}
