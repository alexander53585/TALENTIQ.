/**
 * GET /api/invite/[token]
 * Devuelve información pública de una invitación (org, rol, validez).
 * No requiere autenticación — cualquiera con el token puede consultar.
 *
 * POST /api/invite/[token]
 * Acepta la invitación para el usuario autenticado actualmente.
 * Nota: usa la sesión directamente (no getRequestContext) porque el usuario
 * recién registrado aún no tiene membresía.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { toErrorResponse } from '@/lib/moments/errors'

function makeClient(req: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}

/* ── GET — info de la invitación ──────────────────────────────────────────── */
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    if (!token || token.length < 40) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    const response = NextResponse.json({})
    const supabase = makeClient(req, response)
    const { data, error } = await supabase.rpc('get_invitation_info', { p_token: token })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (data?.error) {
      const status = data.error === 'not_found' ? 404 : 410
      return NextResponse.json({ error: data.error, status_text: data.status }, { status })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/* ── POST — aceptar invitación ────────────────────────────────────────────── */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    if (!token || token.length < 40) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    const response = NextResponse.json({})
    const supabase = makeClient(req, response)

    // Verificar sesión activa — no usamos getRequestContext porque el usuario
    // puede no tener membresía todavía (es un invitado recién registrado)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('accept_invitation', {
      p_token: token,
      p_user_id: user.id,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (data?.error) return NextResponse.json({ error: data.error }, { status: 400 })

    return NextResponse.json({ data })
  } catch (err) {
    return toErrorResponse(err)
  }
}
