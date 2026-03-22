import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getRequestContext } from '@/lib/auth/requestContext'
import { toErrorResponse } from '@/lib/moments/errors'

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ANALYSIS_PROMPT = `Eres un consultor experto en estrategia organizacional y cultura.
Analiza el siguiente documento corporativo y extrae la información relevante.

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "valores_detectados": ["string"],
  "ejes_estrategicos": ["string"],
  "capacidades_requeridas": ["string"],
  "tono_cultural": "string",
  "prioridades": ["string"],
  "riesgos": ["string"],
  "utilidad_score": 1,
  "resumen_ejecutivo": "string"
}

Instrucciones:
- valores_detectados: valores organizacionales mencionados o implícitos (máx 10)
- ejes_estrategicos: iniciativas o focos estratégicos del período (máx 8)
- capacidades_requeridas: competencias y habilidades que el doc demanda (máx 8)
- tono_cultural: 1 oración describiendo el estilo cultural que transmite el documento
- prioridades: lista ordenada de prioridades mencionadas (máx 6)
- riesgos: riesgos o desafíos identificados (máx 5)
- utilidad_score: del 1 al 5, qué tan útil es este doc para configurar el perfil cultural (1=poco, 5=muy útil)
- resumen_ejecutivo: síntesis de los hallazgos más relevantes en 3–4 oraciones

NO incluyas texto fuera del JSON. NO uses markdown. Solo el objeto JSON.`

/* ── Extrae texto del documento según su tipo ─────────── */
async function extractText(buffer: Buffer, mimeType: string): Promise<{ text?: string; pdf?: string }> {
  // TXT / Markdown — lectura directa
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return { text: buffer.toString('utf-8').slice(0, 80000) }
  }

  // PDF — base64 para Claude document API
  if (mimeType === 'application/pdf') {
    return { pdf: buffer.toString('base64') }
  }

  // DOCX — extraer texto del XML sin librerías externas
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      // DOCX es un ZIP — buscar word/document.xml como secuencia de bytes
      const str = buffer.toString('binary')
      // Buscar el contenido XML de word/document.xml
      const xmlStart = str.indexOf('<w:body')
      const xmlEnd   = str.indexOf('</w:body>')
      if (xmlStart > -1 && xmlEnd > -1) {
        const xml = str.slice(xmlStart, xmlEnd + 9)
        // Eliminar tags XML, conservar texto
        const cleaned = xml
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 80000)
        return { text: cleaned }
      }
    } catch { /* fallback */ }
    return { text: '[Documento DOCX — contenido no extraíble automáticamente. Usa PDF o TXT para mejor análisis.]' }
  }

  return { text: '[Tipo de archivo no reconocido]' }
}

/* ── POST /api/foundation/documents/[id]/analyze ─────── */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId, userId } = await getRequestContext()
    const supabase = await createClient()

    // Obtener registro del documento (filtrando por org para aislamiento tenant)
    const { data: doc, error: docErr } = await supabase
      .from('strategic_documents')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .single()

    if (docErr || !doc) return NextResponse.json({ error: 'Documento no encontrado', code: 'NOT_FOUND' }, { status: 404 })

    // Descargar archivo desde Storage
    const { data: blob, error: dlErr } = await supabase.storage
      .from('kulturh-docs')
      .download(doc.storage_path)

    if (dlErr || !blob) return NextResponse.json({ error: 'No se pudo descargar el archivo', code: 'INTERNAL_ERROR' }, { status: 500 })

    const buffer = Buffer.from(await blob.arrayBuffer())
    const { text, pdf } = await extractText(buffer, doc.mime_type ?? 'text/plain')

    // Construir mensaje para Claude según tipo
    let message: Anthropic.MessageParam

    if (pdf) {
      message = {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdf },
          } as any,
          { type: 'text', text: ANALYSIS_PROMPT },
        ],
      }
    } else {
      message = {
        role: 'user',
        content: `${ANALYSIS_PROMPT}\n\n== CONTENIDO DEL DOCUMENTO: ${doc.name} ==\n\n${text}`,
      }
    }

    // Llamar a Claude
    const response = await claude.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1500,
      system:     'Eres un consultor de cultura organizacional. Respondes siempre en español con JSON puro, sin texto adicional.',
      messages:   [message],
    })

    const raw = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('')

    // Parsear JSON del análisis
    let analysis: Record<string, any>
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
    } catch {
      return NextResponse.json({ error: 'La IA no devolvió un análisis válido. Intenta nuevamente.', code: 'INTERNAL_ERROR' }, { status: 422 })
    }

    // Guardar análisis en DB
    const { data: updated, error: updateErr } = await supabase
      .from('strategic_documents')
      .update({
        ai_analysis:   analysis,
        utility_score: analysis.utilidad_score ?? null,
        analyzed_at:   new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (updateErr) throw new Error(updateErr.message)

    // Loguear uso IA (fire-and-forget)
    void supabase.from('ai_usage').insert({
      organization_id: orgId,
      user_id:         userId,
      feature:         'document_analysis',
      input_tokens:    response.usage?.input_tokens  ?? 0,
      output_tokens:   response.usage?.output_tokens ?? 0,
    })

    return NextResponse.json({ data: updated })

  } catch (err) {
    return toErrorResponse(err)
  }
}
