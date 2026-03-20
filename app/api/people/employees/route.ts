import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const { candidate_id, vacancy_id, hire_date, onboarding_notes } = body;

    if (!candidate_id || !vacancy_id || !hire_date) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    // 1. Obtener datos del candidato y vacante
    const { data: cand, error: candErr } = await supabase
      .from('candidates')
      .select('*, vacancies(organization_id, job_position_id)')
      .eq('id', candidate_id)
      .single();

    if (candErr || !cand) return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 });
    const orgId = (cand.vacancies as any).organization_id;
    const positionId = (cand.vacancies as any).job_position_id;

    // 2. Crear Empleado en People
    const { data: employee, error: empErr } = await supabase
      .from('employees')
      .insert({
        organization_id: orgId,
        candidate_id: candidate_id,
        job_position_id: positionId,
        full_name: cand.full_name,
        email: cand.email,
        hire_date: hire_date,
        onboarding_notes: onboarding_notes || '',
        status: 'onboarding'
      })
      .select()
      .single();

    if (empErr) throw empErr;

    // 3. Actualizar al candidato ganador (Hired)
    const newHistoryEntry = { from: cand.status, to: 'hired', by: user.id, at: new Date().toISOString() };
    const candHistory = Array.isArray(cand.status_history) ? cand.status_history : [];
    await supabase.from('candidates').update({ 
      status: 'hired', 
      status_history: [...candHistory, newHistoryEntry] 
    }).eq('id', candidate_id);

    // 4. Cerrar Vacante ('closed')
    await supabase.from('vacancies').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', vacancy_id);

    // 5. Automatizar Discarded (Lanzamos generación de Feedback asíncronamente)
    // Extraemos todos los otros candidatos (finalistas, en entrevista...) que NO fueron seleccionados
    const { data: remainingCands } = await supabase
      .from('candidates')
      .select('id, status, status_history')
      .eq('vacancy_id', vacancy_id)
      .neq('id', candidate_id)
      .not('status', 'eq', 'discarded'); // saltar los que ya estaban descartados de antes

    if (remainingCands && remainingCands.length > 0) {
      for (const rc of remainingCands) {
        const hArr = Array.isArray(rc.status_history) ? rc.status_history : [];
        await supabase.from('candidates').update({ 
          status: 'discarded',
          status_history: [...hArr, { from: rc.status, to: 'discarded', by: 'system', at: new Date().toISOString() }]
        }).eq('id', rc.id);
        
        // Disparar feedback en background via internal local API call:
        // En Next.js App Router, un fetch asíncrono no-bloqueante a tu propia API sirve perfect.
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        fetch(`${baseUrl}/api/hiring/candidates/${rc.id}/feedback`, { method: 'POST', headers: { cookie: request.headers.get('cookie') || '' } }).catch(e => console.error(e));
      }
    }

    return NextResponse.json({ success: true, employee });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
