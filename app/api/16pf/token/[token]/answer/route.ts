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
    const body = await request.json().catch(() => ({}));

    // 0. Validar body e integridad de datos
    const { questionId, value } = body;
    
    // El id debe ser un número entero entre 1 y 187
    const qId = parseInt(questionId, 10);
    if (isNaN(qId) || qId < 1 || qId > 187) {
      return NextResponse.json({ error: 'questionId debe ser un número entre 1 y 187' }, { status: 400 });
    }

    // El valor debe ser 1 (C), 2 (?), o 3 (A)
    if (![1, 2, 3].includes(value)) {
      return NextResponse.json({ error: 'value debe ser 1, 2 o 3' }, { status: 400 });
    }

    // 1. Obtener estado actual de la evaluación
    const { data: evaluation, error } = await supabase
      .from('pf16_evaluations')
      .select('id, status, progress_pct')
      .eq('access_token', token)
      .maybeSingle();

    if (error || !evaluation) {
      return NextResponse.json({ error: 'Token inválido o evaluación inexistente' }, { status: 404 });
    }

    // 2. Validar estados bloqueantes
    if (evaluation.status === 'completed') {
      return NextResponse.json({ error: 'Esta evaluación ya fue completada y no admite más cambios' }, { status: 400 });
    }

    if (evaluation.status === 'expired') {
      return NextResponse.json({ error: 'Este enlace de evaluación ha expirado' }, { status: 403 });
    }

    // 3. Calcular e inyectar progreso (Robustez: solo hacia adelante o mantener)
    const calculatedProgress = Math.min(100, Math.round((qId / 187) * 100));
    const finalProgress = Math.max(evaluation.progress_pct || 0, calculatedProgress);

    const updates: Record<string, any> = {
      progress_pct: finalProgress,
    };

    // Si es el primer avance, marcar como in_progress
    if (evaluation.status === 'sent' || evaluation.status === 'pending') {
      updates.status = 'in_progress';
      updates.started_at = new Date().toISOString();
    }

    // Actualizamos solo si hay cambio o para asegurar el estado activo
    const { error: updateErr } = await supabase
      .from('pf16_evaluations')
      .update(updates)
      .eq('id', evaluation.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ 
      ok: true, 
      progress_pct: finalProgress,
      status: updates.status || evaluation.status 
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
