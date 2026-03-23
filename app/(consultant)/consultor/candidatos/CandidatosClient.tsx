'use client'

import { useState } from 'react'
import type { CandidateDisplay, OrgOption } from './page'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new:        { label: 'Nuevo',       className: 'bg-blue-50 text-[#3B6FCA]' },
  interview:  { label: 'Entrevista',  className: 'bg-teal-50 text-[#00A99D]' },
  offer:      { label: 'Oferta',      className: 'bg-green-50 text-green-600' },
  hired:      { label: 'Contratado',  className: 'bg-emerald-50 text-emerald-600' },
  discarded:  { label: 'Descartado',  className: 'bg-red-50 text-red-500' },
}

interface Props {
  candidates: CandidateDisplay[]
  orgOptions: OrgOption[]
}

export default function ConsultorCandidatosClient({ candidates, orgOptions }: Props) {
  const [selectedOrg, setSelectedOrg] = useState<string>('all')

  const filtered = selectedOrg === 'all'
    ? candidates
    : candidates.filter((c) => c.orgId === selectedOrg)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      {/* Filter */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-sm text-slate-500">
          {filtered.length} candidato{filtered.length !== 1 ? 's' : ''}
        </p>
        <select
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value)}
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3B6FCA]/30"
        >
          <option value="all">Todos los clientes</option>
          {orgOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left font-medium text-slate-400 pb-3 pr-4">Candidato</th>
              <th className="text-left font-medium text-slate-400 pb-3 pr-4">Email</th>
              <th className="text-left font-medium text-slate-400 pb-3 pr-4">Vacante</th>
              <th className="text-left font-medium text-slate-400 pb-3 pr-4">Empresa</th>
              <th className="text-left font-medium text-slate-400 pb-3 pr-4">Estado</th>
              <th className="text-left font-medium text-slate-400 pb-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((c) => {
              const statusInfo = STATUS_CONFIG[c.status] ?? { label: c.status, className: 'bg-slate-100 text-slate-500' }
              const date = new Date(c.created_at).toLocaleDateString('es-MX', {
                day: '2-digit', month: 'short', year: 'numeric'
              })
              return (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-[#1E2A45]">{c.name}</td>
                  <td className="py-3 pr-4 text-slate-500">{c.email}</td>
                  <td className="py-3 pr-4 text-slate-600">{c.vacancyTitle}</td>
                  <td className="py-3 pr-4 text-slate-600">{c.orgName}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="py-3 text-slate-400">{date}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
