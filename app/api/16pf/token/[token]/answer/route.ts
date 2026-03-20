// POST /api/16pf/token/[token]/answer — Track individual answer progress
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = await params;
    const supabase = getServiceClient();
    const body = await request.json();
    const { questionId, value } = body;

    if (!questionId || ![1,2,3].includes(value)) {
      return NextResponse.json({ error: 'questionId y value (1|2|3) requeridos' }, { status: 400 });
    }

    // Get evaluation
    const { data: evaluation, error } = await supabase
      .from('pf16_evaluations')
      .select('id, status, progress_pct')
      .eq('access_token', token)
      .single();

    if (error || !evaluation) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 404 });
    }

    if (evaluation.status === 'completed') {
      return NextResponse.json({ error: 'Evaluación ya completada' }, { status: 400 });
    }

    // Update progress and status
    const newProgress = Math.round((questionId / 187) * 100);
    const updates: Record<string, unknown> = {
      progress_pct: Math.max(evaluation.progress_pct, newProgress),
    };

    if (evaluation.status === 'pending' || evaluation.status === 'sent') {
      updates.status = 'in_progress';
      updates.started_at = new Date().toISOString();
    }

    await supabase
      .from('pf16_evaluations')
      .update(updates)
      .eq('id', evaluation.id);

    return NextResponse.json({ ok: true, progress_pct: updates.progress_pct });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
