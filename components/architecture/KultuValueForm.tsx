'use client'

import { useState, useEffect } from 'react'
import { C, FF } from '@/lib/tokens'

/* ══════════════════ TYPES ══════════════════════════════ */
export interface KultuValueFactors {
  conocimiento:    number  // 1-5
  complejidad:     number
  responsabilidad: number
  autonomia:       number
  gestion_personas: number
  condiciones:     number
}

export interface KultuValueResult {
  factors: KultuValueFactors
  score:   number  // 6-30
  band:    string
  bandLabel: string
}

/* ══════════════════ CONSTANTS ══════════════════════════ */
export const KULTVALUE_FACTORS = [
  {
    key:         'conocimiento' as keyof KultuValueFactors,
    label:       'Conocimiento',
    icon:        '🎓',
    description: 'Nivel de formación, experticia técnica y know-how requerido para el cargo.',
    levels:      ['Operativo básico', 'Técnico elemental', 'Técnico avanzado', 'Profesional especializado', 'Experto / Referente'],
  },
  {
    key:         'complejidad' as keyof KultuValueFactors,
    label:       'Complejidad',
    icon:        '🧩',
    description: 'Dificultad de los problemas que enfrenta y variabilidad de las situaciones.',
    levels:      ['Rutinaria / Predecible', 'Variada con pautas', 'Variable con criterio', 'Compleja con análisis', 'Altamente compleja / Estratégica'],
  },
  {
    key:         'responsabilidad' as keyof KultuValueFactors,
    label:       'Responsabilidad',
    icon:        '⚖️',
    description: 'Impacto de las decisiones y alcance de la responsabilidad sobre resultados.',
    levels:      ['Sigue instrucciones exactas', 'Toma decisiones operativas', 'Gestiona resultados de área', 'Impacta resultados organizacionales', 'Define estrategia y resultados globales'],
  },
  {
    key:         'autonomia' as keyof KultuValueFactors,
    label:       'Autonomía',
    icon:        '🧭',
    description: 'Grado de independencia en la toma de decisiones y manejo del trabajo.',
    levels:      ['Supervisión constante', 'Supervisión frecuente', 'Supervisión esporádica', 'Alta autonomía operativa', 'Autonomía total / establece políticas'],
  },
  {
    key:         'gestion_personas' as keyof KultuValueFactors,
    label:       'Gestión de personas',
    icon:        '👥',
    description: 'Responsabilidad sobre equipos, liderazgo y desarrollo de personas.',
    levels:      ['Sin personas a cargo', 'Coordina 1-2 personas', 'Supervisa equipo pequeño (3-8)', 'Lidera área (9-30 personas)', 'Dirige múltiples equipos / organización'],
  },
  {
    key:         'condiciones' as keyof KultuValueFactors,
    label:       'Condiciones del entorno',
    icon:        '🌡️',
    description: 'Exposición a condiciones físicas, ambientales o de riesgo en el trabajo.',
    levels:      ['Condiciones ideales de oficina', 'Entorno mixto / viajes ocasionales', 'Entorno exigente o viajes frecuentes', 'Condiciones demandantes / exposición moderada', 'Alto riesgo o condiciones extremas'],
  },
]

export const KULTVALUE_BANDS = [
  { min: 6,  max: 12, band: 'Operativo',                    color: '#64748b', bg: '#f1f5f9' },
  { min: 13, max: 18, band: 'Técnico-Profesional',           color: '#3B6FCA', bg: '#eff6ff' },
  { min: 19, max: 24, band: 'Especialista / Mando medio',    color: '#7c3aed', bg: '#f5f3ff' },
  { min: 25, max: 30, band: 'Directivo / Ejecutivo',         color: '#dc2626', bg: '#fef2f2' },
]

export function getBand(score: number) {
  return KULTVALUE_BANDS.find(b => score >= b.min && score <= b.max) ?? KULTVALUE_BANDS[0]
}

export function calcKultuValue(factors: KultuValueFactors): KultuValueResult {
  const score = Object.values(factors).reduce((s, v) => s + v, 0)
  const b     = getBand(score)
  return { factors, score, band: b.band, bandLabel: b.band }
}

const INIT_FACTORS: KultuValueFactors = {
  conocimiento: 1, complejidad: 1, responsabilidad: 1,
  autonomia: 1, gestion_personas: 1, condiciones: 1,
}

/* ══════════════════ SCORE RING ══════════════════════════ */
function ScoreRing({ score, band }: { score: number; band: ReturnType<typeof getBand> }) {
  const pct  = ((score - 6) / 24) * 100
  const r    = 44
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={108} height={108} viewBox="0 0 108 108">
        <circle cx={54} cy={54} r={r} fill="none" stroke={C.borderLight} strokeWidth={8} />
        <circle
          cx={54} cy={54} r={r} fill="none"
          stroke={band.color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 54 54)"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        <text x={54} y={50} textAnchor="middle" fontFamily={FF} fontSize={22} fontWeight={800} fill={band.color}>{score}</text>
        <text x={54} y={65} textAnchor="middle" fontFamily={FF} fontSize={9}  fontWeight={600} fill={C.textMuted}>/ 30 pts</text>
      </svg>
      <div style={{
        background: band.bg, border: `1.5px solid ${band.color}30`,
        borderRadius: 20, padding: '4px 14px',
        fontFamily: FF, fontSize: 12, fontWeight: 700, color: band.color,
        textAlign: 'center',
      }}>
        {band.band}
      </div>
    </div>
  )
}

