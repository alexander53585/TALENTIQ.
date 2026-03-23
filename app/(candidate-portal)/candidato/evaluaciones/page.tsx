import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClipboardList, CheckCircle2, Clock, PlayCircle } from 'lucide-react'

interface CandidateRow {
  id: string
}

interface EvaluationRow {
  id: string
  status: string
  created_at: string
  access_token: string
  candidate_id: string
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending:     { label: 'Pendiente',     icon: <Clock size={14} />,        className: 'bg-amber-50 text-amber-600' },
  sent:        { label: 'Por completar', icon: <PlayCircle size={14} />,   className: 'bg-blue-50 text-[#3B6FCA]' },
  in_progress: { label: 'En progreso',   icon: <PlayCircle size={14} />,   className: 'bg-teal-50 text-[#00A99D]' },
  completed:   { label: 'Completada',    icon: <CheckCircle2 size={14} />, className: 'bg-emerald-50 text-emerald-600' },
}

export default async function CandidatoEvaluacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/candidato/login')

  // Find candidate records linked to this email
  const { data: candidateRecords } = await supabase
    .from('candidates')
    .select('id')
    .eq('email', user.email)

  const typedCandidates = (candidateRecords as CandidateRow[] | null) ?? []
  const candidateIds = typedCandidates.map((c) => c.id)

  const { data: evaluations } = candidateIds.length > 0
    ? await supabase
        .from('pf16_evaluations')
        .select('id, status, created_at, access_token, candidate_id')
        .in('candidate_id', candidateIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const typedEvals = (evaluations as EvaluationRow[] | null) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A45]">Evaluaciones</h1>
        <p className="text-slate-500 text-sm mt-1">
          Evaluaciones de personalidad 16PF asignadas a tu perfil.
        </p>
      </div>

      {typedEvals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <ClipboardList size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="font-semibold text-[#1E2A45] text-lg mb-2">Sin evaluaciones</h2>
          <p className="text-slate-400 text-sm">
            Cuando una empresa te asigne una evaluación 16PF, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {typedEvals.map((ev) => {
            const statusInfo = STATUS_CONFIG[ev.status] ?? {
              label: ev.status,
              icon: <Clock size={14} />,
              className: 'bg-slate-100 text-slate-500',
            }
            const date = new Date(ev.created_at).toLocaleDateString('es-MX', {
              day: '2-digit', month: 'long', year: 'numeric'
            })
            const isActionable = ev.status === 'sent' || ev.status === 'in_progress'

            return (
              <div
                key={ev.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center text-[#3B6FCA] shrink-0">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-[#1E2A45]">Evaluación 16PF</p>
                    <p className="text-xs text-slate-400 mt-0.5">Asignada el {date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
                    {statusInfo.icon}
                    {statusInfo.label}
                  </span>

                  {ev.status === 'completed' ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                      <CheckCircle2 size={16} />
                      Completada
                    </span>
                  ) : isActionable ? (
                    // Server renders the href with the token — token is in HTML but not in any API response
                    <a
                      href={`/16pf/${ev.access_token}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3B6FCA] text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <PlayCircle size={14} />
                      {ev.status === 'in_progress' ? 'Continuar' : 'Iniciar'}
                    </a>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
        <p>
          <strong className="text-slate-700">Nota:</strong> Las evaluaciones son asignadas por las empresas a
          las que te postulas. Los resultados son confidenciales y solo los ve el equipo de RH.
        </p>
      </div>
    </div>
  )
}
