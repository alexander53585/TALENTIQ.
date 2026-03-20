'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const C = {
  bg: '#F7F9FC', border: '#D8E1EB', borderLight: '#E8EDF3',
  primary: '#3366FF', primaryLight: '#5580FF',
  primaryGlow: 'rgba(51,102,255,0.15)', primaryDim: 'rgba(51,102,255,0.08)',
  error: '#D94A4A', errorDim: 'rgba(217,74,74,0.08)',
  success: '#18A873', successDim: 'rgba(24,168,115,0.08)',
  text: '#182230', textSecondary: '#5B6B7F', textMuted: '#8FA3C0',
  surfaceAlt: '#F1F5F9',
  shadow: '0 1px 3px rgba(24,34,48,0.06)',
  shadowMd: '0 4px 12px rgba(24,34,48,0.07), 0 2px 4px rgba(24,34,48,0.04)',
}
const FF = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const KEYFRAMES = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');*{box-sizing:border-box}::placeholder{color:#8FA3C0}@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`

function AuthInput({ label, type, value, onChange, placeholder, required, icon }: {
  label: string; type: string; value: string
  onChange: (v: string) => void; placeholder: string
  required?: boolean; icon?: string
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
          type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width: '100%', boxSizing: 'border-box', background: '#fff', border: `1.5px solid ${focused ? C.primary : C.border}`, boxShadow: focused ? `0 0 0 3px ${C.primaryGlow}` : C.shadow, borderRadius: 10, color: C.text, fontFamily: FF, fontSize: 15, padding: icon ? '13px 16px 13px 42px' : '13px 16px', outline: 'none', transition: 'all 0.2s', lineHeight: 1.5 }}
        />
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const getRedirectUrl = () => {
    if (typeof window === 'undefined') return ''
    return window.location.origin
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(''); setLoading(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: getRedirectUrl() })
      if (err) throw err
      setSent(true)
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase()
      if (msg.includes('rate limit')) setError('Has excedido el límite de correos. Espera unos minutos e intenta de nuevo.')
      else setError('No pudimos enviar el correo. Verifica el email.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FF }}>
      <style>{KEYFRAMES}</style>
      <div style={{ width: '100%', maxWidth: 440, padding: '0 20px', animation: 'fadeIn 0.5s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 28, cursor: 'pointer' }} onClick={() => router.push('/login')}>
          <div style={{ width: 48, height: 48, borderRadius: 12, margin: '0 auto 12px', background: C.primaryDim, border: `1px solid ${C.primary}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: C.primary, transition: 'transform 0.2s' }}
            onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.08)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}>🔑</div>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: '28px 28px', boxShadow: C.shadowMd }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 18px', background: C.successDim, border: `2px solid ${C.success}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✓</div>
              <h2 style={{ fontFamily: FF, fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 10 }}>Correo enviado</h2>
              <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, marginBottom: 22 }}>
                Si el correo <strong>{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña.
              </p>
              <button onClick={() => router.push('/login')} style={{ width: '100%', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`, border: 'none', color: '#fff', borderRadius: 10, padding: '12px', fontFamily: FF, fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 14px ${C.primaryGlow}` }}>
                Volver a iniciar sesión
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ margin: '0 0 4px', fontFamily: FF, fontSize: 20, fontWeight: 700, color: C.text }}>Recuperar contraseña</h2>
              <p style={{ fontSize: 14, color: C.textSecondary, margin: '0 0 22px', lineHeight: 1.6 }}>
                Te enviaremos un enlace seguro para restablecer tu acceso
              </p>
              {error && <div style={{ background: C.errorDim, border: `1px solid ${C.error}25`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: C.error, fontFamily: FF }}>{error}</div>}
              <form onSubmit={handleSubmit}>
                <AuthInput label="Correo electrónico" type="email" value={email} onChange={setEmail} placeholder="tu@empresa.com" required icon="✉" />
                <button type="submit" disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: loading ? C.surfaceAlt : `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`, border: 'none', color: loading ? C.textMuted : '#fff', borderRadius: 10, padding: '12px', fontFamily: FF, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : `0 4px 14px ${C.primaryGlow}`, transition: 'all 0.2s', marginBottom: 10 }}>
                  {loading ? <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> : 'Enviar enlace de recuperación'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 18 }}>
                <button onClick={() => router.push('/login')} style={{ background: 'none', border: 'none', color: C.primary, fontFamily: FF, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Volver a iniciar sesión</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
