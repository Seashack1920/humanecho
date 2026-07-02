// Format-aware chunking for public-domain reference works.
// Lyrics/poetry → stanzas; screenplays/plays → scenes; prose → overlapping paragraphs.

const words = (s: string) => s.split(/\s+/).filter(Boolean).length

function mergeSmall(parts: string[], maxWords: number): string[] {
  const out: string[] = []; let cur = ''; let count = 0
  for (const p of parts) {
    const w = words(p)
    if (count + w > maxWords && cur) { out.push(cur); cur = p; count = w }
    else { cur = cur ? `${cur}\n\n${p}` : p; count += w }
  }
  if (cur) out.push(cur)
  return out
}

function paragraphChunks(t: string, targetWords = 450, overlapWords = 60): string[] {
  const paras = t.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  const chunks: string[] = []; let cur: string[] = []; let count = 0
  for (const p of paras) {
    const w = words(p)
    if (count + w > targetWords && cur.length) {
      chunks.push(cur.join('\n\n'))
      const tail = cur.join(' ').split(/\s+/).slice(-overlapWords).join(' ')  // overlap for context continuity
      cur = tail ? [tail] : []; count = words(tail)
    }
    cur.push(p); count += w
  }
  if (cur.length) chunks.push(cur.join('\n\n'))
  return chunks
}

export function chunkText(text: string, documentType: string): string[] {
  const t = (text || '').replace(/\r\n/g, '\n').trim()
  if (!t) return []
  if (documentType === 'song_lyrics' || documentType === 'poetry') {
    return t.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)                      // stanzas
  }
  if (documentType === 'screenplay' || documentType === 'stage_play') {
    const scenes = t.split(/\n(?=(?:INT\.|EXT\.|INT\/EXT|SCENE|ACT|Scene|Act)\b)/)
    if (scenes.length > 1) return mergeSmall(scenes.map(s => s.trim()).filter(Boolean), 1200)
    return paragraphChunks(t)
  }
  return paragraphChunks(t)                                                            // prose
}
