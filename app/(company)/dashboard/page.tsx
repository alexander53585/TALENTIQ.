import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Dna, Building2, Users, BarChart3, BookOpen,
  AlertTriangle, ArrowRight, Plus, CheckCircle2,
  Clock, Briefcase, TrendingUp, Settings,
  ShieldCheck, UserCheck, RefreshCw, Calendar, Activity,
} from 'lucide-react'

/* ── helpers ─────────────────────────────────────────── */
async function fetchMetrics(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string) {
  const [profileRes, positionsRes, vacanciesRes, employeesRes, candidatesRes] = await Promise.allSettled([
    supabase.from('organization_profiles').select('readiness_score, kultudna_summary').eq('organization_id', orgId).maybeSingle(),
    supabase.from('job_positions').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('vacancies').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).in('status', ['published', 'in_process']),
    supabase.from('employees').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
    supabase.from('candidates').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).not('status', 'in', '("hired")'),
  ])

  const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null
  const positions = positionsRes.status === 'fulfilled' ? (positionsRes.value.count ?? 0) : 0
  const vacancies = vacanciesRes.status === 'fulfilled' ? (vacanciesRes.value.count ?? 0) : 0
  const employees = employeesRes.status === 'fulfilled' ? (employeesRes.value.count ?? 0) : 0
  const activeCandidates = candidatesRes.status === 'fulfilled' ? (candidatesRes.value.count ?? 0) : 0

  return {
    foundationScore: profile?.readiness_score ?? 0,
    hasKultuDNA: !!profile?.kultudna_summary,
    positions,
    vacancies,
    employees,
    activeCandidates,
  }
}

/* ── sub-components ───────────────────────────────────── */
function ModuleCard({
  icon: Icon,
  label,
  subtitle,
  metric,
  metricLabel,
  cta,
  ctaHref,
  locked,
  comingSoon,
  status,
}: {
  icon: React.ElementType
  label: string
  subtitle: string
  metric?: string | number
  metricLabel?: string
  cta?: string
  ctaHref?: string
  locked?: boolean
  comingSoon?: boolean
  status?: 'ok' | 'warning' | 'empty'
}) {
  const statusColors = {
    ok: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
    empty: 'bg-slate-50 text-slate-400 border-slate-100',
  }
  const iconBg = comingSoon
    ? 'bg-slate-100 text-slate-400'
    : locked
      ? 'bg-amber-50 text-amber-400'
      : 'bg-[#3B6FCA]/10 text-[#3B6FCA]'

  return (
    <div
      className={`relative bg-white rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-200
        ${comingSoon || locked
          ? 'border-slate-200 opacity-70'
          : 'border-slate-200 hover:border-[#3B6FCA]/40 hover:shadow-md hover:shadow-[#3B6FCA]/5 cursor-pointer'
        }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={20} />
        </div>
        {comingSoon && (
          <span className="text-[10px] font-semibold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 tracking-wide">
            PRÓXIMAMENTE
          </span>
        )}
        {!comingSoon && status && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border tracking-wide ${statusColors[status]}`}>
            {status === 'ok' ? 'ACTIVO' : status === 'warning' ? 'PENDIENTE' : 'VACÍO'}
          </span>
        )}
      </div>

      {/* Label */}
      <div>
        <p className="text-sm font-semibold text-[#1E2A45] leading-none">{label}</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{subtitle}</p>
      </div>

      {/* Metric */}
      {!comingSoon && (
        <div className="flex items-end gap-1.5">
          {metric !== undefined ? (
            <>
              <span className="text-3xl font-bold text-[#1E2A45] leading-none">{metric}</span>
              {metricLabel && <span className="text-xs text-slate-400 mb-0.5">{metricLabel}</span>}
            </>
          ) : (
            <span className="text-sm text-slate-400 italic">Sin datos</span>
          )}
        </div>
      )}

      {/* CTA */}
      {cta && ctaHref && !comingSoon && !locked && (
        <Link
          href={ctaHref}
          className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-[#3B6FCA] hover:gap-2.5 transition-all duration-150"
        >
          {cta} <ArrowRight size={13} />
        </Link>
      )}
      {locked && (
        <p className="mt-auto text-xs text-amber-500 font-medium flex items-center gap-1.5">
          <AlertTriangle size={12} /> Requiere Foundation
        </p>
      )}
    </div>
  )
}

