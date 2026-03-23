'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { C, FF } from '@/lib/tokens'

/* ── Parsea el texto del KultuDNA en secciones ── */
const SECTION_KEYS = [
  { key: 'identity',    title: 'Identidad y valores core',        icon: '💎' },
  { key: 'leadership',  title: 'Estilo de liderazgo esperado',     icon: '🧭' },
  { key: 'people',      title: 'Perfil de personas que encajan',   icon: '👥' },
  { key: 'priorities',  title: 'Prioridades estratégicas actuales',icon: '🎯' },
  { key: 'tone',        title: 'Tono y ritmo organizacional',      icon: '⚡' },
]

function parseKultuDNA(text: string): { key: string; title: string; icon: string; content: string }[] {
  const sections: { key: string; title: string; icon: string; content: string }[] = []
  for (const s of SECTION_KEYS) {
    // Match **TITLE** (uppercase) followed by content until next **
    const pattern = new RegExp(
      `\\*\\*${s.title.toUpperCase()}\\*\\*([\\s\\S]*?)(?=\\*\\*[A-ZÁÉÍÓÚÑ]|$)`,
      'i'
    )
    const match = text.match(pattern)
    sections.push({
      ...s,
      content: match ? match[1].trim() : '',
    })
  }
  return sections
}

/* ── Readiness badge ── */
function ReadinessBadge({ score, isReady }: { score: number; isReady: boolean }) {
  const color = isReady ? C.success : score > 50 ? C.primary : C.warn
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: `${color}10`, border: `1.5px solid ${color}30`,
      borderRadius: 24, padding: '6px 16px',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: color,
        boxShadow: `0 0 0 3px ${color}20`,
      }} />
      <span style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color }}>
        {isReady ? 'Foundation completo' : `Readiness ${score}%`}
      </span>
    </div>
  )
}

/* ── Section card ── */
function SectionCard({ icon, title, content, workshopMode }: {
  icon: string; title: string; content: string; workshopMode?: boolean
}) {
  return (
    <div style={{
      background: '#fff', border: `1.5px solid ${C.border}`,
      borderRadius: 14, padding: '20px 22px',
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: workshopMode ? 22 : 18 }}>{icon}</span>
        <p style={{
          fontFamily: FF, fontSize: workshopMode ? 16 : 13,
          fontWeight: 700, color: C.primary, margin: 0,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>{title}</p>
      </div>
      <p style={{
        fontFamily: FF, fontSize: workshopMode ? 16 : 14,
        color: C.textSecondary, lineHeight: 1.8, margin: 0,
      }}>
        {content || <span style={{ color: C.textMuted, fontStyle: 'italic' }}>Sin contenido en esta sección</span>}
      </p>
    </div>
  )
}

/* ══════════════════ PAGE ════════════════════════════════ */
export default function KultuDNAPage() {
  const [kultudna, setKultudna]       = useState<string | null>(null)
  const [readiness, setReadiness]     = useState<{ score: number; isReady: boolean } | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)
  const [generating, setGenerating]   = useState(false)
  const [error, setError]             = useState('')
  const [workshopMode, setWorkshopMode] = useState(false)

  // ── Load existing KultuDNA ────────────────────────────
  useEffect(() => {
    fetch('/api/foundation/kultudna')
      .then(r => r.json())
      .then(({ data }) => {
        if (data?.kultudna_summary) {
          setKultudna(data.kultudna_summary)
          setReadiness({ score: data.readiness_score ?? 0, isReady: data.is_ready_for_architecture ?? false })
          setGeneratedAt(data.updated_at)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── Generate ──────────────────────────────────────────
  const generate = async () => {
    setGenerating(true); setError('')
    try {
      const res  = await fetch('/api/foundation/kultudna', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error desconocido')
      setKultudna(json.kultudna)
      setReadiness(json.readiness)
      setGeneratedAt(json.generatedAt)
    } catch (err: any) {
      setError(err.message ?? 'No se pudo generar el KultuDNA. Verifica que Foundation esté completo.')
    } finally {
      setGenerating(false)
    }
  }

  const sections = kultudna ? parseKultuDNA(kultudna) : []
  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  const overlayStyle: React.CSSProperties = workshopMode ? {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: '#fff', overflowY: 'auto', padding: '40px 56px',
  } : {}

  return (
    <div style={workshopMode ? overlayStyle : { maxWidth: 860, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 24, gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Link href="/foundation" style={{
              fontFamily: FF, fontSize: 13, color: C.textMuted,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
            }}>← Foundation</Link>
          </div>
          <h1 style={{
            fontFamily: FF, fontSize: workshopMode ? 36 : 26,
            fontWeight: 800, color: C.text, margin: '0 0 4px', letterSpacing: '-0.02em',
          }}>
            🧬 KultuDNA
          </h1>
          <p style={{ fontFamily: FF, fontSize: workshopMode ? 16 : 13, color: C.textSecondary, margin: 0 }}>
            Perfil cultural de la organización · Contexto base para toda la IA del sistema
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {readiness && <ReadinessBadge score={readiness.score} isReady={readiness.isReady} />}
          <button
            onClick={() => setWorkshopMode(w => !w)}
            style={{
              background: workshopMode ? C.primary : '#fff',
              border: `1.5px solid ${workshopMode ? C.primary : C.border}`,
              color: workshopMode ? '#fff' : C.textSecondary,
              borderRadius: 10, padding: '8px 14px',
              fontFamily: FF, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {workshopMode ? '✕ Cerrar presentación' : '📺 Presentar'}
          </button>
        </div>
      </div>

      {/* ── Generate / Regenerate card ── */}
      <div style={{
        background: kultudna ? C.primaryDim : `linear-gradient(135deg, ${C.primary}08, ${C.primaryLight}05)`,
        border: `1.5px solid ${C.primary}20`,
        borderRadius: 16, padding: '22px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1 }}>
          {kultudna ? (
            <>
              <p style={{ fontFamily: FF, fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>
                ✦ KultuDNA generado
              </p>
              <p style={{ fontFamily: FF, fontSize: 12, color: C.textMuted, margin: 0 }}>
                {formattedDate ? `Última generación: ${formattedDate}` : 'Perfil cultural activo'}
                {' · '}Regenerar si actualizaste Foundation
              </p>
            </>
          ) : (
            <>
              <p style={{ fontFamily: FF, fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>
                Genera el KultuDNA de tu organización
              </p>
              <p style={{ fontFamily: FF, fontSize: 12, color: C.textMuted, margin: 0 }}>
                La IA analizará todos tus datos de Foundation y construirá un perfil cultural completo.
                Requiere Foundation con misión, visión y al menos 2 valores definidos.
              </p>
            </>
          )}
        </div>

        <button
          onClick={generate}
          disabled={generating || loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: generating ? C.surfaceAlt : `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
            border: 'none', color: generating ? C.textMuted : '#fff',
            borderRadius: 12, padding: '12px 22px',
            fontFamily: FF, fontSize: 14, fontWeight: 700,
            cursor: generating ? 'not-allowed' : 'pointer',
            boxShadow: generating ? 'none' : `0 4px 14px ${C.primaryGlow}`,
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}
        >
          {generating ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
              Generando...
            </>
          ) : kultudna ? '✦ Regenerar KultuDNA' : '✦ Generar KultuDNA'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 20, padding: '12px 16px',
          background: '#fef2f2', border: `1px solid #fca5a5`,
          borderRadius: 10, fontFamily: FF, fontSize: 13, color: '#dc2626',
        }}>{error}</div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 110, background: C.surfaceAlt, borderRadius: 14,
              animation: 'pulse 1.5s ease-in-out infinite',
              opacity: 1 - i * 0.15,
            }} />
          ))}
        </div>
      )}

      {/* ── Generating overlay ── */}
      {generating && (
        <div style={{
          background: '#fff', border: `1.5px solid ${C.border}`,
          borderRadius: 16, padding: '48px 32px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16, animation: 'spin 2s linear infinite', display: 'inline-block' }}>🧬</div>
          <p style={{ fontFamily: FF, fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>
            Generando KultuDNA
          </p>
          <p style={{ fontFamily: FF, fontSize: 14, color: C.textSecondary, margin: 0, maxWidth: 420, marginInline: 'auto' }}>
            La IA está analizando la misión, valores, arquetipos y ejes estratégicos para construir el perfil cultural…
          </p>
        </div>
      )}

      {/* ── KultuDNA sections ── */}
      {!loading && !generating && kultudna && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sections.map(s => (
              <SectionCard
                key={s.key}
                icon={s.icon}
                title={s.title}
                content={s.content}
                workshopMode={workshopMode}
              />
            ))}
          </div>

          {/* Raw text toggle */}
          <details style={{ marginTop: 16 }}>
            <summary style={{
              fontFamily: FF, fontSize: 12, color: C.textMuted, cursor: 'pointer',
              padding: '8px 0', userSelect: 'none',
            }}>
              Ver texto completo (raw)
            </summary>
            <div style={{
              marginTop: 10, padding: '16px 18px',
              background: C.surfaceAlt, borderRadius: 12,
              fontFamily: 'monospace', fontSize: 12, color: C.textSecondary,
              lineHeight: 1.8, whiteSpace: 'pre-wrap',
              border: `1px solid ${C.borderLight}`,
            }}>
              {kultudna}
            </div>
          </details>

          {/* Architecture unlock banner */}
          {readiness?.isReady && (
            <div style={{
              marginTop: 20, background: C.successDim,
              border: `1.5px solid ${C.success}30`,
              borderRadius: 14, padding: '18px 22px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>🏗️</span>
                <div>
                  <p style={{ fontFamily: FF, fontSize: 14, fontWeight: 700, color: C.success, margin: '0 0 2px' }}>
                    Architecture desbloqueado
                  </p>
                  <p style={{ fontFamily: FF, fontSize: 12, color: C.textSecondary, margin: 0 }}>
                    Foundation completo · KultuDNA activo · Puedes crear cargos con contexto cultural
                  </p>
                </div>
              </div>
              <Link
                href="/architecture"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: C.success, color: '#fff',
                  borderRadius: 10, padding: '10px 20px',
                  fontFamily: FF, fontSize: 13, fontWeight: 700,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                }}
              >
                Ir a Architecture →
              </Link>
            </div>
          )}
        </>
      )}

      {/* ── Empty state ── */}
      {!loading && !generating && !kultudna && (
        <div style={{
          textAlign: 'center', padding: '64px 32px',
          background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 16,
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🧬</div>
          <p style={{ fontFamily: FF, fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>
            Sin KultuDNA generado
          </p>
          <p style={{ fontFamily: FF, fontSize: 14, color: C.textSecondary, margin: '0 0 24px', maxWidth: 420, marginInline: 'auto', lineHeight: 1.7 }}>
            Primero completa la misión, visión y al menos 2 valores en Foundation, luego genera el perfil cultural.
          </p>
          <Link href="/foundation" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: C.primary, color: '#fff',
            borderRadius: 10, padding: '11px 22px',
            fontFamily: FF, fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}>
            Completar Foundation →
          </Link>
        </div>
      )}

      <style suppressHydrationWarning>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:.6 } 50% { opacity:1 } }
      `}</style>
    </div>
  )
}
