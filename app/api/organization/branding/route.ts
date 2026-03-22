/**
 * GET  /api/organization/branding  — devuelve nombre, plan y logo_url de la org activa
 * PUT  /api/organization/branding  — actualiza logo_url (solo owner/admin)
 *
 * Seguridad:
 *   - organization_id siempre del contexto de sesión (nunca del body/URL)
 *   - PUT restringido a roles owner/admin
 *   - logo_url validado: null o URL https:// de máx 1000 caracteres
 *     (la restricción CHECK en DB actúa como segunda capa)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getRequestContext }         from '@/lib/auth/requestContext'
import { ForbiddenError, ValidationError, NotFoundError, toErrorResponse } from '@/lib/moments/errors'

// ── Validación ────────────────────────────────────────────────────────

function validateLogoUrl(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value !== 'string') {
    throw new ValidationError('"logo_url" debe ser texto o null', 'logo_url')
  }

  const trimmed = value.trim()
  if (trimmed === '') return null

  if (!trimmed.startsWith('https://')) {
    throw new ValidationError('"logo_url" debe comenzar con https://', 'logo_url')
  }

  if (trimmed.length > 1000) {
    throw new ValidationError('"logo_url" no puede superar 1000 caracteres', 'logo_url')
  }

  // Bloquear data URIs y javascript: aunque vengan disfrazados
  const lower = trimmed.toLowerCase()
  if (lower.includes('javascript:') || lower.includes('data:')) {
    throw new ValidationError('"logo_url" contiene un protocolo no permitido', 'logo_url')
  }

  return trimmed
}

// ── GET ───────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const { orgId } = await getRequestContext()
    const supabase  = await createClient()

    const { data: org, error } = await supabase
      .from('organizations')
      .select('name, plan, logo_url')
      .eq('id', orgId)
      .maybeSingle()

    if (error || !org) {
      throw new NotFoundError('Organización no encontrada')
    }

    return NextResponse.json({ data: org })

  } catch (err) {
    return toErrorResponse(err)
  }
}

// ── PUT ───────────────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const { orgId, role } = await getRequestContext()

    if (role !== 'owner' && role !== 'admin') {
      throw new ForbiddenError('Solo owner o admin pueden actualizar el branding')
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new ValidationError('El cuerpo de la solicitud debe ser JSON')
    }

    const logo_url = validateLogoUrl((body as Record<string, unknown>).logo_url)

    const supabase = await createClient()

    const { data: updated, error } = await supabase
      .from('organizations')
      .update({ logo_url })
      .eq('id', orgId)
      .select('name, plan, logo_url')
      .single()

    if (error) throw error

    return NextResponse.json({ data: updated })

  } catch (err) {
    return toErrorResponse(err)
  }
}
