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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vacancy_id } = await params;
    const supabase = getServiceClient();

    const body = await request.json().catch(() => ({}));
    const { first_name, last_name, email, phone } = body;

    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'Nombre, apellido y email son obligatorios' },
        { status: 400 }
      );
    }

    // Validar email básico
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // 1. Verificar que la vacante exista y esté publicada
    const { data: vacancy, error: vacErr } = await supabase
      .from('vacancies')
      .select('id, organization_id, title, status')
      .eq('id', vacancy_id)
      .in('status', ['published', 'in_process'])
      .maybeSingle();

    if (vacErr) throw vacErr;
    if (!vacancy) {
      return NextResponse.json({ error: 'Vacante no disponible' }, { status: 404 });
    }

    // 2. Prevenir postulaciones duplicadas en la misma vacante
    const { data: existing } = await supabase
      .from('candidates')
      .select('id')
      .eq('vacancy_id', vacancy_id)
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una postulación con este email para esta vacante' },
        { status: 409 }
      );
    }

    // 3. Crear candidato con source=portal en el historial
    const { data: candidate, error: candErr } = await supabase
      .from('candidates')
      .insert({
        organization_id: vacancy.organization_id,
        vacancy_id: vacancy.id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        status: 'new',
        status_history: [
          {
            from: null,
            to: 'new',
            by: 'portal',
            source: 'portal_publico',
            at: new Date().toISOString(),
          },
        ],
      })
      .select('id, first_name, last_name, email')
      .maybeSingle();

    if (candErr) throw candErr;

    return NextResponse.json({
      success: true,
      message: `¡Postulación recibida, ${candidate?.first_name}! El equipo de selección se pondrá en contacto contigo.`,
      candidate_id: candidate?.id,
    });
  } catch (err: any) {
    console.error('[Public Apply API] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Error al procesar la postulación' },
      { status: 500 }
    );
  }
}
