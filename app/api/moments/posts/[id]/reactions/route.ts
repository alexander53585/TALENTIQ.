/**
 * POST   /api/moments/posts/[id]/reactions  — agregar o cambiar reacción
 * DELETE /api/moments/posts/[id]/reactions  — eliminar propia reacción
 *
 * POST usa UPSERT: si el usuario ya reaccionó, actualiza el tipo.
 * Unicidad garantizada por UNIQUE(user_id, target_type, target_id) en DB.
 *
 * Seguridad:
 *   - organization_id siempre del contexto de sesión
 *   - 404 si el post pertenece a otra org (evita enumeración)
 *   - Rate limiting en POST: máx 60 reacciones/10 min
 *   - DELETE solo elimina la reacción del propio usuario
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getRequestContext }         from '@/lib/auth/requestContext'
import { validateReactionCreate }    from '@/lib/moments/validators'
import { checkRateLimit }            from '@/lib/moments/rateLimit'
import { toErrorResponse, NotFoundError, ValidationError } from '@/lib/moments/errors'

// ── Helper: verificar que el post existe en la org ────────────────────

async function requirePost(supabase: Awaited<ReturnType<typeof createClient>>, postId: string, orgId: string) {
  const { data, error } = await supabase
    .from('moments_posts')
    .select('id, status')
    .eq('id', postId)
    .eq('organization_id', orgId)   // AISLAMIENTO TENANT
    .maybeSingle()

  if (error || !data || data.status !== 'published') {
    throw new NotFoundError('Post no encontrado')
  }
  return data
}

// ── POST — agregar / cambiar reacción ─────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { orgId, userId } = await getRequestContext()
    const { id: postId }    = await params

    const rawBody   = await req.json().catch(() => null)
    const validated = validateReactionCreate({
      ...rawBody,
      target_type: 'post',   // forzado desde la URL, nunca del cliente
      target_id:   postId,
    })

    // Doble-check: el target_id del body no debe apuntar a otro recurso
    if (validated.target_id !== postId) {
      throw new ValidationError('target_id no coincide con el post de la URL', 'target_id')
    }

    const supabase = await createClient()
    await requirePost(supabase, postId, orgId)

    // Rate limiting
    checkRateLimit(userId, 'reaction')

    // UPSERT: una reacción por usuario por post, tipo intercambiable
    const { data: reaction, error } = await supabase
      .from('moments_reactions')
      .upsert(
        {
          organization_id: orgId,
          user_id:         userId,
          target_type:     'post',
          target_id:       postId,
          reaction_type:   validated.reaction_type,
        },
        { onConflict: 'user_id,target_type,target_id' },
      )
      .select('id, reaction_type, created_at')
      .single()

    if (error) throw error

    return NextResponse.json({ data: reaction }, { status: 201 })

  } catch (err) {
    return toErrorResponse(err)
  }
}

// ── DELETE — eliminar propia reacción ─────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { orgId, userId } = await getRequestContext()
    const { id: postId }    = await params

    const supabase = await createClient()

    // Verificar que el post existe en la org (404 homogéneo)
    await requirePost(supabase, postId, orgId)

    // Eliminar reacción del usuario en este post
    const { data: deleted, error } = await supabase
      .from('moments_reactions')
      .delete()
      .eq('user_id',     userId)
      .eq('target_type', 'post')
      .eq('target_id',   postId)
      .eq('organization_id', orgId)
      .select('id')
      .maybeSingle()

    if (error) throw error

    if (!deleted) {
      throw new NotFoundError('No tienes ninguna reacción en este post')
    }

    return NextResponse.json({ data: { deleted: true } })

  } catch (err) {
    return toErrorResponse(err)
  }
}
