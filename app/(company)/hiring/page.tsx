'use client';

import { useState, useEffect } from 'react';
import { C, FF } from '@/lib/tokens';
import Link from 'next/link';
import { StatusBadge } from '@/components/architecture/StatusBadge';
import AiWidget from '@/components/kulturh/AiWidget';

export default function HiringPage() {
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/hiring/vacancies')
      .then(res => res.json())
      .then(json => {
        setVacancies(json.data || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ fontFamily: FF, maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.primaryDim, border: `1px solid ${C.primary}20`, borderRadius: 24, padding: '6px 18px', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>✦ KultuRH · Módulo de Hiring</span>
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.2 }}>
            Vacantes y Selección
          </h1>
          <p style={{ color: C.textSecondary, fontSize: 15, lineHeight: 1.7 }}>
            Gestiona tus procesos de selección, publicadores y pipeline de candidatos.
          </p>
        </div>
        
        <Link href="/hiring/new" style={{
          background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
          border: 'none', color: '#fff', borderRadius: 10, padding: '12px 24px',
          fontFamily: FF, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 14px ${C.primaryGlow}`
        }}>
          + Nueva Vacante
        </Link>
      </div>

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: C.textMuted, fontSize: 15 }}>
          Cargando vacantes...
        </div>
      )}

      {error && (
         <div style={{ padding: '16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, color: '#DC2626', marginBottom: 24 }}>
           ⚠️ {error}
         </div>
      )}

      {!loading && !error && vacancies.length === 0 && (
         <div style={{ background: '#fff', border: `1px dashed ${C.border}`, borderRadius: 16, padding: '48px 24px', textAlign: 'center', boxShadow: C.shadow }}>
           <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
           <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>Sin vacantes activas</h2>
           <p style={{ color: C.textSecondary, fontSize: 15, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
             Crea tu primera vacante basándote en los cargos pre-aprobados de Arquitectura Organizacional.
           </p>
           <Link href="/hiring/new" style={{ color: C.primary, fontWeight: 700, textDecoration: 'none', fontSize: 15 }}>
             → Comenzar ahora
           </Link>
         </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {vacancies.map(v => (
           <Link href={`/hiring/${v.id}`} key={v.id} style={{ 
             display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
             background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, 
             padding: '24px', textDecoration: 'none', color: 'inherit',
             transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
           }}>
             <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                   <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>{v.title}</h3>
                   <span style={{ 
                     background: v.status === 'published' ? '#D1FAE5' : v.status === 'created' ? C.surfaceAlt : '#FEF3C7',
                     color: v.status === 'published' ? '#065F46' : v.status === 'created' ? C.textSecondary : '#92400E',
                     fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase'
                   }}>
                     {v.status === 'published' ? 'Publicada' : v.status === 'created' ? 'Borrador' : v.status}
                   </span>
                </div>
                <div style={{ fontSize: 13, color: C.textSecondary, display: 'flex', gap: 16 }}>
                   <span>💼 Cargo: {v.job_positions?.puesto || v.job_positions?.title}</span>
                   <span>📅 Creada: {new Date(v.created_at).toLocaleDateString()}</span>
                </div>
             </div>
             <div style={{ color: C.primary, fontWeight: 700 }}>
               Pipeline →
             </div>
           </Link>
        ))}
      </div>

      {/* ── RAY: Asistente IA de Hiring ── */}
      <AiWidget context={{
        screen: 'hiring',
        mode: null,
        step: 1,
        subPhase: vacancies.length === 0 ? 'sin_vacantes' : 'listado',
        formC: { puesto: null, area: 'Selección y Reclutamiento', mision: null },
      }} />
    </div>
  );
}
