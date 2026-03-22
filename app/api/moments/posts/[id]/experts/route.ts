/**
 * GET /api/moments/posts/[id]/experts
 *
 * Returns up to 5 active employees who share the job_position_id
 * stored in the question post's metadata. Used to suggest experts
 * who may be best placed to answer a question.
 *
 * Seguridad:
 *   - organization_id siempre del contexto de sesión
 *   - 404 si el post no pertenece a la org o no es tipo question
 *   - 404 si el post no tiene job_position_id en metadata
 */
import { NextRequest, NextResponse }           from 'next/server'
import { createClient }                        from '@/lib/supabase/server'
import { getRequestContext }                   from '@/lib/auth/requestContext'
import { toErrorResponse, NotFoundError }      from '@/lib/moments/errors'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { orgId }      = await getRequestContext()
    const { id: postId } = await params
    const supabase       = await createClient()

    // ── 1. Verificar post ──────────────────────────────────────────────
    const { data: post } = await supabase
      .from('moments_posts')
      .select('post_type, metadata')
      .eq('id', postId)
      .eq('organization_id', orgId)
      .eq('status', 'published')
      .maybeSingle()

    if (!post) throw new NotFoundError('Post no encontrado')
    if (post.post_type !== 'question') {
      throw new NotFoundError('Post no encontrado')   // homogeneous 404
    }

    const meta            = post.metadata as Record<string, unknown> | null
    const job_position_id = meta?.job_position_id as string | null

    if (!job_position_id) {
      return NextResponse.json({ data: [] })
    }

    // ── 2. Buscar empleados activos con ese cargo ────────────────────
    const { data: employees } = await supabase
      .from('employees')
      .select('user_id, full_name, job_position_id')
      .eq('organization_id', orgId)
      .eq('job_position_id', job_position_id)
      .eq('status', 'active')
      .limit(5)

    // Fetch the job position name for display
    const { data: position } = await supabase
      .from('job_positions')
      .select('puesto')
      .eq('id', job_position_id)
      .eq('organization_id', orgId)
      .maybeSingle()

    const experts = (employees ?? []).map(e => ({
      user_id:           e.user_id,
      full_name:         e.full_name,
      job_position_name: position?.puesto ?? null,
    }))

    return NextResponse.json({ data: experts })

  } catch (err) {
    return toErrorResponse(err)
  }
}
