import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { embed } from '@/lib/voyage'
import { chunkText } from '@/lib/chunk'
import { cleanReferenceText } from '@/lib/clean'

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key')
)

const vecLiteral = (e: number[]) => `[${e.join(',')}]`
const words = (s: string) => s.split(/\s+/).filter(Boolean).length

async function requireAdmin(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false as const, res: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }) }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { ok: false as const, res: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }) }
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (prof?.role !== 'admin') return { ok: false as const, res: NextResponse.json({ error: 'Admins only.' }, { status: 403 }) }
  return { ok: true as const }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.res

  try {
    const b = await req.json()
    const action = b.action

    // ── List library (grouped by source, computed in the route) ──
    if (action === 'list') {
      const { data } = await supabase.from('pd_reference_chunks')
        .select('source, document_type').limit(5000)
      const map = new Map<string, { source: string; document_type: string; count: number }>()
      for (const r of (data as any[]) || []) {
        const k = r.source || '(untitled)'
        const cur = map.get(k) || { source: k, document_type: r.document_type, count: 0 }
        cur.count++; map.set(k, cur)
      }
      return NextResponse.json({ total: (data || []).length, sources: [...map.values()].sort((a, b) => b.count - a.count) })
    }

    // ── Semantic search / preview ──
    if (action === 'search') {
      if (!b.query?.trim()) return NextResponse.json({ error: 'Enter a search query.' }, { status: 400 })
      const [emb] = await embed([b.query], 'query')
      const { data, error } = await supabase.rpc('match_pd_chunks', {
        query_embedding: emb, match_count: 8,
        p_document_type: b.document_type || null, p_tier: null,
      })
      if (error) throw error
      return NextResponse.json({ results: data || [] })
    }

    // ── Delete a source ──
    if (action === 'delete') {
      if (!b.source) return NextResponse.json({ error: 'Missing source.' }, { status: 400 })
      await supabase.from('pd_reference_chunks').delete().eq('source', b.source)
      return NextResponse.json({ ok: true })
    }

    // ── Ingest: chunk → embed → store ──
    if (action === 'ingest') {
      const { text, document_type, genre, craft_element, example_type, source } = b
      if (!text?.trim() || !source?.trim() || !document_type) {
        return NextResponse.json({ error: 'Text, source, and document type are required.' }, { status: 400 })
      }
      const tierSupport: string[] | null = Array.isArray(b.tier_support) && b.tier_support.length ? b.tier_support : null
      // Strip Gutenberg/boilerplate so only the work itself gets embedded.
      const cleaned = cleanReferenceText(text)
      if (!cleaned.text.trim()) return NextResponse.json({ error: 'Nothing left after cleaning — check the pasted text.' }, { status: 400 })
      const chunks = chunkText(cleaned.text, document_type)
      if (!chunks.length) return NextResponse.json({ error: 'No chunks produced from that text.' }, { status: 400 })

      const embeddings: number[][] = []
      for (let i = 0; i < chunks.length; i += 64) {
        const e = await embed(chunks.slice(i, i + 64), 'document')
        embeddings.push(...e)
      }
      const rows = chunks.map((content, i) => ({
        content,
        embedding: vecLiteral(embeddings[i]),
        genre: genre || null,
        document_type,
        craft_element: craft_element || null,
        tier_support: tierSupport,
        example_type: example_type || null,
        source,
        token_count: Math.round(words(content) * 1.3),
      }))
      const { error } = await supabase.from('pd_reference_chunks').insert(rows)
      if (error) throw error
      return NextResponse.json({ ok: true, ingested: rows.length, removed: cleaned.removed, notes: cleaned.notes })
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (err) {
    console.error('Reference library error:', err)
    return NextResponse.json({ error: (err as Error).message || 'Something went wrong.' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120
