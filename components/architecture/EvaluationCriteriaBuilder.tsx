'use client';

import { useState, useCallback } from 'react';
import { C, FF } from '@/lib/tokens';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface EvalCriterion {
  type: string;
  label: string;
  weight: number;
}

interface EvaluationCriteriaBuilderProps {
  positionId: string;
  positionMeta?: { title?: string; area?: string; kultvalue_band?: string; kultvalue_score?: number; specific_competencies?: unknown[] };
  initial?: EvalCriterion[];
  onSaved?: (criteria: EvalCriterion[]) => void;
}

// ─── Available criteria types ─────────────────────────────────────────────────
const CRITERION_TYPES: Record<string, { label: string; description: string; icon: string; defaultWeight: number }> = {
  quality:                { label: 'Calidad del trabajo',       description: 'Precisión, rigor y estándares en la ejecución', icon: '⭐', defaultWeight: 20 },
  kpi_okr:                { label: 'KPIs / OKRs',               description: 'Cumplimiento de indicadores y objetivos clave',  icon: '📊', defaultWeight: 30 },
  project:                { label: 'Gestión de proyectos',       description: 'Entrega en tiempo, alcance y presupuesto',       icon: '🗂️', defaultWeight: 15 },
  competency:             { label: 'Competencias del cargo',     description: 'Competencias específicas del rol',               icon: '🎯', defaultWeight: 20 },
  cardinal:               { label: 'Competencias cardinales',   description: 'Valores y competencias organizacionales',        icon: '🏛️', defaultWeight: 10 },
  compliance:             { label: 'Cumplimiento normativo',     description: 'Adhesión a políticas y regulaciones',            icon: '✅', defaultWeight: 10 },
  milestone:              { label: 'Hitos del período',          description: 'Logros y entregables específicos acordados',     icon: '🏁', defaultWeight: 15 },
  extraordinary_evidence: { label: 'Evidencia extraordinaria',  description: 'Contribuciones excepcionales no planificadas',   icon: '💡', defaultWeight: 5  },
};

const PREVIEW_RATINGS = ['Insuficiente', 'En desarrollo', 'Competente', 'Destacado', 'Excepcional'];