/* ══════════════════ FACTOR ROW ══════════════════════════ */
function FactorRow({
  factor, value, onChange,
}: {
  factor: typeof KULTVALUE_FACTORS[0]
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div style={{
      background: '#fff', border: `1.5px solid ${C.border}`,
      borderRadius: 12, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{factor.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>
            {factor.label}
          </p>
          <p style={{ fontFamily: FF, fontSize: 11, color: C.textMuted, margin: 0 }}>
            {factor.description}
          </p>
        </div>
        <div style={{
          minWidth: 28, height: 28, borderRadius: 8,
          background: C.primaryDim, border: `1.5px solid ${C.primary}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FF, fontSize: 14, fontWeight: 800, color: C.primary, flexShrink: 0,
        }}>{value}</div>
      </div>

      {/* Level buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            title={factor.levels[n - 1]}
            style={{
              flex: 1, height: 36, border: 'none', cursor: 'pointer',
              borderRadius: 8, transition: 'all 0.15s',
              background: n <= value
                ? `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`
                : C.surfaceAlt,
              boxShadow: n === value ? `0 2px 8px ${C.primaryGlow}` : 'none',
            }}
          />
        ))}
      </div>
      <p style={{ fontFamily: FF, fontSize: 11, color: C.textSecondary, margin: '6px 0 0', fontStyle: 'italic' }}>
        N{value}: {factor.levels[value - 1]}
      </p>
    </div>
  )
}

/* ══════════════════ MAIN COMPONENT ══════════════════════ */
export default function KultuValueForm({
  initial,
  result,
  onSave,
  onAiSuggest,
  suggesting,
}: {
  initial?:    KultuValueFactors
  result?:     any  // descriptivo generado por IA
  onSave:      (r: KultuValueResult) => void
  onAiSuggest: () => void
  suggesting:  boolean
}) {
  const [factors, setFactors] = useState<KultuValueFactors>(initial ?? INIT_FACTORS)
  const [saved, setSaved]     = useState(false)

  // Recalc when initial changes (from AI suggestion)
  useEffect(() => {
    if (initial) { setFactors(initial); setSaved(false) }
  }, [initial])

  const kv   = calcKultuValue(factors)
  const band = getBand(kv.score)

  const set = (k: keyof KultuValueFactors, v: number) => {
    setFactors(prev => ({ ...prev, [k]: v }))
    setSaved(false)
  }

  const handleSave = () => { onSave(kv); setSaved(true) }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h3 style={{ fontFamily: FF, fontSize: 17, fontWeight: 800, color: C.text, margin: '0 0 3px' }}>
            ⚖️ KultuValue
          </h3>
          <p style={{ fontFamily: FF, fontSize: 12, color: C.textMuted, margin: 0 }}>
            Valoración formal del cargo · 6 factores · Escala 6–30
          </p>
        </div>

        <button
          onClick={onAiSuggest}
          disabled={suggesting}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: suggesting ? C.surfaceAlt : C.secondaryDim,
            border: `1.5px solid ${suggesting ? C.border : C.secondary + '40'}`,
            color: suggesting ? C.textMuted : C.secondary,
            borderRadius: 10, padding: '9px 16px',
            fontFamily: FF, fontSize: 12, fontWeight: 700,
            cursor: suggesting ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
          }}
        >
          {suggesting
            ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Analizando...</>
            : '✦ Sugerir con IA'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
        {/* Factors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {KULTVALUE_FACTORS.map(f => (
            <FactorRow key={f.key} factor={f} value={factors[f.key]} onChange={v => set(f.key, v)} />
          ))}
        </div>

        {/* Score ring — sticky */}
        <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 130 }}>
          <ScoreRing score={kv.score} band={band} />

          {/* Factor summary */}
          <div style={{
            background: '#fff', border: `1.5px solid ${C.border}`,
            borderRadius: 12, padding: '12px 14px',
          }}>
            {KULTVALUE_FACTORS.map(f => (
              <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontFamily: FF, fontSize: 11, color: C.textSecondary }}>{f.icon}</span>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <div key={n} style={{
                      width: 8, height: 8, borderRadius: 2,
                      background: n <= factors[f.key] ? C.primary : C.borderLight,
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            style={{
              background: saved
                ? C.success
                : `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
              border: 'none', color: '#fff',
              borderRadius: 10, padding: '11px 0',
              fontFamily: FF, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s', width: '100%',
              boxShadow: `0 3px 10px ${C.primaryGlow}`,
            }}
          >
            {saved ? '✓ Guardado' : '💾 Guardar'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
