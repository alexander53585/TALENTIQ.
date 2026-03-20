'use client';

import { useState, lazy, Suspense } from 'react';
import { C, FF } from '@/lib/tokens';
import { StatusBadge, type JobStatus } from '@/components/architecture/StatusBadge';
import { Spinner } from '@/components/kulturh/Atoms';

const ApprovalPanel = lazy(() => import('@/components/architecture/ApprovalPanel'));
const Profile16PFPanel = lazy(() => import('@/components/architecture/Profile16PFPanel'));
const EvaluationCriteriaBuilder = lazy(() => import('@/components/architecture/EvaluationCriteriaBuilder'));

interface PositionDetailPanelProps {
  item: any;         // full job_position record from DB
  userRole: string;
  onBack: () => void;
  onStatusChange?: (newStatus: JobStatus) => void;
}

type Tab = 'descriptor' | 'profile16pf' | 'criteria';

export default function PositionDetailPanel({ item, userRole, onBack, onStatusChange }: PositionDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('descriptor');
  const [showApproval, setShowApproval] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<JobStatus>(item.status ?? 'draft');
  const [approvalHistory, setApprovalHistory] = useState(item.approval_history ?? []);
  const [profile16pf, setProfile16pf] = useState(item.profile_16pf_reference ?? null);
  const [evalCriteria, setEvalCriteria] = useState(item.evaluation_criteria ?? []);

  const handleStatusChange = (newStatus: JobStatus, notes: string) => {
    setCurrentStatus(newStatus);
    setApprovalHistory((prev: any[]) => [
      ...prev,
      { from: currentStatus, to: newStatus, notes, at: new Date().toISOString() },
    ]);
    setShowApproval(false);
    onStatusChange?.(newStatus);
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'descriptor',  label: 'Descriptivo',     icon: '📄' },
    { id: 'profile16pf', label: 'Perfil 16PF',     icon: '🧠' },
    { id: 'criteria',    label: 'Criterios Eval.', icon: '🎯' },
  ];

  return (
    <div style={{ fontFamily: FF, animation: 'fadeIn 0.4s ease' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{
          background: '#fff', border: `1px solid ${C.border}`, color: C.textSecondary,
          borderRadius: 10, padding: '9px 18px', fontFamily: FF, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>← Volver</button>
        <StatusBadge status={currentStatus} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowApproval(true)}
            style={{
              background: currentStatus === 'approved' ? '#D1FAE5' : `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
              border: 'none', color: currentStatus === 'approved' ? '#065F46' : '#fff',
              borderRadius: 10, padding: '9px 18px', fontFamily: FF, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', boxShadow: currentStatus === 'approved' ? 'none' : `0 2px 8px ${C.primaryGlow}`,
            }}
          >
            {currentStatus === 'approved' ? '✓ Aprobado' : '⚙ Flujo de aprobación'}
          </button>
        </div>
      </div>

      {/* Position header */}
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 20, boxShadow: C.shadow }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          {item.puesto || item.title || 'Sin título'}
        </div>
        <div style={{ fontSize: 14, color: C.textSecondary }}>
          {item.area || 'Sin área'}
          {item.kultvalue_band && <span style={{ marginLeft: 12, color: C.primary, fontWeight: 600 }}>Banda {item.kultvalue_band}</span>}
          {item.version > 1 && <span style={{ marginLeft: 12, color: C.textMuted }}>v{item.version}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: C.surfaceAlt, padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            background: activeTab === t.id ? '#fff' : 'transparent',
            border: 'none', borderRadius: 10, padding: '9px 18px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FF,
            color: activeTab === t.id ? C.primary : C.textSecondary,
            boxShadow: activeTab === t.id ? C.shadow : 'none',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'descriptor' && (
        <div>
          {/* Render existing descriptive data */}
          {item.result ? (
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: '24px', fontSize: 14, color: C.textSecondary, lineHeight: 1.8 }}>
              {item.resumen && <p style={{ marginBottom: 14 }}>{item.resumen}</p>}
              <pre style={{ fontFamily: FF, whiteSpace: 'pre-wrap', fontSize: 13 }}>
                {JSON.stringify(item.result ?? item.data, null, 2)}
              </pre>
            </div>
          ) : (
            <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: '40px 24px', textAlign: 'center', color: C.textMuted }}>
              Sin datos de descriptivo disponibles
            </div>
          )}
        </div>
      )}

      {activeTab === 'profile16pf' && (
        <Suspense fallback={<Spinner label="Cargando panel 16PF" sub="" />}>
          <Profile16PFPanel
            positionId={item.id}
            profile={profile16pf}
            onGenerated={p => setProfile16pf(p)}
          />
        </Suspense>
      )}

      {activeTab === 'criteria' && (
        <Suspense fallback={<Spinner label="Cargando criterios" sub="" />}>
          <EvaluationCriteriaBuilder
            positionId={item.id}
            positionMeta={{
              title: item.puesto || item.title,
              area: item.area,
              kultvalue_band: item.kultvalue_band,
              kultvalue_score: item.kultvalue_score,
              specific_competencies: item.specific_competencies,
            }}
            initial={evalCriteria}
            onSaved={c => setEvalCriteria(c)}
          />
        </Suspense>
      )}

      {/* Approval Panel Overlay */}
      {showApproval && (
        <Suspense fallback={null}>
          <ApprovalPanel
            positionId={item.id}
            currentStatus={currentStatus}
            approvalHistory={approvalHistory}
            userRole={userRole}
            onStatusChange={handleStatusChange}
            onClose={() => setShowApproval(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
