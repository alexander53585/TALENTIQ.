'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2 } from 'lucide-react'

interface CandidateProfile {
  id: string
  name: string
  email: string
  phone?: string | null
}

export default function CandidatoPerfilPage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      setUserEmail(user.email)

      const { data } = await supabase
        .from('candidates')
        .select('id, name, email, phone')
        .eq('email', user.email)
        .limit(1)
        .maybeSingle()

      if (data) {
        const p = data as CandidateProfile
        setProfile(p)
        setName(p.name ?? '')
        setPhone(p.phone ?? '')
      }
      setLoading(false)
    }

    loadProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('candidates')
        .update({ name, phone: phone || null })
        .eq('email', userEmail)

      if (updateError) {
        setError('No se pudo guardar los cambios. Intenta de nuevo.')
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch {
      setError('Ocurrió un error inesperado.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[#3B6FCA]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A45]">Mi Perfil</h1>
        <p className="text-slate-500 text-sm mt-1">
          Mantén tu información actualizada.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-[#3B6FCA] flex items-center justify-center text-white text-xl font-bold">
            {(name?.[0] ?? userEmail?.[0] ?? 'C').toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-[#1E2A45]">{name || 'Sin nombre'}</p>
            <p className="text-sm text-slate-400">{userEmail}</p>
          </div>
        </div>

        {!profile && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            No encontramos un perfil vinculado a este email. El perfil se actualiza cuando una empresa te registra como candidato.
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-[#00A99D]">
            Cambios guardados correctamente.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Nombre completo
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre completo"
              disabled={!profile}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B6FCA]/30 focus:border-[#3B6FCA] transition-all disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={userEmail}
              readOnly
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">El email no puede modificarse.</p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
              Teléfono
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 55 0000 0000"
              disabled={!profile}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B6FCA]/30 focus:border-[#3B6FCA] transition-all disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          {profile && (
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#3B6FCA] text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" /> Guardando...</>
              ) : (
                <><Save size={14} /> Guardar cambios</>
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
