'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, ChevronDown, LogOut, User, Building2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  orgName: string
  plan: string
  userEmail: string
  userRole: string
  activeRole: string
  onSimulateRole: (role: string | null) => void
  onMenuClick: () => void
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Gratis',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  hr_specialist: 'Especialista RH',
  manager: 'Manager',
  employee: 'Colaborador',
}

export default function Header({
  orgName, plan, userEmail, userRole, activeRole, onSimulateRole, onMenuClick
}: HeaderProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = userEmail
    ? userEmail.substring(0, 2).toUpperCase()
    : '?'

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-3 sticky top-0 z-30 shadow-sm">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      {/* Org info */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-[#3B6FCA]/10 flex items-center justify-center shrink-0">
          <Building2 size={14} className="text-[#3B6FCA]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1E2A45] truncate leading-none">{orgName}</p>
          <p className="text-[10px] text-slate-400 leading-none mt-0.5">
            {PLAN_LABELS[plan] ?? plan}
          </p>
        </div>
      </div>

      <div className="flex-1" />

      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors ${activeRole !== userRole ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-slate-100'}`}
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${activeRole !== userRole ? 'bg-amber-500' : 'bg-[#3B6FCA]'}`}>
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium text-[#1E2A45] leading-none">
              {userEmail}
              {activeRole !== userRole && <span className="ml-2 text-[8px] bg-amber-200 text-amber-800 px-1 rounded uppercase font-bold">Simulado</span>}
            </p>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">{ROLE_LABELS[activeRole] ?? activeRole}</p>
          </div>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

            {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
            <div className="px-4 py-2.5 border-b border-slate-100">
              <p className="text-xs font-semibold text-[#1E2A45] truncate">{userEmail}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Rol real: {ROLE_LABELS[userRole] ?? userRole}</p>
            </div>
            
            {(userRole === 'owner' || userRole === 'admin') && (
              <div className="py-1 border-b border-slate-100">
                <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simular rol</p>
                {Object.entries(ROLE_LABELS).map(([r, label]) => (
                  <button
                    key={r}
                    onClick={() => {
                      onSimulateRole(r === userRole ? null : r)
                      setMenuOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-4 py-1.5 text-xs transition-colors
                      ${activeRole === r ? 'text-[#3B6FCA] bg-blue-50 font-semibold' : 'text-slate-600 hover:bg-slate-50'}
                    `}
                  >
                    {label}
                    {activeRole === r && <CheckCircle2 size={12} />}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => { setMenuOpen(false); router.push('/profile') }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <User size={15} /> Mi perfil
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={15} /> Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
