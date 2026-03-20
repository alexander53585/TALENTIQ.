'use client';

import { useState } from 'react';
import { C, FF } from '@/lib/tokens';

interface Factor16PF {
  factor: string;
  nivel_sugerido: 'bajo' | 'medio' | 'alto';
  justificacion: string;
}

interface Profile16PF {
  factores: Factor16PF[];
  nota_metodologica: string;
}

interface Profile16PFPanelProps {
  positionId: string;
  profile?: Profile16PF | null;
  onGenerated: (profile: Profile16PF) => void;
}

const NIVEL_CONFIG = {
  bajo:  { label: 'Bajo',  color: '#1D4ED8', bg: '#EFF6FF', bar: 20 },
  medio: { label: 'Medio', color: '#B45309', bg: '#FEF3C7', bar: 50 },
  alto:  { label: 'Alto',  color: '#065F46', bg: '#D1FAE5', bar: 85 },
};

const FACTOR_NAMES: Record<string, string> = {
  A: 'Afectividad', B: 'Inteligencia', C: 'Estabilidad Emocional',
  E: 'Dominancia', F: 'Impulsividad', G: 'Normatividad',
  H: 'Audacia Social', I: 'Sensibilidad', L: 'Suspicacia',
  M: 'Imaginación', N: 'Astucia', O: 'Inseguridad',
  Q1: 'Apertura al Cambio', Q2: 'Autosuficiencia',
  Q3: 'Perfeccionismo', Q4: 'Tensión',
};

export default function Profile16PFPanel({ positionId, profile, onGenerated }: Profile16PFPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/architecture/descriptions/${positionId}/profile16pf`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar perfil');
      onGenerated(data.profile_16pf_reference);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#fff', border: `1px solid ${C.border}`,
      borderRadius: 14, overflow: 'hidden', boxShadow: C.shadow,
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 22px', background: 'linear-gradient(135deg, #1E293B, #334155)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC', fontFamily: FF, marginBottom: 2 }}>
            Perfil 16PF de Referencia
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: FF }}>
            Orientativo · No es un filtro de selección
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            background: loading ? '#475569' : 'linear-gradient(135deg, #3366FF, #5580FF)',
            border: 'none', color: '#fff', borderRadius: 10,
            padding: '9px 18px', fontSize: 13, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: FF,
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {loading ? (
            <>
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Generando…
            </>
          ) : (
            profile ? '↺ Regenerar con IA' : '✦ Generar con IA'
          )}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 22px', background: '#FEF2F2', borderBottom: `1px solid #FECACA`, fontSize: 13, color: '#DC2626', fontFamily: FF }}>
          ⚠️ {error}
        </div>
      )}

      {!profile ? (
        <div style={{ padding: '40px 22px', textAlign: 'center', color: C.textMuted, fontFamily: FF }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🧠</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: C.textSecondary }}>
            Sin perfil de referencia
          </div>
          <div style={{ fontSize: 13, maxWidth: 340, margin: '0 auto', lineHeight: 1.7 }}>
            Genera el perfil 16PF sugerido para este cargo usando IA. Sirve como referencia orientativa al comparar candidatos.
          </div>
        </div>
      ) : (
        <div style={{ padding: '18px 22px' }}>
          {/* Factors grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginBottom: 16 }}>
            {profile.factores.map(f => {
              const cfg = NIVEL_CONFIG[f.nivel_sugerido] ?? NIVEL_CONFIG.medio;
              const isOpen = expanded === f.factor;
              return (
                <div
                  key={f.factor}
                  onClick={() => setExpanded(isOpen ? null : f.factor)}
                  style={{
                    border: `1px solid ${isOpen ? cfg.color + '50' : C.border}`,
                    borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                    background: isOpen ? cfg.bg : '#fff',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: FF }}>
                        {f.factor}
                      </span>
                      <span style={{ fontSize: 11, color: C.textMuted, fontFamily: FF, marginLeft: 6 }}>
                        {FACTOR_NAMES[f.factor]}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: cfg.color,
                      background: cfg.bg, borderRadius: 6, padding: '2px 8px', fontFamily: FF,
                      border: `1px solid ${cfg.color}30`,
                    }}>
                      {cfg.label}
                    </span>
                  </div>
                  {/* Mini bar */}
                  <div style={{ height: 4, background: C.borderLight, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${cfg.bar}%`, background: cfg.color, borderRadius: 2, transition: 'width 0.4s ease' }} />
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: 8, fontSize: 12, color: C.textSecondary, fontFamily: FF, lineHeight: 1.6 }}>
                      {f.justificacion}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Disclaimer */}
          <div style={{
            padding: '12px 16px', background: '#F0F9FF',
            border: '1px solid #BAE6FD', borderRadius: 10,
            fontSize: 12, color: '#0369A1', fontFamily: FF, lineHeight: 1.6,
          }}>
            ℹ️ <strong>Nota metodológica:</strong> {profile.nota_metodologica}
          </div>
        </div>
      )}
    </div>
  );
}
