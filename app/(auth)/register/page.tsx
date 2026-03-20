'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ParticleBackground from '@/components/ui/ParticleBackground'

const C = {
  bg: '#F7F9FC', border: '#D8E1EB', borderLight: '#E8EDF3',
  primary: '#3366FF', primaryLight: '#5580FF',
  primaryGlow: 'rgba(51,102,255,0.15)',
  error: '#D94A4A', errorDim: 'rgba(217,74,74,0.08)',
  success: '#18A873', successDim: 'rgba(24,168,115,0.08)',
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
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: focused ? C.primary : C.textMuted, transition: 'color 0.2s' }}>{icon}</span>
        )}
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box', background: '#fff',
            border: `1.5px solid ${focused ? C.primary : C.border}`,
            boxShadow: focused ? `0 0 0 3px rgba(51,102,255,0.15)` : C.shadow,
            borderRadius: 10, color: C.text, fontFamily: FF, fontSize: 15,
            padding: icon ? '13px 16px 13px 42px' : '13px 16px',
            outline: 'none', transition: 'all 0.2s', lineHeight: 1.5,
          }}
        />
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const getRedirectUrl = () => {
    if (typeof window === 'undefined') return ''
    return window.location.origin
  }

  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== confirmPass) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signUp({
        email, password, options: { emailRedirectTo: getRedirectUrl() }
      })
      if (authError) throw authError
      if (data.user?.identities?.length === 0) {
        setError('Este correo ya está registrado. Intenta iniciar sesión.')
        setLoading(false); return
      }
      setSuccess(true)
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase()
      if (msg.includes('already registered') || msg.includes('already')) setError('Este correo ya está registrado. Intenta iniciar sesión.')
      else if (msg.includes('password')) setError('La contraseña es muy débil. Debe tener al menos 6 caracteres.')
      else if (msg.includes('rate limit')) setError('Se ha excedido el límite de registros. Intenta de nuevo en unos minutos.')
      else if (msg.includes('invalid') && msg.includes('email')) setError('El correo electrónico no es válido o su dominio está restringido.')
      else setError(err.message || 'Error al crear la cuenta. Intenta de nuevo.')
    }
    setLoading(false)
  }

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setOauthLoading(provider)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: getRedirectUrl() } })
    setOauthLoading(null)
  }

  const KEYFRAMES = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');*{box-sizing:border-box}::placeholder{color:#8FA3C0}@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FF }}>
        <style>{KEYFRAMES}</style>
        <div style={{ maxWidth: 440, padding: '0 20px', textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 24px', background: C.successDim, border: `2px solid ${C.success}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✓</div>
          <h2 style={{ fontFamily: FF, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Verifica tu correo</h2>
          <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.8, marginBottom: 28 }}>
            Hemos enviado un enlace a <strong style={{ color: C.primary }}>{email}</strong>.
            Si no confirmas tu correo, se mostrará un error al intentar configurar tu empresa.
          </p>
          <button onClick={() => router.push('/login')} style={{ width: '100%', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`, border: 'none', color: '#fff', borderRadius: 10, padding: '12px', fontFamily: FF, fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 14px ${C.primaryGlow}` }}>
            Ya lo confirmé, Iniciar Sesión →
          </button>
        </div>
      </div>
    )
  }

  const btnSecondary: React.CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: `1px solid ${C.border}`, background: '#fff', color: C.text, borderRadius: 10, padding: '12px', fontFamily: FF, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', marginBottom: 10 }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FF, padding: '40px 0', position: 'relative', overflow: 'hidden' }}>
      <style>{KEYFRAMES}</style>
      <ParticleBackground />
      <div style={{ width: '100%', maxWidth: 420, padding: '0 20px', animation: 'fadeIn 0.5s ease', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 28, cursor: 'pointer' }} onClick={() => router.push('/login')}>
          <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', fontWeight: 700, boxShadow: `0 6px 20px ${C.primaryGlow}` }}>K</div>
          <div style={{ fontFamily: FF, fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Kultu<span style={{ color: C.primary }}>RH</span></div>
          <div style={{ fontSize: 13, color: C.textMuted, fontFamily: FF, marginTop: 4 }}>Crea tu cuenta gratis</div>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: '28px 28px', boxShadow: C.shadowMd }}>
          <button style={btnSecondary} disabled={!!oauthLoading} onClick={() => handleOAuth('google')}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Registro con Google
          </button>
          <button style={btnSecondary} disabled={!!oauthLoading} onClick={() => handleOAuth('facebook')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" /></svg>
            Registro con Facebook
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: C.borderLight }} />
            <div style={{ padding: '0 14px', fontSize: 13, color: C.textMuted, fontFamily: FF }}>O continuar con</div>
            <div style={{ flex: 1, height: 1, background: C.borderLight }} />
          </div>

          {error && <div style={{ background: C.errorDim, border: `1px solid ${C.error}25`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: C.error, fontFamily: FF, lineHeight: 1.5 }}>{error}</div>}

          <form onSubmit={handleRegister}>
            <AuthInput label="Correo electrónico laboral" type="email" value={email} onChange={setEmail} placeholder="tu@empresa.com" required icon="✉" />
            <AuthInput label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" required icon="🔒" />
            <AuthInput label="Confirmar contraseña" type="password" value={confirmPass} onChange={setConfirmPass} placeholder="Repite la contraseña" required icon="🔒" />
            <div style={{ marginTop: 10 }}>
              <button type="submit" disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: loading ? C.surfaceAlt : `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`, border: 'none', color: loading ? C.textMuted : '#fff', borderRadius: 10, padding: '12px', fontFamily: FF, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : `0 4px 14px ${C.primaryGlow}`, transition: 'all 0.2s', marginBottom: 10 }}>
                {loading ? <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> : 'Continuar con Email'}
              </button>
            </div>
          </form>

          <div style={{ textAlign: 'center', marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.borderLight}` }}>
            <span style={{ fontSize: 14, color: C.textSecondary, fontFamily: FF }}>
              ¿Ya tienes cuenta?{' '}
              <button onClick={() => router.push('/login')} style={{ background: 'none', border: 'none', color: C.primary, fontFamily: FF, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Inicia sesión</button>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
