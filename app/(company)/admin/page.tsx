'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Users, UserPlus, Shield, MoreVertical,
  Trash2, Mail, CheckCircle2, AlertCircle, X, Send, Plus
} from 'lucide-react'

interface Member {
  id: string
  user_id: string
  role: string
  scope: string
  is_active: boolean
  created_at: string
  email?: string
}

type InviteResult = {
  email: string
  status: 'sent' | 'already_member' | 'resent' | 'error'
  message?: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  hr_specialist: 'Especialista RH',
  manager: 'Manager',
  employee: 'Colaborador',
}

const INVITE_ROLE_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  admin:        { label: 'Administrador',   desc: 'Gestión total del equipo, vacantes y configuración.', color: '#3B6FCA' },
  hr_specialist:{ label: 'Especialista RH', desc: 'Selección, candidatos y competencias.',               color: '#18A873' },
  manager:      { label: 'Manager',         desc: 'Evaluación y seguimiento de equipo.',                 color: '#F59E0B' },
  employee:     { label: 'Colaborador',     desc: 'Acceso a perfil y evaluaciones.',                     color: '#6B7280' },
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-50 text-purple-700 border-purple-100',
  admin: 'bg-blue-50 text-blue-700 border-blue-100',
  hr_specialist: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  manager: 'bg-amber-50 text-amber-700 border-amber-100',
  employee: 'bg-slate-50 text-slate-600 border-slate-100',
}

