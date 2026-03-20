'use client';

import { C, FF } from '@/lib/tokens';

export type JobStatus = 'draft' | 'in_review' | 'adjusted' | 'approved' | 'versioned' | 'archived';

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string; dot: string }> = {
  draft:     { label: 'Borrador',    color: '#64748B', bg: '#F1F5F9', dot: '#94A3B8' },
  in_review: { label: 'En revisión', color: '#B45309', bg: '#FEF3C7', dot: '#F59E0B' },
  adjusted:  { label: 'Ajustado',   color: '#1D4ED8', bg: '#EFF6FF', dot: '#3B82F6' },
  approved:  { label: 'Aprobado',   color: '#065F46', bg: '#D1FAE5', dot: '#10B981' },
  versioned: { label: 'Versionado', color: '#6D28D9', bg: '#EDE9FE', dot: '#8B5CF6' },
  archived:  { label: 'Archivado',  color: '#374151', bg: '#F3F4F6', dot: '#9CA3AF' },
};

interface StatusBadgeProps {
  status: JobStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const px = size === 'sm' ? '5px 10px' : '6px 14px';
  const fs = size === 'sm' ? 11 : 12;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: cfg.bg, color: cfg.color,
      borderRadius: 20, padding: px, fontSize: fs,
      fontWeight: 700, fontFamily: FF, letterSpacing: '0.02em',
      border: `1px solid ${cfg.dot}30`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: cfg.dot, flexShrink: 0,
      }} />
      {cfg.label}
    </span>
  );
}
