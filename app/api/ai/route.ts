import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 1. Validar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parsear body
  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'messages es requerido' }, { status: 400 })
  }

  const { messages, system, maxTokens, model, feature = 'general' } = body

  // 3. Obtener organización del usuario (no bloquea si no tiene membresía)
  const { data: membership } = await supabase
    .from('user_memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  try {
    // 4. Llamar a Claude desde el servidor (API key nunca sale del server)
    const result = await callClaude(messages, {
      model,
      maxTokens,
      system,
    })
    
    // 5. Loguear uso en ai_usage (fire and forget)
    // Solo si existe una membresía y un ID de organización válido
    if (membership?.organization_id) {
      try {
        void supabase.from('ai_usage').insert({
          organization_id: membership.organization_id,
          user_id: user.id,
          feature,
          input_tokens: result.usage?.input_tokens ?? 0,
          output_tokens: result.usage?.output_tokens ?? 0,
        })
      } catch (e) {
        console.error("[AI Usage Log Error] No se pudo registrar el uso:", e)
      }
    }

    return NextResponse.json({
      content: result.content,
      usage: result.usage,
    })
  } catch (err: any) {
    console.error("[AI Server Error] Error al llamar a Claude:", err)
    return NextResponse.json({ 
      error: err.message || 'Error interno al procesar la solicitud de IA' 
    }, { status: 500 })
  }
}
