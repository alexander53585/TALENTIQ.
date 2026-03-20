'use client';

import { useState, useEffect } from 'react';
import { C, FF } from '@/lib/tokens';
import { StatusBadge } from '@/components/architecture/StatusBadge';

interface ApprovedPosition {
  id: string;
  title?: string;
  puesto?: string;
  area?: string;
  status: string;
  kultvalue_band?: string;
  kultvalue_score?: number;
  profile_16pf_reference?: any;
  approved_at?: string;
  version?: number;
}

interface Props {
  onSelect: (pos: ApprovedPosition) => void;
  selectedId?: string;
}

export default function ApprovedPositionSelector({ onSelect, selectedId }: Props) {
  const [positions, setPositions] = useState<ApprovedPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/architecture/descriptions?approved=true')
      .then(r => r.json())
      .then(json => {
        setPositions(json.data ?? json ?? []);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center', color: C.textMuted, fontFamily: FF, fontSize: 14 }}>
        Cargando cargos aprobados…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '12px 16px', background: '#FEF2F2', borderRadius: 10, fontSize: 13, color: '#DC2626', fontFamily: FF }}>
        ⚠️ {error}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div style={{
        padding: '28px 22px', textAlign: 'center',
        background: '#FFFBEB', border: '1px solid #FDE68A',
        borderRadius: 12, fontFamily: FF,
      }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#92400E', marginBottom: 6 }}>
          No hay cargos aprobados
        </div>
        <div style={{ fontSize: 13, color: '#B45309', lineHeight: 1.7, marginBottom: 16 }}>
          Para crear una vacante, primero necesitas tener al menos un cargo aprobado en el módulo de Arquitectura.
        </div>
        <a href="/architecture" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg, #3366FF, #5580FF)',
          color: '#fff', textDecoration: 'none', borderRadius: 10,
          padding: '10px 20px', fontSize: 13, fontWeight: 700,
        }}>
          → Ir a Arquitectura de Cargos
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {positions.map(pos => {
        const name = pos.title || pos.puesto || 'Sin título';
        const isSelected = pos.id === selectedId;
        return (
          <div
            key={pos.id}
            onClick={() => onSelect(pos)}
            style={{
              border: `2px solid ${isSelected ? C.primary : C.border}`,
              borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
              background: isSelected ? C.primaryDim : '#fff',
              transition: 'all 0.2s',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FF, marginBottom: 3 }}>
                {name}
              </div>
              <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: FF }}>
                {pos.area || 'Sin área'}
                {pos.kultvalue_band && <span style={{ marginLeft: 8, color: C.primary }}>· Banda {pos.kultvalue_band}</span>}
                {pos.version && pos.version > 1 && <span style={{ marginLeft: 8, color: C.textMuted }}>v{pos.version}</span>}
              </div>
            </div>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              {pos.profile_16pf_reference && (
                <span style={{ fontSize: 10, background: '#D1FAE5', color: '#065F46', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>
                  16PF ✓
                </span>
              )}
              <StatusBadge status="approved" size="sm" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
