import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/ai/server'
import { getOrgId } from '@/lib/foundation/orgId'
import { calcReadiness } from '@/lib/foundation/readiness'
import { getLimits, getSizeLabel } from '@/lib/foundation/limits'

/* ── Construye el prompt con todos los datos de Foundation ── */
function buildKultuDNAPrompt(data: {
  profile:     Record<string, any>
  cardinales:  any[]
  axes:        any[]
}): string {
  const p = data.profile
  const valores = data.cardinales.map(c => `${c.name} (${c.dimension}): ${c.definition ?? ''}`).join('\n')
  const ejes    = data.axes.map((a, i) => {
    const dur = a.duration ? ` [${a.duration}]` : ''
    return `${i + 1}. ${a.name}${dur}${a.description ? ` — ${a.description}` : ''}`
  }).join('\n')
  const arquetipos = p.org_structure ?? ''

  const sizeLabel = getSizeLabel(p.size ?? '')
  const limits    = getLimits(p.size ?? '')

  return `Eres un consultor senior de cultura organizacional y gestión del talento.

Con base en los siguientes datos de la empresa, genera un perfil cultural compacto llamado "KultuDNA".

== DATOS DE LA ORGANIZACIÓN ==

SECTOR: ${p.sector ?? 'No especificado'}
TAMAÑO: ${p.size ?? 'No especificado'} (categoría: ${sizeLabel})
NATURALEZA JURÍDICA: ${p.legal_structure ?? 'No especificada'}

MISIÓN: ${p.mission ?? 'No definida'}
VISIÓN: ${p.vision ?? 'No definida'}
PROPÓSITO: ${p.purpose ?? 'No definido'}

PROPUESTA DE VALOR: ${p.value_proposition ?? 'No definida'}
MODALIDAD DE TRABAJO: ${p.work_mode ?? 'No especificada'}
MADUREZ DIGITAL: ${p.digital_maturity ?? 'No especificada'}
ARQUETIPOS CULTURALES: ${arquetipos || 'No seleccionados'}

VALORES Y COMPETENCIAS CARDINALES (${data.cardinales.length} de ${limits.valores[0]}–${limits.valores[1]} recomendados para su tamaño):
${valores || 'No definidos'}

PROCESOS CLAVE: ${(p.key_processes ?? []).join(', ') || 'No definidos'}
ÁREAS / PRIORIDADES CRÍTICAS: ${(p.critical_areas ?? []).join(', ') || 'No definidas'}

EJES ESTRATÉGICOS DEL PERÍODO (${data.axes.length} de ${limits.ejes[0]}–${limits.ejes[1]} recomendados; duración entre corchetes):
${ejes || 'No definidos'}

== INSTRUCCIÓN ==

Genera el KultuDNA en español. Debe tener exactamente estas 5 secciones con sus títulos:

**IDENTIDAD Y VALORES CORE**
(2–3 oraciones sobre qué los define como organización y qué principios no negocian)

**ESTILO DE LIDERAZGO ESPERADO**
(2–3 oraciones sobre cómo se lidera, qué comportamientos se valoran en posiciones de influencia)

**PERFIL DE PERSONAS QUE ENCAJAN**
(2–3 oraciones sobre el tipo de profesional que prospera aquí — mentalidad, forma de trabajar, valores)

**PRIORIDADES ESTRATÉGICAS ACTUALES**
(2–3 oraciones sobre en qué está enfocada la organización y qué impulsa las decisiones hoy)

**TONO Y RITMO ORGANIZACIONAL**
(2–3 oraciones sobre el ambiente, la velocidad y el estilo de comunicación interno)

Escribe en tono profesional pero humano. Evita el lenguaje corporativo genérico. Sé específico usando los datos reales de la empresa. Total: 300–400 palabras.`
}

/* ── POST /api/foundation/kultudna ───────────────────────── */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  // 1. Leer todos los datos de Foundation en paralelo
  const [profileRes, cardinalesRes, axesRes] = await Promise.all([
    supabase.from('organization_profiles').select('*').eq('organization_id', orgId).maybeSingle(),
    supabase.from('cardinal_competencies').select('*').eq('organization_id', orgId).eq('is_active', true),
    supabase.from('strategic_axes').select('*').eq('organization_id', orgId).eq('is_active', true).order('priority'),
  ])

  const profile    = profileRes.data ?? {}
  const cardinales = cardinalesRes.data ?? []
  const axes       = axesRes.data ?? []

  // 2. Generar KultuDNA con Claude
  const prompt = buildKultuDNAPrompt({ profile, cardinales, axes })

  const result = await callClaude(
    [{ role: 'user', content: prompt }],
    {
      model:     'claude-sonnet-4-5',
      maxTokens: 1024,
      system:    'Eres un consultor experto en cultura organizacional. Respondes siempre en español, de forma precisa y sin texto adicional fuera del formato solicitado.',
    }
  )

  const kultudna = result.content.trim()

  // 3. Calcular readiness y persistir
  const readiness = await calcReadiness(supabase, orgId)

  const { data: updated, error } = await supabase
    .from('organization_profiles')
    .upsert({
      organization_id:           orgId,
      kultudna_summary:          kultudna,
      readiness_score:           readiness.score,
      is_ready_for_architecture: readiness.isReady,
    }, { onConflict: 'organization_id' })
    .select('kultudna_summary, readiness_score, is_ready_for_architecture, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 4. Loguear uso de IA (fire-and-forget)
  void supabase.from('ai_usage').insert({
    organization_id: orgId,
    user_id:         user.id,
    feature:         'kultudna_generation',
    input_tokens:    result.usage?.input_tokens  ?? 0,
    output_tokens:   result.usage?.output_tokens ?? 0,
  })

  return NextResponse.json({
    kultudna:    updated.kultudna_summary,
    readiness:   { score: updated.readiness_score, isReady: updated.is_ready_for_architecture },
    generatedAt: updated.updated_at,
  })
}

/* ── GET /api/foundation/kultudna — leer el existente ──── */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ data: null })

  const { data } = await supabase
    .from('organization_profiles')
    .select('kultudna_summary, readiness_score, is_ready_for_architecture, updated_at')
    .eq('organization_id', orgId)
    .maybeSingle()

  return NextResponse.json({ data })
}