// ─── Component ───────────────────────────────────────────────────────────────
export default function EvaluationCriteriaBuilder({
  positionId, positionMeta, initial = [], onSaved,
}: EvaluationCriteriaBuilderProps) {

  const [criteria, setCriteria] = useState<EvalCriterion[]>(
    initial.length > 0 ? initial : [
      { type: 'kpi_okr',    label: 'KPIs / OKRs',             weight: 30 },
      { type: 'competency', label: 'Competencias del cargo',   weight: 30 },
      { type: 'quality',    label: 'Calidad del trabajo',      weight: 20 },
      { type: 'cardinal',   label: 'Competencias cardinales',  weight: 10 },
      { type: 'compliance', label: 'Cumplimiento normativo',   weight: 10 },
    ]
  );
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [aiRationale, setAiRationale] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const total = criteria.reduce((s, c) => s + c.weight, 0);
  const isValid = Math.abs(total - 100) < 0.01;

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const addCriterion = (type: string) => {
    if (criteria.find(c => c.type === type)) return;
    const def = CRITERION_TYPES[type];
    setCriteria(prev => {
      const newCriteria = [...prev, { type, label: def.label, weight: def.defaultWeight }];
      // Auto-normalize weights
      return normalizeWeights(newCriteria);
    });
    setSaved(false);
  };

  const removeCriterion = (type: string) => {
    setCriteria(prev => {
      const next = prev.filter(c => c.type !== type);
      return normalizeWeights(next);
    });
    setSaved(false);
  };

  const setWeight = (type: string, newWeight: number) => {
    setCriteria(prev => prev.map(c => c.type === type ? { ...c, weight: newWeight } : c));
    setSaved(false);
  };

  const normalizeWeights = (list: EvalCriterion[]): EvalCriterion[] => {
    if (list.length === 0) return list;
    const total = list.reduce((s, c) => s + c.weight, 0);
    if (total === 0) {
      const even = Math.floor(100 / list.length);
      return list.map((c, i) => ({ ...c, weight: i === 0 ? 100 - even * (list.length - 1) : even }));
    }
    const factor = 100 / total;
    const normalized = list.map(c => ({ ...c, weight: Math.round(c.weight * factor) }));
    // Fix rounding drift on first item
    const drift = 100 - normalized.reduce((s, c) => s + c.weight, 0);
    if (normalized.length > 0) normalized[0].weight += drift;
    return normalized;
  };

  const autoBalance = () => {
    const even = Math.floor(100 / criteria.length);
    const remainder = 100 - even * criteria.length;
    setCriteria(prev => prev.map((c, i) => ({ ...c, weight: i === 0 ? even + remainder : even })));
    setSaved(false);
  };

  // ─── AI Suggest ────────────────────────────────────────────────────────────
  const handleAiSuggest = async () => {
    setSuggesting(true);
    setError('');
    setAiRationale('');
    try {
      const res = await fetch(`/api/architecture/descriptions/${positionId}/criteria`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(positionMeta ?? {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al consultar IA');
      if (data.criteria?.length > 0) {
        setCriteria(data.criteria);
        setSaved(false);
      }
      if (data.rationale) setAiRationale(data.rationale);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSuggesting(false);
    }
  };

  // ─── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/architecture/descriptions/${positionId}/criteria`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setSaved(true);
      onSaved?.(criteria);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  // ─── Weight bar color ──────────────────────────────────────────────────────
  const weightColor = (w: number) => w >= 30 ? C.primary : w >= 15 ? '#7C3AED' : C.textMuted;

  const usedTypes = new Set(criteria.map(c => c.type));

  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: C.shadow }}>
      {/* Header */}
      <div style={{ padding: '18px 22px', background: '#F0F9FF', borderBottom: `1px solid #BAE6FD`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0369A1', fontFamily: FF, marginBottom: 2 }}>
            🎯 Criterios de Evaluación de Desempeño
          </div>
          <div style={{ fontSize: 12, color: '#0284C7', fontFamily: FF }}>
            Performance heredará estos criterios para generar el template de evaluación
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleAiSuggest} disabled={suggesting} style={{
            background: suggesting ? C.surfaceAlt : 'linear-gradient(135deg, #7C3AED, #9333EA)',
            border: 'none', color: '#fff', borderRadius: 10,
            padding: '8px 16px', fontSize: 12, fontWeight: 700,
            cursor: suggesting ? 'not-allowed' : 'pointer', fontFamily: FF,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {suggesting ? (
              <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Analizando…</>
            ) : '✦ Sugerir con IA'}
          </button>
          <button onClick={() => setShowPreview(p => !p)} style={{
            background: '#fff', border: `1px solid #BAE6FD`, color: '#0369A1',
            borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: FF,
          }}>
            {showPreview ? 'Ocultar preview' : '👁 Ver preview'}
          </button>
        </div>
      </div>

      <div style={{ padding: '22px' }}>
        {/* AI Rationale */}
        {aiRationale && (
          <div style={{ padding: '12px 16px', background: '#EDE9FE', border: '1px solid #C4B5FD', borderRadius: 10, fontSize: 12, color: '#6D28D9', fontFamily: FF, lineHeight: 1.6, marginBottom: 18 }}>
            ✦ <strong>IA:</strong> {aiRationale}
          </div>
        )}

        {/* Total indicator */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 18, padding: '10px 16px',
          background: isValid ? '#D1FAE5' : total > 100 ? '#FEE2E2' : '#FEF3C7',
          borderRadius: 10, border: `1px solid ${isValid ? '#6EE7B7' : total > 100 ? '#FECACA' : '#FDE68A'}`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: isValid ? '#065F46' : total > 100 ? '#DC2626' : '#92400E', fontFamily: FF }}>
            {isValid ? '✓ Los pesos suman 100%' : `⚠ Suma actual: ${total}% (faltan ${100 - total > 0 ? 100 - total : 'sobran ' + (total - 100)}%)`}
          </span>
          {!isValid && (
            <button onClick={autoBalance} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: C.textSecondary, fontFamily: FF }}>
              Balancear
            </button>
          )}
        </div>

        {/* Criteria list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {criteria.map(c => {
            const def = CRITERION_TYPES[c.type] ?? { icon: '📌', description: '' };
            return (
              <div key={c.type} style={{ background: C.surfaceAlt, borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{def.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: FF }}>{c.label}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FF }}>{def.description}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: weightColor(c.weight), fontFamily: FF, minWidth: 36, textAlign: 'right' }}>
                      {c.weight}%
                    </span>
                    <button onClick={() => removeCriterion(c.type)} style={{
                      background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted,
                      borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 13,
                    }}>✕</button>
                  </div>
                </div>
                {/* Slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="range" min={1} max={100} value={c.weight}
                    onChange={e => setWeight(c.type, Number(e.target.value))}
                    style={{ flex: 1, accentColor: weightColor(c.weight), cursor: 'pointer' }}
                  />
                  {/* Bar visual */}
                  <div style={{ width: 80, height: 6, background: C.borderLight, borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ height: '100%', width: `${c.weight}%`, background: weightColor(c.weight), borderRadius: 3, transition: 'width 0.2s' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add types */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontFamily: FF }}>
            + Agregar criterio
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(CRITERION_TYPES).filter(([t]) => !usedTypes.has(t)).map(([type, def]) => (
              <button key={type} onClick={() => addCriterion(type)} style={{
                background: '#fff', border: `1px dashed ${C.border}`, borderRadius: 10,
                padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: FF,
                color: C.textSecondary, display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}>
                {def.icon} {def.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div style={{ marginBottom: 18, padding: '16px', background: '#F8FAFC', border: `1px solid ${C.border}`, borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, marginBottom: 14, fontFamily: FF, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Preview — Template de evaluación en Performance
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {criteria.map(c => {
                const def = CRITERION_TYPES[c.type] ?? { icon: '📌' };
                return (
                  <div key={c.type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>{def.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: FF }}>{c.label}</span>
                        <span style={{ fontSize: 11, color: C.textMuted, fontFamily: FF }}>{c.weight}%</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {PREVIEW_RATINGS.map((r, i) => (
                          <div key={i} style={{
                            flex: 1, height: 20, borderRadius: 4, background: i === 2 ? C.primary : C.borderLight,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span style={{ fontSize: 8, color: i === 2 ? '#fff' : C.textMuted, fontFamily: FF }}>{i + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: C.textMuted, fontFamily: FF, fontStyle: 'italic' }}>
              Performance generará este template con escalas 1–5 por cada criterio. La ponderación calculará el puntaje final automáticamente.
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 14, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, color: '#DC2626', fontFamily: FF }}>
            ⚠️ {error}
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!isValid || saving}
          style={{
            width: '100%', background: (!isValid || saving) ? C.surfaceAlt
              : saved ? '#065F46'
              : `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
            border: 'none', color: (!isValid || saving) ? C.textMuted : '#fff',
            borderRadius: 10, padding: '13px', fontFamily: FF, fontSize: 14, fontWeight: 700,
            cursor: (!isValid || saving) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {saving ? 'Guardando…' : saved ? '✓ Criterios guardados' : isValid ? 'Guardar criterios de evaluación' : `Ajusta los pesos (falta ${Math.abs(100 - total)}%)`}
        </button>
      </div>
    </div>
  );
}
