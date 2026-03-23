// GET  /api/hiring/vacancies/[id]/candidates — lista candidatos de una vacante
// POST /api/hiring/vacancies/[id]/candidates — agrega candidato manualmente
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRequestContext } from '@/lib/auth/requestContext';
import {
  toErrorResponse,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/lib/moments/errors';

// Roles que pueden agregar candidatos manualmente
const HR_ROLES = ['owner', 'admin', 'hr_specialist'] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Resuelve sesión, membresía activa y valid_until en una sola llamada
    const { orgId } = await getRequestContext();
    const { id } = await params;

    const supabase = await createClient();

    // Cross-tenant: filtramos por organization_id del contexto autenticado.
    // access_token EXCLUIDO — nunca se retorna en listados masivos.
    const { data, error } = await supabase
      .from('candidates')
      .select('*, pf16_evaluations(id, status, progress_pct, sent_at, completed_at)')
      .eq('vacancy_id', id)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Verificación adicional: si no hay datos y la vacancy no existe en la org,
    // devolvemos 404 para evitar enumeración cross-tenant.
    if (!data) throw new NotFoundError('Vacante no encontrada');

    return NextResponse.json({ data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Resuelve sesión y membresía activa con valid_until verificado
    const { orgId, userId, role } = await getRequestContext();

    // Solo roles privilegiados pueden agregar candidatos
    if (!HR_ROLES.includes(role as typeof HR_ROLES[number])) {
      throw new ForbiddenError('Solo owner, admin o hr_specialist pueden agregar candidatos');
    }

    const { id } = await params;
    const supabase = await createClient();

    // Verificar que la vacante pertenece a la org del contexto antes de insertar
    const { data: vacancy, error: vacancyError } = await supabase
      .from('vacancies')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (vacancyError) throw new Error(vacancyError.message);
    if (!vacancy) throw new NotFoundError('Vacante no encontrada');

    const body = await request.json();
    const { full_name, email, phone, source } = body;

    if (!full_name || !email) {
      throw new ValidationError('Los campos full_name y email son requeridos');
    }

    // organization_id siempre del contexto — NUNCA del body del request
    const { data, error } = await supabase
      .from('candidates')
      .insert({
        organization_id: orgId,
        vacancy_id: id,
        full_name,
        email,
        phone,
        source: source || 'direct',
        status: 'received',
        status_history: [{ from: null, to: 'received', by: userId, at: new Date().toISOString() }],
        notes: { specialist: [], manager: [] },
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    return toErrorResponse(err);
  }
}
