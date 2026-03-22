import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

// Devuelve las organizaciones más activas (con más vacantes publicadas)
// para mostrar en el carousel "Empleadores destacados"
// TODO: rate limit — este endpoint es público y podría usarse para enumeración de organizaciones.
// Considerar implementar rate limiting (ej. con Upstash/Redis o middleware) antes de producción.
// Nota de seguridad: retorna UUIDs internos junto a name/slug/count. Si en el futuro se crean
// endpoints públicos que acepten organization_id sin autenticación, se debe eliminar el campo id
// de la respuesta y usar slug como identificador externo.
export async function GET() {
  try {
    const supabase = getServiceClient();

    // Traemos todas las vacantes publicadas con su org para agrupar en JS
    const { data, error } = await supabase
      .from('vacancies')
      .select('organization_id, organizations:organization_id (name, slug)')
      .in('status', ['published', 'in_process']);

    if (error) throw error;

    // Agrupar por org y contar
    const map = new Map<string, { name: string; slug: string; count: number }>();
    for (const v of data || []) {
      const org = v.organizations as any;
      if (!org) continue;
      const key = v.organization_id as string;
      if (!map.has(key)) {
        map.set(key, { name: org.name, slug: org.slug, count: 0 });
      }
      map.get(key)!.count += 1;
    }

    // Top 8 con más vacantes
    const companies = Array.from(map.entries())
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return NextResponse.json({ data: companies });
  } catch (err: any) {
    console.error('[Public Companies API] Error:', err);
    return NextResponse.json({ error: 'Error al cargar empresas' }, { status: 500 });
  }
}
