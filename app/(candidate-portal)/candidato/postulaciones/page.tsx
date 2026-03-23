import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Briefcase, ArrowRight } from 'lucide-react'

interface OrgInfo {
  name: string
}

interface VacancyInfo {
  title: string
  status: string
  organizations: OrgInfo | OrgInfo[] | null
}

interface ApplicationRow {
  id: string
  status: string
  created_at: string
  vacancies: VacancyInfo | VacancyInfo[] | null
}

type TimelineStatus = 'new' | 'interview' | 'offer' | 'hired' | 'discarded'

const TIMELINE_STEPS: TimelineStatus[] = ['new', 'interview', 'offer', 'hired']

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  new:        { label: 'Nuevo',       badgeClass: 'bg-blue-50 text-[#3B6FCA]',      dotClass: 'bg-[#3B6FCA]' },
  interview:  { label: 'Entrevista',  badgeClass: 'bg-teal-50 text-[#00A99D]',      dotClass: 'bg-[#00A99D]' },
  offer:      { label: 'Oferta',      badgeClass: 'bg-green-50 text-green-600',      dotClass: 'bg-green-500' },
  hired:      { label: 'Contratado',  badgeClass: 'bg-emerald-50 text-emerald-600',  dotClass: 'bg-emerald-500' },
  discarded:  { label: 'Descartado',  badgeClass: 'bg-red-50 text-red-500',          dotClass: 'bg-red-400' },
}

function StatusTimeline({ status }: { status: string }) {
  if (status === 'discarded') {
    return (
      <div className="mt-3">
        <span className="px-2.5 py-1 bg-red-50 text-red-500 rounded-full text-xs font-medium">
          Proceso finalizado — No avanzó
        </span>
      </div>
    )
  }

  const currentIndex = TIMELINE_STEPS.indexOf(status as TimelineStatus)

  return (
    <div className="mt-3 flex items-center gap-1">
      {TIMELINE_STEPS.map((step, i) => {
        const isCompleted = i <= currentIndex
        const isCurrent = i === currentIndex
        const cfg = STATUS_CONFIG[step]
        return (
          <div key={step} className="flex items-center">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                isCompleted ? cfg.dotClass : 'bg-slate-200'
              } ${isCurrent ? 'ring-2 ring-offset-1 ring-current' : ''}`}
              style={{ color: isCurrent ? undefined : undefined }}
              title={cfg.label}
            />
            {i < TIMELINE_STEPS.length - 1 && (
              <div className={`w-8 h-0.5 ${i < currentIndex ? 'bg-[#00A99D]' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
      <span className="ml-2 text-xs text-slate-500">
        {STATUS_CONFIG[status]?.label ?? status}
      </span>
    </div>
  )
}

export default async function CandidatoPostulacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/candidato/login')

  const { data: applications } = await supabase
    .from('candidates')
    .select('id, status, created_at, vacancies(title, status, organizations(name))')
    .eq('email', user.email)
    .order('created_at', { ascending: false })

  const typedApps = (applications as ApplicationRow[] | null) ?? []

  const getVacancy = (a: ApplicationRow): VacancyInfo | null => {
    if (!a.vacancies) return null
    return Array.isArray(a.vacancies) ? a.vacancies[0] ?? null : a.vacancies
  }

  const getOrg = (v: VacancyInfo): OrgInfo | null => {
    if (!v.organizations) return null
    return Array.isArray(v.organizations) ? v.organizations[0] ?? null : v.organizations
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2A45]">Mis Postulaciones</h1>
          <p className="text-slate-500 text-sm mt-1">
            {typedApps.length} postulación{typedApps.length !== 1 ? 'es' : ''} en total.
          </p>
        </div>
        <Link
          href="/vacantes"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#3B6FCA] text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          Ver vacantes <ArrowRight size={14} />
        </Link>
      </div>

      {typedApps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="font-semibold text-[#1E2A45] text-lg mb-2">Sin postulaciones</h2>
          <p className="text-slate-400 text-sm mb-6">
            Aún no te has postulado a ninguna vacante.
          </p>
          <Link
            href="/vacantes"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3B6FCA] text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Explorar vacantes <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {typedApps.map((app) => {
            const vacancy = getVacancy(app)
            const org = vacancy ? getOrg(vacancy) : null
            const statusInfo = STATUS_CONFIG[app.status] ?? {
              label: app.status,
              badgeClass: 'bg-slate-100 text-slate-500',
              dotClass: 'bg-slate-400',
            }
            const date = new Date(app.created_at).toLocaleDateString('es-MX', {
              day: '2-digit', month: 'long', year: 'numeric'
            })

            return (
              <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center text-[#3B6FCA] font-bold shrink-0 mt-0.5">
                      {(org?.name?.[0] ?? 'E').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1E2A45]">{vacancy?.title ?? 'Vacante'}</p>
                      <p className="text-sm text-slate-400 mt-0.5">{org?.name ?? '—'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Postulado el {date}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${statusInfo.badgeClass}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <StatusTimeline status={app.status} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