/* ── Invite Modal ────────────────────────────────────────────────────────── */
function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [emailInput, setEmailInput] = useState('')
  const [emails, setEmails] = useState<string[]>([])
  const [role, setRole] = useState<'admin' | 'hr_specialist' | 'manager' | 'employee'>('employee')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<InviteResult[] | null>(null)
  const [inputError, setInputError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const addEmail = () => {
    const val = emailInput.trim().toLowerCase()
    if (!val) return
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setInputError('Correo electrónico no válido')
      return
    }
    if (emails.includes(val)) {
      setInputError('Este correo ya fue agregado')
      return
    }
    setEmails(prev => [...prev, val])
    setEmailInput('')
    setInputError('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      addEmail()
    }
    if (e.key === 'Backspace' && !emailInput && emails.length > 0) {
      setEmails(prev => prev.slice(0, -1))
    }
  }

  const removeEmail = (em: string) => setEmails(prev => prev.filter(e => e !== em))

  const handleSend = async () => {
    // Also add any email currently in the input
    const pendingEmail = emailInput.trim().toLowerCase()
    let allEmails = [...emails]
    if (pendingEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pendingEmail)) {
        setInputError('Correo electrónico no válido')
        return
      }
      if (!allEmails.includes(pendingEmail)) allEmails.push(pendingEmail)
    }

    if (allEmails.length === 0) {
      setInputError('Agrega al menos un correo electrónico')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: allEmails, role, message: message || undefined }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'Error al enviar invitaciones')
      setResults(json.data)
    } catch (err: any) {
      setInputError(err.message)
    }
    setSending(false)
  }

  const allDone = results !== null
  const sentCount = results?.filter(r => r.status === 'sent' || r.status === 'resent').length ?? 0

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999, padding: '20px',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520,
        boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
        animation: 'modalIn 0.25s ease',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <style suppressHydrationWarning>{`@keyframes modalIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Modal header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #E8EDF3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1E2A45', display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={18} color="#3B6FCA" /> Invitar colaboradores
            </div>
            <div style={{ fontSize: 13, color: '#8FA3C0', marginTop: 2 }}>Los invitados recibirán un correo con un enlace seguro</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8FA3C0', padding: 4, borderRadius: 8, lineHeight: 1 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px 28px' }}>
          {!allDone ? (
            <>
              {/* Email input area */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E2A45', marginBottom: 8 }}>
                  Correos electrónicos <span style={{ color: '#D94A4A' }}>*</span>
                </label>
                <div style={{
                  minHeight: 52, border: `1.5px solid ${inputError ? '#D94A4A' : '#D8E1EB'}`,
                  borderRadius: 10, padding: '8px 12px', display: 'flex',
                  flexWrap: 'wrap', gap: 6, alignItems: 'center', background: '#fff',
                  cursor: 'text',
                }} onClick={() => inputRef.current?.focus()}>
                  {emails.map(em => (
                    <span key={em} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: '#EEF3FF', color: '#3B6FCA', borderRadius: 20,
                      padding: '3px 10px', fontSize: 12, fontWeight: 600,
                      border: '1px solid #D0DCFF',
                    }}>
                      {em}
                      <button onClick={() => removeEmail(em)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B6FCA', padding: 0, lineHeight: 1 }}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={inputRef}
                    value={emailInput}
                    onChange={e => { setEmailInput(e.target.value); setInputError('') }}
                    onKeyDown={handleKeyDown}
                    onBlur={addEmail}
                    placeholder={emails.length === 0 ? 'colaborador@empresa.com, otro@empresa.com...' : 'Agregar más...'}
                    style={{ flex: 1, minWidth: 180, border: 'none', outline: 'none', fontSize: 14, color: '#1E2A45', background: 'transparent', fontFamily: 'inherit' }}
                  />
                </div>
                {inputError && <div style={{ fontSize: 12, color: '#D94A4A', marginTop: 6 }}>{inputError}</div>}
                <div style={{ fontSize: 11, color: '#8FA3C0', marginTop: 6 }}>
                  Presiona Enter, coma o espacio para agregar cada correo. Puedes invitar hasta 20 a la vez.
                </div>
              </div>

              {/* Role selector */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E2A45', marginBottom: 10 }}>
                  Rol a asignar <span style={{ color: '#D94A4A' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(Object.entries(INVITE_ROLE_LABELS) as [string, typeof INVITE_ROLE_LABELS[string]][]).map(([val, info]) => (
                    <label key={val} style={{
                      border: `2px solid ${role === val ? info.color : '#E8EDF3'}`,
                      borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                      background: role === val ? `${info.color}08` : '#fff',
                      transition: 'all 0.15s',
                    }}>
                      <input type="radio" name="role" value={val} checked={role === val}
                        onChange={() => setRole(val as typeof role)}
                        style={{ display: 'none' }}
                      />
                      <div style={{ fontSize: 13, fontWeight: 700, color: role === val ? info.color : '#1E2A45', marginBottom: 2 }}>
                        {info.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#8FA3C0', lineHeight: 1.4 }}>{info.desc}</div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Optional personal message */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E2A45', marginBottom: 8 }}>
                  Mensaje personal <span style={{ fontSize: 12, color: '#8FA3C0', fontWeight: 400 }}>(opcional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Agrega una nota personal que aparecerá en el correo de invitación..."
                  maxLength={300}
                  rows={3}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical',
                    border: '1.5px solid #D8E1EB', borderRadius: 10, padding: '12px 14px',
                    fontSize: 14, color: '#1E2A45', outline: 'none', fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
                <div style={{ fontSize: 11, color: '#8FA3C0', textAlign: 'right', marginTop: 4 }}>{message.length}/300</div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose}
                  style={{ flex: 1, border: '1.5px solid #D8E1EB', background: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, color: '#5B6B7F', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSend} disabled={sending}
                  style={{
                    flex: 2, background: sending ? '#93B4F0' : 'linear-gradient(135deg,#3B6FCA,#5580FF)',
                    border: 'none', borderRadius: 10, padding: '12px', fontSize: 14,
                    fontWeight: 700, color: '#fff', cursor: sending ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                  {sending ? (
                    <><div style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Enviando...</>
                  ) : (
                    <><Send size={16} /> Enviar invitaciones</>
                  )}
                </button>
              </div>
              <style suppressHydrationWarning>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </>
          ) : (
            /* Results screen */
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{sentCount > 0 ? '🎉' : '⚠️'}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1E2A45', marginBottom: 6 }}>
                  {sentCount > 0
                    ? `${sentCount} invitación${sentCount > 1 ? 'es' : ''} enviada${sentCount > 1 ? 's' : ''}`
                    : 'Sin invitaciones nuevas'}
                </div>
                <div style={{ fontSize: 13, color: '#8FA3C0' }}>
                  Resumen del envío
                </div>
              </div>

              <div style={{ border: '1px solid #E8EDF3', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                {results!.map((r, i) => {
                  const statusInfo = {
                    sent:          { label: 'Enviado',          color: '#18A873', bg: '#F0FBF6' },
                    resent:        { label: 'Reenviado',        color: '#3B6FCA', bg: '#EEF3FF' },
                    already_member:{ label: 'Ya es miembro',    color: '#8FA3C0', bg: '#F7F9FC' },
                    error:         { label: 'Error',            color: '#D94A4A', bg: '#FFF5F5' },
                  }[r.status]
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 16px', background: i % 2 === 0 ? '#fff' : '#FAFBFC',
                      borderBottom: i < results!.length - 1 ? '1px solid #E8EDF3' : 'none',
                    }}>
                      <div style={{ fontSize: 13, color: '#1E2A45', fontWeight: 500 }}>{r.email}</div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px',
                        borderRadius: 20, background: statusInfo.bg, color: statusInfo.color,
                      }}>
                        {statusInfo.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              <button onClick={() => { onSuccess(); onClose() }}
                style={{
                  width: '100%', background: 'linear-gradient(135deg,#3B6FCA,#5580FF)',
                  border: 'none', borderRadius: 10, padding: '13px', fontSize: 15,
                  fontWeight: 700, color: '#fff', cursor: 'pointer',
                }}>
                Aceptar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Admin Page ──────────────────────────────────────────────────────────── */
export default function AdminPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => { fetchMembers() }, [])

  const fetchMembers = async () => {
    setLoading(true)
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
      {/* Invite Modal */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={fetchMembers}
        />
      )}

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
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center justify-center gap-2 bg-[#3B6FCA] text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-900/10 hover:bg-[#2d5ab8] transition-all"
        >
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
              <p className="text-slate-400 text-sm font-medium">No hay miembros activos</p>
              <button
                onClick={() => setShowInvite(true)}
                className="mt-4 flex items-center gap-2 mx-auto text-sm text-[#3B6FCA] font-semibold hover:underline"
              >
                <Plus size={14} /> Invitar el primer colaborador
              </button>
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
