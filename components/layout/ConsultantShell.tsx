'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Users,
  BarChart3,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
  ChevronDown,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface OrgInfo {
  id: string
  name: string
  logo_url?: string | null
  plan?: string | null
}

interface Membership {
  organization_id: string
  role: string
  organizations: OrgInfo | OrgInfo[] | null
}

interface ConsultantShellProps {
  children: React.ReactNode
  memberships: Membership[]
  userEmail: string
}

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',   href: '/consultor',            Icon: LayoutDashboard },
  { id: 'clientes',    label: 'Clientes',    href: '/consultor/clientes',   Icon: Building2 },
  { id: 'procesos',    label: 'Procesos',    href: '/consultor/procesos',   Icon: Briefcase },
  { id: 'candidatos',  label: 'Candidatos',  href: '/consultor/candidatos', Icon: Users },
  { id: 'reportes',    label: 'Reportes',    href: '/consultor/reportes',   Icon: BarChart3 },
  { id: 'perfil',      label: 'Perfil',      href: '/consultor/perfil',     Icon: UserCircle },
]

function getOrg(membership: Membership): OrgInfo | null {
  if (!membership.organizations) return null
  return Array.isArray(membership.organizations)
    ? membership.organizations[0] ?? null
    : membership.organizations
}

export default function ConsultantShell({ children, memberships, userEmail }: ConsultantShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeOrgId, setActiveOrgId] = useState<string>(
    memberships[0]?.organization_id ?? ''
  )
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const activeOrg = memberships.find((m) => m.organization_id === activeOrgId)
  const activeOrgInfo = activeOrg ? getOrg(activeOrg) : null

  const isActive = (href: string) =>
    href === '/consultor' ? pathname === href : pathname.startsWith(href)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const NavItem = ({ item }: { item: typeof NAV_ITEMS[0] }) => {
    const active = isActive(item.href)
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mx-2 transition-all duration-150 group
          ${active
            ? 'bg-[#3B6FCA] text-white shadow-md shadow-blue-900/30'
            : 'text-slate-300 hover:bg-white/10 hover:text-white'}
          ${collapsed ? 'justify-center' : ''}
        `}
        title={collapsed ? item.label : undefined}
      >
        <item.Icon size={18} className="shrink-0" />
        {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
        {active && !collapsed && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />
        )}
      </Link>
    )
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-white/10 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-8 h-8 rounded-lg bg-[#3B6FCA] flex items-center justify-center shrink-0 shadow-lg">
          <span className="text-white font-bold text-sm">K</span>
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-sm leading-none">KultuRH</p>
            <span className="inline-block text-[10px] bg-[#00A99D] text-white px-1.5 py-0.5 rounded-full leading-none mt-1">
              Consultor
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.id} item={item} />
        ))}
      </nav>

      {/* Sign out */}
      {!collapsed && (
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 mx-4 mb-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl text-sm transition-colors"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center h-10 mx-4 mb-4 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#F0F3FA]">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#0F1D3A] transition-all duration-300 ease-in-out shrink-0
          ${collapsed ? 'w-16' : 'w-56'}`}
        style={{ minHeight: '100vh' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#0F1D3A] flex flex-col z-50 shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Menu size={20} />
          </button>

          {/* Org selector */}
          {memberships.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-sm transition-colors"
              >
                <span className="w-5 h-5 rounded-md bg-[#3B6FCA] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {(activeOrgInfo?.name?.[0] ?? 'C').toUpperCase()}
                </span>
                <span className="font-medium text-[#1E2A45] max-w-[140px] truncate">
                  {activeOrgInfo?.name ?? 'Seleccionar cliente'}
                </span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
              {orgDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                  {memberships.map((m) => {
                    const org = getOrg(m)
                    if (!org) return null
                    return (
                      <button
                        key={m.organization_id}
                        onClick={() => {
                          setActiveOrgId(m.organization_id)
                          setOrgDropdownOpen(false)
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                          m.organization_id === activeOrgId ? 'bg-blue-50 text-[#3B6FCA]' : 'text-slate-700'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-md bg-[#3B6FCA]/10 flex items-center justify-center text-[#3B6FCA] text-xs font-bold shrink-0">
                          {(org.name?.[0] ?? 'C').toUpperCase()}
                        </span>
                        <span className="truncate">{org.name}</span>
                        <span className="ml-auto text-[10px] text-slate-400 capitalize">{m.role}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block text-xs text-slate-400 truncate max-w-[200px]">{userEmail}</span>
            <div className="w-8 h-8 rounded-full bg-[#3B6FCA] flex items-center justify-center text-white text-sm font-bold">
              {(userEmail?.[0] ?? 'C').toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
