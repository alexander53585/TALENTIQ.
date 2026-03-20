import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

    const { data, error } = await supabase
      .from('vacancies')
      .select('*, job_positions(*)')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

    const body = await request.json();
    const allowedFields = ['title', 'status', 'publication_channels', 'ad_content', 'evaluation_structure'];
    const updateData: any = { updated_at: new Date().toISOString() };

    for (const key of allowedFields) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }

    const { data, error } = await supabase
      .from('vacancies')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
