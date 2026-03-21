import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // 1. Validar membresía activa y rol de RR.HH. (Owner, Admin, HR Specialist)
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!membership || !['owner', 'admin', 'hr_specialist'].includes(membership.role)) {
      return NextResponse.json({ error: 'Acceso denegado. Se requiere rol de RR.HH.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { candidate_id, vacancy_id: body_vacancy_id, hire_date, onboarding_notes } = body;

    if (!candidate_id || !hire_date) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios (candidate_id, hire_date)' }, { status: 400 });
    }

    // 2. Obtener datos del candidato y su vacante asociada (Fuente de Verdad)
    // Filtramos por orgId para asegurar aislamiento multitenant
    const { data: cand, error: candErr } = await supabase
      .from('candidates')
      .select(`
        *,
        vacancies!inner (
          id,
          organization_id,
          job_position_id,
          status
        )
      `)
      .eq('id', candidate_id)
      .eq('vacancies.organization_id', membership.organization_id)
      .maybeSingle();

    if (candErr) throw candErr;
    if (!cand) return NextResponse.json({ error: 'Candidato no encontrado en tu organización' }, { status: 404 });

    const official_vacancy = (cand.vacancies as any);
    const orgId = official_vacancy.organization_id;
    const positionId = official_vacancy.job_position_id;
    const official_vacancy_id = official_vacancy.id;

    // 3. Validación de integridad de la Vacante
    // Si el cliente envía un vacancy_id y no coincide con el del candidato, rechazamos (Data Integrity Check)
    if (body_vacancy_id && body_vacancy_id !== official_vacancy_id) {
      return NextResponse.json({ 
        error: 'Conflicto de integridad: El vacancy_id proporcionado no coincide con la vacante real del candidato.',
        details: 'Manipulation attempt or stale UI'
      }, { status: 422 });
    }

    // 4. Crear registro de Empleado en el módulo People
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
      .maybeSingle();

    if (empErr) throw empErr;

    // 5. Actualizar estado del candidato a 'hired' con historial
    const newHistoryEntry = { from: cand.status, to: 'hired', by: user.id, at: new Date().toISOString() };
    const candHistory = Array.isArray(cand.status_history) ? cand.status_history : [];
    
    await supabase.from('candidates')
      .update({ 
        status: 'hired', 
        status_history: [...candHistory, newHistoryEntry] 
      })
      .eq('id', candidate_id);

    // 6. Cerrar formalmente la vacante asociada (Solo la oficial)
    await supabase.from('vacancies')
      .update({ 
        status: 'closed', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', official_vacancy_id)
      .eq('organization_id', orgId); // Extra safety filter

    // 7. Automatización: Descartar candidatos restantes y disparar Feedback
    const { data: remainingCands } = await supabase
      .from('candidates')
      .select('id, status, status_history')
      .eq('vacancy_id', official_vacancy_id)
      .neq('id', candidate_id)
      .not('status', 'in', '("discarded", "hired")'); // Evitar re-procesar ya cerrados

    if (remainingCands && remainingCands.length > 0) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
      const cookie = request.headers.get('cookie') || '';

      for (const rc of remainingCands) {
        const hArr = Array.isArray(rc.status_history) ? rc.status_history : [];
        
        await supabase.from('candidates')
          .update({ 
            status: 'discarded',
            status_history: [...hArr, { from: rc.status, to: 'discarded', by: 'system', at: new Date().toISOString() }]
          })
          .eq('id', rc.id);
        
        // Disparar feedback asíncrono (Fire and forget)
        fetch(`${baseUrl}/api/hiring/candidates/${rc.id}/feedback`, { 
          method: 'POST', 
          headers: { cookie } 
        }).catch(e => console.error("[Feedback Async Error]:", e));
      }
    }

    return NextResponse.json({ success: true, employee });
  } catch (err: any) {
    console.error("[Hire Candidate API Error]:", err);
    return NextResponse.json({ error: err.message || 'Error interno al procesar la contratación' }, { status: 500 });
  }
}
