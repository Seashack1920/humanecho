import { createClient } from '@supabase/supabase-js'
import { embed, isVoyageConfigured } from './voyage'

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key')
)

export type RagChunk = { id: string; content: string; source: string; craft_element: string; document_type: string; similarity: number }

// Best-effort retrieval: any failure (no key, network, empty library) returns []
// so callers fall back cleanly to model-only. Never throws.
export async function retrieveChunks(opts: { queryText: string; tier?: string; documentType?: string | null; count?: number }): Promise<RagChunk[]> {
  try {
    if (!isVoyageConfigured() || !opts.queryText?.trim()) return []
    const q = opts.queryText.split(/\s+/).slice(0, 1500).join(' ')  // cap the query size
    const [emb] = await embed([q], 'query')
    if (!emb) return []
    const { data, error } = await supabase.rpc('match_pd_chunks', {
      query_embedding: emb,
      match_count: opts.count ?? 6,
      p_document_type: opts.documentType ?? null,
      p_tier: opts.tier ?? null,
    })
    if (error) { console.error('match_pd_chunks error:', error); return [] }
    return (data as RagChunk[]) || []
  } catch (e) {
    console.error('RAG retrieve failed (continuing model-only):', e)
    return []
  }
}

// Renders retrieved chunks into a reference block for the system prompt, with a
// strict citation + no-reproduction instruction.
export function chunksToReferenceBlock(chunks: RagChunk[]): string {
  if (!chunks.length) return ''
  const items = chunks.map((c, i) =>
    `[Ref ${i + 1} — ${c.source || 'public-domain reference'}${c.craft_element ? `, on ${c.craft_element}` : ''}]\n${c.content}`
  ).join('\n\n')
  return `\n\nYou may draw on these public-domain craft references to ground and illustrate your feedback. When a specific reference informs a point, cite it by its source name (e.g. "as in ${chunks[0].source || 'the reference'}"). These are teaching examples only — do NOT reproduce them at length or present them as the writer's work.\n\n===== PUBLIC-DOMAIN REFERENCES =====\n${items}\n===== END REFERENCES =====`
}
