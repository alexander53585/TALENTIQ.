/**
 * GET /api/moments/meta/competencies
 *
 * Devuelve las competencias cardinales activas de la organización
 * para el picker de reconocimientos en el compositor de posts.
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
      .from('cardinal_competencies')
      .select('id, name, dimension')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('dimension', { ascending: true })
      .order('name',      { ascending: true })

    if (error) throw error

    return NextResponse.json({ data: data ?? [] })

  } catch (err) {
    return toErrorResponse(err)
  }
}
