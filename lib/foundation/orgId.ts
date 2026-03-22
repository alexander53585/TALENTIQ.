/**
 * lib/foundation/orgId.ts
 *
 * Helper para resolver el organization_id de un usuario a partir de su membresía activa.
 *
 * SEGURIDAD: Esta función solo retorna el orgId si existe una membresía que cumpla:
 *   1. is_active = true
 *   2. valid_until IS NULL  OR  valid_until > ahora
 *
 * Se eliminó el fallback a "cualquier membresía" que existía anteriormente porque
 * permitía resolver el orgId de membresías expiradas, inactivas o de organizaciones
 * anteriores — un vector de acceso no autorizado cross-tenant.
 *
 * Si no hay membresía válida, retorna null.
 *
 * COMPATIBILIDAD: mantiene la firma pública `getOrgId(supabase, userId)` sin cambios.
 */
import { SupabaseClient } from '@supabase/supabase-js'

export async function getOrgId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  // Solo membresías activas y no expiradas.
  // ORDER BY created_at DESC + LIMIT 1 garantiza desempate determinista
  // cuando el usuario tiene más de una membresía válida.
  const { data } = await supabase
    .from('user_memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .or('valid_until.is.null,valid_until.gt.' + new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Sin fallback: si no hay membresía válida, retornamos null
  return data?.organization_id ?? null
}
