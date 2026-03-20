// PUT /api/architecture/descriptions/[id]/status
// Transitions: draft→in_review→adjusted→approved / approved→versioned | → archived
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Status = 'draft' | 'in_review' | 'adjusted' | 'approved' | 'versioned' | 'archived';

const VALID_TRANSITIONS: Record<Status, Status[]> = {
  draft:      ['in_review', 'archived'],
  in_review:  ['adjusted', 'draft'],
  adjusted:   ['approved', 'in_review'],
  approved:   ['versioned', 'archived'],
  versioned:  ['archived'],
  archived:   [],
};

const APPROVER_ROLES = ['admin', 'owner'];

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { new_status, notes } = body as { new_status: Status; notes?: string };

    // Get current position + membership
    const [{ data: pos, error: posErr }, { data: membership }] = await Promise.all([
      supabase.from('job_positions').select('status, organization_id, approval_history, version').eq('id', id).single(),
      supabase.from('user_memberships').select('organization_id, role').eq('user_id', user.id).eq('is_active', true).single(),
    ]);

    if (posErr || !pos) return NextResponse.json({ error: 'Cargo no encontrado' }, { status: 404 });
    if (!membership) return NextResponse.json({ error: 'Sin membresía activa' }, { status: 403 });
    if (pos.organization_id !== membership.organization_id) {
      return NextResponse.json({ error: 'Sin acceso a este cargo' }, { status: 403 });
    }

    const currentStatus = pos.status as Status;

    // Validate transition
    if (!VALID_TRANSITIONS[currentStatus]?.includes(new_status)) {
      return NextResponse.json({
        error: `Transición inválida: ${currentStatus} → ${new_status}`,
      }, { status: 422 });
    }

    // Approver gate: only admin/owner can move to "approved"
    if (new_status === 'approved' && !APPROVER_ROLES.includes(membership.role)) {
      return NextResponse.json({
        error: 'Solo admin u owner pueden aprobar cargos',
      }, { status: 403 });
    }

    // Build history entry
    const historyEntry = {
      from: currentStatus,
      to: new_status,
      by: user.id,
      by_email: user.email,
      at: new Date().toISOString(),
      notes: notes || null,
    };

    const history = Array.isArray(pos.approval_history) ? pos.approval_history : [];

    // Patch payload
    const patch: Record<string, unknown> = {
      status: new_status,
      approval_history: [...history, historyEntry],
      review_notes: notes ?? null,
    };

    if (new_status === 'approved') {
      patch.approved_by = user.id;
      patch.approved_at = new Date().toISOString();
    }

    // If editing an already-approved job → version it first (called by frontend as versioned)
    if (new_status === 'versioned') {
      patch.version = (pos.version ?? 1) + 1;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('job_positions')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
