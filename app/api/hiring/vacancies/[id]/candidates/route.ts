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
      .from('candidates')
      .select('*, pf16_evaluations(status, progress_pct, access_token)')
      .eq('vacancy_id', id)
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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
    const { full_name, email, phone, source } = body;

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('candidates')
      .insert({
        organization_id: membership.organization_id,
        vacancy_id: id,
        full_name,
        email,
        phone,
        source: source || 'direct',
        status: 'received',
        status_history: [{ from: null, to: 'received', by: user.id, at: new Date().toISOString() }],
        notes: { specialist: [], manager: [] }
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
