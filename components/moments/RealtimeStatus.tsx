'use client'

import type { ConnectionStatus } from '@/lib/moments/useRealtimeMoments'

interface Props {
  status: ConnectionStatus
}

const CONFIG: Record<ConnectionStatus, { dot: string; label: string; title: string }> = {
  connecting: {
    dot:   'bg-amber-400 animate-pulse',
    label: 'Conectando…',
    title: 'Conectando al servidor en tiempo real',
  },
  live: {
    dot:   'bg-emerald-500',
    label: 'En vivo',
    title: 'Actualizaciones en tiempo real activas',
  },
  polling: {
    dot:   'bg-amber-400',
    label: 'Modo offline',
    title: 'Tiempo real no disponible — actualizando cada 30 s',
  },
  error: {
    dot:   'bg-red-400',
    label: 'Sin conexión',
    title: 'Error de tiempo real — intentando reconectar',
  },
}

export default function RealtimeStatus({ status }: Props) {
  const cfg = CONFIG[status]

  return (
    <div
      className="flex items-center gap-1.5"
      title={cfg.title}
      role="status"
      aria-live="polite"
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      <span className="text-[10px] text-slate-400 hidden sm:inline">{cfg.label}</span>
    </div>
  )
}
