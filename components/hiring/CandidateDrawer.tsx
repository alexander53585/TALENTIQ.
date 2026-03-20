'use client';

import { useState } from 'react';
import { C, FF } from '@/lib/tokens';

type Tab = 'perfil' | 'evaluaciones' | 'entrevistas' | 'notas' | 'historial';

interface DrawerProps {
  candidate: any;
  onClose: () => void;
}

export default function CandidateDrawer({ candidate, onClose }: DrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('perfil');

  if (!candidate) return null;

  const tabs: { id: Tab, label: string }[] = [
    { id: 'perfil', label: '👤 Perfil' },
    { id: 'evaluaciones', label: '📊 Evaluaciones' },
    { id: 'entrevistas', label: '💬 Entrevistas' },
    { id: 'notas', label: '📝 Notas' },
    { id: 'historial', label: '🕒 Historial' }
  ];

  return (
    <>
      <div 
        onClick={onClose} 
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, animation: 'fadeIn 0.2s' }} 
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '100%',
        background: '#fff', zIndex: 101, boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
        display: 'flex', flexDirection: 'column', fontFamily: FF, animation: 'slideInRight 0.3s ease'
      }}>
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${C.borderLight}`, background: C.surfaceAlt, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
           <div>
             <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>{candidate.full_name}</h2>
             <div style={{ fontSize: 13, color: C.textSecondary }}>{candidate.email} • {candidate.phone || 'Sin télefono'}</div>
             <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
               <span style={{ fontSize: 11, fontWeight: 700, background: '#E0E7FF', color: '#3730A3', padding: '4px 10px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                 {candidate.status}
               </span>
               <span style={{ fontSize: 11, fontWeight: 700, background: '#F1F5F9', color: C.textSecondary, padding: '4px 10px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                 Fuente: {candidate.source}
               </span>
             </div>
           </div>
           <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 24, color: C.textMuted, cursor: 'pointer', lineHeight: 1 }}>
             ×
           </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
           {tabs.map(t => (
             <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
               flex: 1, padding: '14px 16px', fontWeight: 600, fontSize: 13, fontFamily: FF,
               background: activeTab === t.id ? '#fff' : 'transparent',
               color: activeTab === t.id ? C.primary : C.textSecondary,
               border: 'none', borderBottom: activeTab === t.id ? `2px solid ${C.primary}` : '2px solid transparent',
               cursor: 'pointer', whiteSpace: 'nowrap'
             }}>
               {t.label}
             </button>
           ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          
          {activeTab === 'perfil' && (
             <div>
               <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Curriculum Vitae</h3>
               {candidate.cv_storage_path ? (
                 <div style={{ padding: '20px', background: '#F8FAFC', border: `1px dashed ${C.border}`, borderRadius: 12, textAlign: 'center' }}>
                   <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
                   <a href={candidate.cv_storage_path} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 700, color: C.primary, textDecoration: 'none' }}>Ver Documento Adjunto →</a>
                 </div>
               ) : (
                 <div style={{ fontSize: 13, color: C.textMuted }}>No hay CV adjunto.</div>
               )}
               
               <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginTop: 32, marginBottom: 16 }}>Consentimiento</h3>
               <div style={{ fontSize: 13, color: C.textSecondary }}>
                 16PF Aceptado: <strong>{candidate.consent_16pf ? 'Sí' : 'No'}</strong>
               </div>
             </div>
          )}

          {activeTab === 'evaluaciones' && (
             <div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                 <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text }}>KultuFit Score</h3>
                 {candidate.kultfit_score ? (
                   <div style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>{candidate.kultfit_score}%</div>
                 ) : (
                   <span style={{ fontSize: 12, color: C.textMuted }}>No calculado</span>
                 )}
               </div>

               {candidate.kultfit_breakdown ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {Object.entries(candidate.kultfit_breakdown).map(([k, v]: any) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '12px', background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
                        <span style={{ textTransform: 'capitalize' }}>{k === '16pf' ? 'Perfil 16PF' : k}</span>
                        <strong style={{ color: C.primary }}>{v}%</strong>
                      </div>
                    ))}
                  </div>
               ) : (
                 <div style={{ fontSize: 13, color: C.textMuted, padding: '24px', background: C.surfaceAlt, borderRadius: 12, textAlign: 'center' }}>
                   Las evaluaciones no se han cargado aún.
                 </div>
               )}
             </div>
          )}

          {activeTab === 'notas' && (
             <div>
               <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Notas Especialista HR</h3>
               {candidate.notes?.specialist?.length > 0 ? (
                 <ul style={{ paddingLeft: 16, fontSize: 13, color: C.textSecondary, marginBottom: 24 }}>
                   {candidate.notes.specialist.map((n: string, i: number) => <li key={i} style={{ marginBottom: 6 }}>{n}</li>)}
                 </ul>
               ) : <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 24 }}>Sin notas.</div>}

               <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Feedback Jefatura</h3>
               {candidate.notes?.manager?.length > 0 ? (
                 <ul style={{ paddingLeft: 16, fontSize: 13, color: C.textSecondary }}>
                   {candidate.notes.manager.map((n: string, i: number) => <li key={i} style={{ marginBottom: 6 }}>{n}</li>)}
                 </ul>
               ) : <div style={{ fontSize: 13, color: C.textMuted }}>Sin feedback.</div>}
             </div>
          )}

          {activeTab === 'historial' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               {candidate.status_history?.map((h: any, i: number) => (
                 <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                   <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.primary, marginTop: 6 }} />
                   <div>
                     <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                       Cambio a <span style={{ textTransform: 'uppercase' }}>{h.to}</span>
                     </div>
                     <div style={{ fontSize: 11, color: C.textMuted }}>{new Date(h.at).toLocaleString()} • {h.by_email || h.by}</div>
                   </div>
                 </div>
               ))}
               {!candidate.status_history?.length && <div style={{ fontSize: 13, color: C.textMuted }}>Sin historial</div>}
             </div>
          )}

          {activeTab === 'entrevistas' && (
            <div style={{ fontSize: 13, color: C.textMuted, padding: '24px', background: C.surfaceAlt, borderRadius: 12, textAlign: 'center' }}>
              Módulo de agenda e integraciones con calendario en construcción.
            </div>
          )}

        </div>
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
