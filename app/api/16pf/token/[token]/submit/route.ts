// POST /api/16pf/token/[token]/submit — Submit all answers and score server-side
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
  computeResults, computeGlobalDims, computeDerivedEqs,
  computeDiscriminants, generateInterpretation
} from '@/lib/16pf/engine';
import { encrypt } from '@/lib/16pf/encryption';
import type { Answers } from '@/lib/16pf/types';

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

    // 1. Validar token y estados de la evaluación
    const { data: evaluation, error: fetchErr } = await supabase
      .from('pf16_evaluations')
      .select('id, norm_idx, status')
      .eq('access_token', token)
      .maybeSingle();

    if (fetchErr || !evaluation) {
      return NextResponse.json({ error: 'Token inválido o evaluación inexistente' }, { status: 404 });
    }

    if (evaluation.status === 'completed') {
      return NextResponse.json({ error: 'Esta evaluación ya fue completada previamente' }, { status: 400 });
    }

    if (evaluation.status === 'expired') {
      return NextResponse.json({ error: 'Este enlace de evaluación ha expirado y no admite envíos' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const answers: Answers = body.answers;

    // Validate 187 answers
    const answerCount = Object.keys(answers).length;
    if (answerCount < 185) {
      return NextResponse.json({ error: `Se requieren al menos 185 respuestas. Recibidas: ${answerCount}` }, { status: 400 });
    }

    // SERVER-SIDE SCORING
    const { decatipos } = computeResults(answers, evaluation.norm_idx);
    const globalDims = computeGlobalDims(decatipos);
    const derivedEqs = computeDerivedEqs(decatipos);
    const discriminants = computeDiscriminants(decatipos);
    const interpretation = generateInterpretation(decatipos, globalDims, derivedEqs);

    // Encrypt answers before storing
    const answersEncrypted = encrypt(JSON.stringify(answers));

    // Save everything to Supabase
    const { error: updateErr } = await supabase
      .from('pf16_evaluations')
      .update({
        answers_encrypted: answersEncrypted,
        decatipos,
        global_dims: globalDims,
        derived_eqs: derivedEqs,
        discriminants,
        interpretation,
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress_pct: 100,
      })
      .eq('id', evaluation.id);

    if (updateErr) throw updateErr;

    // DO NOT return decatipos to candidate
    return NextResponse.json({
      ok: true,
      message: 'Evaluación completada. Gracias por tu participación.',
    });
  } catch (err: unknown) {
    console.error('16PF Submit error:', err);
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
