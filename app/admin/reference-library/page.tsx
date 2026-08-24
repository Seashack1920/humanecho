'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/useCurrentUser'

const DOC_TYPES = [
  { value: 'novel_excerpt', label: 'Prose / Novel excerpt' },
  { value: 'song_lyrics', label: 'Song lyrics' },
  { value: 'poetry', label: 'Poetry' },
  { value: 'screenplay', label: 'Screenplay' },
  { value: 'stage_play', label: 'Stage play' },
]
const CRAFT = ['', 'structure', 'character_arc', 'pacing', 'prose', 'dialogue', 'theme', 'setting', 'voice']
const EXAMPLE_TYPES = ['', 'high_level_critique', 'revision_guidance', 'line_level_example', 'adaptation_potential']
const TIERS = [{ v: 'base', l: 'Base' }, { v: 'creator_plus', l: 'Creator+' }, { v: 'revisionist', l: 'Revisionist' }]

export default function ReferenceLibraryPage() {
  const { loading: authLoading, isAdmin } = useCurrentUser()
  const [form, setForm] = useState({ source: '', document_type: 'novel_excerpt', genre: '', craft_element: '', example_type: '', text: '' })
  const [tierSupport, setTierSupport] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [total, setTotal] = useState(0)
  const [sources, setSources] = useState<{ source: string; document_type: string; count: number }[]>([])

  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token
  const call = useCallback(async (body: any) => {
    const res = await fetch('/api/admin/reference', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Request failed')
    return data
  }, [])

  const loadList = useCallback(async () => {
    try { const d = await call({ action: 'list' }); setTotal(d.total); setSources(d.sources) } catch {}
  }, [call])

  useEffect(() => { if (isAdmin) loadList() }, [isAdmin, loadList])

  const ingest = async () => {
    setBusy(true); setErr(null); setMsg(null)
    try {
      const d = await call({ action: 'ingest', ...form, tier_support: tierSupport })
      const cleanBits = [
        ...(d.notes || []),
        d.removed ? `${d.removed.toLocaleString()} chars trimmed` : null,
      ].filter(Boolean)
      setMsg(`Ingested ${d.ingested} chunks from “${form.source}”.` + (cleanBits.length ? ` (Auto-cleaned: ${cleanBits.join(' · ')}.)` : ''))
      setForm(f => ({ ...f, source: '', text: '' })); setTierSupport([])
      loadList()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const del = async (source: string) => {
    if (!confirm(`Delete all chunks from “${source}”?`)) return
    try { await call({ action: 'delete', source }); loadList() } catch (e) { setErr((e as Error).message) }
  }
  const search = async () => {
    setSearching(true); setErr(null); setResults([])
    try { const d = await call({ action: 'search', query, document_type: searchType || null }); setResults(d.results || []) }
    catch (e) { setErr((e as Error).message) } finally { setSearching(false) }
  }

  const toggleTier = (v: string) => setTierSupport(t => t.includes(v) ? t.filter(x => x !== v) : [...t, v])

  if (authLoading) return <Shell><p style={muted}>Loading…</p></Shell>
  if (!isAdmin) return <Shell><p style={muted}>Admins only.</p></Shell>

  return (
    <Shell>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>Reference Library</h1>
      <p style={{ ...muted, fontSize: '14px', marginBottom: '8px' }}>
        Public-domain craft references that ground the Writing Coach and the story judge. {total} chunks stored.
      </p>
      <p style={{ ...muted, fontSize: '12px', marginBottom: '24px' }}>Requires <code>VOYAGE_API_KEY</code> in the environment for ingesting and searching.</p>

      {/* Ingest */}
      <div style={panel}>
        <h2 style={h2}>Add a reference work</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 240px' }}><label style={lbl}>Source</label>
            <input style={input} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. Pride and Prejudice — Jane Austen" /></div>
          <div style={{ flex: '1 1 160px' }}><label style={lbl}>Document type</label>
            <select style={input} value={form.document_type} onChange={e => setForm(f => ({ ...f, document_type: e.target.value }))}>{DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 150px' }}><label style={lbl}>Genre (optional)</label><input style={input} value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))} placeholder="literary, romance…" /></div>
          <div style={{ flex: '1 1 150px' }}><label style={lbl}>Craft element</label><select style={input} value={form.craft_element} onChange={e => setForm(f => ({ ...f, craft_element: e.target.value }))}>{CRAFT.map(c => <option key={c} value={c}>{c || '—'}</option>)}</select></div>
          <div style={{ flex: '1 1 150px' }}><label style={lbl}>Example type</label><select style={input} value={form.example_type} onChange={e => setForm(f => ({ ...f, example_type: e.target.value }))}>{EXAMPLE_TYPES.map(c => <option key={c} value={c}>{c || '—'}</option>)}</select></div>
        </div>
        <label style={lbl}>Available to tiers <span style={{ ...muted, fontWeight: 400 }}>(none = all tiers)</span></label>
        <div style={{ display: 'flex', gap: '14px', marginBottom: '10px' }}>
          {TIERS.map(t => <label key={t.v} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}><input type="checkbox" checked={tierSupport.includes(t.v)} onChange={() => toggleTier(t.v)} />{t.l}</label>)}
        </div>
        <label style={lbl}>Text</label>
        <textarea style={{ ...input, minHeight: '160px', resize: 'vertical', fontFamily: 'ui-monospace, monospace' }} value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="Paste the public-domain text — raw Project Gutenberg is fine (headers, footers, transcriber notes and illustration tags are stripped automatically). It's then chunked (stanzas for lyrics, scenes for scripts, paragraphs for prose) and embedded." />
        {err && <div style={{ color: '#dc3c3c', fontSize: '14px', margin: '10px 0' }}>{err}</div>}
        {msg && <div style={{ color: 'var(--accent-primary)', fontSize: '14px', margin: '10px 0' }}>{msg}</div>}
        <button onClick={ingest} disabled={busy} style={btn}>{busy ? 'Chunking & embedding…' : 'Ingest'}</button>
      </div>

      {/* Search / preview */}
      <div style={{ ...panel, marginTop: '24px' }}>
        <h2 style={h2}>Search the library</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '2 1 220px' }}><input style={{ ...input, marginBottom: 0 }} value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. how a scene builds tension" onKeyDown={e => e.key === 'Enter' && search()} /></div>
          <select style={{ ...input, width: 'auto', marginBottom: 0 }} value={searchType} onChange={e => setSearchType(e.target.value)}><option value="">Any type</option>{DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select>
          <button onClick={search} disabled={searching} style={btn}>{searching ? 'Searching…' : 'Search'}</button>
        </div>
        {results.map((r, i) => (
          <div key={r.id || i} style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <div style={{ ...muted, fontSize: '12px', marginBottom: '4px' }}>{r.source} · {r.craft_element || '—'} · {(r.similarity * 100).toFixed(0)}% match</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{(r.content || '').slice(0, 400)}{r.content?.length > 400 ? '…' : ''}</div>
          </div>
        ))}
      </div>

      {/* Library contents */}
      <div style={{ ...panel, marginTop: '24px' }}>
        <h2 style={h2}>In the library ({sources.length} works)</h2>
        {sources.length === 0 ? <p style={muted}>Nothing ingested yet.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sources.map(s => (
              <div key={s.source} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                <div style={{ flex: 1, minWidth: 0 }}><span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.source}</span> <span style={{ ...muted, fontSize: '12px' }}>· {s.document_type} · {s.count} chunks</span></div>
                <button onClick={() => del(s.source)} style={{ ...smallBtn, color: '#dc3c3c', borderColor: '#dc3c3c' }}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}><div style={{ maxWidth: '820px', margin: '0 auto', padding: '40px 20px 120px' }}>{children}</div></div>
}
const muted: React.CSSProperties = { color: 'var(--text-muted)' }
const panel: React.CSSProperties = { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px' }
const h2: React.CSSProperties = { fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }
const btn: React.CSSProperties = { padding: '10px 20px', borderRadius: '999px', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }
const smallBtn: React.CSSProperties = { padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }
