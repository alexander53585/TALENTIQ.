'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { C, FF } from '@/lib/tokens'

/* ══════════════════ TYPES ══════════════════════════════ */
interface StrategicDoc {
  id: string
  name: string
  document_type: string
  file_size: number | null
  mime_type: string | null
  ai_analysis: Analysis | null
  utility_score: number | null
  analyzed_at: string | null
  created_at: string
}

interface Analysis {
  valores_detectados:   string[]
  ejes_estrategicos:    string[]
  capacidades_requeridas: string[]
  tono_cultural:        string
  prioridades:          string[]
  riesgos:              string[]
  utilidad_score:       number
  resumen_ejecutivo:    string
}

/* ══════════════════ CONSTANTS ══════════════════════════ */
const DOC_TYPES = [
  { id: 'strategic_plan', label: 'Plan estratégico',   icon: '🎯' },
  { id: 'ethics_code',    label: 'Código de ética',    icon: '⚖️' },
  { id: 'policy',         label: 'Política interna',   icon: '📋' },
  { id: 'manual',         label: 'Manual / Guía',      icon: '📖' },
  { id: 'other',          label: 'Otro documento',     icon: '📄' },
]
const MAX_MB = 10

function docTypeInfo(id: string) {
  return DOC_TYPES.find(d => d.id === id) ?? DOC_TYPES[4]
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function scoreColor(s: number) {
  if (s >= 4) return C.success
  if (s >= 3) return C.primary
  return C.warn
}

/* ══════════════════ DRAG & DROP ZONE ═══════════════════ */
function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false)
  const [typeSelected, setTypeSelected] = useState('strategic_plan')
  const inputRef = useRef<HTMLInputElement>(null)

  const accept = (f: File) => {
    const ok = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'].includes(f.type)
    if (!ok) { alert('Solo se aceptan PDF, DOCX y TXT'); return }
    if (f.size > MAX_MB * 1024 * 1024) { alert(`El archivo supera los ${MAX_MB} MB`); return }
    onFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) accept(f)
  }

  return (
    <div>
      {/* Type selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {DOC_TYPES.map(t => (
          <button key={t.id} onClick={() => setTypeSelected(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: typeSelected === t.id ? C.primaryDim : '#fff',
            border: `1.5px solid ${typeSelected === t.id ? C.primary : C.border}`,
            color: typeSelected === t.id ? C.primary : C.textSecondary,
            borderRadius: 20, padding: '5px 12px',
            fontFamily: FF, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Drop area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? C.primary : C.border}`,
          borderRadius: 14, padding: '36px 24px', textAlign: 'center',
          background: dragging ? C.primaryDim : C.surfaceAlt,
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
        <p style={{ fontFamily: FF, fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>
          {dragging ? 'Suelta el archivo aquí' : 'Arrastra un documento o haz clic para seleccionar'}
        </p>
        <p style={{ fontFamily: FF, fontSize: 12, color: C.textMuted, margin: 0 }}>
          PDF, DOCX, TXT · Máximo {MAX_MB} MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) accept(f) }}
        />
      </div>

      {/* Hidden type data passed via closure */}
      <input type="hidden" id="doc-type-selected" value={typeSelected} />
    </div>
  )
}

/* ══════════════════ ANALYSIS VIEW ══════════════════════ */
function AnalysisView({ analysis }: { analysis: Analysis }) {
  const sections = [
    { label: 'Valores detectados',       icon: '💎', items: analysis.valores_detectados },
    { label: 'Ejes estratégicos',        icon: '🎯', items: analysis.ejes_estrategicos },
    { label: 'Capacidades requeridas',   icon: '🧠', items: analysis.capacidades_requeridas },
    { label: 'Prioridades',              icon: '⚡', items: analysis.prioridades },
    { label: 'Riesgos identificados',    icon: '⚠️', items: analysis.riesgos },
  ]

  return (
    <div style={{ marginTop: 16, borderTop: `1px solid ${C.borderLight}`, paddingTop: 16 }}>
      {/* Resumen ejecutivo */}
      <div style={{
        background: C.primaryDim, borderRadius: 10, padding: '12px 14px', marginBottom: 14,
        borderLeft: `3px solid ${C.primary}`,
      }}>
        <p style={{ fontFamily: FF, fontSize: 11, fontWeight: 700, color: C.primary, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Resumen ejecutivo
        </p>
        <p style={{ fontFamily: FF, fontSize: 13, color: C.text, margin: 0, lineHeight: 1.7 }}>
          {analysis.resumen_ejecutivo}
        </p>
      </div>

      {/* Tono cultural */}
      {analysis.tono_cultural && (
        <div style={{
          background: C.secondaryDim, borderRadius: 10, padding: '10px 14px', marginBottom: 14,
        }}>
          <span style={{ fontFamily: FF, fontSize: 11, fontWeight: 700, color: C.secondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🎭 Tono cultural:{' '}
          </span>
          <span style={{ fontFamily: FF, fontSize: 13, color: C.textSecondary }}>{analysis.tono_cultural}</span>
        </div>
      )}

      {/* Tag sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {sections.map(s => s.items?.length > 0 && (
          <div key={s.label} style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: '12px 14px' }}>
            <p style={{ fontFamily: FF, fontSize: 11, fontWeight: 700, color: C.textMuted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {s.icon} {s.label}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {s.items.map((item, i) => (
                <span key={i} style={{
                  fontFamily: FF, fontSize: 11, color: C.text, fontWeight: 500,
                  background: C.surfaceAlt, border: `1px solid ${C.borderLight}`,
                  borderRadius: 20, padding: '3px 9px',
                }}>{item}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════ DOCUMENT CARD ══════════════════════ */
function DocCard({
  doc, onAnalyze, onDelete, analyzing,
}: {
  doc: StrategicDoc
  onAnalyze: (id: string) => void
  onDelete: (id: string) => void
  analyzing: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const info = docTypeInfo(doc.document_type)
  const date = new Date(doc.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div style={{
      background: '#fff', border: `1.5px solid ${C.border}`,
      borderRadius: 14, overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: C.primaryDim, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>{info.icon}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: FF, fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: FF, fontSize: 11, fontWeight: 600, color: C.primary,
              background: C.primaryDim, borderRadius: 20, padding: '2px 8px',
            }}>{info.label}</span>
            {doc.file_size && <span style={{ fontFamily: FF, fontSize: 11, color: C.textMuted }}>{formatBytes(doc.file_size)}</span>}
            <span style={{ fontFamily: FF, fontSize: 11, color: C.textMuted }}>{date}</span>
          </div>
        </div>

        {/* Utility score */}
        {doc.utility_score && (
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `2.5px solid ${scoreColor(doc.utility_score)}`,
              background: `${scoreColor(doc.utility_score)}10`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FF, fontSize: 14, fontWeight: 800, color: scoreColor(doc.utility_score),
            }}>{doc.utility_score}</div>
            <p style={{ fontFamily: FF, fontSize: 9, color: C.textMuted, margin: '3px 0 0' }}>UTILIDAD</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        padding: '10px 18px 14px', borderTop: `1px solid ${C.borderLight}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Analyze button */}
          <button
            onClick={() => onAnalyze(doc.id)}
            disabled={analyzing}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: doc.ai_analysis
                ? '#fff'
                : `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
              border: `1.5px solid ${doc.ai_analysis ? C.border : 'transparent'}`,
              color: doc.ai_analysis ? C.textSecondary : '#fff',
              borderRadius: 8, padding: '7px 14px',
              fontFamily: FF, fontSize: 12, fontWeight: 600,
              cursor: analyzing ? 'not-allowed' : 'pointer',
              opacity: analyzing ? 0.6 : 1, transition: 'all 0.2s',
            }}
          >
            {analyzing ? (
              <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> Analizando...</>
            ) : doc.ai_analysis ? '🔄 Re-analizar' : '✦ Analizar con IA'}
          </button>

          {/* Toggle findings */}
          {doc.ai_analysis && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                background: expanded ? C.surfaceAlt : '#fff',
                border: `1.5px solid ${C.border}`, color: C.textSecondary,
                borderRadius: 8, padding: '7px 14px',
                fontFamily: FF, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {expanded ? '▲ Ocultar' : '▼ Ver hallazgos'}
            </button>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={() => { if (confirm('¿Eliminar este documento?')) onDelete(doc.id) }}
          style={{
            background: 'none', border: 'none', color: C.textMuted,
            fontFamily: FF, fontSize: 12, cursor: 'pointer',
            padding: '4px 8px', borderRadius: 6,
          }}
        >
          🗑 Eliminar
        </button>
      </div>

      {/* Analysis results */}
      {expanded && doc.ai_analysis && (
        <div style={{ padding: '0 18px 18px' }}>
          <AnalysisView analysis={doc.ai_analysis} />
        </div>
      )}
    </div>
  )
}

/* ══════════════════ PAGE ════════════════════════════════ */
export default function DocumentsPage() {
  const [docs, setDocs]           = useState<StrategicDoc[]>([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [error, setError]         = useState('')
  const [uploadOk, setUploadOk]   = useState(false)

  const loadDocs = useCallback(() => {
    fetch('/api/foundation/documents')
      .then(r => r.json())
      .then(({ data }) => setDocs(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadDocs() }, [loadDocs])

  /* ── Upload ───────────────────────────────────────── */
  const handleFile = async (file: File) => {
    setUploading(true); setError(''); setUploadOk(false)
    const typeEl = document.getElementById('doc-type-selected') as HTMLInputElement
    const docType = typeEl?.value ?? 'other'

    const form = new FormData()
    form.append('file', file)
    form.append('document_type', docType)

    try {
      const res = await fetch('/api/foundation/documents', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al subir')
      setDocs(prev => [json.data, ...prev])
      setUploadOk(true)
      setTimeout(() => setUploadOk(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  /* ── Analyze ──────────────────────────────────────── */
  const handleAnalyze = async (id: string) => {
    setAnalyzing(id); setError('')
    try {
      const res = await fetch(`/api/foundation/documents/${id}/analyze`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al analizar')
      setDocs(prev => prev.map(d => d.id === id ? json.data : d))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAnalyzing(null)
    }
  }

  /* ── Delete ───────────────────────────────────────── */
  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/foundation/documents?id=${id}`, { method: 'DELETE' })
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch {
      setError('Error al eliminar el documento')
    }
  }

  const totalAnalyzed  = docs.filter(d => d.ai_analysis).length
  const avgUtility     = docs.filter(d => d.utility_score).reduce((s, d) => s + (d.utility_score ?? 0), 0) / (docs.filter(d => d.utility_score).length || 1)

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 8 }}>
          <Link href="/foundation" style={{ fontFamily: FF, fontSize: 13, color: C.textMuted, textDecoration: 'none' }}>
            ← Foundation
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: FF, fontSize: 26, fontWeight: 800, color: C.text, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              📂 Documentos estratégicos
            </h1>
            <p style={{ fontFamily: FF, fontSize: 13, color: C.textSecondary, margin: 0 }}>
              Sube tu estrategia, políticas y manuales · La IA extrae hallazgos clave
            </p>
          </div>

          {/* Stats */}
          {docs.length > 0 && (
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { v: docs.length,    l: 'documentos' },
                { v: totalAnalyzed,  l: 'analizados' },
                { v: avgUtility > 0 ? avgUtility.toFixed(1) : '—', l: 'utilidad avg' },
              ].map(s => (
                <div key={s.l} style={{
                  textAlign: 'center', background: '#fff',
                  border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '10px 16px',
                }}>
                  <p style={{ fontFamily: FF, fontSize: 20, fontWeight: 800, color: C.primary, margin: 0 }}>{s.v}</p>
                  <p style={{ fontFamily: FF, fontSize: 10, color: C.textMuted, margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.l}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Upload zone ── */}
      <div style={{
        background: '#fff', border: `1.5px solid ${C.border}`,
        borderRadius: 16, padding: '22px 24px', marginBottom: 24,
      }}>
        <p style={{ fontFamily: FF, fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 14px' }}>
          Subir documento
        </p>
        <DropZone onFile={handleFile} />

        {uploading && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontFamily: FF, fontSize: 13, color: C.primary }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
            Subiendo documento...
          </div>
        )}
        {uploadOk && (
          <div style={{ marginTop: 14, fontFamily: FF, fontSize: 13, color: C.success, fontWeight: 600 }}>
            ✅ Documento subido. Haz clic en "Analizar con IA" para extraer hallazgos.
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 16, padding: '12px 16px',
          background: '#fef2f2', border: `1px solid #fca5a5`,
          borderRadius: 10, fontFamily: FF, fontSize: 13, color: '#dc2626',
        }}>{error}</div>
      )}

      {/* ── Document list ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2].map(i => (
            <div key={i} style={{ height: 90, background: C.surfaceAlt, borderRadius: 14, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '56px 32px',
          background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 16,
        }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>📂</div>
          <p style={{ fontFamily: FF, fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>
            Sin documentos aún
          </p>
          <p style={{ fontFamily: FF, fontSize: 13, color: C.textSecondary, margin: 0, maxWidth: 380, marginInline: 'auto', lineHeight: 1.7 }}>
            Sube tu plan estratégico, código de ética o manuales. La IA extraerá valores, ejes y competencias automáticamente.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {docs.map(doc => (
            <DocCard
              key={doc.id}
              doc={doc}
              onAnalyze={handleAnalyze}
              onDelete={handleDelete}
              analyzing={analyzing === doc.id}
            />
          ))}
        </div>
      )}

      {/* KultuDNA integration tip */}
      {totalAnalyzed > 0 && (
        <div style={{
          marginTop: 20, background: C.secondaryDim,
          border: `1.5px solid ${C.secondary}20`,
          borderRadius: 14, padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontFamily: FF, fontSize: 14, fontWeight: 700, color: C.secondary, margin: '0 0 2px' }}>
              🧬 Incorporar hallazgos al KultuDNA
            </p>
            <p style={{ fontFamily: FF, fontSize: 12, color: C.textSecondary, margin: 0 }}>
              Regenera el KultuDNA para que incluya los valores y ejes extraídos de tus documentos.
            </p>
          </div>
          <Link href="/foundation/kultudna" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: C.secondary, color: '#fff',
            borderRadius: 10, padding: '9px 18px',
            fontFamily: FF, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            Regenerar KultuDNA →
          </Link>
        </div>
      )}

      <style suppressHydrationWarning>{`
        @keyframes spin  { from { transform:rotate(0deg) }   to { transform:rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:.6 } 50% { opacity:1 } }
      `}</style>
    </div>
  )
}
