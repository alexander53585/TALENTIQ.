import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, Briefcase } from 'lucide-react'

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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new:        { label: 'Nuevo',       className: 'bg-blue-50 text-[#3B6FCA]' },
  interview:  { label: 'Entrevista',  className: 'bg-teal-50 text-[#00A99D]' },
  offer:      { label: 'Oferta',      className: 'bg-green-50 text-green-600' },
  hired:      { label: 'Contratado',  className: 'bg-emerald-50 text-emerald-600' },
  discarded:  { label: 'Descartado',  className: 'bg-red-50 text-red-500' },
}

export default async function CandidatoInicioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/candidato/login')

  const { data: applications } = await supabase
    .from('candidates')
    .select('id, status, created_at, vacancies(title, status, organizations(name))')
    .eq('email', user.email)
    .order('created_at', { ascending: false })

  const typedApps = (applications as ApplicationRow[] | null) ?? []

  const activeApps = typedApps.filter(
    (a) => a.status !== 'discarded' && a.status !== 'hired'
  )

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
      {/* Welcome */}
      <div className="bg-[#1A2B5E] rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-sm mb-1">Bienvenido al Portal Candidato</p>
        <h1 className="text-2xl font-bold">{user.email}</h1>
        <p className="text-blue-200 text-sm mt-2">
          {typedApps.length === 0
            ? 'Aún no tienes postulaciones activas.'
            : `Tienes ${activeApps.length} postulación${activeApps.length !== 1 ? 'es' : ''} activa${activeApps.length !== 1 ? 's' : ''}.`}
        </p>
      </div>

      {typedApps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="font-semibold text-[#1E2A45] text-lg mb-2">
            No tienes postulaciones aún
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Explora las vacantes disponibles y postúlate a las que te interesen.
          </p>
          <Link
            href="/vacantes"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3B6FCA] text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Explorar vacantes disponibles <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#1E2A45]">Mis postulaciones recientes</h2>
            <Link
              href="/candidato/postulaciones"
              className="text-sm text-[#3B6FCA] hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid gap-3">
            {typedApps.slice(0, 5).map((app) => {
              const vacancy = getVacancy(app)
              const org = vacancy ? getOrg(vacancy) : null
              const statusInfo = STATUS_CONFIG[app.status] ?? { label: app.status, className: 'bg-slate-100 text-slate-500' }
              const date = new Date(app.created_at).toLocaleDateString('es-MX', {
                day: '2-digit', month: 'short', year: 'numeric'
              })

              return (
                <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center text-[#3B6FCA] font-bold shrink-0">
                      {(org?.name?.[0] ?? 'E').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[#1E2A45] truncate">
                        {vacancy?.title ?? 'Vacante'}
                      </p>
                      <p className="text-sm text-slate-400">{org?.name ?? '—'} · {date}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="text-center pt-2">
            <Link
              href="/vacantes"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-[#3B6FCA]/30 text-[#3B6FCA] font-medium rounded-xl hover:bg-blue-50 transition-colors text-sm"
            >
              Explorar vacantes disponibles <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
