// POST /api/16pf/evaluations/[id]/send — Mark evaluation as sent
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;

    // 1. Validar membresía y rol de RR.HH.
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!membership || !['owner', 'admin', 'hr_specialist'].includes(membership.role)) {
      return NextResponse.json({ error: 'Acceso denegado. Se requiere rol de RR.HH.' }, { status: 403 });
    }

    // 2. Actualizar la evaluación filtrando por ID y orgId del usuario
    const { data: evaluation, error } = await supabase
      .from('pf16_evaluations')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
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
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
