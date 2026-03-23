'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, LogOut, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CandidatePortalShellProps {
  children: React.ReactNode
  userEmail: string
}

const NAV_LINKS = [
  { label: 'Inicio',           href: '/candidato' },
  { label: 'Mis Postulaciones', href: '/candidato/postulaciones' },
  { label: 'Mi Perfil',         href: '/candidato/perfil' },
  { label: 'Evaluaciones',      href: '/candidato/evaluaciones' },
]

export default function CandidatePortalShell({ children, userEmail }: CandidatePortalShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/candidato/login')
  }

  const isActive = (href: string) =>
    href === '/candidato' ? pathname === href : pathname.startsWith(href)

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/candidato" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#3B6FCA] flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xs">K</span>
            </div>
            <span className="font-bold text-[#1E2A45] text-base">KultuRH</span>
            <span className="hidden sm:inline-block text-[10px] bg-[#00A99D] text-white px-2 py-0.5 rounded-full font-medium ml-1">
              Portal Candidato
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-[#3B6FCA] text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#1E2A45]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[#3B6FCA] flex items-center justify-center text-white text-xs font-bold">
                  {(userEmail?.[0] ?? 'C').toUpperCase()}
                </div>
                <span className="text-sm text-slate-600 max-w-[140px] truncate">{userEmail}</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <LogOut size={14} />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 pb-4">
            <nav className="flex flex-col gap-1 pt-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'bg-[#3B6FCA] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-1"
              >
                <LogOut size={14} />
                Cerrar sesión
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 text-center">
        <p className="text-slate-400 text-sm">
          © 2025 KultuRH · Portal de Candidatos
        </p>
      </footer>
    </div>
  )
}
