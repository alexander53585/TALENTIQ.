import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse, ForbiddenError } from '@/lib/moments/errors'
import { calcReadiness } from '@/lib/foundation/readiness'

export async function GET() {
  try {
    const { orgId } = await getRequestContext()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_profiles')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return NextResponse.json({ data })

  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { orgId, role } = await getRequestContext()

    // Solo owner y admin pueden modificar el perfil de fundación de la organización
    const ALLOWED = ['owner', 'admin'] as const
    if (!(ALLOWED as readonly string[]).includes(role)) {
      throw new ForbiddenError('Se requiere rol de Administrador o Propietario para editar el perfil de fundación')
    }

    const supabase = await createClient()

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Body inválido', code: 'VALIDATION_ERROR' }, { status: 400 })

    // Campos base — siempre disponibles
    const baseFields = [
      'mission', 'vision', 'purpose', 'values',
      'value_proposition', 'key_processes', 'critical_areas',
      'kultudna_summary', 'work_mode', 'org_structure', 'digital_maturity',
      'foundation_phase',
    ]
    // Campos de identidad — requieren migración 20240014
    const identityFields = ['sector', 'size', 'legal_structure']

    const patch: Record<string, unknown> = { organization_id: orgId }
    for (const k of baseFields) {
      if (k in body) patch[k] = body[k]
    }

    // Intentar incluir campos de identidad; si la columna no existe, se ignoran
    for (const k of identityFields) {
      if (k in body) patch[k] = body[k]
    }

    const { data, error } = await supabase
      .from('organization_profiles')
      .upsert(patch, { onConflict: 'organization_id' })
      .select()
      .single()

    // Si falla por columna inexistente, reintentar sin campos de identidad
    if (error?.code === '42703') {
      const safePatch: Record<string, unknown> = { organization_id: orgId }
      for (const k of baseFields) {
        if (k in body) safePatch[k] = body[k]
      }
      const { data: safeData, error: safeError } = await supabase
        .from('organization_profiles')
        .upsert(safePatch, { onConflict: 'organization_id' })
        .select()
        .single()
      if (safeError) throw new Error(safeError.message)

      const readiness = await calcReadiness(supabase, orgId)
      await supabase
        .from('organization_profiles')
        .update({ readiness_score: readiness.score, is_ready_for_architecture: readiness.isReady })
        .eq('organization_id', orgId)
      return NextResponse.json({ data: { ...safeData, ...readiness } })
    }

    if (error) throw new Error(error.message)

    // Recalcular readiness y persistirlo
    const readiness = await calcReadiness(supabase, orgId)
    await supabase
      .from('organization_profiles')
      .update({ readiness_score: readiness.score, is_ready_for_architecture: readiness.isReady })
      .eq('organization_id', orgId)

    return NextResponse.json({ data: { ...data, ...readiness } })

  } catch (err) {
    return toErrorResponse(err)
  }
}
