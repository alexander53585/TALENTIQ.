'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const C = {
  bg: '#F7F9FC', border: '#D8E1EB',
  primary: '#3B6FCA', primaryLight: '#5580FF',
  primaryGlow: 'rgba(59,111,202,0.18)',
  text: '#1E2A45', textSecondary: '#5B6B7F', textMuted: '#8FA3C0',
  error: '#D94A4A', errorDim: 'rgba(217,74,74,0.08)',
  success: '#18A873', successDim: 'rgba(24,168,115,0.08)',
  surface: '#ffffff',
  shadowMd: '0 4px 24px rgba(0,0,0,0.07)',
}
const FF = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  hr_specialist: 'Especialista RH',
  manager: 'Manager',
  employee: 'Colaborador',
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#3B6FCA',
  hr_specialist: '#18A873',
  manager: '#F59E0B',
  employee: '#6B7280',
}

type InviteInfo = {
  valid: boolean
  email: string
  role: string
  organization_name: string
  message?: string
  expires_at: string
}

type Phase = 'loading' | 'valid' | 'accepted' | 'already_member' | 'error' | 'wrong_account'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('loading')
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!token || token.length < 40) { setPhase('error'); setErrorMsg('Token inválido'); return }
    loadInvite()
  }, [token])

  async function loadInvite() {
    setPhase('loading')
    try {
      // 1. Fetch invitation info
      const res = await fetch(`/api/invite/${token}`)
      const json = await res.json()

      if (!res.ok || json.error) {
        const errMap: Record<string, string> = {
          not_found: 'Este enlace de invitación no existe.',
          expired: 'Esta invitación ha expirado.',
          already_used: 'Esta invitación ya fue utilizada.',
        }
        setErrorMsg(errMap[json.error] || 'El enlace de invitación no es válido.')
        setPhase('error')
        return
      }

      const info: InviteInfo = json.data
      setInvite(info)

      // 2. Check if user is logged in
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setCurrentUserEmail(user.email ?? null)
        // Check email match
        if (user.email?.toLowerCase() !== info.email.toLowerCase()) {
          setPhase('wrong_account')
          return
        }
        // Auto-accept if logged in and email matches
        await acceptInvite()
        return
      }

      setPhase('valid')
    } catch {
      setErrorMsg('No se pudo cargar la invitación. Intenta de nuevo.')
      setPhase('error')
    }
  }

  async function acceptInvite() {
    setAccepting(true)
    try {
      const res = await fetch(`/api/invite/${token}`, { method: 'POST' })
      const json = await res.json()

      if (res.status === 401) {
        setPhase('valid')
        setAccepting(false)
        return
      }
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Error al aceptar')
      }

      if (json.data?.already_member) {
        setPhase('already_member')
      } else {
        setPhase('accepted')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al aceptar la invitación')
      setPhase('error')
    }
    setAccepting(false)
  }

  const goRegister = () => {
    if (!invite) return
    const params = new URLSearchParams({ invite: token, email: invite.email })
    router.push(`/register?${params}`)
  }

  const goLogin = () => {
    const params = new URLSearchParams({ invite: token })
    router.push(`/login?${params}`)
  }

  const goDashboard = () => router.push('/dashboard')

  /* ── Renders ─────────────────────────────────────────────────────────── */

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: FF, padding: '32px 20px',
    }}>
      <style suppressHydrationWarning>{`*{box-sizing:border-box}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{
        width: '100%', maxWidth: 480,
        background: C.surface, borderRadius: 20,
        border: `1px solid ${C.border}`,
        boxShadow: C.shadowMd, overflow: 'hidden',
        animation: 'fadeUp 0.4s ease',
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
          padding: '28px 32px', textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, margin: '0 auto 10px',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff',
          }}>K</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Kultu<span style={{ opacity: 0.85 }}>RH</span>
          </div>
        </div>
        {/* Body */}
        <div style={{ padding: '32px' }}>{children}</div>
      </div>
    </div>
  )

  if (phase === 'loading') {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${C.primary}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <style suppressHydrationWarning>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: C.textSecondary, fontSize: 15 }}>Verificando invitación...</p>
        </div>
      </Card>
    )
  }

  if (phase === 'error') {
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 12px' }}>
            Invitación no válida
          </h2>
          <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, margin: '0 0 28px' }}>
            {errorMsg}
          </p>
          <button onClick={() => router.push('/login')}
            style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Ir al inicio de sesión
          </button>
        </div>
      </Card>
    )
  }

  if (phase === 'wrong_account') {
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔄</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 12px' }}>
            Cuenta diferente
          </h2>
          <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, margin: '0 0 8px' }}>
            Esta invitación es para <strong style={{ color: C.primary }}>{invite?.email}</strong>.
          </p>
          <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, margin: '0 0 28px' }}>
            Actualmente has iniciado sesión con <strong>{currentUserEmail}</strong>. Cierra sesión e inicia con el correo correcto.
          </p>
          <button onClick={goLogin}
            style={{ width: '100%', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`, color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>
            Cambiar cuenta
          </button>
          <button onClick={goDashboard}
            style={{ width: '100%', background: 'transparent', color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px', fontSize: 14, cursor: 'pointer' }}>
            Ir a mi panel
          </button>
        </div>
      </Card>
    )
  }

  if (phase === 'accepted' || phase === 'already_member') {
    const isAlready = phase === 'already_member'
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.successDim, border: `2px solid ${C.success}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px' }}>✓</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>
            {isAlready ? '¡Ya eres miembro!' : '¡Bienvenido al equipo!'}
          </h2>
          <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, margin: '0 0 8px' }}>
            {isAlready
              ? `Ya tienes acceso a ${invite?.organization_name}.`
              : `Te has unido a ${invite?.organization_name} como `}
            {!isAlready && <strong style={{ color: C.primary }}>{ROLE_LABELS[invite?.role || ''] || invite?.role}</strong>}
            {!isAlready && '.'}
          </p>
          <button onClick={goDashboard}
            style={{ width: '100%', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`, color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 24, boxShadow: `0 4px 14px ${C.primaryGlow}` }}>
            Ir a mi panel →
          </button>
        </div>
      </Card>
    )
  }

  // phase === 'valid' — not logged in
  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 8px', lineHeight: 1.3 }}>
          Invitación a<br />
          <span style={{ color: C.primary }}>{invite?.organization_name}</span>
        </h2>
        <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, margin: '4px 0 0' }}>
          Has sido invitado a colaborar como
        </p>
      </div>

      {/* Role badge */}
      <div style={{
        background: '#F8FAFF', border: '1px solid #E0E8FF',
        borderRadius: 12, padding: '14px 20px', marginBottom: 20, textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block', background: `${ROLE_COLORS[invite?.role || '']}18`,
          color: ROLE_COLORS[invite?.role || ''] || C.primary,
          borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700,
          border: `1px solid ${ROLE_COLORS[invite?.role || '']}30`,
          marginBottom: 4,
        }}>
          {ROLE_LABELS[invite?.role || ''] || invite?.role}
        </div>
        <div style={{ fontSize: 12, color: C.textMuted }}>
          Correo: {invite?.email}
        </div>
      </div>

      {/* Personal message */}
      {invite?.message && (
        <div style={{
          background: '#F0F4FF', borderLeft: `3px solid ${C.primary}`,
          borderRadius: '0 8px 8px 0', padding: '12px 16px',
          marginBottom: 20, fontSize: 14, color: C.textSecondary,
          fontStyle: 'italic', lineHeight: 1.6,
        }}>
          "{invite.message}"
        </div>
      )}

      {/* CTA buttons */}
      <button onClick={goRegister}
        style={{
          width: '100%', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
          color: '#fff', border: 'none', borderRadius: 10, padding: '14px',
          fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10,
          boxShadow: `0 4px 14px ${C.primaryGlow}`,
        }}>
        Crear cuenta y aceptar →
      </button>
      <button onClick={goLogin}
        style={{
          width: '100%', background: 'transparent', color: C.primary,
          border: `1.5px solid ${C.primary}30`, borderRadius: 10, padding: '13px',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
        Ya tengo cuenta — Iniciar sesión
      </button>

      <p style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 16 }}>
        Esta invitación expira el {invite ? new Date(invite.expires_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
      </p>
    </Card>
  )
}
