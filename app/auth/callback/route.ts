import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  // Default redirect
  let redirectTo = new URL(next, origin)

  // Recovery type always goes to reset-password page
  if (type === 'recovery') {
    redirectTo = new URL('/reset-password', origin)
  }

  const response = NextResponse.redirect(redirectTo)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  if (code) {
    // OAuth and magic link code exchange
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL('/login?error=auth_callback', origin))
    }
  } else if (token_hash && type) {
    // Email confirmation and password recovery token
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
    if (error) {
      return NextResponse.redirect(new URL('/login?error=auth_callback', origin))
    }
  }

  return response
}
