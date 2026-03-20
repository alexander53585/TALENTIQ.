'use client';
import React from 'react';
import type { Decatipos, GlobalDims, DerivedEqs } from './types';
import { FACTORS, POLO_BAJO, POLO_ALTO, FACTOR_ORDER } from './engine';

// ═══════════════════════════════════════════════════════════
// ProfileChart — Factor table with bar dots
// ═══════════════════════════════════════════════════════════
export function ProfileChart({ decatipos }: { decatipos: Decatipos }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#F1F5F9' }}>
            <th style={TH}>Factor</th>
            <th style={TH}>Polo Bajo</th>
            <th style={{ ...TH, textAlign: 'center' }}>Pje.</th>
            <th style={{ ...TH, textAlign: 'center', minWidth: 220 }}>1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 · 10</th>
            <th style={TH}>Polo Alto</th>
          </tr>
        </thead>
        <tbody>
          {FACTOR_ORDER.map(f => {
            const d = decatipos[f] || 5;
            const isExtreme = d <= 2 || d >= 9;
            return (
              <tr key={f} style={{ borderBottom: '1px solid #E8EDF3' }}>
                <td style={{ ...TD, fontWeight: 700, color: '#3366FF' }}>{f}</td>
                <td style={{ ...TD, fontSize: 11, color: '#5B6B7F' }}>{POLO_BAJO[f]}</td>
                <td style={{ ...TD, textAlign: 'center', fontWeight: 700, color: isExtreme ? '#DC2626' : '#182230' }}>{d}</td>
                <td style={{ ...TD, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(v => (
                      <div key={v} style={{
                        width: v === d ? 14 : 8,
                        height: v === d ? 14 : 8,
                        borderRadius: '50%',
                        background: v === d ? (isExtreme ? '#DC2626' : '#3366FF') : '#D8E1EB',
                        transition: 'all 0.3s',
                      }} />
                    ))}
                  </div>
                </td>
                <td style={{ ...TD, fontSize: 11, color: '#5B6B7F' }}>{POLO_ALTO[f]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// GlobalDimsChart — Bar chart for global dimensions + derived eqs
// ═══════════════════════════════════════════════════════════
export function GlobalDimsChart({ globalDims, derivedEqs }: { globalDims: GlobalDims; derivedEqs: DerivedEqs }) {
  const items = [
    { label: 'Ansiedad', key: 'ANS', value: globalDims.ANS, color: '#EF4444' },
    { label: 'Extraversión', key: 'EXT', value: globalDims.EXT, color: '#3B82F6' },
    { label: 'Control Social', key: 'SCO', value: globalDims.SCO, color: '#8B5CF6' },
    { label: 'Independencia', key: 'IND', value: globalDims.IND, color: '#F59E0B' },
    { label: 'Objetividad', key: 'OBJ', value: globalDims.OBJ, color: '#10B981' },
    { label: 'Creatividad', key: 'CRE', value: derivedEqs.CRE, color: '#EC4899' },
    { label: 'Neuroticismo', key: 'NEU', value: derivedEqs.NEU, color: '#EF4444' },
    { label: 'Liderazgo', key: 'LID', value: derivedEqs.LID, color: '#3366FF' },
    { label: 'Libre Accidentes', key: 'LAC', value: derivedEqs.LAC, color: '#14B8A6' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
      {items.map(item => {
        const pct = Math.round((item.value / 10) * 100);
        return (
          <div key={item.key} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8EDF3', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#5B6B7F', fontWeight: 600 }}>{item.label}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value.toFixed(1)}</span>
            </div>
            <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3 }}>
              <div style={{ height: '100%', borderRadius: 3, background: item.color, width: `${pct}%`, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// RadarChart — SVG radar chart for factor profile
// ═══════════════════════════════════════════════════════════
export function RadarChart({ decatipos, size = 300 }: { decatipos: Decatipos; size?: number }) {
  const factors = FACTOR_ORDER;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 30;
  const angleStep = (2 * Math.PI) / factors.length;

  const toXY = (val: number, idx: number) => {
    const angle = angleStep * idx - Math.PI / 2;
    const r = (val / 10) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const gridLevels = [2, 4, 6, 8, 10];
  const dataPoints = factors.map((f, i) => toXY(decatipos[f] || 5, i));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
      {/* Grid circles */}
      {gridLevels.map(level => {
        const gridPoints = factors.map((_, i) => toXY(level, i));
        const gridPath = gridPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
        return <path key={level} d={gridPath} fill="none" stroke="#E8EDF3" strokeWidth={1} />;
      })}
      {/* Axis lines */}
      {factors.map((_, i) => {
        const p = toXY(10, i);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E8EDF3" strokeWidth={1} />;
      })}
      {/* Data polygon */}
      <path d={dataPath} fill="rgba(51,102,255,0.15)" stroke="#3366FF" strokeWidth={2} />
      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#3366FF" stroke="#fff" strokeWidth={2} />
      ))}
      {/* Labels */}
      {factors.map((f, i) => {
        const labelR = maxR + 18;
        const angle = angleStep * i - Math.PI / 2;
        const lx = cx + labelR * Math.cos(angle);
        const ly = cy + labelR * Math.sin(angle);
        return (
          <text key={f} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fontWeight={700} fill="#5B6B7F" fontFamily="'Inter', sans-serif">
            {f}
          </text>
        );
      })}
    </svg>
  );
}

// Styles
const TH: React.CSSProperties = { padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: 11, color: '#8FA3C0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' };
const TD: React.CSSProperties = { padding: '0.6rem 0.75rem' };
