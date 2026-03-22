/**
 * lib/auth/requestContext.ts
 * Resuelve el contexto de seguridad de una request server-side.
 *
 * Garantías:
 * - userId y orgId SIEMPRE provienen de la sesión Supabase + user_memberships
 * - Nunca se leen del cuerpo de la request ni de query params
 * - Lanza errores tipados (NotAuthenticatedError, ForbiddenError) si faltan
 */
import { createClient } from '@/lib/supabase/server'
import { NotAuthenticatedError, ForbiddenError } from '@/lib/moments/errors'

export type OrgRole =
  | 'owner'
  | 'admin'
  | 'hr_specialist'
  | 'manager'
  | 'employee'

export interface RequestContext {
  userId: string
  orgId:  string
  role:   OrgRole
}

/**
 * Resuelve userId, orgId y rol desde la sesión activa.
 *
 * @throws {NotAuthenticatedError} si no hay sesión
 * @throws {ForbiddenError}        si el usuario no tiene membresía activa o expirada
 */
export async function getRequestContext(): Promise<RequestContext> {
  const supabase = await createClient()

  // 1. Verificar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new NotAuthenticatedError()

  // 2. Resolver membresía activa (orgId + rol en una sola query).
  //    .order + .limit(1) garantizan que obtenemos la membresía más reciente
  //    incluso si el usuario tiene múltiples filas (evita error de maybeSingle
  //    cuando hay más de una fila).
  const { data: membership, error } = await supabase
    .from('user_memberships')
    .select('organization_id, role, valid_until')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !membership?.organization_id) {
    throw new ForbiddenError('Sin membresía activa en ninguna organización')
  }

  // 3. Verificar que la membresía no haya expirado
  if (membership.valid_until && new Date(membership.valid_until) < new Date()) {
    throw new ForbiddenError('Membresía expirada')
  }

  return {
    userId: user.id,
    orgId:  membership.organization_id,
    role:   membership.role as OrgRole,
  }
}
