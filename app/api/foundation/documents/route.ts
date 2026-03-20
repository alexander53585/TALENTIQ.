import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/foundation/orgId'

const MAX_SIZE    = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
]

/* ── GET — listar documentos de la org ────────────────── */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ data: [] })

  const { data, error } = await supabase
    .from('strategic_documents')
    .select('id, name, document_type, file_size, mime_type, ai_analysis, utility_score, analyzed_at, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

/* ── POST — upload + registro ─────────────────────────── */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  // Parse multipart form
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'FormData inválido' }, { status: 400 })

  const file         = form.get('file') as File | null
  const documentType = (form.get('document_type') as string) ?? 'other'

  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'El archivo supera los 10 MB' }, { status: 413 })
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido. Usa PDF, DOCX o TXT.' }, { status: 415 })
  }

  // Build storage path
  const ext       = file.name.split('.').pop() ?? 'bin'
  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path      = `${orgId}/strategic/${Date.now()}_${safeName}`

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Upload to Storage
  const { error: storageErr } = await supabase.storage
    .from('kulturh-docs')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (storageErr) return NextResponse.json({ error: storageErr.message }, { status: 500 })

  // Register in DB
  const { data, error: dbErr } = await supabase
    .from('strategic_documents')
    .insert({
      organization_id: orgId,
      user_id:         user.id,
      name:            file.name,
      document_type:   documentType,
      storage_path:    path,
      file_size:       file.size,
      mime_type:       file.type,
    })
    .select()
    .single()

  if (dbErr) {
    // Rollback storage upload
    void supabase.storage.from('kulturh-docs').remove([path])
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

/* ── DELETE — eliminar documento ──────────────────────── */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  // Get storage_path before deleting
  const { data: doc } = await supabase
    .from('strategic_documents')
    .select('storage_path')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

  // Delete from storage and DB in parallel
  await Promise.all([
    supabase.storage.from('kulturh-docs').remove([doc.storage_path]),
    supabase.from('strategic_documents').delete().eq('id', id).eq('organization_id', orgId),
  ])

  return NextResponse.json({ ok: true })
}
