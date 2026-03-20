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

    const { data: evaluation, error } = await supabase
      .from('pf16_evaluations')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, access_token')
      .single();

    if (error) throw error;

    // Build the candidate link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const candidateLink = `${baseUrl}/16pf/${evaluation.access_token}`;

    return NextResponse.json({
      ...evaluation,
      candidate_link: candidateLink,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
