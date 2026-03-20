// PUT /api/16pf/evaluations/[id]/notes — Save specialist notes
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;

    // Check role
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership || !['hr_specialist', 'admin', 'owner'].includes(membership.role)) {
      return NextResponse.json({ error: 'Solo hr_specialist o superior' }, { status: 403 });
    }

    const body = await request.json();
    const { specialist_notes } = body;

    const { data: evaluation, error } = await supabase
      .from('pf16_evaluations')
      .update({ specialist_notes })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(evaluation);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
