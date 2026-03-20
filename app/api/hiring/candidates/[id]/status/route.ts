import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    // Get current candidate to fetch history
    const { data: cand, error: fetchErr } = await supabase
      .from('candidates')
      .select('status, status_history, organization_id')
      .eq('id', id)
      .single();

    if (fetchErr || !cand) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (cand.organization_id !== membership.organization_id) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    if (cand.status === status) {
      return NextResponse.json({ message: 'Sin cambios' }); // Ignore
    }

    const historyArray = Array.isArray(cand.status_history) ? cand.status_history : [];
    const newEntry = {
      from: cand.status,
      to: status,
      by: user.id,
      by_email: user.email,
      at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('candidates')
      .update({
        status,
        updated_at: new Date().toISOString(),
        status_history: [...historyArray, newEntry]
      })
      .eq('id', id)
      .select('id, status, status_history')
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
