'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { C, FF } from '@/lib/tokens'
import { useOrganization } from '@/hooks/useOrganization'
import { ValuesDeck, ArchetypesDeck, ChallengesDeck } from '@/components/foundation/KultuArchetypes'
import { VALUE_CARDS, CHALLENGE_CARDS } from '@/lib/foundation/cards-data'

/* ══════════════════ TYPES ══════════════════════ */
interface FoundationState {
  // Phase 1
  sector: string; size: string; legal_structure: string
  work_mode: string; digital_maturity: string; org_structure: string
  // Phase 2
  mission: string; vision: string; purpose: string
  selectedValues: string[]; selectedArchetypes: string[]
  // Phase 3
  value_proposition: string; key_processes: string[]; critical_areas: string[]
  // Phase 4
  selectedChallenges: string[]
}

const INIT: FoundationState = {
  sector: '', size: '', legal_structure: '', work_mode: '', digital_maturity: '', org_structure: '',
  mission: '', vision: '', purpose: '', selectedValues: [], selectedArchetypes: [],
  value_proposition: '', key_processes: [], critical_areas: [],
  selectedChallenges: [],
}

/* ══════════════════ HELPERS ════════════════════ */
const PHASES = [
  { n: 1, label: 'Identidad',   icon: '🏢' },
  { n: 2, label: 'Esencia',     icon: '✨' },
  { n: 3, label: 'Negocio',     icon: '💼' },
  { n: 4, label: 'Horizonte',   icon: '🎯' },
]

const SECTORS = ['Tecnología', 'Retail & Comercio', 'Manufactura', 'Servicios profesionales', 'Educación', 'Salud', 'Financiero & Fintech', 'Construcción & Real Estate', 'Agro & Alimentos', 'Logística', 'Medios & Entretenimiento', 'Gobierno & Público', 'ONG & Social', 'Otro']
const SIZES   = ['1–10 personas', '11–50 personas', '51–200 personas', '201–500 personas', '501–1,000 personas', '+1,000 personas']
const LEGAL   = ['S.A.', 'S.R.L.', 'E.I.R.L.', 'Cooperativa', 'Fundación / ONG', 'Empresa pública', 'Holding', 'Otro']
const MODES   = ['Presencial', 'Remoto', 'Híbrido (mayoría presencial)', 'Híbrido (mayoría remoto)']
const DIGITAL = ['Básico — procesos en papel/Excel', 'Intermedio — sistemas parciales', 'Avanzado — sistemas integrados', 'Nativo digital — datos en el centro']

/* ══════════════════ SUB-COMPONENTS ══════════════════════ */

function ProgressBar({ phase, total = 4 }: { phase: number; total?: number }) {
  const pct = Math.round(((phase - 1) / total) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: C.borderLight, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          width: `${pct}%`, transition: 'width 0.5s ease',
          background: `linear-gradient(90deg, ${C.primary}, ${C.primaryLight})`,
        }} />
      </div>
      <span style={{ fontFamily: FF, fontSize: 12, color: C.textMuted, minWidth: 36 }}>{pct}%</span>
    </div>
  )
}

