import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiComplete } from '@/lib/ai/claude';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const { title, mission, functions, requirements } = body;

    const prompt = `Eres un talent acq manager experto en redacción persuasiva de ofertas de empleo.
Para la vacante "${title}":
Misión: ${mission || 'N/A'}
Funciones principales: ${functions ? JSON.stringify(functions) : 'N/A'}
Requisitos: ${requirements ? JSON.stringify(requirements) : 'N/A'}

Redacta contenido altamente optimizado y atractivo de la vacante para tres canales distintos. Toma en cuenta el tono de la audiencia:
1. "linkedin": Tono profesional pero dinámico, destacando impacto y logros.
2. "instagram": Tono cercano, ágil, visual (incluye sugerencia de imagen o copy para reel) y enfocado en la cultura del día a día.
3. "internal": Portal de referidos o portal interno, tono fraterno invitando a los colegas a correr la voz.

Responde ÚNICAMENTE con un JSON válido usando estrictamente este formato:
{
  "linkedin": "Texto para LinkedIn...",
  "instagram": "Texto para Instagram...",
  "internal": "Texto para portal interno..."
}`;

    const raw = await aiComplete({
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-sonnet-4-5',
      feature: 'vacancy_optimize',
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('La IA no devolvió JSON válido');
    
    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
