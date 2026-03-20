import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: membership } = await supabase
      .from('user_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

    const status = request.nextUrl.searchParams.get('status');
    let query = supabase
      .from('vacancies')
      .select('*, job_positions(title, puesto)')
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: membership } = await supabase
      .from('user_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

    const body = await request.json();
    const { job_position_id, title, ad_content, evaluation_structure, publication_channels } = body;

    if (!job_position_id || !title) {
      return NextResponse.json({ error: 'job_position_id y title son obligatorios' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('vacancies')
      .insert({
        organization_id: membership.organization_id,
        job_position_id,
        title,
        ad_content: ad_content || {},
        evaluation_structure: evaluation_structure || { "16pf": 25, "competencies": 30, "technical": 20, "cultural": 15, "ethical": 10 },
        publication_channels: publication_channels || [],
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
