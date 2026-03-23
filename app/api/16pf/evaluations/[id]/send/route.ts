// POST /api/16pf/evaluations/[id]/send — Mark evaluation as sent
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRequestContext } from '@/lib/auth/requestContext';
import { toErrorResponse, ForbiddenError } from '@/lib/moments/errors';

const HR_ROLES = ['owner', 'admin', 'hr_specialist'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Resuelve sesión + membresía activa + valid_until en una sola llamada
    const { orgId, role } = await getRequestContext()

    if (!(HR_ROLES as readonly string[]).includes(role)) {
      throw new ForbiddenError('Se requiere rol de RR.HH. o superior')
    }

    const { id } = params;
    const supabase = await createClient();

    // Actualizar la evaluación — filtro cross-tenant por orgId del contexto
    const { data: evaluation, error } = await supabase
      .from('pf16_evaluations')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('id, status, access_token')
      .maybeSingle();

    if (error) throw error;
    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluación no encontrada en tu organización' }, { status: 404 });
    }

    // Build the candidate link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const candidateLink = `${baseUrl}/16pf/${evaluation.access_token}`;

    // Solo devolvemos lo necesario para confirmar el envío
    return NextResponse.json({
      id: evaluation.id,
      status: evaluation.status,
      candidate_link: candidateLink,
    });
  } catch (err: unknown) {
    console.error('[16PF Send API] Error:', err);
    return toErrorResponse(err);
  }
}
