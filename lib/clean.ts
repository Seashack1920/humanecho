// Cleans pasted public-domain text before chunking/embedding.
// Strips Project Gutenberg boilerplate, transcriber cruft, and normalizes
// whitespace so only the actual work gets embedded. Best-effort and safe:
// if no known markers are found, the text passes through (only whitespace
// normalization + italics-underscore removal apply).

export function cleanReferenceText(raw: string): { text: string; removed: number; notes: string[] } {
  const notes: string[] = []
  let t = (raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const before = t.length

  // ── Project Gutenberg start/end banners (modern format) ──
  // "*** START OF THE PROJECT GUTENBERG EBOOK <TITLE> ***" and its END twin.
  const startRe = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i
  const endRe   = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i
  const sm = t.match(startRe)
  if (sm && sm.index != null) { t = t.slice(sm.index + sm[0].length); notes.push('Removed Gutenberg header') }
  const em = t.match(endRe)
  if (em && em.index != null) { t = t.slice(0, em.index); if (!notes.includes('Removed Gutenberg footer')) notes.push('Removed Gutenberg footer') }

  // ── Legacy Gutenberg footers ──
  const legacyEnd = /\n[ \t]*End of (?:the )?Project Gutenberg['’]?s?\b[\s\S]*$/i
  if (legacyEnd.test(t)) { t = t.replace(legacyEnd, ''); if (!notes.includes('Removed Gutenberg footer')) notes.push('Removed Gutenberg footer') }

  // ── Legacy "SMALL PRINT" preamble: cut everything up to its end marker ──
  const smallPrint = /\*END\*\s*THE SMALL PRINT![\s\S]*?(?:\n\n)/i
  if (smallPrint.test(t)) { t = t.replace(smallPrint, ''); if (!notes.includes('Removed Gutenberg header')) notes.push('Removed Gutenberg header') }

  // ── Transcriber / producer lines commonly left near the top ──
  t = t.replace(/^[ \t]*(?:Produced by|Transcribed by|E-?text prepared by|Updated editions will).*$/gim, '')
  if (/\bTranscriber['’]s Note\b/i.test(t)) {
    t = t.replace(/\bTranscriber['’]s Note[\s\S]*?(?:\n\n)/i, '')
    notes.push('Removed transcriber note')
  }

  // ── Illustration tags and standalone italics underscores ──
  if (/\[Illustration[^\]]*\]/i.test(t)) { t = t.replace(/\[Illustration[^\]]*\]/gi, ''); notes.push('Removed illustration tags') }
  t = t.replace(/_([^_\n]+)_/g, '$1') // _italics_ → italics

  // ── Whitespace: trim trailing spaces, collapse 3+ blank lines to one ──
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

  return { text: t, removed: Math.max(0, before - t.length), notes }
}
