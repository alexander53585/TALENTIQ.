/**
 * POST /api/admin/invite
 * Crea invitaciones y envía correos a uno o varios colaboradores.
 *
 * GET /api/admin/invite
 * Lista las invitaciones pendientes/recientes de la organización.
 *
 * Seguridad:
 * - Solo owner/admin pueden invitar
 * - El token se genera en la DB (CSPRNG)
 * - No se puede invitar con rol 'owner'
 */
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getRequestContext } from '@/lib/auth/requestContext'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { toErrorResponse, ForbiddenError, ValidationError } from '@/lib/moments/errors'

const VALID_INVITE_ROLES = ['admin', 'hr_specialist', 'manager', 'employee'] as const
type InviteRole = typeof VALID_INVITE_ROLES[number]

const ROLE_LABELS: Record<InviteRole, string> = {
  admin: 'Administrador',
  hr_specialist: 'Especialista RH',
  manager: 'Manager',
  employee: 'Colaborador',
}

function buildInviteEmail(opts: {
  orgName: string
  inviterEmail: string
  role: InviteRole
  message?: string
  inviteUrl: string
}) {
  const roleName = ROLE_LABELS[opts.role]
  const personalMsg = opts.message
    ? `<p style="background:#F0F4FF;border-left:3px solid #3B6FCA;padding:12px 16px;border-radius:0 8px 8px 0;margin:20px 0;color:#374151;font-style:italic;">"${opts.message}"</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#3B6FCA,#5580FF);padding:32px 40px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:12px;margin-bottom:8px;">
            <div style="width:44px;height:44px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;">K</div>
          </div>
          <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">KultuRH</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;">Portal de Gestión de Talento</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1E2A45;">
            Has sido invitado a unirte
          </h1>
          <p style="margin:0 0 20px;font-size:15px;color:#5B6B7F;line-height:1.6;">
            <strong style="color:#1E2A45;">${opts.orgName}</strong> te invita a colaborar en KultuRH como <strong style="color:#3B6FCA;">${roleName}</strong>.
          </p>

          ${personalMsg}

          <p style="font-size:14px;color:#5B6B7F;margin:0 0 28px;line-height:1.6;">
            Haz clic en el botón para aceptar la invitación y configurar tu cuenta. El enlace expira en <strong>7 días</strong>.
          </p>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 32px;">
            <a href="${opts.inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#3B6FCA,#5580FF);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.01em;box-shadow:0 4px 14px rgba(59,111,202,0.35);">
              Aceptar invitación →
            </a>
          </td></tr></table>

          <!-- Rol info box -->
          <div style="background:#F8FAFF;border:1px solid #E0E8FF;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <div style="font-size:12px;font-weight:700;color:#3B6FCA;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Tu rol asignado</div>
            <div style="font-size:15px;font-weight:600;color:#1E2A45;">${roleName}</div>
            ${opts.role === 'admin' ? '<div style="font-size:12px;color:#5B6B7F;margin-top:4px;">Gestión total del equipo, vacantes y configuración.</div>' : ''}
            ${opts.role === 'hr_specialist' ? '<div style="font-size:12px;color:#5B6B7F;margin-top:4px;">Gestión de selección, candidatos y competencias.</div>' : ''}
            ${opts.role === 'manager' ? '<div style="font-size:12px;color:#5B6B7F;margin-top:4px;">Evaluación y seguimiento de tu equipo.</div>' : ''}
            ${opts.role === 'employee' ? '<div style="font-size:12px;color:#5B6B7F;margin-top:4px;">Colaborador del equipo con acceso a tu perfil y evaluaciones.</div>' : ''}
          </div>

          <p style="font-size:13px;color:#8FA3C0;line-height:1.6;margin:0;">
            Si no esperabas esta invitación, puedes ignorar este correo con seguridad.<br>
            Enviado por: <strong style="color:#5B6B7F;">${opts.inviterEmail}</strong>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F7F9FC;border-top:1px solid #E8EDF3;padding:20px 40px;text-align:center;">
          <div style="font-size:12px;color:#8FA3C0;">© KultuRH · Portal de Gestión de Talento Humano</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/* ── POST — crear invitaciones ─────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const { orgId, role: callerRole, userId } = await getRequestContext()

    if (!['owner', 'admin'].includes(callerRole)) {
      throw new ForbiddenError('Solo owner o admin pueden invitar miembros')
    }

    const body = await req.json().catch(() => null)
    if (!body?.emails || !Array.isArray(body.emails) || body.emails.length === 0) {
      throw new ValidationError('Se requiere al menos un correo electrónico')
    }
    if (!body?.role || !VALID_INVITE_ROLES.includes(body.role)) {
      throw new ValidationError(`Rol inválido. Opciones: ${VALID_INVITE_ROLES.join(', ')}`)
    }

    const emails: string[] = ([...new Set(body.emails.map((e: string) => e.trim().toLowerCase()))] as string[]).filter(Boolean)
    const role = body.role as InviteRole
    const message: string | undefined = body.message?.trim() || undefined

    if (emails.length > 20) {
      throw new ValidationError('Máximo 20 invitaciones por envío')
    }

    const supabase = await createClient()
    const service = createServiceClient()

    // Obtener info de la org y del invitador
    const [{ data: org }, { data: { user } }] = await Promise.all([
      supabase.from('organizations').select('name').eq('id', orgId).single(),
      supabase.auth.getUser(),
    ])

    const orgName = org?.name || 'tu organización'
    const inviterEmail = user?.email || 'tu equipo'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || ''

    // Verificar miembros ya existentes para esta org
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('email, id')
      .in('email', emails)

    const existingMemberEmails = new Set<string>()
    if (existingProfiles && existingProfiles.length > 0) {
      const existingUserIds = existingProfiles.map(p => p.id)
      const { data: existingMemberships } = await service
        .from('user_memberships')
        .select('user_id')
        .eq('organization_id', orgId)
        .in('user_id', existingUserIds)
        .eq('is_active', true)

      existingMemberships?.forEach(m => {
        const profile = existingProfiles.find(p => p.id === m.user_id)
        if (profile) existingMemberEmails.add(profile.email.toLowerCase())
      })
    }

    const results: Array<{ email: string; status: 'sent' | 'already_member' | 'resent' | 'error'; message?: string }> = []
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

    for (const email of emails) {
      // Skip existing active members
      if (existingMemberEmails.has(email)) {
        results.push({ email, status: 'already_member', message: 'Ya es miembro activo' })
        continue
      }

      try {
        // Verificar si ya existe una invitación pendiente → cancelarla para reenviar
        const { data: existingInvite } = await service
          .from('invitations')
          .select('id')
          .eq('organization_id', orgId)
          .eq('email', email)
          .eq('status', 'pending')
          .maybeSingle()

        let token: string

        if (existingInvite) {
          // Renovar invitación existente con nuevo token y fecha
          const { data: updated } = await service
            .from('invitations')
            .update({
              role,
              message,
              invited_by: userId,
              token: undefined, // Let DB regenerate via trigger alternative — just update expires_at
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', existingInvite.id)
            .select('token')
            .single()
          token = updated!.token
        } else {
          // Crear nueva invitación
          const { data: invite, error: insertError } = await service
            .from('invitations')
            .insert({
              organization_id: orgId,
              email,
              role,
              message,
              invited_by: userId,
            })
            .select('token')
            .single()

          if (insertError) throw new Error(insertError.message)
          token = invite!.token
        }

        const inviteUrl = `${appUrl}/invite/${token}`

        // Enviar email
        if (resend) {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'KultuRH <noreply@kulturh.app>',
            to: email,
            subject: `${orgName} te invita a unirte a KultuRH`,
            html: buildInviteEmail({ orgName, inviterEmail, role, message, inviteUrl }),
          })
        } else {
          // Sin proveedor de email configurado — registrar en consola para desarrollo
          console.log(`[INVITE] URL de invitación para ${email}: ${inviteUrl}`)
        }

        results.push({ email, status: existingInvite ? 'resent' : 'sent' })
      } catch (err: any) {
        results.push({ email, status: 'error', message: err.message })
      }
    }

    return NextResponse.json({ data: results })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/* ── GET — listar invitaciones de la organización ─────────────────────────── */
export async function GET() {
  try {
    const { orgId, role } = await getRequestContext()

    if (!['owner', 'admin'].includes(role)) {
      throw new ForbiddenError('Solo owner o admin pueden ver invitaciones')
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('invitations')
      .select('id, email, role, status, expires_at, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}
