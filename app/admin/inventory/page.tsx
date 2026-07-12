'use client'

/**
 * Admin → Track Inventory.
 *
 * Compiles a full catalog of every track, grouped by artist and sorted by
 * track name, with album/type/status/duration. Export as Markdown (.md) or
 * print to PDF (opens a clean print window — "Save as PDF" in the dialog).
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Track = { id: string; title: string; artist_id: string | null; album_id: string | null; track_type: string | null; status: string | null; duration: string | null; content_origin: string | null }
type Group = { artistId: string; name: string; tracks: (Track & { albumTitle: string })[] }

const ORIGIN: Record<string, string> = { '100% human': 'Human', 'human+ai': 'Human+AI', 'ai generated': 'AI' }

export default function TrackInventory() {
  const [groups, setGroups]   = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [publishedOnly, setPublishedOnly] = useState(false)
  const [generatedAt, setGeneratedAt]     = useState('')

  useEffect(() => {
    ;(async () => {
      const [{ data: artists }, { data: albums }, { data: tracks }] = await Promise.all([
        supabase.from('artists').select('id, name').order('name'),
        supabase.from('albums').select('id, title').is('deleted_at', null),
        supabase.from('tracks').select('id, title, artist_id, album_id, track_type, status, duration, content_origin').is('deleted_at', null),
      ])
      const albumTitle: Record<string, string> = {}
      for (const a of albums || []) albumTitle[a.id] = a.title
      const byArtist: Record<string, Group> = {}
      for (const a of artists || []) byArtist[a.id] = { artistId: a.id, name: a.name, tracks: [] }
      for (const t of (tracks as Track[]) || []) {
        if (!t.artist_id || !byArtist[t.artist_id]) continue
        byArtist[t.artist_id].tracks.push({ ...t, albumTitle: t.album_id ? (albumTitle[t.album_id] || 'Album') : 'Single' })
      }
      const list = Object.values(byArtist)
        .map(g => ({ ...g, tracks: g.tracks.sort((a, b) => a.title.localeCompare(b.title)) }))
        .filter(g => g.tracks.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
      setGroups(list)
      setGeneratedAt(new Date().toLocaleString())
      setLoading(false)
    })()
  }, [])

  const view = publishedOnly
    ? groups.map(g => ({ ...g, tracks: g.tracks.filter(t => t.status === 'published') })).filter(g => g.tracks.length > 0)
    : groups

  const totalTracks = view.reduce((n, g) => n + g.tracks.length, 0)
  const scopeLabel  = publishedOnly ? 'Published tracks only' : 'All tracks (incl. drafts & private)'

  // ── Markdown export ──
  const md = () => {
    const esc = (s: string) => (s || '').replace(/\|/g, '\\|')
    let out = `# Human Echo — Track Inventory\n\n`
    out += `_Generated ${generatedAt} · ${totalTracks} tracks · ${view.length} artists · ${scopeLabel}_\n`
    for (const g of view) {
      out += `\n## ${g.name} (${g.tracks.length})\n\n`
      out += `| # | Track | Album | Type | Status | Duration |\n|---:|---|---|---|---|---|\n`
      g.tracks.forEach((t, i) => {
        out += `| ${i + 1} | ${esc(t.title)} | ${esc(t.albumTitle)} | ${esc(t.track_type || '')} | ${esc(t.status || '')} | ${esc(t.duration || '—')} |\n`
      })
    }
    return out
  }
  const downloadMd = () => {
    const blob = new Blob([md()], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `human-echo-track-inventory-${new Date().toISOString().slice(0, 10)}.md`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── Print / PDF (clean standalone window) ──
  const printPDF = () => {
    const esc = (s: string) => (s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
    const rows = view.map(g => `
      <h2>${esc(g.name)} <span class="count">${g.tracks.length}</span></h2>
      <table>
        <thead><tr><th class="n">#</th><th>Track</th><th>Album</th><th>Type</th><th>Status</th><th>Duration</th></tr></thead>
        <tbody>${g.tracks.map((t, i) => `<tr><td class="n">${i + 1}</td><td>${esc(t.title)}</td><td>${esc(t.albumTitle)}</td><td>${esc(t.track_type || '')}</td><td>${esc(t.status || '')}</td><td>${esc(t.duration || '—')}</td></tr>`).join('')}</tbody>
      </table>`).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Human Echo — Track Inventory</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; margin: 32px; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .sub { color: #666; font-size: 12px; margin-bottom: 20px; }
        h2 { font-size: 15px; margin: 22px 0 6px; border-bottom: 2px solid #111; padding-bottom: 3px; page-break-after: avoid; }
        .count { color: #888; font-weight: 400; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 4px; }
        th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
        th { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #666; }
        td.n, th.n { width: 32px; color: #999; text-align: right; }
        tr { page-break-inside: avoid; }
        @media print { body { margin: 12mm; } }
      </style></head>
      <body>
        <h1>Human Echo — Track Inventory</h1>
        <div class="sub">Generated ${esc(generatedAt)} · ${totalTracks} tracks · ${view.length} artists · ${esc(scopeLabel)}</div>
        ${rows}
        <script>window.onload = () => { window.print(); }</script>
      </body></html>`
    const w = window.open('', '_blank')
    if (!w) { alert('Please allow pop-ups to print the inventory.'); return }
    w.document.open(); w.document.write(html); w.document.close()
  }

  if (loading) return <div style={{ ...s.page, color: 'var(--text-muted)', textAlign: 'center', paddingTop: '80px' }}>Compiling inventory…</div>

  return (
    <div style={s.page}>
      <div style={s.navRow}>
        <div>
          <h1 style={s.h1}>Track Inventory</h1>
          <p style={s.subtitle}>{totalTracks} tracks · {view.length} artists · generated {generatedAt}</p>
        </div>
        <Link href="/admin/content" style={s.link}>← Content</Link>
      </div>

      <div style={s.toolbar}>
        <label style={s.check}>
          <input type="checkbox" checked={publishedOnly} onChange={e => setPublishedOnly(e.target.checked)} />
          Published only
        </label>
        <div style={{ flex: 1 }} />
        <button style={s.btnSecondary} onClick={downloadMd}>⬇ Markdown</button>
        <button style={s.btn} onClick={printPDF}>🖨 Print / PDF</button>
      </div>

      {view.length === 0 ? (
        <div style={s.empty}>No tracks match.</div>
      ) : view.map(g => (
        <div key={g.artistId} style={{ marginBottom: '28px' }}>
          <h2 style={s.h2}>{g.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '13px' }}>{g.tracks.length}</span></h2>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width: '36px', textAlign: 'right' }}>#</th>
                  <th style={s.th}>Track</th>
                  <th style={s.th}>Album</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Status</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {g.tracks.map((t, i) => (
                  <tr key={t.id}>
                    <td style={{ ...s.td, textAlign: 'right', color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ ...s.td, fontWeight: 500 }}>{t.title}</td>
                    <td style={{ ...s.td, color: t.albumTitle === 'Single' ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{t.albumTitle}</td>
                    <td style={s.td}>{t.track_type || '—'}</td>
                    <td style={s.td}><span style={badge(t.status)}>{t.status || 'draft'}</span></td>
                    <td style={{ ...s.td, textAlign: 'right', color: 'var(--text-muted)' }}>{t.duration || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

const badge = (status: string | null): React.CSSProperties => ({
  fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
  background: status === 'published' ? 'rgba(52,168,83,0.14)' : status === 'private' ? 'rgba(196,162,101,0.14)' : 'rgba(150,150,150,0.14)',
  color: status === 'published' ? '#34a853' : status === 'private' ? 'var(--accent-gold)' : 'var(--text-muted)',
})

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: '900px', margin: '0 auto', padding: '32px 24px 80px', fontFamily: 'DM Sans, sans-serif' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '18px' },
  h1: { fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0' },
  link: { fontSize: '14px', color: 'var(--accent-primary)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 },
  toolbar: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-secondary)' },
  check: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' },
  btn: { padding: '9px 16px', borderRadius: '999px', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '9px 16px', borderRadius: '999px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  h2: { fontFamily: 'Playfair Display, serif', fontSize: '19px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px', display: 'flex', alignItems: 'baseline', gap: '8px' },
  tableWrap: { border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' },
  td: { padding: '9px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' },
  empty: { fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px 0' },
}