function PhaseNav({ current, workshopMode }: { current: number; workshopMode: boolean }) {
  return (
    <div style={{ display: 'flex', gap: workshopMode ? 24 : 12 }}>
      {PHASES.map(p => {
        const done    = p.n < current
        const active  = p.n === current
        return (
          <div key={p.n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: workshopMode ? 36 : 28, height: workshopMode ? 36 : 28,
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FF, fontSize: workshopMode ? 14 : 12, fontWeight: 700,
              background: done ? C.success : active ? C.primary : C.surfaceAlt,
              color: done || active ? '#fff' : C.textMuted,
              border: `2px solid ${done ? C.success : active ? C.primary : C.border}`,
              transition: 'all 0.3s',
            }}>
              {done ? '✓' : p.n}
            </div>
            {!workshopMode && (
              <span style={{
                fontFamily: FF, fontSize: 12, fontWeight: active ? 600 : 400,
                color: active ? C.text : C.textMuted,
                display: 'none',
              } as any}>{p.label}</span>
            )}
            {workshopMode && (
              <span style={{ fontFamily: FF, fontSize: 14, fontWeight: active ? 700 : 400, color: active ? C.text : C.textMuted }}>
                {p.icon} {p.label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Select({ label, value, onChange, options, required }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: FF, fontSize: 13, fontWeight: 600, color: C.text }}>
        {label}{required && <span style={{ color: C.error }}> *</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          fontFamily: FF, fontSize: 14, color: value ? C.text : C.textMuted,
          border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 14px',
          background: '#fff', outline: 'none', cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
          paddingRight: 38,
        }}
      >
        <option value="">Seleccionar...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function Textarea({ label, value, onChange, placeholder, hint, required, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; hint?: string; required?: boolean; rows?: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: FF, fontSize: 13, fontWeight: 600, color: C.text }}>
        {label}{required && <span style={{ color: C.error }}> *</span>}
      </label>
      {hint && <p style={{ fontFamily: FF, fontSize: 12, color: C.textMuted, margin: 0 }}>{hint}</p>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          fontFamily: FF, fontSize: 14, color: C.text,
          border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '12px 14px',
          background: '#fff', outline: 'none', resize: 'vertical', lineHeight: 1.7,
          transition: 'border-color 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor = C.primary }}
        onBlur={e => { e.target.style.borderColor = C.border }}
      />
      <div style={{ textAlign: 'right', fontFamily: FF, fontSize: 11, color: value.length > 0 ? C.textMuted : C.borderLight }}>
        {value.length} caracteres
      </div>
    </div>
  )
}

function TagInput({ label, value, onChange, placeholder }: {
  label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string
}) {
  const [input, setInput] = useState('')
  const add = () => {
    const t = input.trim()
    if (t && !value.includes(t)) { onChange([...value, t]); setInput('') }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontFamily: FF, fontSize: 13, fontWeight: 600, color: C.text }}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 42, padding: '8px 10px', border: `1.5px solid ${C.border}`, borderRadius: 10, background: '#fff' }}>
        {value.map(t => (
          <span key={t} style={{
            display: 'flex', alignItems: 'center', gap: 5, background: C.primaryDim,
            border: `1px solid ${C.primary}30`, borderRadius: 20, padding: '3px 10px',
            fontFamily: FF, fontSize: 12, color: C.primary, fontWeight: 600,
          }}>
            {t}
            <button onClick={() => onChange(value.filter(x => x !== t))}
              style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
          </span>
        ))}
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
          placeholder={value.length === 0 ? placeholder : 'Agregar otro...'}
          style={{
            border: 'none', outline: 'none', fontFamily: FF, fontSize: 13,
            color: C.text, background: 'transparent', flex: 1, minWidth: 140,
          }}
        />
      </div>
      <p style={{ fontFamily: FF, fontSize: 11, color: C.textMuted, margin: 0 }}>
        Escribe y presiona Enter o coma para agregar
      </p>
    </div>
  )
}

/* ══════════════════ PHASES ══════════════════════════════ */

function Phase1({ state, onChange, workshopMode }: { state: FoundationState; onChange: (k: keyof FoundationState, v: any) => void; workshopMode: boolean }) {
  const fs = workshopMode ? 18 : 14
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: FF, fontSize: workshopMode ? 28 : 22, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>
          🏢 Identidad de la organización
        </h2>
        <p style={{ fontFamily: FF, fontSize: workshopMode ? 16 : 14, color: C.textSecondary, margin: 0 }}>
          Contexto base que calibra todos los módulos del sistema.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Select label="Sector / Industria" value={state.sector} onChange={v => onChange('sector', v)} options={SECTORS} required />
        <Select label="Tamaño de la organización" value={state.size} onChange={v => onChange('size', v)} options={SIZES} required />
        <Select label="Naturaleza jurídica" value={state.legal_structure} onChange={v => onChange('legal_structure', v)} options={LEGAL} />
        <Select label="Modalidad de trabajo" value={state.work_mode} onChange={v => onChange('work_mode', v)} options={MODES} required />
      </div>

      <Select
        label="Madurez digital"
        value={state.digital_maturity}
        onChange={v => onChange('digital_maturity', v)}
        options={DIGITAL}
      />

      <div style={{
        background: C.primaryDim, border: `1px solid ${C.primary}20`,
        borderRadius: 12, padding: '14px 18px',
        fontFamily: FF, fontSize: fs === 18 ? 14 : 13, color: C.textSecondary, lineHeight: 1.7,
      }}>
        ✦ Esta información contextualiza el KultuDNA y calibra las recomendaciones de IA en todo el sistema.
      </div>
    </div>
  )
}

