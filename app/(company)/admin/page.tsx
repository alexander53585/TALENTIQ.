'use client'

import { useState, useEffect } from 'react'
import { 
  Users, UserPlus, Shield, MoreVertical, 
  Trash2, Mail, CheckCircle2, AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface Member {
  id: string
  user_id: string
  role: string
  scope: string
  is_active: boolean
  created_at: string
  email?: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  hr_specialist: 'Especialista RH',
  manager: 'Manager',
  employee: 'Colaborador',
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-50 text-purple-700 border-purple-100',
  admin: 'bg-blue-50 text-blue-700 border-blue-100',
  hr_specialist: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  manager: 'bg-amber-50 text-amber-700 border-amber-100',
  employee: 'bg-slate-50 text-slate-600 border-slate-100',
}

export default function AdminPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/admin/members')
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      setMembers(data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    setUpdating(memberId)
    try {
      const res = await fetch('/api/admin/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memberId, role: newRole })
      })
      const { error } = await res.json()
      if (error) throw new Error(error)
      
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    } catch (e: any) {
      alert(e.message)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2A45] flex items-center gap-2">
            <Shield size={24} className="text-[#3B6FCA]" /> Panel de Administración
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestiona los miembros de tu equipo, roles y permisos de acceso.
          </p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-[#3B6FCA] text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-900/10 hover:bg-[#2d5ab8] transition-all">
          <UserPlus size={18} /> Invitar Miembro
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-8 h-8 border-4 border-[#3B6FCA] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 text-sm">Cargando miembros...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
            <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
            <p className="text-red-800 font-semibold">Error al cargar datos</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rol Actual</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Alcance</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map(member => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#3B6FCA] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                          {member.email?.substring(0,2).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1E2A45]">{member.email || 'Miembro del equipo'}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Mail size={10} /> ID: {member.user_id.substring(0,8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select 
                          value={member.role}
                          disabled={updating === member.id}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border bg-transparent cursor-pointer outline-none transition-all
                            ${ROLE_COLORS[member.role] || 'border-slate-200'}
                          `}
                        >
                          {Object.entries(ROLE_LABELS).map(([val, label]) => (
                            <option key={val} value={val} className="text-slate-700 bg-white font-normal">{label}</option>
                          ))}
                        </select>
                        {updating === member.id && <div className="w-3 h-3 border-2 border-[#3B6FCA] border-t-transparent rounded-full animate-spin"></div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 capitalize">{member.scope || 'Organización'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Quitar acceso">
                          <Trash2 size={16} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {members.length === 0 && (
            <div className="p-12 text-center">
              <Users size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No se encontraron miembros activos</p>
            </div>
          )}
        </div>
      )}

      {/* Guide Card */}
      <div className="bg-[#3B6FCA]/5 border border-[#3B6FCA]/10 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-[#1E2A45] mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" /> Guía de Permisos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
                <p className="text-[10px] font-bold text-purple-700 uppercase">Owner</p>
                <p className="text-[11px] text-slate-500 leading-snug">Control total. Acceso a facturación y seguridad.</p>
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-bold text-blue-700 uppercase">Admin</p>
                <p className="text-[11px] text-slate-500 leading-snug">Gestor total. Invitaciones y arquitectura.</p>
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-bold text-emerald-700 uppercase">HR Specialist</p>
                <p className="text-[11px] text-slate-500 leading-snug">Selección, candidatos y competencias.</p>
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-bold text-amber-700 uppercase">Manager</p>
                <p className="text-[11px] text-slate-500 leading-snug">Evaluador. Foco en equipo y desempeño.</p>
            </div>
        </div>
      </div>
    </div>
  )
}
