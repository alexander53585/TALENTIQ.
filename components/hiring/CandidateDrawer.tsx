'use client';

import { useState } from 'react';
import { C, FF } from '@/lib/tokens';

type Tab = 'perfil' | 'evaluaciones' | 'entrevistas' | 'notas' | 'historial';

interface DrawerProps {
  candidate: any;
  onClose: () => void;
}

export default function CandidateDrawer({ candidate: initialCandidate, onClose }: DrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('perfil');
  const [candidate, setCandidate] = useState(initialCandidate);
  const [loading16pf, setLoading16pf] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [interpreting, setInterpreting] = useState(false);
  const [interpretation, setInterpretation] = useState('');

  if (!candidate) return null;

  const tabs: { id: Tab, label: string }[] = [
    { id: 'perfil', label: '👤 Perfil' },
    { id: 'evaluaciones', label: '📊 Evaluaciones' },
    { id: 'entrevistas', label: '💬 Entrevistas' },
    { id: 'notas', label: '📝 Notas' },
    { id: 'historial', label: '🕒 Historial' }
  ];

  const handleSend16PF = async () => {
    setLoading16pf(true);
    try {
      const res = await fetch(`/api/hiring/candidates/${candidate.id}/trigger-16pf`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setCandidate({ ...candidate, consent_16pf: true, pf16Link: data.link });
      setShowConsentModal(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading16pf(false);
    }
  };

  const calculateKultufit = async () => {
    try {
      const res = await fetch(`/api/hiring/candidates/${candidate.id}/kultfit`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) setCandidate({ ...candidate, kultufit_score: data.kultufit_score, kultfit_breakdown: data.kultfit_breakdown });
    } catch (e) { console.error(e); }
  };

  const handleInterpret = async () => {
    setInterpreting(true);
    try {
      const res = await fetch(`/api/hiring/candidates/${candidate.id}/interpret-16pf`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) setInterpretation(data.ai_interpretation);
    } catch (e) { console.error(e); } finally {
      setInterpreting(false);
    }
  };

  const handleKultuFeedback = async () => {
    if (confirm('Generar reporte de rechazo para el candidato?')) {
      try {
        const res = await fetch(`/api/hiring/candidates/${candidate.id}/feedback`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) alert('KultuFeedback Generado con éxito: revisa las notas internas.');
      } catch (e) { console.error(e); }
    }
  };

  const pfData = candidate.pf16_evaluations?.[0];

  return (
    <>
      <div 
        onClick={onClose} 
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, animation: 'fadeIn 0.2s' }} 
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 540, maxWidth: '100%',
        background: '#fff', zIndex: 101, boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
        display: 'flex', flexDirection: 'column', fontFamily: FF, animation: 'slideInRight 0.3s ease'
      }}>
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
               
               <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginTop: 32, marginBottom: 16 }}>Acciones Rápidas</h3>
               <button onClick={handleKultuFeedback} style={{ background: '#FFF1F2', color: '#BE123C', border: '1px solid #FECDD3', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FF, width: '100%' }}>
                 Generar KultuFeedback de Rechazo (IA)
               </button>
             </div>
          )}

          {activeTab === 'evaluaciones' && (
             <div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                 <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text }}>KultuFit Score Total</h3>
                 {candidate.kultfit_score ? (
                   <div style={{ fontSize: 24, fontWeight: 800, color: C.primary }}>{candidate.kultfit_score}%</div>
                 ) : (
                   <span style={{ fontSize: 12, color: C.textMuted }}>No calculado</span>
                 )}
               </div>

               <div style={{ background: '#F8FAFC', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                   <span style={{ fontSize: 20 }}>🧠</span>
                   <h4 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Protocolo 16PF</h4>
                   {!candidate.consent_16pf && (
                      <span style={{ marginLeft: 'auto', fontSize: 11, background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>Requiere Consentimiento</span>
                   )}
                 </div>
                 
                 {!candidate.consent_16pf ? (
                   <div>
                     <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>El candidato debe aceptar los términos de la evaluación psicométrica automatizada antes de generarla.</p>
                     <button onClick={() => setShowConsentModal(true)} style={{ background: 'linear-gradient(135deg, #3366FF, #5580FF)', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, width: '100%' }}>
                        Solicitar y Enviar 16PF →
                     </button>
                   </div>
                 ) : (
                   <div>
                     <div style={{ fontSize: 13, color: '#065F46', background: '#D1FAE5', padding: '8px 12px', borderRadius: 8, marginBottom: 16, border: '1px solid #A7F3D0' }}>
                       ✓ Consentimiento 16PF validado.
                     </div>
                     {candidate.pf16Link && (
                       <div style={{ marginBottom: 16 }}>
                         <label style={{ fontSize: 11, color: C.textSecondary, fontWeight: 700 }}>Enlace de la prueba generado:</label>
                         <input readOnly value={candidate.pf16Link} style={{ width: '100%', padding: '8px', fontSize: 12, border: `1px solid ${C.borderLight}`, borderRadius: 6, background: '#fff', marginTop: 4 }} />
                       </div>
                     )}
                     {pfData && (
                        <div style={{ fontSize: 13, color: C.text, marginBottom: 16 }}>
                          Estado de la prueba: <strong>{pfData.status}</strong> ({pfData.progress_pct || 0}%)
                        </div>
                     )}
                     
                     <div style={{ display: 'flex', gap: 12 }}>
                       <button onClick={calculateKultufit} style={{ flex: 1, background: '#fff', border: `1px solid ${C.primary}`, color: C.primary, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                         Actualizar KultuFit
                       </button>
                       <button onClick={handleInterpret} disabled={interpreting} style={{ flex: 1, background: '#1E1B4B', border: 'none', color: '#fff', padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: interpreting ? 'wait' : 'pointer' }}>
                         {interpreting ? 'Analizando IA...' : 'Ver Interpretación 16PF'}
                       </button>
                     </div>

                     {interpretation && (
                        <div style={{ marginTop: 16, background: '#EEF2FF', padding: 16, borderRadius: 8, border: '1px solid #C7D2FE', fontSize: 13, color: '#312E81', whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto' }}>
                          <strong>Interpretación AI Exclusiva (HR):</strong><br/><br/>
                          {interpretation}
                        </div>
                     )}
                   </div>
                 )}
               </div>

               <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Desglose de Puntuaciones</h3>
               {candidate.kultfit_breakdown ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {Object.entries(candidate.kultfit_breakdown).map(([k, v]: any) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '12px', background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
                        <span style={{ textTransform: 'capitalize' }}>{k === '16pf' ? 'Perfil 16PF' : k}</span>
                        <strong style={{ color: C.primary }}>{Number(v).toFixed(2)}%</strong>
                      </div>
                    ))}
                  </div>
               ) : (
                 <div style={{ fontSize: 13, color: C.textMuted, padding: '24px', background: C.surfaceAlt, borderRadius: 12, textAlign: 'center' }}>
                   Las evaluaciones técnicas y blandas no registran puntajes.
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

        </div>
      </div>

      {showConsentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div style={{ background: '#fff', width: 400, borderRadius: 16, padding: '24px', fontFamily: FF }}>
             <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 12 }}>Consentimiento 16PF</h3>
             <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, marginBottom: 24 }}>
               Al continuar, certificas que el candidato ha otorgado su consentimiento expreso de uso de datos para la evaluación psicométrica. Se le generará un token cifrado.
             </p>
             <div style={{ display: 'flex', gap: 12 }}>
               <button onClick={() => setShowConsentModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
               <button onClick={handleSend16PF} disabled={loading16pf} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: C.primary, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                 {loading16pf ? 'Generando...' : 'Confirmar y Enviar'}
               </button>
             </div>
           </div>
        </div>
      )}
    </>
  );
}
