import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    // Simple connectivity check
    const { error } = await supabase.from('organizations').select('id').limit(1)

    return NextResponse.json({
      status: 'ok',
      supabase: !error,
      ...(error && { supabase_error: error.message }),
    })
  } catch {
    return NextResponse.json({ status: 'ok', supabase: false }, { status: 200 })
  }
}
