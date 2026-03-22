/**
 * GET /api/moments/meta/positions
 *
 * Devuelve los cargos aprobados de la organización para el picker
 * de preguntas dirigidas por cargo en el compositor de posts.
 *
 * Seguridad: organization_id siempre del contexto de sesión.
 */
import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse }   from '@/lib/moments/errors'

export async function GET() {
  try {
    const { orgId } = await getRequestContext()
    const supabase  = await createClient()

    const { data, error } = await supabase
      .from('job_positions')
      .select('id, puesto, area')
      .eq('organization_id', orgId)
      .eq('status', 'approved')
      .order('area',   { ascending: true })
      .order('puesto', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data: data ?? [] })

  } catch (err) {
    return toErrorResponse(err)
  }
}
