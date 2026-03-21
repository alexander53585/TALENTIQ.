import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Service client — bypasses RLS para lectura pública filtrada por status
function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

const PER_PAGE = 10;

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const { searchParams } = request.nextUrl;

    const search   = searchParams.get('q')?.trim() || '';
    const location = searchParams.get('location')?.trim() || '';
    const modality = searchParams.get('modality')?.trim() || '';
    const sort     = searchParams.get('sort') || 'recent'; // 'recent' | 'active'
    const page     = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const offset   = (page - 1) * PER_PAGE;

    let query = supabase
      .from('vacancies')
      .select(`
        id,
        title,
        status,
        location,
        modality,
        description,
        ad_content,
        created_at,
        updated_at,
        organizations:organization_id (name, slug),
        job_positions:job_position_id (puesto, title)
      `, { count: 'exact' })
      .in('status', ['published', 'in_process']);

    if (search)   query = query.ilike('title', `%${search}%`);
    if (location) query = query.ilike('location', `%${location}%`);
    if (modality) query = query.eq('modality', modality);

    // Sort
    query = sort === 'active'
      ? query.order('status', { ascending: false }).order('updated_at', { ascending: false })
      : query.order('updated_at', { ascending: false });

    query = query.range(offset, offset + PER_PAGE - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const sanitized = (data || []).map(v => ({
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
    }));

    return NextResponse.json({
      data: sanitized,
      pagination: {
        total: count ?? 0,
        page,
        per_page: PER_PAGE,
        total_pages: Math.ceil((count ?? 0) / PER_PAGE),
      },
    });
  } catch (err: any) {
    console.error('[Public Vacancies API] Error:', err);
    return NextResponse.json({ error: 'Error al cargar vacantes' }, { status: 500 });
  }
}
