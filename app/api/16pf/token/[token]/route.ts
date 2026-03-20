// GET /api/16pf/token/[token] — Validate token (public, no auth)
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Use service role for token validation (bypasses RLS)
function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = await params;
    const supabase = getServiceClient();

    const { data: evaluation, error } = await supabase
      .from('pf16_evaluations')
      .select('id, status, progress_pct, candidate_id, candidates(first_name, last_name)')
      .eq('access_token', token)
      .single();

    if (error || !evaluation) {
      return NextResponse.json({ valid: false, error: 'Token inválido' }, { status: 404 });
    }

    if (evaluation.status === 'completed') {
      return NextResponse.json({ valid: false, completed: true, message: 'Esta evaluación ya fue completada.' });
    }

    if (evaluation.status === 'expired') {
      return NextResponse.json({ valid: false, expired: true, message: 'Este enlace ha expirado.' });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidateData = evaluation.candidates as any;
    const candidateName = candidateData?.first_name ? `${candidateData.first_name} ${candidateData.last_name}` : 'Candidato';

    return NextResponse.json({
      valid: true,
      evaluationId: evaluation.id,
      candidateName,
      progress_pct: evaluation.progress_pct,
      status: evaluation.status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
