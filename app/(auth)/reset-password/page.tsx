'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
const KEYFRAMES = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');*{box-sizing:border-box}::placeholder{color:#8FA3C0}@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`

function AuthInput({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder: string; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontSize: 13, color: C.text, fontFamily: FF, fontWeight: 600, display: 'block', marginBottom: 6 }}>
        {label}{required && <span style={{ color: C.error, marginLeft: 2 }}> *</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: focused ? C.primary : C.textMuted, transition: 'color 0.2s' }}>🔒</span>
        <input
          type="password" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width: '100%', boxSizing: 'border-box', background: '#fff', border: `1.5px solid ${focused ? C.primary : C.border}`, boxShadow: focused ? `0 0 0 3px ${C.primaryGlow}` : C.shadow, borderRadius: 10, color: C.text, fontFamily: FF, fontSize: 15, padding: '13px 16px 13px 42px', outline: 'none', transition: 'all 0.2s', lineHeight: 1.5 }}
        />
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FF }}>
      <style>{KEYFRAMES}</style>
      <div style={{ width: '100%', maxWidth: 440, padding: '0 20px', animation: 'fadeIn 0.5s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', fontWeight: 700, boxShadow: `0 6px 20px ${C.primaryGlow}` }}>K</div>
          <div style={{ fontFamily: FF, fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Kultu<span style={{ color: C.primary }}>RH</span></div>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: '28px 28px', boxShadow: C.shadowMd }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 18px', background: C.successDim, border: `2px solid ${C.success}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✓</div>
              <h2 style={{ fontFamily: FF, fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 8 }}>Contraseña actualizada</h2>
              <p style={{ fontSize: 14, color: C.textSecondary, fontFamily: FF }}>Redirigiendo al dashboard...</p>
            </div>
          ) : (
            <>
              <h2 style={{ margin: '0 0 4px', fontFamily: FF, fontSize: 20, fontWeight: 700, color: C.text }}>Nueva contraseña</h2>
              <p style={{ fontSize: 14, color: C.textSecondary, margin: '0 0 22px', lineHeight: 1.6 }}>Elige una contraseña segura para tu cuenta</p>

              {error && <div style={{ background: C.errorDim, border: `1px solid ${C.error}25`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: C.error, fontFamily: FF }}>{error}</div>}

              <form onSubmit={handleSubmit}>
                <AuthInput label="Nueva contraseña" value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" required />
                <AuthInput label="Confirmar contraseña" value={confirm} onChange={setConfirm} placeholder="Repite la contraseña" required />
                <button type="submit" disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: loading ? C.surfaceAlt : `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`, border: 'none', color: loading ? C.textMuted : '#fff', borderRadius: 10, padding: '12px', fontFamily: FF, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : `0 4px 14px ${C.primaryGlow}`, transition: 'all 0.2s' }}>
                  {loading ? <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> : 'Guardar nueva contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
