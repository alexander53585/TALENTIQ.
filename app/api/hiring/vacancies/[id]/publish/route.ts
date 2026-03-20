import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;
    
    // Check access
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

    // Validate vacancy exists and matches org
    const { data: current, error: checkErr } = await supabase
      .from('vacancies')
      .select('status, organization_id')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single();

    if (checkErr || !current) return NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 });

    // Enforce logic (can only publish from ready or created, for instance)
    if (!['created', 'ready'].includes(current.status)) {
      return NextResponse.json({ error: `No se puede publicar desde el estado: ${current.status}` }, { status: 422 });
    }

    const { data, error } = await supabase
      .from('vacancies')
      .update({
        status: 'published',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
