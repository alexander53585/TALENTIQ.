'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ParticleBackground from '@/components/ui/ParticleBackground'

const C = {
  bg: '#F7F9FC', border: '#D8E1EB', borderLight: '#E8EDF3',
  primary: '#3366FF', primaryLight: '#5580FF',
  primaryGlow: 'rgba(51,102,255,0.15)', primaryDim: 'rgba(51,102,255,0.08)',
  error: '#D94A4A', errorDim: 'rgba(217,74,74,0.08)',
  text: '#182230', textSecondary: '#5B6B7F', textMuted: '#8FA3C0',
  surfaceAlt: '#F1F5F9',
  shadow: '0 1px 3px rgba(24,34,48,0.06)',
  shadowMd: '0 4px 12px rgba(24,34,48,0.07), 0 2px 4px rgba(24,34,48,0.04)',
}
const FF = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

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
        {icon && (
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, color: focused ? C.primary : C.textMuted, transition: 'color 0.2s',
          }}>{icon}</span>
        )}
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box', background: '#fff',
            border: `1.5px solid ${focused ? C.primary : C.border}`,
            boxShadow: focused ? `0 0 0 3px ${C.primaryGlow}` : C.shadow,
            borderRadius: 10, color: C.text, fontFamily: FF, fontSize: 15,
            padding: icon ? '13px 16px 13px 42px' : '13px 16px',
            outline: 'none', transition: 'all 0.2s', lineHeight: 1.5,
          }}
        />
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const getRedirectUrl = () => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/auth/callback`
  }

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(''); setLoading(true)
    try {
      if (!remember) sessionStorage.setItem('ephemeral', 'true')
      else { sessionStorage.removeItem('ephemeral'); localStorage.setItem('rememberUser_v1', email) }

      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError

      // If coming from an invitation, redirect to accept it
      if (inviteToken) {
        router.push(`/invite/${inviteToken}`)
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase()
      if (msg.includes('invalid login') || msg.includes('credentials')) {
        setError('Correo o contraseña incorrectos.')
      } else if (msg.includes('email not confirmed')) {
        setError('Por favor confirma tu correo electrónico antes de entrar.')
      } else if (msg.includes('rate limit')) {
        setError('Demasiados intentos. Por favor espera unos minutos.')
      } else {
        setError(err.message || 'Error al iniciar sesión. Intenta de nuevo.')
      }
    }
    setLoading(false)
  }

  const handleOAuth = async (provider: 'google' | 'linkedin_oidc') => {
    setOauthLoading(provider)
    if (!remember) sessionStorage.setItem('ephemeral', 'true')
    else sessionStorage.removeItem('ephemeral')

    const supabase = createClient()
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: getRedirectUrl() } })
    setOauthLoading(null)
  }

  const btnBase: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    border: `1px solid ${C.border}`, background: '#fff', color: C.text,
    borderRadius: 10, padding: '12px', fontFamily: FF, fontSize: 15,
    fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', marginBottom: 10,
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FF, padding: '40px 0', position: 'relative', overflow: 'hidden' }}>
      <style suppressHydrationWarning>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');*{box-sizing:border-box}::placeholder{color:#8FA3C0}@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <ParticleBackground />

      <div style={{ width: '100%', maxWidth: 420, padding: '0 20px', animation: 'fadeIn 0.5s ease', position: 'relative', zIndex: 1 }}>
        {/* Brand logo */}
        <div style={{ textAlign: 'center', marginBottom: 28, cursor: 'pointer' }} onClick={() => router.push('/')}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
            background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: '#fff', fontWeight: 700,
            boxShadow: `0 6px 20px ${C.primaryGlow}`,
          }}>K</div>
          <div style={{ fontFamily: FF, fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>
            Kultu<span style={{ color: C.primary }}>RH</span>
          </div>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: '30px 28px', boxShadow: C.shadowMd }}>
          <h2 style={{ margin: '0 0 4px', fontFamily: FF, fontSize: 20, fontWeight: 700, color: C.text }}>Inicia sesión</h2>
          <p style={{ fontSize: 14, color: C.textSecondary, margin: '0 0 24px', lineHeight: 1.6 }}>
            Te damos la bienvenida de nuevo a tu plataforma.
          </p>

          <button style={btnBase} disabled={oauthLoading === 'google'} onClick={() => handleOAuth('google')}>
            <GoogleIcon /> Google
          </button>
          <button style={btnBase} disabled={oauthLoading === 'linkedin_oidc'} onClick={() => handleOAuth('linkedin_oidc')}>
            <LinkedInIcon /> LinkedIn
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: C.borderLight }} />
            <div style={{ padding: '0 14px', fontSize: 13, color: C.textMuted, fontFamily: FF }}>O continuar con</div>
            <div style={{ flex: 1, height: 1, background: C.borderLight }} />
          </div>

          {error && (
            <div style={{ background: C.errorDim, border: `1px solid ${C.error}25`, borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 13, color: C.error, fontFamily: FF, lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <AuthInput label="Correo electrónico" type="email" value={email} onChange={setEmail} placeholder="tu@empresa.com" required icon="✉" />
            <AuthInput label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="••••••••" required icon="🔒" />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: FF, fontSize: 13, color: C.textSecondary, userSelect: 'none' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  style={{ accentColor: C.primary, width: 16, height: 16, cursor: 'pointer', margin: 0 }} />
                Mantener sesión activa
              </label>
              <button type="button" onClick={() => router.push('/forgot-password')} style={{ background: 'none', border: 'none', color: C.primary, fontFamily: FF, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ¿Olvidó su clave?
              </button>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: loading ? C.surfaceAlt : `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
              border: 'none', color: loading ? C.textMuted : '#fff',
              borderRadius: 10, padding: '12px', fontFamily: FF, fontSize: 15,
              fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : `0 4px 14px ${C.primaryGlow}`,
              transition: 'all 0.2s', marginBottom: 10,
            }}>
              {loading
                ? <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                : 'Iniciar con email'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.borderLight}` }}>
            <span style={{ fontSize: 14, color: C.textSecondary, fontFamily: FF }}>
              ¿No tienes cuenta?{' '}
              <button onClick={() => router.push('/register')} style={{ background: 'none', border: 'none', color: C.primary, fontFamily: FF, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Regístrate gratis
              </button>
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: C.textMuted, fontFamily: FF, lineHeight: 1.6 }}>
          Tus datos están protegidos con cifrado de extremo a extremo.
        </div>
      </div>
    </div>
  )
}
