'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Dna, Building2, Users, BarChart3, BookOpen,
  AlertTriangle, ArrowRight, Plus, CheckCircle2,
  Clock, Briefcase, TrendingUp, Settings,
  ShieldCheck, ChevronLeft, ChevronRight, X,
} from 'lucide-react'

const MODULES = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', Icon: LayoutDashboard, available: true },
  { id: 'foundation', label: 'KultuDNA', href: '/foundation', Icon: Dna, available: true },
  { id: 'architecture', label: 'Cargos', href: '/architecture', Icon: Building2, available: true },
  { id: 'hiring', label: 'Selección', href: '/hiring', Icon: Briefcase, available: true },
  { id: 'people', label: 'People', href: '/people', Icon: Users, available: true },
  { id: 'performance', label: 'Desempeño', href: '/performance', Icon: BarChart3, available: false },
  { id: 'learning', label: 'Aprendizaje', href: '/learning', Icon: BookOpen, available: false },
]

const ADMIN_MODULE = { id: 'admin', label: 'Administración', href: '/admin', Icon: Settings, available: true }

interface SidebarProps {
  collapsed: boolean
  onCollapse: (v: boolean) => void
  mobileOpen: boolean
  onMobileClose: () => void
  role?: string
}

export default function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose, role }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  const navItems = role === 'owner' || role === 'admin'
    ? [...MODULES, ADMIN_MODULE]
    : MODULES

  const NavItem = ({ item }: { item: typeof MODULES[0] }) => {
    const active = isActive(item.href)
    if (!item.available) {
      return (
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-50 cursor-not-allowed mx-2 ${collapsed ? 'justify-center' : ''}`}>
          <item.Icon size={18} className="text-slate-400 shrink-0" />
          {!collapsed && (
            <span className="text-sm text-slate-400 flex-1 flex items-center justify-between">
              {item.label}
              <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full">Soon</span>
            </span>
          )}
        </div>
      )
    }
    return (
      <Link
        href={item.href}
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
            <p className="text-[#00A99D] text-[10px] leading-none mt-0.5">Suite</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => <NavItem key={item.id} item={item as typeof MODULES[0]} />)}
      </nav>

      {/* Collapse toggle — desktop only */}
      <button
        onClick={() => onCollapse(!collapsed)}
        className="hidden lg:flex items-center justify-center h-10 mx-4 mb-4 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#1A2B5E] transition-all duration-300 ease-in-out shrink-0
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
            onClick={onMobileClose}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#1A2B5E] flex flex-col z-50 shadow-2xl">
            <button
              onClick={onMobileClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
