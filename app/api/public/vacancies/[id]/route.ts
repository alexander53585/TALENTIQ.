import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const { data: v, error } = await supabase
      .from('vacancies')
      .select(`
        id,
        title,
        status,
        location,
        modality,
        description,
        ad_content,
        evaluation_structure,
        created_at,
        updated_at,
        organizations:organization_id (name, slug),
        job_positions:job_position_id (puesto, title)
      `)
      .eq('id', id)
      .in('status', ['published', 'in_process'])
      .maybeSingle();

    if (error) throw error;
    if (!v) {
      return NextResponse.json({ error: 'Vacante no encontrada o no disponible' }, { status: 404 });
    }

    return NextResponse.json({
      id: v.id,
      title: v.title,
      status: v.status,
      location: v.location,
      modality: v.modality,
      description: v.description || (v.ad_content as any)?.linkedin || null,
      organization: (v.organizations as any)?.name || 'Empresa confidencial',
      position: (v.job_positions as any)?.puesto || (v.job_positions as any)?.title || null,
      created_at: v.created_at,
      updated_at: v.updated_at,
    });
  } catch (err: any) {
    console.error('[Public Vacancy Detail API] Error:', err);
    return NextResponse.json({ error: 'Error al cargar la vacante' }, { status: 500 });
  }
}