function Phase2({ state, onChange, workshopMode }: { state: FoundationState; onChange: (k: keyof FoundationState, v: any) => void; workshopMode: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h2 style={{ fontFamily: FF, fontSize: workshopMode ? 28 : 22, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>
          ✨ Esencia institucional
        </h2>
        <p style={{ fontFamily: FF, fontSize: workshopMode ? 16 : 14, color: C.textSecondary, margin: 0 }}>
          El ADN que diferencia a tu organización. Define quiénes son, por qué existen y hacia dónde van.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Textarea label="Misión" value={state.mission} onChange={v => onChange('mission', v)} required
          placeholder="¿Por qué existimos? ¿Qué problema resolvemos y para quién?"
          hint="La razón de ser diaria. Concreta, inspiradora, presente." rows={3} />
        <Textarea label="Visión" value={state.vision} onChange={v => onChange('vision', v)} required
          placeholder="¿Dónde queremos estar en 5–10 años? ¿Cómo se verá el éxito?"
          hint="La imagen del futuro deseado. Ambiciosa pero alcanzable." rows={3} />
        <Textarea label="Propósito" value={state.purpose} onChange={v => onChange('purpose', v)}
          placeholder="¿Por qué importa lo que hacemos más allá del negocio?"
          hint="El 'para qué' más profundo. Conecta con la huella que se quiere dejar." rows={3} />
      </div>

      <div style={{ border: `1.5px solid ${C.borderLight}`, borderRadius: 16, padding: '20px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ fontSize: 18 }}>🃏</span>
          <div>
            <p style={{ fontFamily: FF, fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>
              KultuARCHETYPES — Valores
            </p>
            <p style={{ fontFamily: FF, fontSize: 12, color: C.textMuted, margin: '2px 0 0' }}>
              Las cartas que selecciones se convierten en competencias cardinales
            </p>
          </div>
        </div>
        <ValuesDeck
          selected={state.selectedValues}
          onChange={v => onChange('selectedValues', v)}
          workshopMode={workshopMode}
        />
      </div>

      <div style={{ border: `1.5px solid ${C.borderLight}`, borderRadius: 16, padding: '20px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ fontSize: 18 }}>🧬</span>
          <div>
            <p style={{ fontFamily: FF, fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>
              KultuARCHETYPES — Arquetipos culturales
            </p>
            <p style={{ fontFamily: FF, fontSize: 12, color: C.textMuted, margin: '2px 0 0' }}>
              Define el estilo cultural dominante (elige hasta 3)
            </p>
          </div>
        </div>
        <ArchetypesDeck
          selected={state.selectedArchetypes}
          onChange={v => onChange('selectedArchetypes', v)}
          workshopMode={workshopMode}
        />
      </div>
    </div>
  )
}

function Phase3({ state, onChange, workshopMode }: { state: FoundationState; onChange: (k: keyof FoundationState, v: any) => void; workshopMode: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h2 style={{ fontFamily: FF, fontSize: workshopMode ? 28 : 22, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>
          💼 Comprensión del negocio
        </h2>
        <p style={{ fontFamily: FF, fontSize: workshopMode ? 16 : 14, color: C.textSecondary, margin: 0 }}>
          Cómo creas valor, cuáles son tus procesos críticos y en qué áreas te juegas el partido.
        </p>
      </div>

      <Textarea
        label="Propuesta de valor"
        value={state.value_proposition}
        onChange={v => onChange('value_proposition', v)}
        required
        placeholder="¿Qué ofrecemos, a quién y por qué nos eligen sobre la competencia?"
        hint="Sé específico sobre el diferencial. Evita el lenguaje genérico."
        rows={4}
      />

      <TagInput
        label="Procesos clave del negocio"
        value={state.key_processes}
        onChange={v => onChange('key_processes', v)}
        placeholder="Ej: Gestión de ventas, Onboarding de clientes..."
      />

      <TagInput
        label="Áreas críticas para el resultado"
        value={state.critical_areas}
        onChange={v => onChange('critical_areas', v)}
        placeholder="Ej: Tecnología, Talento, Experiencia de cliente..."
      />

      {state.selectedArchetypes.length > 0 && (
        <div style={{
          background: C.secondaryDim, border: `1px solid ${C.secondary}20`,
          borderRadius: 12, padding: '14px 18px',
        }}>
          <p style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.secondary, margin: '0 0 6px' }}>
            ✦ Cultura detectada
          </p>
          <p style={{ fontFamily: FF, fontSize: 13, color: C.textSecondary, margin: 0 }}>
            Arquetipos seleccionados:{' '}
            <strong>{state.selectedArchetypes.join(', ')}</strong>.
            Esta configuración cultural influirá en los perfiles de competencias de Architecture.
          </p>
        </div>
      )}
    </div>
  )
}

function Phase4({ state, onChange, workshopMode }: { state: FoundationState; onChange: (k: keyof FoundationState, v: any) => void; workshopMode: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h2 style={{ fontFamily: FF, fontSize: workshopMode ? 28 : 22, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>
          🎯 Horizonte estratégico
        </h2>
        <p style={{ fontFamily: FF, fontSize: workshopMode ? 16 : 14, color: C.textSecondary, margin: 0 }}>
          Define los retos del período. Se convierten en ejes estratégicos que dan dirección a los cargos y el talento.
        </p>
      </div>

      <div style={{ border: `1.5px solid ${C.borderLight}`, borderRadius: 16, padding: '20px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ fontSize: 18 }}>🃏</span>
          <div>
            <p style={{ fontFamily: FF, fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>
              KultuARCHETYPES — Retos Estratégicos
            </p>
            <p style={{ fontFamily: FF, fontSize: 12, color: C.textMuted, margin: '2px 0 0' }}>
              Cada reto seleccionado se convierte en un eje estratégico de la organización
            </p>
          </div>
        </div>
        <ChallengesDeck
          selected={state.selectedChallenges}
          onChange={v => onChange('selectedChallenges', v)}
          workshopMode={workshopMode}
        />
      </div>

      {state.selectedChallenges.length > 0 && (
        <div style={{
          background: '#fff', border: `1.5px solid ${C.border}`,
          borderRadius: 14, padding: '18px 20px',
        }}>
          <p style={{ fontFamily: FF, fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 12px' }}>
            📋 Ejes estratégicos del período
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {state.selectedChallenges.map((id, i) => {
              const card = CHALLENGE_CARDS.find(c => c.id === id)
              if (!card) return null
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', background: C.primaryDim,
                    border: `1.5px solid ${C.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: FF, fontSize: 11, fontWeight: 700, color: C.primary, flexShrink: 0,
                  }}>{i + 1}</div>
                  <span style={{ fontSize: 15 }}>{card.icon}</span>
                  <span style={{ fontFamily: FF, fontSize: 13, fontWeight: 600, color: C.text }}>{card.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════ MAIN PAGE ═══════════════════════════ */
export default function FoundationPage() {
  const { organizationId } = useOrganization()
  const [phase, setPhase] = useState(1)
  const [state, setState] = useState<FoundationState>(INIT)
  const [workshopMode, setWorkshopMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // ── Restore state and handle draft recovery ──────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/foundation/profile')
        const { data } = await res.json()
        
        // 1. Get database state
        let dbState: FoundationState = INIT
        if (data) {
          const archs = data.org_structure?.split('|').map((s: string) => s.trim()).filter(Boolean) || []
          dbState = {
            ...INIT,
            mission:           data.mission ?? '',
            vision:           data.vision ?? '',
            purpose:          data.purpose ?? '',
            value_proposition: data.value_proposition ?? '',
            key_processes:    data.key_processes ?? [],
            critical_areas:   data.critical_areas ?? [],
            work_mode:        data.work_mode ?? '',
            digital_maturity: data.digital_maturity ?? '',
            org_structure:    data.org_structure ?? '',
            sector:           data.sector ?? '',
            size:             data.size ?? '',
            legal_structure:  data.legal_structure ?? '',
            selectedArchetypes: archs,
          }
        }

        // 2. Fetch cardinales and axes to complete the state
        const [cardRes, axesRes] = await Promise.all([
          fetch('/api/foundation/cardinales'),
          fetch('/api/foundation/axes')
        ])
        const { data: cards } = await cardRes.json()
        const { data: axes } = await axesRes.json()

        if (cards?.length > 0) {
          // Re-map cardinality names to IDs from VALUE_CARDS
          const selectedVals = cards.map((c: any) => {
            const match = VALUE_CARDS.find(v => v.name === c.name)
            return match?.id
          }).filter(Boolean)
          dbState.selectedValues = selectedVals
        }

        if (axes?.length > 0) {
          const selectedChalls = axes.map((a: any) => {
            const match = CHALLENGE_CARDS.find(c => c.name === a.name)
            return match?.id
          }).filter(Boolean)
          dbState.selectedChallenges = selectedChalls
        }

        // 3. Draft check
        const DRAFT_KEY = `kulturh_foundation_draft_${organizationId}`
        const rawDraft = localStorage.getItem(DRAFT_KEY)
        if (rawDraft) {
          const draft = JSON.parse(rawDraft)
          // If draft is newer (last 2 hours), ask or auto-restore? 
          // For now, let's just use DB as source of truth and only allow 
          // in-session draft if user hasn't saved.
          // BUT the user says "it doesn't save exactly where you left it".
          // So we should probably check if there's a 'phase' in there.
          if (draft.phase) setPhase(draft.phase)
        }

        setState(dbState)
      } catch (e) {
        console.error("Error loading Foundation data:", e)
      } finally {
        setLoading(false)
      }
    }

    if (organizationId) loadData()
  }, [organizationId])

  // ── Auto-save phase and unsaved state to draft ───────────────────────
  useEffect(() => {
    if (!organizationId || loading) return
    const DRAFT_KEY = `kulturh_foundation_draft_${organizationId}`
    const draft = { phase, state, updatedAt: Date.now() }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [phase, state, organizationId, loading])

  const chg = useCallback((k: keyof FoundationState, v: any) => {
    setState(prev => ({ ...prev, [k]: v }))
    setSaved(false)
  }, [])

  // ── Validation per phase ───────────────────────────────
  const canAdvance = () => {
    if (phase === 1) return !!state.sector && !!state.size && !!state.work_mode
    if (phase === 2) return !!state.mission && !!state.vision && state.selectedValues.length >= 2
    if (phase === 3) return !!state.value_proposition
    return true
  }

  // ── Save helpers ───────────────────────────────────────
  const saveProfile = async () => {
    const res = await fetch('/api/foundation/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mission:          state.mission,
        vision:           state.vision,
        purpose:          state.purpose,
        value_proposition: state.value_proposition,
        key_processes:    state.key_processes,
        critical_areas:   state.critical_areas,
        work_mode:        state.work_mode,
        digital_maturity: state.digital_maturity,
        org_structure:    state.selectedArchetypes.join(' | ') || state.org_structure,
        sector:           state.sector,
        size:             state.size,
        legal_structure:  state.legal_structure,
      }),
    })
    if (!res.ok) throw new Error('Error al guardar perfil')
  }

  const saveCardinales = async () => {
    if (state.selectedValues.length === 0) return
    const weight = Math.floor(100 / state.selectedValues.length)
    const remainder = 100 - weight * state.selectedValues.length

    // Delete existing and recreate (batch upsert via individual POSTs)
    const cardinales = state.selectedValues.map((id, i) => {
      const card = VALUE_CARDS.find(c => c.id === id)!
      return {
        name:               card.name,
        definition:         card.definition,
        dimension:          card.dimension,
        relative_weight:    weight + (i === 0 ? remainder : 0),
        min_level_expected: 1,
      }
    })

    for (const c of cardinales) {
      await fetch('/api/foundation/cardinales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c),
      })
    }
  }

  const saveAxes = async () => {
    if (state.selectedChallenges.length === 0) return
    const axes = state.selectedChallenges.map((id, i) => {
      const card = CHALLENGE_CARDS.find(c => c.id === id)!
      return { name: card.name, description: card.description, priority: i + 1 }
    })
    for (const a of axes) {
      await fetch('/api/foundation/axes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(a),
      })
    }
  }

  const handleNext = async () => {
    setSaving(true); setError('')
    try {
      if (phase === 2) await Promise.all([saveProfile(), saveCardinales()])
      else if (phase === 3) await saveProfile()
      else if (phase === 4) { await Promise.all([saveProfile(), saveAxes()]); setSaved(true) }
      else await saveProfile()
      if (phase < 4) setPhase(p => p + 1)
    } catch {
      setError('Error al guardar. Verifica tu conexión e intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleFinish = async () => {
    setSaving(true); setError('')
    try {
      await Promise.all([saveProfile(), saveAxes()])
      setSaved(true)
    } catch {
      setError('Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  /* ── Workshop overlay ──────────────────────────────── */
  const workshopStyle: React.CSSProperties = workshopMode ? {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: '#fff', overflowY: 'auto',
    padding: '32px 48px',
  } : {}

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ fontFamily: FF, fontSize: 14, color: C.textMuted }}>Cargando Foundation...</div>
      </div>
    )
  }

  return (
    <div style={workshopMode ? workshopStyle : { maxWidth: 860, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: workshopMode ? 28 : 20, gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: FF, fontSize: workshopMode ? 34 : 24,
            fontWeight: 800, color: C.text, margin: '0 0 4px', letterSpacing: '-0.02em',
          }}>
            Foundation
          </h1>
          <p style={{ fontFamily: FF, fontSize: workshopMode ? 16 : 13, color: C.textSecondary, margin: 0 }}>
            Planificación estratégica asistida · KultuDNA de la organización
          </p>
        </div>

        <button
          onClick={() => setWorkshopMode(w => !w)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: workshopMode ? C.primary : '#fff',
            border: `1.5px solid ${workshopMode ? C.primary : C.border}`,
            color: workshopMode ? '#fff' : C.textSecondary,
            borderRadius: 10, padding: '9px 16px',
            fontFamily: FF, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {workshopMode ? '📺 Salir del modo taller' : '📺 Modo presentación'}
        </button>
      </div>

      {/* ── Phase nav + progress ── */}
      <div style={{
        background: '#fff', border: `1.5px solid ${C.border}`,
        borderRadius: 14, padding: '16px 20px', marginBottom: 24,
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <PhaseNav current={phase} workshopMode={workshopMode} />
          <div style={{ fontFamily: FF, fontSize: 12, color: C.textMuted }}>
            Fase {phase} de 4 · {PHASES[phase - 1]?.icon} {PHASES[phase - 1]?.label}
          </div>
        </div>
        <ProgressBar phase={phase} />
      </div>

      {/* ── Phase content ── */}
      <div style={{
        background: '#fff', border: `1.5px solid ${C.border}`,
        borderRadius: 16, padding: workshopMode ? '32px 36px' : '28px 30px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        animation: 'fadeIn 0.3s ease',
      }}>
        <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }`}</style>

        {phase === 1 && <Phase1 state={state} onChange={chg} workshopMode={workshopMode} />}
        {phase === 2 && <Phase2 state={state} onChange={chg} workshopMode={workshopMode} />}
        {phase === 3 && <Phase3 state={state} onChange={chg} workshopMode={workshopMode} />}
        {phase === 4 && <Phase4 state={state} onChange={chg} workshopMode={workshopMode} />}

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 20, padding: '12px 16px', background: '#fef2f2',
            border: `1px solid #fca5a5`, borderRadius: 10,
            fontFamily: FF, fontSize: 13, color: '#dc2626',
          }}>{error}</div>
        )}

        {/* Saved banner */}
        {saved && phase === 4 && (
          <div style={{
            marginTop: 20, background: C.successDim,
            border: `1px solid ${C.success}30`, borderRadius: 12,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: FF, fontSize: 14, color: C.success, fontWeight: 600,
            }}>
              <span style={{ fontSize: 18 }}>✅</span>
              Foundation guardado correctamente.
            </div>
            <div style={{
              borderTop: `1px solid ${C.success}20`, padding: '14px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 12, background: `${C.success}05`,
            }}>
              <div>
                <p style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>
                  🧬 Siguiente paso: generar el KultuDNA
                </p>
                <p style={{ fontFamily: FF, fontSize: 12, color: C.textSecondary, margin: 0 }}>
                  La IA construirá el perfil cultural que usarán todos los módulos del sistema.
                </p>
              </div>
              <Link
                href="/foundation/kultudna"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: C.primary, color: '#fff',
                  borderRadius: 10, padding: '10px 18px',
                  fontFamily: FF, fontSize: 13, fontWeight: 700, textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Generar KultuDNA →
              </Link>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 32,
          paddingTop: 22, borderTop: `1px solid ${C.borderLight}`,
        }}>
          <button
            onClick={() => setPhase(p => Math.max(1, p - 1))}
            disabled={phase === 1}
            style={{
              background: '#fff', border: `2px solid ${C.border}`, color: C.textSecondary,
              borderRadius: 10, padding: '11px 22px', fontFamily: FF, fontSize: 14,
              fontWeight: 600, cursor: phase === 1 ? 'not-allowed' : 'pointer',
              opacity: phase === 1 ? 0.4 : 1,
            }}
          >
            ← Anterior
          </button>

          {phase < 4 ? (
            <button
              onClick={handleNext}
              disabled={!canAdvance() || saving}
              style={{
                background: canAdvance() && !saving
                  ? `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`
                  : C.surfaceAlt,
                border: 'none', color: canAdvance() && !saving ? '#fff' : C.textMuted,
                borderRadius: 10, padding: '11px 28px', fontFamily: FF, fontSize: 14,
                fontWeight: 700, cursor: canAdvance() && !saving ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: canAdvance() && !saving ? `0 4px 12px ${C.primaryGlow}` : 'none',
              }}
            >
              {saving ? '⟳ Guardando...' : `Siguiente — ${PHASES[phase]?.label} →`}
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving || saved}
              style={{
                background: saved ? C.success : `linear-gradient(135deg, ${C.success}, #22c55e)`,
                border: 'none', color: '#fff',
                borderRadius: 10, padding: '11px 28px', fontFamily: FF, fontSize: 14,
                fontWeight: 700, cursor: saving || saved ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: `0 4px 12px ${C.successGlow}`,
              }}
            >
              {saving ? '⟳ Guardando...' : saved ? '✓ Foundation completado' : '✦ Completar Foundation'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