function FoundationProgress({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score))
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct === 100 ? '#10b981' : pct > 50 ? '#3B6FCA' : '#f59e0b',
          }}
        />
      </div>
      <span className="text-sm font-bold text-[#1E2A45] shrink-0">{pct}%</span>
    </div>
  )
}

/* ── HR KPI Card ──────────────────────────────────────── */
function HRKpiCard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  trendLabel,
  comingSoon,
  iconColor = 'text-[#3B6FCA]',
  iconBg = 'bg-[#3B6FCA]/10',
}: {
  icon: React.ElementType
  label: string
  value?: string | number
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  comingSoon?: boolean
  iconColor?: string
  iconBg?: string
}) {
  const trendColors = { up: 'text-emerald-500', down: 'text-red-500', neutral: 'text-slate-400' }
  const trendArrows = { up: '↑', down: '↓', neutral: '→' }
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 ${comingSoon ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={16} className={iconColor} />
        </div>
        {comingSoon && (
          <span className="text-[10px] font-semibold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 tracking-wide">
            PRONTO
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-slate-400 leading-none mb-1">{label}</p>
        {comingSoon ? (
          <p className="text-sm text-slate-300 font-medium italic">Sin datos aún</p>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[#1E2A45] leading-none">{value ?? '—'}</span>
            {unit && <span className="text-xs text-slate-400">{unit}</span>}
          </div>
        )}
      </div>
      {!comingSoon && trend && trendLabel && (
        <p className={`text-[11px] font-medium ${trendColors[trend]} flex items-center gap-1`}>
          <span>{trendArrows[trend]}</span> {trendLabel}
        </p>
      )}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────── */
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('user_memberships')
    .select('organization_id, role, organizations(name)')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .maybeSingle()

  const orgId = membership?.organization_id
  const org = (Array.isArray(membership?.organizations)
    ? membership?.organizations[0]
    : membership?.organizations) as { name: string } | null | undefined
  const orgName = org?.name ?? 'tu empresa'

  const metrics = orgId
    ? await fetchMetrics(supabase, orgId)
    : { foundationScore: 0, hasKultuDNA: false, positions: 0, vacancies: 0, employees: 0, activeCandidates: 0 }

  const foundationComplete = metrics.foundationScore >= 100
  const hasAnyData = metrics.positions > 0 || metrics.employees > 0

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Onboarding alert (replaces the old top fixed bar) ── */}
      {!orgId && (
        <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Clock size={18} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Tu perfil de empresa está incompleto</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Configura tu organización para desbloquear todas las funcionalidades de KultuRH.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="shrink-0 flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Configurar ahora <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* ── Foundation alert banner ── */}
      {!foundationComplete && (
        <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Completa Foundation antes de continuar</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Architecture y Hiring requieren que el ADN cultural de {orgName} esté configurado.
            </p>
            <FoundationProgress score={metrics.foundationScore} />
          </div>
          <Link
            href="/foundation"
            className="shrink-0 flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Completar <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A45]">
          {greeting()}, {orgName} 👋
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {hasAnyData
            ? `${metrics.positions} cargos · ${metrics.employees} colaboradores · ${metrics.vacancies} vacantes activas`
            : 'Comienza configurando el ADN cultural de tu empresa'}
        </p>
      </div>

      {/* ── Core modules grid ── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Módulos activos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Foundation */}
          <ModuleCard
            icon={Dna}
            label="Foundation"
            subtitle="ADN cultural y valores de la organización"
            metric={`${metrics.foundationScore}%`}
            metricLabel="completado"
            status={foundationComplete ? 'ok' : metrics.foundationScore > 0 ? 'warning' : 'empty'}
            cta={foundationComplete ? 'Ver KultuDNA' : 'Completar ahora'}
            ctaHref="/foundation"
          />

          {/* Architecture */}
          <ModuleCard
            icon={ShieldCheck}
            label="Architecture"
            subtitle="Cargos y perfiles de competencias"
            metric={metrics.positions}
            metricLabel={metrics.positions === 1 ? 'cargo' : 'cargos'}
            status={metrics.positions > 0 ? 'ok' : 'empty'}
            cta={metrics.positions > 0 ? 'Ver cargos' : 'Crear primer cargo'}
            ctaHref="/architecture"
            locked={!foundationComplete}
          />

          {/* Hiring */}
          <ModuleCard
            icon={Briefcase}
            label="Hiring"
            subtitle="Vacantes y proceso de selección"
            metric={metrics.vacancies}
            metricLabel={metrics.vacancies === 1 ? 'vacante activa' : 'vacantes activas'}
            status={metrics.vacancies > 0 ? 'ok' : 'empty'}
            cta="Ver vacantes"
            ctaHref="/hiring"
            locked={!foundationComplete}
          />

          {/* People */}
          <ModuleCard
            icon={Users}
            label="People"
            subtitle="Colaboradores y estructura de equipo"
            metric={metrics.employees}
            metricLabel={metrics.employees === 1 ? 'colaborador' : 'colaboradores'}
            status={metrics.employees > 0 ? 'ok' : 'empty'}
            cta="Ver equipo"
            ctaHref="/people"
            comingSoon={false}
          />
        </div>
      </div>

      {/* ── Coming soon modules ── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Próximas fases</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ModuleCard icon={TrendingUp} label="Performance" subtitle="Evaluaciones y OKRs" comingSoon />
          <ModuleCard icon={BookOpen} label="Learning" subtitle="Formación y desarrollo" comingSoon />
          <ModuleCard icon={BarChart3} label="Analytics" subtitle="Métricas e insights de RH" comingSoon />
          <ModuleCard icon={Settings} label="Admin" subtitle="Usuarios, roles y empresa" cta="Administrar" ctaHref="/admin" status="ok" metric={undefined} />
        </div>
      </div>

      {/* ── Quick actions (only when Foundation is done) ── */}
      {foundationComplete && (
        <div className="bg-[#3B6FCA]/5 border border-[#3B6FCA]/15 rounded-2xl p-5">
          <p className="text-sm font-semibold text-[#1E2A45] mb-3 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-500" /> Acciones rápidas
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/architecture" className="flex items-center gap-1.5 bg-[#3B6FCA] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#2d5ab8] transition-colors">
              <Plus size={13} /> Nuevo cargo
            </Link>
            <Link href="/hiring" className="flex items-center gap-1.5 bg-white border border-slate-200 text-[#1E2A45] text-xs font-semibold px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors">
              <Plus size={13} /> Nueva vacante
            </Link>
            <Link href="/foundation" className="flex items-center gap-1.5 bg-white border border-slate-200 text-[#1E2A45] text-xs font-semibold px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors">
              <Dna size={13} /> Editar KultuDNA
            </Link>
          </div>
        </div>
      )}

      {/* ── HR Indicators ── */}
      {orgId && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Indicadores de RH</p>
            <span className="text-[11px] text-slate-400">Actualizado en tiempo real</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <HRKpiCard
              icon={Users}
              label="Headcount"
              value={metrics.employees}
              unit="colaboradores"
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <HRKpiCard
              icon={Briefcase}
              label="Vacantes activas"
              value={metrics.vacancies}
              unit="abiertas"
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
            />
            <HRKpiCard
              icon={UserCheck}
              label="Candidatos activos"
              value={metrics.activeCandidates}
              unit="en proceso"
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
            <HRKpiCard
              icon={Building2}
              label="Cargos documentados"
              value={metrics.positions}
              unit="posiciones"
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
            />
            <HRKpiCard
              icon={RefreshCw}
              label="Índice de rotación"
              comingSoon
              iconBg="bg-amber-50"
              iconColor="text-amber-500"
            />
            <HRKpiCard
              icon={Activity}
              label="Ausentismo"
              comingSoon
              iconBg="bg-rose-50"
              iconColor="text-rose-500"
            />
          </div>
        </div>
      )}

      {/* ── Empty state (no org) ── */}
      {!orgId && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Clock size={24} className="text-slate-400" />
          </div>
          <p className="text-base font-semibold text-[#1E2A45]">Tu workspace está listo</p>
          <p className="text-sm text-slate-400 mt-1 mb-6">Configura tu empresa para comenzar a usar los módulos</p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 bg-[#3B6FCA] text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-[#2d5ab8] transition-colors"
          >
            Configurar empresa <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </div>
  )
}
