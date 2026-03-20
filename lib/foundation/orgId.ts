import { SupabaseClient } from '@supabase/supabase-js'

export async function getOrgId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  // 1. Intentar membresía activa
  const { data: active } = await supabase
    .from('user_memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  
  if (active?.organization_id) return active.organization_id

  // 2. Si no hay una activa explícitamente, intentar cualquier membresía (fallback)
  const { data: anyMem } = await supabase
    .from('user_memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  return anyMem?.organization_id ?? null
}
