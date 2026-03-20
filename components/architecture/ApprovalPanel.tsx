'use client';

import { useState } from 'react';
import { C, FF } from '@/lib/tokens';
import { StatusBadge, type JobStatus } from './StatusBadge';

interface HistoryEntry {
  from: string;
  to: string;
  by: string;
  by_email?: string;
  at: string;
  notes?: string | null;
}

interface ApprovalPanelProps {
  positionId: string;
  currentStatus: JobStatus;
  approvalHistory: HistoryEntry[];
  userRole: string;
  onStatusChange: (newStatus: JobStatus, notes: string) => void;
  onClose: () => void;
}

// What transitions are available per status + role
function getAvailableActions(status: JobStatus, role: string): { label: string; next: JobStatus; color: string }[] {
  const isApprover = ['admin', 'owner'].includes(role);
  const map: Partial<Record<JobStatus, { label: string; next: JobStatus; color: string }[]>> = {
    draft:     [{ label: 'Enviar a revisión', next: 'in_review', color: C.primary }],
    in_review: [
      { label: 'Marcar como ajustado', next: 'adjusted', color: '#B45309' },
      { label: 'Devolver a borrador',  next: 'draft',    color: C.textMuted },
    ],
    adjusted: isApprover
      ? [
          { label: '✓ Aprobar cargo',     next: 'approved',  color: '#065F46' },
          { label: 'Devolver a revisión', next: 'in_review', color: '#B45309' },
        ]
      : [{ label: 'Devolver a revisión', next: 'in_review', color: '#B45309' }],
    approved: [{ label: 'Versionar (al editar)', next: 'versioned', color: '#6D28D9' }],
    versioned: [],
    archived:  [],
  };
  return map[status] ?? [];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function ApprovalPanel({
  positionId, currentStatus, approvalHistory, userRole, onStatusChange, onClose,
}: ApprovalPanelProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const actions = getAvailableActions(currentStatus, userRole);

  const handleAction = async (next: JobStatus) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/architecture/descriptions/${positionId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: next, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar estado');
      onStatusChange(next, notes);
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', justifyContent: 'flex-end',
      background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        width: 400, maxWidth: '95vw', height: '100%', overflow: 'auto',
        background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
        padding: '28px 24px', fontFamily: FF,
        display: 'flex', flexDirection: 'column', gap: 24,
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6 }}>
              Flujo de aprobación
            </div>
            <StatusBadge status={currentStatus} />
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', fontSize: 20,
            cursor: 'pointer', color: C.textMuted, padding: 4,
          }}>✕</button>
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div style={{
            background: C.surfaceAlt, borderRadius: 12,
            border: `1px solid ${C.border}`, padding: 18,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Acción de revisión
            </div>
            <textarea
              placeholder="Notas de revisión (opcional)…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '10px 12px', fontFamily: FF, fontSize: 13,
                color: C.text, resize: 'vertical', outline: 'none',
                marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {actions.map(action => (
                <button
                  key={action.next}
                  onClick={() => handleAction(action.next)}
                  disabled={loading}
                  style={{
                    background: action.color, border: 'none', color: '#fff',
                    borderRadius: 10, padding: '11px 18px', fontFamily: FF,
                    fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
                    textAlign: 'left',
                  }}
                >
                  {loading ? 'Procesando…' : action.label}
                </button>
              ))}
            </div>
            {error && (
              <div style={{
                marginTop: 10, padding: '8px 12px', background: '#FEF2F2',
                border: '1px solid #FECACA', borderRadius: 8,
                fontSize: 13, color: '#DC2626',
              }}>
                ⚠️ {error}
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Historial de cambios
          </div>
          {approvalHistory.length === 0 ? (
            <div style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', padding: '20px 0' }}>
              Sin movimientos registrados aún
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...approvalHistory].reverse().map((entry, i) => (
                <div key={i} style={{
                  borderLeft: `3px solid ${C.primary}30`,
                  paddingLeft: 14, paddingBottom: 12,
                  borderBottom: i < approvalHistory.length - 1 ? `1px solid ${C.borderLight}` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <StatusBadge status={entry.from as JobStatus} size="sm" />
                    <span style={{ fontSize: 12, color: C.textMuted }}>→</span>
                    <StatusBadge status={entry.to as JobStatus} size="sm" />
                  </div>
                  <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 2 }}>
                    <strong>{entry.by_email || 'Usuario'}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: entry.notes ? 4 : 0 }}>
                    {formatDate(entry.at)}
                  </div>
                  {entry.notes && (
                    <div style={{
                      fontSize: 12, color: C.textSecondary, fontStyle: 'italic',
                      background: C.surfaceAlt, borderRadius: 6, padding: '6px 10px', marginTop: 6,
                    }}>
                      "{entry.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
