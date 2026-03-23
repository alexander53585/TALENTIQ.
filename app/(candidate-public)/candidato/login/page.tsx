'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CandidatoLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError('Email o contraseña incorrectos. Verifica tus datos e intenta de nuevo.')
        return
      }

      router.push('/candidato')
      router.refresh()
    } catch {
      setError('Ocurrió un error inesperado. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F3FA] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-[#3B6FCA] flex items-center justify-center shadow-md">
          <span className="text-white font-bold">K</span>
        </div>
        <div>
          <p className="font-bold text-[#1E2A45] leading-none">KultuRH</p>
          <span className="text-[10px] bg-[#00A99D] text-white px-1.5 py-0.5 rounded-full font-medium">
            Portal Candidato
          </span>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-sm shadow-sm">
        <h1 className="text-xl font-bold text-[#1E2A45] mb-1 text-center">
          Accede a tu portal
        </h1>
        <p className="text-sm text-slate-400 text-center mb-6">
          Ingresa con tus credenciales de candidato
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B6FCA]/30 focus:border-[#3B6FCA] transition-all"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B6FCA]/30 focus:border-[#3B6FCA] transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#3B6FCA] text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-5 space-y-2 text-center text-sm">
          <p className="text-slate-400">
            ¿No tienes cuenta?{' '}
            <Link href="/candidato/registro" className="text-[#3B6FCA] hover:underline font-medium">
              Regístrate aquí
            </Link>
          </p>
          <p className="text-slate-400">
            <Link href="/vacantes" className="text-[#00A99D] hover:underline">
              Postularse a una vacante
            </Link>
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-400">
        ¿Eres empresa?{' '}
        <Link href="/login" className="text-[#3B6FCA] hover:underline font-medium">
          Iniciar sesión aquí
        </Link>
      </p>
    </div>
  )
}
