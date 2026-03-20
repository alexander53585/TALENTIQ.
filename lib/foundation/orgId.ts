import { SupabaseClient } from '@supabase/supabase-js'

export async function getOrgId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('user_memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  return data?.organization_id ?? null
}
