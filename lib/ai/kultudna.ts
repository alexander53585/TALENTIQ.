import { createClient } from '@/lib/supabase/client'

/**
 * Obtiene el KultuDNA summary de una organización.
 * Retorna string vacío si Foundation no está configurado aún.
 */
export async function getKultuDNA(organizationId: string): Promise<string> {
  if (!organizationId) return ''

  const supabase = createClient()
  const { data } = await supabase
    .from('organization_profiles')
    .select('kultudna_summary')
    .eq('organization_id', organizationId)
    .maybeSingle()

  return data?.kultudna_summary ?? ''
}
