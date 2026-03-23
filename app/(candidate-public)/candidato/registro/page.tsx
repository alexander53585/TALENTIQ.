'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CandidatoRegistroPage() {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${nombre} ${apellido}`.trim(),
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Este email ya está registrado. Intenta iniciar sesión.')
        } else if (signUpError.message.includes('Password')) {
          setError('La contraseña debe tener al menos 6 caracteres.')
        } else {
          setError(signUpError.message)
        }
        return
      }

      setSuccess(true)
    } catch {
      setError('Ocurrió un error inesperado. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F0F3FA] flex flex-col items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-sm shadow-sm text-center">
          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#00A99D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#1E2A45] mb-2">¡Revisa tu email!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Hemos enviado un enlace de verificación a{' '}
            <strong className="text-[#1E2A45]">{email}</strong>. Confirma tu cuenta para poder acceder al portal.
          </p>
          <Link
            href="/candidato/login"
            className="inline-flex items-center justify-center w-full py-2.5 bg-[#3B6FCA] text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    )
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
          Crear cuenta de candidato
        </h1>
        <p className="text-sm text-slate-400 text-center mb-6">
          Regístrate para acceder a tus postulaciones
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-slate-700 mb-1.5">
                Nombre
              </label>
              <input
                id="nombre"
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ana"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B6FCA]/30 focus:border-[#3B6FCA] transition-all"
              />
            </div>
            <div>
              <label htmlFor="apellido" className="block text-sm font-medium text-slate-700 mb-1.5">
                Apellido
              </label>
              <input
                id="apellido"
                type="text"
                required
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="García"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B6FCA]/30 focus:border-[#3B6FCA] transition-all"
              />
            </div>
          </div>
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
              placeholder="ana@email.com"
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B6FCA]/30 focus:border-[#3B6FCA] transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#3B6FCA] text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <Link href="/candidato/login" className="text-[#3B6FCA] hover:underline font-medium">
            Iniciar sesión
          </Link>
        </p>
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
