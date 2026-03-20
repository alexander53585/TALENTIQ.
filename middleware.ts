import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protect all company routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/company')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check active membership
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('id, organization_id, role, is_active, valid_until')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .or('valid_until.is.null,valid_until.gt.' + new Date().toISOString())
      .limit(1)
      .single()

    if (!membership) {
      // Si eligió "configurar más tarde", dejarlo pasar
      const skipCookie = request.cookies.get('onboarding_skip')?.value
      if (!skipCookie) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  }

  // Redirigir al onboarding si ya autenticado pero sin membresía intenta acceder a auth pages
  if ((pathname === '/login' || pathname === '/register' || pathname === '/forgot-password') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Onboarding accesible solo con sesión activa
  if (pathname === '/onboarding' && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Reset-password requiere sesión activa (viene del callback de recuperación)
  if (pathname === '/reset-password' && !user) {
    return NextResponse.redirect(new URL('/forgot-password', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health|auth/callback).*)',
  ],
}
