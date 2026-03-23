// GET /api/hiring/vacancies/[id]/candidates/link?candidate_id=<uuid>
// Endpoint exclusivo para roles HR: devuelve la URL completa del link 16PF
// NUNCA devuelve el access_token raw — solo la URL ya construida en servidor
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRequestContext } from '@/lib/auth/requestContext';
import {
  toErrorResponse,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/lib/moments/errors';

// Regex para validar UUID v4 estándar
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Solo roles privilegiados pueden acceder al link de evaluación
const HR_ROLES = ['owner', 'admin', 'hr_specialist'] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Resuelve sesión, membresía activa y valid_until en una sola llamada
    const { orgId, role } = await getRequestContext();

    // Solo HR puede acceder al link de evaluación 16PF
    if (!HR_ROLES.includes(role as typeof HR_ROLES[number])) {
      throw new ForbiddenError('Solo owner, admin o hr_specialist pueden acceder al link de evaluación');
    }

    const { id: vacancyId } = await params;

    // Obtener candidate_id de query params (nunca del body)
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidate_id');

    if (!candidateId) {
      throw new ValidationError('El parámetro candidate_id es requerido', 'candidate_id');
    }

    // Validar que candidate_id es un UUID válido
    if (!UUID_REGEX.test(candidateId)) {
      throw new ValidationError('El parámetro candidate_id debe ser un UUID válido', 'candidate_id');
    }

    const supabase = await createClient();

    // Verificar cross-tenant:
    // 1. La vacante debe pertenecer a la org del contexto
    // 2. El candidato debe pertenecer a la org del contexto y a esa vacante
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id, organization_id')
      .eq('id', candidateId)
      .eq('vacancy_id', vacancyId)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (candidateError) throw new Error(candidateError.message);
    if (!candidate) throw new NotFoundError('Candidato no encontrado en esta vacante');

    // Buscar evaluación 16PF del candidato — incluir access_token solo aquí,
    // en endpoint protegido por role check, para construir la URL en servidor
    const { data: evaluation, error: evalError } = await supabase
      .from('pf16_evaluations')
      .select('id, status, access_token, expires_at')
      .eq('candidate_id', candidateId)
      .maybeSingle();

    if (evalError) throw new Error(evalError.message);

    // Si no hay evaluación, retornar campos nulos sin exponer access_token
    if (!evaluation) {
      return NextResponse.json({
        evaluation_id: null,
        status: null,
        link: null,
      });
    }

    // Construir URL completa en servidor — NUNCA devolver el access_token raw
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const link = `${appUrl}/test/${evaluation.access_token}`;

    return NextResponse.json({
      evaluation_id: evaluation.id,
      status: evaluation.status,
      link,
      expires_at: evaluation.expires_at ?? null,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
