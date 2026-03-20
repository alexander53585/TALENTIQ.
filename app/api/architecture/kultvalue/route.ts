import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/* ── POST /api/architecture/kultvalue ──────────────────────
   Analiza un descriptivo generado y sugiere factores KultuValue
   Retorna: { factors: KultuValueFactors }
─────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { result } = await req.json().catch(() => ({ result: null }))
  if (!result) return NextResponse.json({ error: 'result requerido' }, { status: 400 })

  const funciones = (result.responsabilidadesClave ?? [])
    .map((r: any) => r.descripcion ?? r.titulo ?? '')
    .join(' | ')

  const prompt = `Eres experto en valoración formal de cargos y análisis organizacional.

Analiza el siguiente descriptivo de cargo y sugiere los valores para cada factor del sistema KultuValue (escala 1-5).

DESCRIPTIVO:
Cargo: ${result.misionPuesto ?? ''}
Funciones: ${funciones}
Perfil requerido: Educación: ${result.perfilIdeal?.educacion ?? ''} | Experiencia: ${result.perfilIdeal?.experiencia ?? ''}
Personal a cargo: ${result.condicionesTrabajo?.personalACargo ?? 'No especificado'}
Viajes: ${result.condicionesTrabajo?.disponibilidadViajes ?? 'No especificado'}

FACTORES (1=mínimo, 5=máximo):
- conocimiento: Formación, experticia técnica, know-how (1=Operativo básico → 5=Experto/Referente)
- complejidad: Dificultad de problemas, variabilidad (1=Rutinaria/Predecible → 5=Altamente compleja/Estratégica)
- responsabilidad: Impacto de decisiones y alcance (1=Sigue instrucciones → 5=Define estrategia global)
- autonomia: Grado de independencia (1=Supervisión constante → 5=Autonomía total/establece políticas)
- gestion_personas: Liderazgo y desarrollo de personas (1=Sin personas a cargo → 5=Dirige múltiples equipos)
- condiciones: Exposición a condiciones físicas o riesgo (1=Condiciones ideales de oficina → 5=Alto riesgo/condiciones extremas)

Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{"conocimiento":3,"complejidad":3,"responsabilidad":3,"autonomia":3,"gestion_personas":1,"condiciones":1}`

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system: 'Eres un experto en valoración de cargos. Respondes solo con JSON puro, sin texto adicional.',
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as any).text)
    .join('')

  try {
    const match = raw.match(/\{[\s\S]*\}/)
    const factors = JSON.parse(match ? match[0] : raw)
    const KEYS = ['conocimiento', 'complejidad', 'responsabilidad', 'autonomia', 'gestion_personas', 'condiciones']
    const clamped = Object.fromEntries(
      KEYS.map(k => [k, Math.min(5, Math.max(1, Math.round(Number(factors[k]) || 1)))])
    )
    return NextResponse.json({ factors: clamped })
  } catch {
    return NextResponse.json({ error: 'No se pudo parsear la sugerencia de IA' }, { status: 422 })
  }
}
