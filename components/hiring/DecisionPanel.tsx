'use client';

import { useState } from 'react';
import { C, FF } from '@/lib/tokens';

interface Props {
  vacancyId: string;
  finalists: any[];
  onClose: () => void;
  onOffer: (candidateId: string, offerDetails: any) => Promise<void>;
}

export default function DecisionPanel({ vacancyId, finalists, onClose, onOffer }: Props) {
  const [selectedToOffer, setSelectedToOffer] = useState<string | null>(null);
  const [offerDetails, setOfferDetails] = useState({ date: '', notes: '' });
  const [loading, setLoading] = useState(false);

  if (finalists.length === 0) {
    return (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} />
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', padding: 32, borderRadius: 16, zIndex: 1001, fontFamily: FF, width: 400, textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: C.text, fontSize: 20 }}>No hay Finalistas</h3>
          <p style={{ color: C.textSecondary, fontSize: 14, marginTop: 12 }}>Mueve candidatos a la columna de Finalistas para poder compararlos.</p>
          <button onClick={onClose} style={{ marginTop: 24, padding: '10px 20px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cerrar</button>
        </div>
      </>
    );
  }

  const handleOfferSubmit = async () => {
    if (!selectedToOffer) return;
    setLoading(true);
    await onOffer(selectedToOffer, offerDetails);
    setLoading(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, animation: 'fadeIn 0.2s' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: '#fff', borderRadius: 20, zIndex: 1001, fontFamily: FF, width: 900,
        maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
      }}>
        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${C.borderLight}`, background: '#0F172A', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div>
             <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Panel de Decisión</h2>
             <span style={{ fontSize: 13, color: '#94A3B8' }}>Comparativa de Finalistas</span>
           </div>
           <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: 28, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '32px', display: 'flex', gap: 24, overflowX: 'auto' }}>
           {finalists.map(cand => (
             <div key={cand.id} style={{
               flex: '0 0 280px', border: `2px solid ${selectedToOffer === cand.id ? C.primary : C.borderLight}`,
               borderRadius: 16, padding: 20, background: selectedToOffer === cand.id ? '#F0F9FF' : '#fff',
               transition: 'all 0.2s', cursor: 'pointer', position: 'relative'
             }} onClick={() => setSelectedToOffer(cand.id)}>
               {selectedToOffer === cand.id && (
                 <div style={{ position: 'absolute', top: 12, right: 12, background: C.primary, color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 12 }}>SELECCIONADO</div>
               )}
               <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 4px 0', paddingRight: 80 }}>{cand.full_name}</h3>
               <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 16 }}>Ref: {cand.source}</div>
               
               <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 20 }}>
                 <div style={{ fontSize: 36, fontWeight: 800, color: C.primary, lineHeight: 1 }}>{cand.kultufit_score || 0}%</div>
                 <div style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', paddingBottom: 6 }}>KultuFit Score</div>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: C.textSecondary }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', background: '#F8FAFC', padding: '6px 12px', borderRadius: 6 }}>
                   <span>Test 16PF (Fit):</span>
                   <strong style={{ color: C.text }}>{cand.kultfit_breakdown?.['16pf'] || 0}%</strong>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', background: '#F8FAFC', padding: '6px 12px', borderRadius: 6 }}>
                   <span>Competencias:</span>
                   <strong style={{ color: C.text }}>{cand.kultfit_breakdown?.competencies || 0}%</strong>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', background: '#F8FAFC', padding: '6px 12px', borderRadius: 6 }}>
                   <span>Técnicas:</span>
                   <strong style={{ color: C.text }}>{cand.kultfit_breakdown?.technical || 0}%</strong>
                 </div>
               </div>
               
               <div style={{ marginTop: 24, fontSize: 12, color: '#64748B', fontStyle: 'italic', borderTop: `1px dashed ${C.borderLight}`, paddingTop: 16 }}>
                 Especialista: "{cand.notes?.specialist?.[0] || 'Sin notas principales'}"
               </div>
             </div>
           ))}
        </div>

        {selectedToOffer && (
          <div style={{ padding: '0 32px 32px 32px', animation: 'fadeIn 0.3s' }}>
             <div style={{ background: '#F1F5F9', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
               <h4 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 16px 0' }}>Confirmar Oferta & Handoff (People)</h4>
               <div style={{ display: 'flex', gap: 16 }}>
                 <div style={{ flex: 1 }}>
                   <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.textSecondary, marginBottom: 8 }}>Fecha estimada de Ingreso</label>
                   <input 
                     type="date" 
                     value={offerDetails.date}
                     onChange={e => setOfferDetails({...offerDetails, date: e.target.value})}
                     style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: FF }}
                   />
                 </div>
                 <div style={{ flex: 2 }}>
                   <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.textSecondary, marginBottom: 8 }}>Notas de Onboarding para el Manager / People</label>
                   <input 
                     type="text" 
                     placeholder="Ej: Requiere equipo Mac, confirmar banda salarial ajustada..."
                     value={offerDetails.notes}
                     onChange={e => setOfferDetails({...offerDetails, notes: e.target.value})}
                     style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: FF }}
                   />
                 </div>
               </div>
               
               <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                 <button onClick={() => setSelectedToOffer(null)} style={{ padding: '10px 20px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecondary, fontWeight: 700, cursor: 'pointer' }}>
                   Cancelar
                 </button>
                 <button 
                   disabled={!offerDetails.date || loading}
                   onClick={handleOfferSubmit} 
                   style={{ padding: '10px 24px', background: loading ? C.border : 'linear-gradient(135deg, #10B981, #059669)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 800, cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s', opacity: !offerDetails.date ? 0.5 : 1 }}
                 >
                   {loading ? 'Aprobando y Notificando...' : 'Aprobar Candidato y Contratar'}
                 </button>
               </div>
             </div>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </>
  );
}
