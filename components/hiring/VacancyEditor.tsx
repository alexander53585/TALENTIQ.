'use client';

import { useState, useEffect } from 'react';
import { C, FF } from '@/lib/tokens';
import { useRouter } from 'next/navigation';

interface PositionData {
  id: string;
  puesto?: string;
  title?: string;
  result?: any;
}

interface Props {
  position: PositionData;
  onSaved?: () => void;
}

export default function VacancyEditor({ position, onSaved }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(position.puesto || position.title || '');
  const [mission, setMission] = useState(position.result?.mission || '');
  const [functions, setFunctions] = useState(
    Array.isArray(position.result?.key_functions) 
      ? position.result.key_functions.map((f:any) => f.description || f).join('\n') 
      : ''
  );
  const [requirements, setRequirements] = useState(
    Array.isArray(position.result?.requirements) 
      ? position.result.requirements.join('\n') 
      : ''
  );

  const [adContent, setAdContent] = useState({ linkedin: '', instagram: '', internal: '' });
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // KultuFit Weights
  const [weights, setWeights] = useState({
    '16pf': 25,
    competencies: 30,
    technical: 20,
    cultural: 15,
    ethical: 10
  });

  const totalWeigth = Object.values(weights).reduce((a, b) => a + b, 0);

  const handleOptimize = async () => {
    setOptimizing(true);
    setError('');
    try {
      const res = await fetch('/api/hiring/vacancies/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, mission, functions, requirements })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAdContent(data);
    } catch (err: any) {
      setError('Error al optimizar con IA: ' + err.message);
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = async () => {
    if (totalWeigth !== 100) {
      setError('La suma de pesos KultuFit debe ser exactamente 100%');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/hiring/vacancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_position_id: position.id,
          title,
          ad_content: adContent,
          evaluation_structure: weights
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onSaved?.();
      router.push('/hiring');
    } catch(err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changeWeight = (key: keyof typeof weights, val: number) => {
    setWeights(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div style={{ fontFamily: FF, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: C.shadow }}>
      
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.borderLight}`, background: C.surfaceAlt }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>Editor de Vacante</h2>
        <div style={{ fontSize: 13, color: C.primary, fontWeight: 600 }}>Basado en el cargo aprobado: {position.puesto || position.title}</div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Basic Information */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Información Base</h3>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Título de la Vacante</label>
            <input 
              value={title} onChange={(e) => setTitle(e.target.value)} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: FF, outline: 'none' }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Misión (Extraída)</label>
              <textarea 
                value={mission} readOnly
                style={{ width: '100%', height: 100, padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: FF, background: '#F8FAFC', fontSize: 13, color: C.textMuted }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Funciones (Extraídas)</label>
              <textarea 
                value={functions} readOnly
                style={{ width: '100%', height: 100, padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: FF, background: '#F8FAFC', fontSize: 13, color: C.textMuted }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Requisitos (Extraídos)</label>
              <textarea 
                value={requirements} readOnly
                style={{ width: '100%', height: 100, padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: FF, background: '#F8FAFC', fontSize: 13, color: C.textMuted }} 
              />
            </div>
          </div>
        </div>

        {/* AI Generator */}
        <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0369A1', marginBottom: 4 }}>Optimización de Aviso Multicanal</h3>
              <div style={{ fontSize: 13, color: '#0284C7' }}>Genera copies atractivos con IA para cada red enfocados en la audiencia objetivo.</div>
            </div>
            <button 
              onClick={handleOptimize} disabled={optimizing}
              style={{ background: optimizing ? C.border : 'linear-gradient(135deg, #0EA5E9, #2563EB)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: optimizing ? 'wait' : 'pointer' }}
            >
              ✦ {optimizing ? 'Generando...' : 'Optimizar aviso con IA'}
            </button>
          </div>

          {(adContent.linkedin || adContent.instagram || adContent.internal) && (
             <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF', marginBottom: 6 }}>📘 LinkedIn</div>
                  <textarea value={adContent.linkedin} onChange={e => setAdContent({...adContent, linkedin: e.target.value})} style={{ width: '100%', height: 140, padding: '10px', borderRadius: 8, border: '1px solid #BFDBFE', fontFamily: FF, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#B91C1C', marginBottom: 6 }}>📸 Instagram</div>
                  <textarea value={adContent.instagram} onChange={e => setAdContent({...adContent, instagram: e.target.value})} style={{ width: '100%', height: 140, padding: '10px', borderRadius: 8, border: '1px solid #FECACA', fontFamily: FF, fontSize: 13 }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#047857', marginBottom: 6 }}>🏢 Portal Corporativo</div>
                  <textarea value={adContent.internal} onChange={e => setAdContent({...adContent, internal: e.target.value})} style={{ width: '100%', height: 140, padding: '10px', borderRadius: 8, border: '1px solid #A7F3D0', fontFamily: FF, fontSize: 13 }} />
                </div>
             </div>
          )}
        </div>

        {/* KultuFit Weights */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Estructura de Evaluación (KultuFit Score)</h3>
            <span style={{ fontSize: 13, fontWeight: 700, color: totalWeigth === 100 ? '#10B981' : '#EF4444', background: totalWeigth === 100 ? '#ECFDF5' : '#FEF2F2', padding: '4px 12px', borderRadius: 20 }}>
              Total: {totalWeigth}% {totalWeigth === 100 ? '✓' : '⚠'}
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(weights).map(([key, val]) => (
               <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 16, background: C.surfaceAlt, padding: '10px 16px', borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <span style={{ width: 140, fontSize: 13, fontWeight: 600, color: C.textSecondary, textTransform: 'capitalize' }}>
                    {key === '16pf' ? 'Perfil 16PF' : key}
                  </span>
                  <input 
                    type="range" min={0} max={100} value={val} 
                    onChange={e => changeWeight(key as any, Number(e.target.value))}
                    style={{ flex: 1, accentColor: C.primary }}
                  />
                  <span style={{ width: 40, textAlign: 'right', fontSize: 14, fontWeight: 700, color: C.primary }}>{val}%</span>
               </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ margin: '0 0 16px 0', padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 14, fontWeight: 500 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 20, borderTop: `1px solid ${C.borderLight}` }}>
           <button 
             onClick={handleSave} 
             disabled={saving || totalWeigth !== 100 || !title.trim()}
             style={{ 
               background: (saving || totalWeigth !== 100 || !title.trim()) ? C.border : `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
               color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: FF
             }}
           >
             {saving ? 'Guardando...' : 'Crear y Continuar →'}
           </button>
        </div>
      </div>
    </div>
  );
}
