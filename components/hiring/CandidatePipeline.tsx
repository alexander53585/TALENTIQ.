'use client';

import { useState, useEffect } from 'react';
import { C, FF } from '@/lib/tokens';
import CandidateDrawer from '@/components/hiring/CandidateDrawer';

interface PipelineProps {
  vacancyId: string;
}

const COLUMNS = [
  { id: 'received', label: '📥 Nuevos' },
  { id: 'reviewing', label: '👀 En Revisión' },
  { id: 'evaluated', label: '📊 Evaluados (16PF)' },
  { id: 'interviewed', label: '💬 Entrevistas' },
  { id: 'finalist', label: '⭐ Finalistas' },
  { id: 'offer', label: '📝 Oferta' },
  { id: 'hired', label: '✅ Contratados' }
];

export default function CandidatePipeline({ vacancyId }: PipelineProps) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);

  // Load data
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

  useEffect(() => {
    loadCandidates();
  }, [vacancyId]);

  // Drag and Drop handlers
  const onDragStart = (e: React.DragEvent, cand: any) => {
    setDraggedItem(cand);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('curr_status', cand.status);
    // Hide ghost image styling fix
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

    // Optimistic update
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
      // Rollback
      setCandidates(previousCandidates);
      alert('Error moviendo al candidato.');
    } finally {
      setDraggedItem(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: C.textMuted, fontFamily: FF }}>Cargando pipeline...</div>;
  }

  return (
    <>
      <style>{`
        .kanban-board {
          display: flex; gap: 16px; overflow-x: auto; padding-bottom: 24px; min-height: 500px;
        }
        .kanban-col {
          min-width: 280px; width: 280px; background: #F8FAFC; border-radius: 12px;
          border: 1px solid ${C.borderLight}; display: flex; flex-direction: column;
        }
        .kanban-header {
          padding: 14px 16px; font-weight: 700; font-size: 14px; font-family: ${FF};
          color: ${C.text}; border-bottom: 1px solid ${C.borderLight};
          display: flex; justify-content: space-between; align-items: center;
        }
        .kanban-body {
          flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 10px;
          overflow-y: auto; overflow-x: hidden;
        }
        .card {
          background: #fff; border-radius: 8px; padding: 14px; border: 1px solid ${C.border};
          box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: grab; transition: all 0.2s;
        }
        .card:hover {
          border-color: ${C.primary}; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.08);
        }
        .card:active { cursor: grabbing; }
        .card.dragging { opacity: 0.5; }
        
        /* Drag UI overlay fix for smooth experience */
        .drop-zone { min-height: 60px; border-radius: 8px; border: 2px dashed transparent; transition: all 0.2s; }
        .drop-zone.active { background: rgba(51,102,255,0.05); border-color: ${C.primary}; }
      `}</style>

      {/* Manual Candidate creation btn could be here, mapped externally or via a modal. */}

      <div className="kanban-board">
        {COLUMNS.map(col => {
          const colCandidates = candidates.filter(c => c.status === col.id);
          
          return (
            <div key={col.id} className="kanban-col">
              <div className="kanban-header">
                {col.label} 
                <span style={{ background: '#E2E8F0', padding: '2px 8px', borderRadius: 20, fontSize: 11, color: C.textSecondary }}>
                  {colCandidates.length}
                </span>
              </div>

              <div 
                className={`kanban-body drop-zone ${draggedItem && draggedItem.status !== col.id ? 'active' : ''}`}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, col.id)}
              >
                {colCandidates.map(c => (
                  <div 
                    key={c.id} 
                    draggable
                    onDragStart={(e) => onDragStart(e, c)}
                    onDragEnd={onDragEnd}
                    className="card"
                  >
                    <div onClick={() => setSelectedCandidate(c)}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FF, marginBottom: 4 }}>
                        {c.full_name}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <span style={{ fontSize: 11, background: C.surfaceAlt, color: C.textMuted, padding: '2px 8px', borderRadius: 4, fontFamily: FF, textTransform: 'capitalize' }}>
                          Ref: {c.source}
                        </span>
                        {c.kultfit_score && (
                          <span style={{ fontSize: 12, fontWeight: 800, color: C.primary, background: C.primaryDim, padding: '2px 8px', borderRadius: 6, fontFamily: FF }}>
                            {c.kultfit_score}% Fit
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 8, fontFamily: FF }}>
                         Ingreso: {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}

                {colCandidates.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, color: C.textMuted, fontFamily: FF }}>
                    Arrastra candidatos aquí
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
    </>
  );
}
