import { NextRequest, NextResponse } from 'next/server'
import { callClaude } from '@/lib/ai/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Auth guard
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { messages, model, maxTokens, system } = body

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 })
  }

  try {
    const result = await callClaude(messages, { model, maxTokens, system })
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Claude API error:', err?.message)
    return NextResponse.json({ error: err?.message || 'Error calling Claude API' }, { status: 500 })
  }
}
