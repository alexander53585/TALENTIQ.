import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con service_role key.
 * SOLO usar en rutas de API server-side.
 * Bypasea RLS — nunca exponer al cliente.
 */
export function createServiceClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service_role env vars not configured')
  return createClient(url, key, { auth: { persistSession: false } })
}
