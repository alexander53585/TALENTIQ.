'use client';

import { useState, useEffect } from 'react';
import { C, FF } from '@/lib/tokens';
import CandidateDrawer from '@/components/hiring/CandidateDrawer';
import DecisionPanel from '@/components/hiring/DecisionPanel';

interface PipelineProps {
  vacancyId: string;
}

const COLUMNS = [
  { id: 'received', label: 'Nuevos', icon: '📥' },
  { id: 'reviewing', label: 'En Revisión', icon: '👀' },
  { id: 'evaluated', label: 'Evaluados', icon: '📊' },
  { id: 'interviewed', label: 'Entrevistas', icon: '💬' },
  { id: 'finalist', label: 'Finalistas', icon: '⭐' },
  { id: 'offer', label: 'Oferta', icon: '📝' },
  { id: 'hired', label: 'Contratados', icon: '✅' }
];

export default function CandidatePipeline({ vacancyId }: PipelineProps) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [showDecisionPanel, setShowDecisionPanel] = useState(false);

  const loadCandidates = async () => {
    try {
      const res = await fetch(`/api/hiring/vacancies/${vacancyId}/candidates`);
      const { data } = await res.json();
      if (data) setCandidates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCandidates(); }, [vacancyId]);

  const onDragStart = (e: React.DragEvent, cand: any) => {
    setDraggedItem(cand);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('curr_status', cand.status);
    e.currentTarget.classList.add('dragging');
  };

  const onDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedItem(null);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = async (e: React.DragEvent, toStatus: string) => {
    e.preventDefault();
    if (!draggedItem) return;
    if (draggedItem.status === toStatus) return;

    const previousCandidates = [...candidates];
    setCandidates(prev => prev.map(c => c.id === draggedItem.id ? { ...c, status: toStatus } : c));

    try {
      const res = await fetch(`/api/hiring/candidates/${draggedItem.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      
      const updated = await res.json();
      setCandidates(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    } catch (err) {
      setCandidates(previousCandidates);
      alert('Error moviendo al candidato.');
    } finally {
      setDraggedItem(null);
    }
  };

  const handleOffer = async (candidateId: string, offerDetails: any) => {
    try {
      const res = await fetch(`/api/people/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidateId,
          vacancy_id: vacancyId,
          hire_date: offerDetails.date,
          onboarding_notes: offerDetails.notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en Handoff');
      
      alert('¡Handoff Exitoso! El candidato ya es Empleado Activo, la vacante se ha cerrado y el resto recibirá feedback automático.');
      setShowDecisionPanel(false);
      window.location.reload(); 
    } catch (e: any) {
      alert(e.message);
    }
  };

  const finalists = candidates.filter(c => c.status === 'finalist');

  if (loading) {
    return <div style={{ padding: '80px 40px', textAlign: 'center', color: C.textMuted, fontFamily: FF, fontSize: 15 }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${C.primaryDim}`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
      Cargando candidatos...
    </div>;
  }

  return (
    <>
      <style>{`
        .kanban-board {
          display: flex; gap: 20px; overflow-x: auto; padding: 4px 4px 32px 4px; min-height: 600px;
          scroll-behavior: smooth;
        }
        .kanban-board::-webkit-scrollbar { height: 8px; }
        .kanban-board::-webkit-scrollbar-track { background: transparent; }
        .kanban-board::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }

        .kanban-col {
          min-width: 300px; width: 300px; background: rgba(248, 250, 252, 0.6); backdrop-filter: blur(8px);
          border-radius: 16px; border: 1px solid ${C.borderLight}; display: flex; flex-direction: column;
          transition: all 0.3s ease;
        }
        .kanban-header {
          padding: 18px 20px; font-weight: 700; font-size: 13px; font-family: ${FF};
          color: ${C.textSecondary}; border-bottom: 1px solid ${C.borderLight};
          display: flex; justify-content: space-between; align-items: center;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .kanban-body {
          flex: 1; padding: 14px; display: flex; flex-direction: column; gap: 12px;
          overflow-y: auto; overflow-x: hidden;
        }
        .card {
          background: #fff; border-radius: 12px; padding: 16px; border: 1px solid ${C.border};
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
          cursor: grab; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative; overflow: hidden;
        }
        .card:hover {
          border-color: ${C.primaryLight}; transform: translateY(-4px); 
          box-shadow: 0 12px 20px -8px rgba(51,102,255,0.15);
        }
        .card:active { cursor: grabbing; }
        .card.dragging { opacity: 0.4; transform: scale(0.95); }
        .drop-zone { min-height: 100px; border-radius: 12px; border: 2px dashed transparent; transition: all 0.2s; }
        .drop-zone.active { background: rgba(51,102,255,0.03); border-color: ${C.primaryLight}; }
        
        .fit-pill {
          font-size: 11px; font-weight: 800; padding: 4px 10px; borderRadius: 8px;
          display: flex; align-items: center; gap: 4px;
        }
        .fit-high { background: ${C.successDim}; color: ${C.success}; }
        .fit-med { background: ${C.warnDim}; color: ${C.warn}; }
        .fit-low { background: ${C.errorDim}; color: ${C.error}; }

        .pf-status-dot {
          width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px;
        }
        .pf-completed { background: ${C.success}; box-shadow: 0 0 8px ${C.successDim}; }
        .pf-pending { background: ${C.warn}; animation: pulse 2s infinite; }
      `}</style>

      {finalists.length > 0 && (
        <div style={{ 
          paddingBottom: 20, marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          borderBottom: `1px solid ${C.borderLight}` 
        }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>Panel de Selección Directa</h3>
            <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>Compara y decide el handoff final de tus mejores talentos.</p>
          </div>
          <button 
            onClick={() => setShowDecisionPanel(true)}
            style={{ 
              padding: '12px 24px', background: C.text, color: '#fff', border: 'none', borderRadius: 12, 
              fontWeight: 700, cursor: 'pointer', fontFamily: FF, display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 8px 16px -4px rgba(24,34,48,0.2)', transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            ⚖️ Abrir Panel de Decisión ({finalists.length})
          </button>
        </div>
      )}

      <div className="kanban-board">
        {COLUMNS.map(col => {
          const colCandidates = candidates.filter(c => c.status === col.id);
          
          return (
            <div key={col.id} className="kanban-col">
              <div className="kanban-header">
                <span>{col.icon} {col.label}</span>
                <span style={{ background: '#fff', border: `1px solid ${C.borderLight}`, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: C.textSecondary, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  {colCandidates.length}
                </span>
              </div>

              <div 
                className={`kanban-body drop-zone ${draggedItem && draggedItem.status !== col.id ? 'active' : ''}`}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, col.id)}
              >
                {colCandidates.map(c => {
                  const fit = c.kultfit_score || 0;
                  const fitClass = fit >= 80 ? 'fit-high' : fit >= 60 ? 'fit-med' : 'fit-low';
                  const pf = c.pf16_evaluations?.[0];
                  
                  return (
                    <div 
                      key={c.id} 
                      draggable
                      onDragStart={(e) => onDragStart(e, c)}
                      onDragEnd={onDragEnd}
                      className="card"
                      onClick={() => setSelectedCandidate(c)}
                    >
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: FF, marginBottom: 6 }}>
                        {c.full_name}
                      </div>
                      
                      <div style={{ fontSize: 12, color: C.textSecondary, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                         <span>{c.source === 'direct' ? '📍 Directo' : `🔗 ${c.source}`}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                           {pf && (
                             <div 
                               title={pf.status === 'completed' ? '16PF Completado' : '16PF Pendiente'}
                               className={`pf-status-dot ${pf.status === 'completed' ? 'pf-completed' : 'pf-pending'}`} 
                             />
                           )}
                           <span style={{ fontSize: 11, color: C.textMuted }}>{new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                        
                        {c.kultfit_score && (
                          <div className={`fit-pill ${fitClass}`}>
                            ✦ {c.kultfit_score}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {colCandidates.length === 0 && !draggedItem && (
                  <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 12, color: C.textMuted, fontFamily: FF, border: `1px dashed ${C.border}`, borderRadius: 12, opacity: 0.6 }}>
                    Sin candidatos
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CandidateDrawer 
        candidate={selectedCandidate} 
        onClose={() => setSelectedCandidate(null)} 
      />

      {showDecisionPanel && (
        <DecisionPanel 
          vacancyId={vacancyId}
          finalists={finalists}
          onClose={() => setShowDecisionPanel(false)}
          onOffer={handleOffer}
        />
      )}
    </>
  );
}
