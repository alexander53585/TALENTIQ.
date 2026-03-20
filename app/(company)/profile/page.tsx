'use client'

import { useState, useEffect } from 'react'
import { 
  User, Mail, Shield, Building2, 
  MapPin, Calendar, CheckCircle2,
  Lock, ArrowRight, UserCircle
} from 'lucide-react'

interface UserProfile {
  id: string
  email: string
}

interface Membership {
  role: string
  organizations: {
    name: string
  }
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  hr_specialist: 'Especialista RH',
  manager: 'Manager',
  employee: 'Colaborador',
}

export default function ProfilePage() {
  const [data, setData] = useState<{ user: UserProfile, membership: Membership } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/profile')
      .then(res => res.json())
      .then(json => {
        if (json.user) setData(json)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-[#3B6FCA] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  const user = data?.user
  const membership = data?.membership

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Profile */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#3B6FCA]/5 rounded-bl-full -mr-10 -mt-10"></div>
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-[#3B6FCA] flex items-center justify-center text-white shadow-xl shadow-blue-900/10">
            <UserCircle size={48} strokeWidth={1.5} />
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-2xl font-bold text-[#1E2A45]">{user?.email || 'Mi Perfil'}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-sm text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                <Shield size={14} className="text-[#3B6FCA]" /> {ROLE_LABELS[membership?.role || ''] || 'Colaborador'}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                <Building2 size={14} className="text-[#3B6FCA]" /> {membership?.organizations?.name || 'Organización'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: Account Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[#1E2A45] mb-6 flex items-center gap-2 uppercase tracking-wider">
              <User size={16} className="text-[#3B6FCA]" /> Información Básica
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Correo electrónico</p>
                <div className="flex items-center gap-2 text-sm text-[#1E2A45] font-medium py-1">
                  <Mail size={16} className="text-slate-400" /> {user?.email}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contraseña</p>
                <button className="flex items-center gap-2 text-xs text-[#3B6FCA] font-semibold hover:opacity-80 py-1 transition-all">
                  <Lock size={14} /> Cambiar contraseña
                </button>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} className="text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">Seguridad de la Cuenta</h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Tu cuenta está protegida por Supabase Auth. Recuerda no compartir tus credenciales de acceso con terceros.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Plans */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
             <h3 className="text-sm font-bold text-[#1E2A45] mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Shield size={16} className="text-[#3B6FCA]" /> Mi Suscripción
            </h3>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Plan Actual</p>
              <p className="text-lg font-bold text-[#3B6FCA]">Free Beta</p>
            </div>
            <button className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
              Ver Planes <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
