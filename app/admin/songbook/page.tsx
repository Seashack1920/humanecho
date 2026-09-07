'use client'

/**
 * Admin → Songbook.
 * Compiles every track's lyrics (text_content where type = 'lyrics') into a
 * songbook, grouped by artist → album, with a contents list. Export as Markdown
 * or print to PDF. Regenerates live, so it stays current as songs are added.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Song = {
  id: string; title: string; lyrics: string; status: string | null
  artistId: string | null; artistName: string; albumId: string | null; albumTitle: string; track_number: number | null
}
type Block = { label: string; isSingles: boolean; songs: Song[] }
type Group = { artistName: string; blocks: Block[] }

export default function Songbook() {
  const [songs, setSongs]     = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [publishedOnly, setPublishedOnly] = useState(false)
  const [generatedAt, setGeneratedAt]     = useState('')

  useEffect(() => {
    ;(async () => {
      const [trk, art, alb] = await Promise.all([
        supabase.from('tracks').select('id, title, text_content, status, artist_id, album_id, track_number')
          .eq('text_content_type', 'lyrics').is('deleted_at', null),
        supabase.from('artists').select('id, name'),
        supabase.from('albums').select('id, title'),
      ])
      const aName: Record<string, string> = {}; for (const a of art.data || []) aName[a.id] = a.name
      const alTitle: Record<string, string> = {}; for (const a of alb.data || []) alTitle[a.id] = a.title
      const list: Song[] = ((trk.data as any[]) || [])
        .filter(t => t.text_content && String(t.text_content).trim())
        .map(t => ({
          id: t.id, title: t.title || '(untitled)', lyrics: String(t.text_content), status: t.status,
          artistId: t.artist_id, artistName: t.artist_id ? (aName[t.artist_id] || 'Unknown') : 'Unattributed',
          albumId: t.album_id, albumTitle: t.album_id ? (alTitle[t.album_id] || 'Album') : 'Singles', track_number: t.track_number,
        }))
      setSongs(list)
      setGeneratedAt(new Date().toLocaleString())
      setLoading(false)
    })()
  }, [])

  const view = publishedOnly ? songs.filter(s => s.status === 'published') : songs

  // Group: artist → (albums sorted, then a Singles block), songs by track_number then title.
  const groups: Group[] = (() => {
    const byArtist: Record<string, Song[]> = {}
    for (const s of view) (byArtist[s.artistName] ||= []).push(s)
    return Object.keys(byArtist).sort((a, b) => a.localeCompare(b)).map(artistName => {
      const items = byArtist[artistName]
      const byBlock: Record<string, Song[]> = {}
      for (const s of items) (byBlock[s.albumTitle] ||= []).push(s)
      const labels = Object.keys(byBlock).sort((a, b) => (a === 'Singles' ? 1 : b === 'Singles' ? -1 : a.localeCompare(b)))
      const blocks: Block[] = labels.map(label => ({
        label, isSingles: label === 'Singles',
        songs: byBlock[label].sort((a, b) => (a.track_number ?? 999) - (b.track_number ?? 999) || a.title.localeCompare(b.title)),
      }))
      return { artistName, blocks }
    })
  })()

  // Assign running numbers in book order.
  const numbered: { n: number; song: Song }[] = []
  for (const g of groups) for (const b of g.blocks) for (const s of b.songs) numbered.push({ n: numbered.length + 1, song: s })
  const numberOf = (id: string) => numbered.find(x => x.song.id === id)?.n || 0
  const total = numbered.length

  const downloadMd = () => {
    let out = `# Human Echo — Songbook\n\n_${total} songs · compiled ${generatedAt}${publishedOnly ? ' · published only' : ''}_\n`
    for (const g of groups) {
      out += `\n\n## ${g.artistName}\n`
      for (const b of g.blocks) {
        out += `\n### ${b.label}\n`
        for (const s of b.songs) {
          out += `\n**${numberOf(s.id)}. ${s.title}**\n\n`
          out += s.lyrics.split('\n').map(l => l.trimEnd()).join('  \n') + '\n'
        }
      }
    }
    const blob = new Blob([out], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `human-echo-songbook-${new Date().toISOString().slice(0, 10)}.md`
    a.click(); URL.revokeObjectURL(url)
  }

  const printPDF = () => {
    const esc = (s: string) => (s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
    const toc = groups.map(g =>
      `<div class="toc-artist">${esc(g.artistName)}</div>` +
      g.blocks.map(b => b.songs.map(s => `<div class="toc-row"><span>${numberOf(s.id)}. ${esc(s.title)}</span><span class="toc-alb">${esc(b.label)}</span></div>`).join('')).join('')
    ).join('')
    const body = groups.map(g =>
      `<section class="artist"><h2>${esc(g.artistName)}</h2>` +
      g.blocks.map(b => `<h3>${esc(b.label)}</h3>` + b.songs.map(s =>
        `<article class="song"><div class="song-h"><span class="num">${numberOf(s.id)}</span><h4>${esc(s.title)}</h4></div><pre>${esc(s.lyrics)}</pre></article>`
      ).join('')).join('') + `</section>`
    ).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Human Echo — Songbook</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=EB+Garamond:ital@0;1&display=swap');
        * { box-sizing: border-box; }
        body { font-family: "EB Garamond", Georgia, serif; color: #1a1a1a; margin: 40px; line-height: 1.5; }
        h1.title { font-family: "Playfair Display", serif; font-size: 40px; text-align: center; margin: 40px 0 4px; }
        .subtitle { text-align: center; color: #666; font-size: 13px; margin-bottom: 40px; }
        .toc-title, h2 { font-family: "Playfair Display", serif; }
        .toc-title { font-size: 22px; margin: 0 0 12px; }
        .toc-artist { font-weight: 700; margin: 14px 0 4px; font-size: 15px; }
        .toc-row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; padding: 1px 0; }
        .toc-alb { color: #888; font-style: italic; white-space: nowrap; }
        .artist { page-break-before: always; }
        h2 { font-size: 26px; border-bottom: 2px solid #1a1a1a; padding-bottom: 4px; margin: 0 0 6px; }
        h3 { font-family: "Playfair Display", serif; font-size: 16px; color: #555; font-style: italic; margin: 18px 0 8px; }
        .song { page-break-inside: avoid; margin: 0 0 22px; }
        .song-h { display: flex; align-items: baseline; gap: 10px; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-bottom: 8px; }
        .num { font-family: "Playfair Display", serif; color: #b8863a; font-size: 15px; min-width: 24px; }
        h4 { font-family: "Playfair Display", serif; font-size: 19px; margin: 0; }
        pre { font-family: "EB Garamond", Georgia, serif; white-space: pre-wrap; font-size: 14px; margin: 0; line-height: 1.55; }
        @media print { body { margin: 16mm; } }
      </style></head><body>
        <h1 class="title">Human Echo — Songbook</h1>
        <div class="subtitle">${total} songs · compiled ${esc(generatedAt)}${publishedOnly ? ' · published only' : ''}</div>
        <div class="toc-title">Contents</div>${toc}
        ${body}
        <script>window.onload = () => window.print()</script>
      </body></html>`
    const w = window.open('', '_blank')
    if (!w) { alert('Please allow pop-ups to print the songbook.'); return }
    w.document.open(); w.document.write(html); w.document.close()
  }

  if (loading) return <div style={{ ...s.page, color: 'var(--text-muted)', textAlign: 'center', paddingTop: '80px' }}>Compiling songbook…</div>

  return (
    <div style={s.page}>
      <div style={s.navRow}>
        <div>
          <h1 style={s.h1}>Songbook</h1>
          <p style={s.subtitle}>{total} songs with lyrics · compiled {generatedAt}</p>
        </div>
        <Link href="/admin/content" style={s.link}>← Content</Link>
      </div>

      <div style={s.toolbar}>
        <label style={s.check}><input type="checkbox" checked={publishedOnly} onChange={e => setPublishedOnly(e.target.checked)} /> Published only</label>
        <div style={{ flex: 1 }} />
        <button style={s.btnSecondary} onClick={downloadMd}>⬇ Markdown</button>
        <button style={s.btn} onClick={printPDF}>🖨 Print / PDF</button>
      </div>

      {total === 0 ? <div style={s.empty}>No songs with lyrics yet.</div> : groups.map(g => (
        <div key={g.artistName} style={{ marginBottom: '34px' }}>
          <h2 style={s.h2}>{g.artistName}</h2>
          {g.blocks.map(b => (
            <div key={b.label} style={{ marginBottom: '18px' }}>
              <div style={s.blockLabel}>{b.label}</div>
              {b.songs.map(song => (
                <div key={song.id} style={s.song}>
                  <div style={s.songHead}>
                    <span style={s.num}>{numberOf(song.id)}</span>
                    <span style={s.songTitle}>{song.title}</span>
                    {song.status !== 'published' && <span style={s.draft}>{song.status || 'draft'}</span>}
                  </div>
                  <pre style={s.lyrics}>{song.lyrics}</pre>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: '760px', margin: '0 auto', padding: '32px 24px 80px', fontFamily: 'DM Sans, sans-serif' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '18px' },
  h1: { fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0' },
  link: { fontSize: '14px', color: 'var(--accent-primary)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 },
  toolbar: { display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '26px', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-secondary)' },
  check: { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' },
  btn: { padding: '9px 16px', borderRadius: '999px', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '9px 16px', borderRadius: '999px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  h2: { fontFamily: 'Playfair Display, serif', fontSize: '23px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', borderBottom: '2px solid var(--border)', paddingBottom: '6px' },
  blockLabel: { fontFamily: 'Playfair Display, serif', fontSize: '15px', fontStyle: 'italic', color: 'var(--text-muted)', margin: '10px 0 10px' },
  song: { marginBottom: '20px' },
  songHead: { display: 'flex', alignItems: 'baseline', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' },
  num: { fontFamily: 'Playfair Display, serif', color: 'var(--accent-gold)', fontSize: '15px', minWidth: '22px' },
  songTitle: { fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' },
  draft: { marginLeft: 'auto', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '999px', padding: '1px 8px' },
  lyrics: { whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 },
  empty: { fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px 0' },
}
