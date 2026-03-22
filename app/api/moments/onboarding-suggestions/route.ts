/**
 * GET /api/moments/onboarding-suggestions
 *
 * Devuelve sugerencias para empleados en onboarding:
 *   - Comunidades más activas a las que unirse
 *   - Plantillas de primer post recomendado
 *
 * Solo devuelve datos si el empleado está en estado 'onboarding'.
 * Retorna 200 con { isOnboarding: false } si no aplica.
 *
 * Seguridad:
 *   - organization_id siempre del contexto de sesión
 */
import { NextResponse }    from 'next/server'
import { createClient }    from '@/lib/supabase/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse } from '@/lib/moments/errors'

export async function GET() {
  try {
    const { orgId, userId } = await getRequestContext()
    const supabase          = await createClient()

    // ── 1. Verificar si el usuario está en onboarding ──────────────────
    const { data: employee } = await supabase
      .from('employees')
      .select('status, full_name')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!employee || employee.status !== 'onboarding') {
      return NextResponse.json({ isOnboarding: false, data: null })
    }

    // ── 2. Comunidades más activas (por miembros) ──────────────────────
    const { data: communities } = await supabase
      .from('moments_communities')
      .select('id, name, description')
      .eq('organization_id', orgId)
      .eq('is_archived', false)
      .eq('is_private', false)
      .order('name', { ascending: true })
      .limit(10)

    // Count members per community
    const commIds = (communities ?? []).map(c => c.id)
    const memberCounts: Record<string, number> = {}

    if (commIds.length > 0) {
      const { data: members } = await supabase
        .from('moments_community_members')
        .select('community_id')
        .in('community_id', commIds)
        .eq('status', 'active')

      for (const m of members ?? []) {
        memberCounts[m.community_id] = (memberCounts[m.community_id] ?? 0) + 1
      }
    }

    const suggestedCommunities = (communities ?? [])
      .map(c => ({ id: c.id, name: c.name, member_count: memberCounts[c.id] ?? 0 }))
      .sort((a, b) => b.member_count - a.member_count)
      .slice(0, 3)

    // ── 3. Plantillas de primer post ───────────────────────────────────
    const firstName = (employee.full_name ?? '').split(' ')[0] || 'Hola'
    const post_templates = [
      {
        type:  'discussion' as const,
        title: null,
        body:  `¡Hola a todos! Soy ${firstName} y acabo de unirme al equipo. Estoy emocionado/a de conocerlos y aprender de cada uno. ¿Algún consejo para empezar con el pie derecho? 😊`,
      },
      {
        type:  'question' as const,
        title: '¿Cuál es la mejor forma de familiarizarse con los procesos?',
        body:  'Estoy en mi primera semana y quiero aprender todo lo que pueda. ¿Qué recursos o personas me recomiendan consultar primero?',
      },
    ]

    return NextResponse.json({
      isOnboarding: true,
      data: {
        employee_name:        employee.full_name,
        communities:          suggestedCommunities,
        post_templates,
      },
    })

  } catch (err) {
    return toErrorResponse(err)
  }
}
