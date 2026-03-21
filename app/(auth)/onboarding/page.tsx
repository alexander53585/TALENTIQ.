'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const C = {
  bg: '#F7F9FC', border: '#D8E1EB', borderLight: '#E8EDF3',
  primary: '#3366FF', primaryLight: '#5580FF',
  primaryGlow: 'rgba(51,102,255,0.15)',
  error: '#D94A4A', errorDim: 'rgba(217,74,74,0.08)',
  text: '#182230', textSecondary: '#5B6B7F', textMuted: '#8FA3C0',
  surfaceAlt: '#F1F5F9',
  shadow: '0 1px 3px rgba(24,34,48,0.06)',
  shadowMd: '0 4px 12px rgba(24,34,48,0.07), 0 2px 4px rgba(24,34,48,0.04)',
}
const FF = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const KEYFRAMES = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');*{box-sizing:border-box}::placeholder{color:#8FA3C0}@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`

const SECTORS = [
  'Tecnología', 'Salud', 'Finanzas y Banca', 'Manufactura',
  'Retail y Comercio', 'Educación', 'Consultoría', 'Gobierno', 'Otros',
]

function AuthInput({ label, value, onChange, placeholder, required, icon }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder: string; required?: boolean; icon?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontSize: 13, color: C.text, fontFamily: FF, fontWeight: 600, display: 'block', marginBottom: 6 }}>
        {label}{required && <span style={{ color: C.error, marginLeft: 2 }}> *</span>}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: focused ? C.primary : C.textMuted, transition: 'color 0.2s' }}>{icon}</span>}
        <input
          type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width: '100%', boxSizing: 'border-box', background: '#fff', border: `1.5px solid ${focused ? C.primary : C.border}`, boxShadow: focused ? `0 0 0 3px ${C.primaryGlow}` : C.shadow, borderRadius: 10, color: C.text, fontFamily: FF, fontSize: 15, padding: icon ? '13px 16px 13px 42px' : '13px 16px', outline: 'none', transition: 'all 0.2s', lineHeight: 1.5 }}
        />
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [sector, setSector] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  // Si el usuario ya tiene membresía activa, llevarlo directo al dashboard
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setChecking(false); return }
      supabase
        .from('user_memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) router.replace('/dashboard')
          else setChecking(false)
        })
    })
  }, [router])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, sector }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear la empresa')

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      console.error("Onboarding Error:", err)
      setError(err.message || 'Error al guardar. Intenta de nuevo.')
    }
    setLoading(false)
  }

  const handleSkip = () => {
    // Guardar flag en cookie para que el middleware lo permita pasar
    document.cookie = 'onboarding_skip=1; path=/; max-age=86400; SameSite=Lax'
    router.push('/dashboard')
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{KEYFRAMES}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FF, padding: '40px 0' }}>
      <style>{KEYFRAMES}</style>
      <div style={{ width: '100%', maxWidth: 440, padding: '0 20px', animation: 'fadeIn 0.5s ease' }}>
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: '34px 30px', boxShadow: C.shadowMd, textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', fontWeight: 700, boxShadow: `0 6px 20px ${C.primaryGlow}` }}>👋</div>
          <h2 style={{ margin: '0 0 8px', fontFamily: FF, fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>¡Te damos la bienvenida!</h2>
          <p style={{ fontSize: 15, color: C.textSecondary, margin: '0 0 28px', lineHeight: 1.6 }}>
            Solo necesitamos un par de datos para personalizar tu espacio de trabajo.
          </p>

          {error && (
            <div style={{ background: C.errorDim, border: `1px solid ${C.error}25`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: C.error, fontFamily: FF, lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            <AuthInput label="¿Cómo se llama tu empresa?" value={companyName} onChange={setCompanyName} placeholder="Ej. Grupo Empresarial XYZ" required icon="🏢" />

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: C.text, fontFamily: FF, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                ¿A qué sector pertenece? <span style={{ color: C.error }}>*</span>
              </label>
              <select value={sector} onChange={e => setSector(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box', background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 10, color: sector ? C.text : C.textMuted, fontFamily: FF, fontSize: 15, padding: '13px 16px', outline: 'none', cursor: 'pointer', appearance: 'none', boxShadow: C.shadow, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235B6B7F' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
                <option value="">— Seleccionar sector —</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: loading ? C.surfaceAlt : `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`, border: 'none', color: loading ? C.textMuted : '#fff', borderRadius: 10, padding: '12px', fontFamily: FF, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : `0 4px 14px ${C.primaryGlow}`, transition: 'all 0.2s', marginBottom: 12 }}>
              {loading ? <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> : 'Finalizar configuración →'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleSkip}
            style={{ width: '100%', background: 'none', border: 'none', color: C.textMuted, fontFamily: FF, fontSize: 13, cursor: 'pointer', padding: '8px', borderRadius: 8, transition: 'color 0.2s' }}
            onMouseOver={e => (e.currentTarget.style.color = C.textSecondary)}
            onMouseOut={e => (e.currentTarget.style.color = C.textMuted)}
          >
            Configurar más tarde →
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: C.textMuted, fontFamily: FF, marginTop: 16, lineHeight: 1.6 }}>
          Si fuiste invitado por tu empresa, solicita al administrador que te agregue directamente.
        </p>
      </div>
    </div>
  )
}
