'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, ChevronDown, LogOut, User, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  orgName: string
  plan: string
  userEmail: string
  userRole: string
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

export default function Header({ orgName, plan, userEmail, userRole, onMenuClick }: HeaderProps) {
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
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#3B6FCA] flex items-center justify-center">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium text-[#1E2A45] leading-none">{userEmail}</p>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">{ROLE_LABELS[userRole] ?? userRole}</p>
          </div>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
            <div className="px-4 py-2.5 border-b border-slate-100">
              <p className="text-xs font-semibold text-[#1E2A45] truncate">{userEmail}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{ROLE_LABELS[userRole] ?? userRole}</p>
            </div>
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
