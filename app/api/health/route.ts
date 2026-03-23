import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    // Verificación mínima de conectividad — no expone detalles de error al cliente
    const { error } = await supabase.from('organizations').select('id').limit(1)

    if (error) {
      // Log interno para trazabilidad sin exponer al cliente
      console.error('[health] Error de conectividad con Supabase:', error.message)
    }

    // Solo { status, supabase } — nunca supabase_error en la respuesta
    return NextResponse.json({
      status: error ? 'degraded' : 'ok',
      supabase: !error,
    })
  } catch {
    return NextResponse.json({ status: 'degraded', supabase: false }, { status: 200 })
  }
}
