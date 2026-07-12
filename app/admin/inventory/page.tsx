'use client'

/**
 * Admin → Content Inventory.
 *
 * Full catalog of tracks, albums, stories and films, organized by artist and
 * sorted by title, with a summary (per-type totals, status & origin breakdown).
 * Export as Markdown (.md) or print to PDF (opens a clean print window).
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Item = {
  id: string; title: string; artistId: string | null; name: string
  status: string | null; content_origin: string | null
  albumTitle?: string; track_type?: string | null; album_type?: string | null
  story_type?: string | null; film_type?: string | null
  duration?: string | null; price?: number | null
  read_time_minutes?: number | null; runtime_minutes?: number | null
}
type SectionKey = 'track' | 'album' | 'story' | 'film'

const ORIGIN: Record<string, string> = { '100% human': 'Human', 'human+ai': 'Human+AI', 'ai generated': 'AI' }
const originLabel = (o: string | null) => (o && ORIGIN[o]) || 'Other'

const SECTIONS: { key: SectionKey; label: string; cols: string[]; cell: (it: Item) => string[] }[] = [
  { key: 'track', label: 'Tracks', cols: ['Track', 'Album', 'Type', 'Status', 'Duration'],
    cell: it => [it.title, it.albumTitle || '—', it.track_type || '—', it.status || 'draft', it.duration || '—'] },
  { key: 'album', label: 'Albums', cols: ['Album', 'Type', 'Status', 'Price'],
    cell: it => [it.title, it.album_type || '—', it.status || 'draft', it.price != null ? `$${it.price}` : '—'] },
  { key: 'story', label: 'Stories', cols: ['Story', 'Type', 'Status', 'Read'],
    cell: it => [it.title, it.story_type || '—', it.status || 'draft', it.read_time_minutes ? `${it.read_time_minutes} min` : '—'] },
  { key: 'film', label: 'Films', cols: ['Film', 'Type', 'Status', 'Runtime'],
    cell: it => [it.title, it.film_type || '—', it.status || 'draft', it.runtime_minutes ? `${it.runtime_minutes} min` : '—'] },
]

export default function ContentInventory() {
  const [data, setData]       = useState<Record<SectionKey, Item[]>>({ track: [], album: [], story: [], film: [] })
  const [loading, setLoading] = useState(true)
  const [publishedOnly, setPublishedOnly] = useState(false)
  const [include, setInclude] = useState<Record<SectionKey, boolean>>({ track: true, album: true, story: true, film: true })
  const [generatedAt, setGeneratedAt]     = useState('')

  useEffect(() => {
    ;(async () => {
      const [artistsR, albumsR, tracksR, storiesR, filmsR] = await Promise.all([
        supabase.from('artists').select('id, name').order('name'),
        supabase.from('albums').select('id, title, artist_id, album_type, status, content_origin, price').is('deleted_at', null),
        supabase.from('tracks').select('id, title, artist_id, album_id, track_type, status, content_origin, duration').is('deleted_at', null),
        supabase.from('stories').select('id, title, artist_id, story_type, status, content_origin, read_time_minutes').is('deleted_at', null),
        supabase.from('films').select('id, title, artist_id, film_type, status, content_origin, runtime_minutes').is('deleted_at', null),
      ])
      const aName: Record<string, string> = {}
      for (const a of artistsR.data || []) aName[a.id] = a.name
      const albumTitle: Record<string, string> = {}
      for (const al of albumsR.data || []) albumTitle[al.id] = al.title

      const nm = (id: string | null) => (id && aName[id]) || 'Unattributed'
      const mk = (r: any, extra: Partial<Item>): Item => ({
        id: r.id, title: r.title || '(untitled)', artistId: r.artist_id, name: nm(r.artist_id),
        status: r.status, content_origin: r.content_origin, ...extra,
      })

      setData({
        track: (tracksR.data || []).map(r => mk(r, { albumTitle: r.album_id ? (albumTitle[r.album_id] || 'Album') : 'Single', track_type: r.track_type, duration: r.duration })),
        album: (albumsR.data || []).map(r => mk(r, { album_type: r.album_type, price: r.price })),
        story: (storiesR.data || []).map(r => mk(r, { story_type: r.story_type, read_time_minutes: r.read_time_minutes })),
        film:  (filmsR.data || []).map(r => mk(r, { film_type: r.film_type, runtime_minutes: r.runtime_minutes })),
      })
      setGeneratedAt(new Date().toLocaleString())
      setLoading(false)
    })()
  }, [])

  const activeSections = SECTIONS.filter(s => include[s.key])
  const keep = (it: Item) => !publishedOnly || it.status === 'published'
  const filtered = (k: SectionKey) => data[k].filter(keep)

  // ── Grouping: artist → { items per section } ──
  const groups = (() => {
    const by: Record<string, { artistId: string; name: string; items: Record<SectionKey, Item[]> }> = {}
    for (const sec of activeSections) {
      for (const it of filtered(sec.key)) {
        const aid = it.artistId || '__none__'
        const g = (by[aid] ||= { artistId: aid, name: it.name, items: { track: [], album: [], story: [], film: [] } })
        g.items[sec.key].push(it)
      }
    }
    for (const g of Object.values(by)) for (const sec of SECTIONS) g.items[sec.key].sort((a, b) => a.title.localeCompare(b.title))
    return Object.values(by).sort((a, b) =>
      a.artistId === '__none__' ? 1 : b.artistId === '__none__' ? -1 : a.name.localeCompare(b.name))
  })()

  // ── Summary ──
  const allItems = activeSections.flatMap(s => filtered(s.key))
  const typeTotals = activeSections.map(s => ({ label: s.label, n: filtered(s.key).length }))
  const statusCount = { published: 0, private: 0, draft: 0, other: 0 }
  const originCount: Record<string, number> = {}
  for (const it of allItems) {
    const st = (it.status || 'draft') as keyof typeof statusCount
    if (st in statusCount) statusCount[st]++; else statusCount.other++
    const o = originLabel(it.content_origin); originCount[o] = (originCount[o] || 0) + 1
  }
  const artistCount = groups.filter(g => g.artistId !== '__none__').length
  const scopeLabel = publishedOnly ? 'Published only' : 'All statuses'
  const summaryLine = `${allItems.length} items · ${artistCount} artists · ${scopeLabel}`
  const statusLine = `Published ${statusCount.published} · Private ${statusCount.private} · Draft ${statusCount.draft}${statusCount.other ? ` · Other ${statusCount.other}` : ''}`
  const originLine = Object.entries(originCount).map(([k, v]) => `${k} ${v}`).join(' · ')

  // ── Markdown export ──
  const md = () => {
    const esc = (s: string) => (s || '').replace(/\|/g, '\\|')
    let out = `# Human Echo — Content Inventory\n\n_Generated ${generatedAt} · ${summaryLine}_\n\n`
    out += `## Summary\n\n`
    typeTotals.forEach(t => { out += `- **${t.label}:** ${t.n}\n` })
    out += `- **By status:** ${statusLine}\n- **By origin:** ${originLine}\n`
    for (const g of groups) {
      out += `\n## ${g.name}\n`
      for (const sec of activeSections) {
        const items = g.items[sec.key]
        if (!items.length) continue
        out += `\n### ${sec.label} (${items.length})\n\n| # | ${sec.cols.join(' | ')} |\n|---:|${sec.cols.map(() => '---').join('|')}|\n`
        items.forEach((it, i) => { out += `| ${i + 1} | ${sec.cell(it).map(esc).join(' | ')} |\n` })
      }
    }
    return out
  }
  const downloadMd = () => {
    const blob = new Blob([md()], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `human-echo-content-inventory-${new Date().toISOString().slice(0, 10)}.md`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── Print / PDF ──
  const printPDF = () => {
    const esc = (s: string) => (s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
    const secHtml = (g: typeof groups[number]) => activeSections.map(sec => {
      const items = g.items[sec.key]
      if (!items.length) return ''
      return `<h3>${sec.label} <span class="count">${items.length}</span></h3>
        <table><thead><tr><th class="n">#</th>${sec.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${items.map((it, i) => `<tr><td class="n">${i + 1}</td>${sec.cell(it).map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    }).join('')
    const body = groups.map(g => `<section><h2>${esc(g.name)}</h2>${secHtml(g)}</section>`).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Human Echo — Content Inventory</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; margin: 32px; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .sub { color: #666; font-size: 12px; margin-bottom: 6px; }
        .summary { font-size: 12px; color: #333; margin-bottom: 18px; padding: 10px 12px; background: #f5f5f4; border-radius: 6px; }
        section { page-break-inside: auto; }
        h2 { font-size: 16px; margin: 20px 0 6px; border-bottom: 2px solid #111; padding-bottom: 3px; page-break-after: avoid; }
        h3 { font-size: 12px; margin: 12px 0 4px; color: #444; text-transform: uppercase; letter-spacing: .05em; page-break-after: avoid; }
        .count { color: #999; font-weight: 400; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 6px; }
        th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
        th { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #666; }
        td.n, th.n { width: 30px; color: #999; text-align: right; }
        tr { page-break-inside: avoid; }
        @media print { body { margin: 12mm; } }
      </style></head><body>
        <h1>Human Echo — Content Inventory</h1>
        <div class="sub">Generated ${esc(generatedAt)} · ${esc(summaryLine)}</div>
        <div class="summary">${typeTotals.map(t => `<strong>${t.label}:</strong> ${t.n}`).join(' &nbsp;·&nbsp; ')}<br>
          <strong>Status:</strong> ${esc(statusLine)}<br><strong>Origin:</strong> ${esc(originLine)}</div>
        ${body}
        <script>window.onload = () => window.print()</script>
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
          <h1 style={s.h1}>Content Inventory</h1>
          <p style={s.subtitle}>{summaryLine} · generated {generatedAt}</p>
        </div>
        <Link href="/admin/content" style={s.link}>← Content</Link>
      </div>

      {/* Summary */}
      <div style={s.summary}>
        <div style={s.statRow}>
          {typeTotals.map(t => (
            <div key={t.label} style={s.stat}>
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)' }}>{t.n}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{t.label}</div>
            </div>
          ))}
          <div style={s.stat}>
            <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--accent-primary)' }}>{artistCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Artists</div>
          </div>
        </div>
        <div style={s.breakLine}><strong>By status:</strong> {statusLine}</div>
        <div style={s.breakLine}><strong>By origin:</strong> {originLine || '—'}</div>
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        {SECTIONS.map(sec => (
          <label key={sec.key} style={s.check}>
            <input type="checkbox" checked={include[sec.key]} onChange={e => setInclude(p => ({ ...p, [sec.key]: e.target.checked }))} />
            {sec.label}
          </label>
        ))}
        <span style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        <label style={s.check}>
          <input type="checkbox" checked={publishedOnly} onChange={e => setPublishedOnly(e.target.checked)} />
          Published only
        </label>
        <div style={{ flex: 1 }} />
        <button style={s.btnSecondary} onClick={downloadMd}>⬇ Markdown</button>
        <button style={s.btn} onClick={printPDF}>🖨 Print / PDF</button>
      </div>

      {groups.length === 0 ? (
        <div style={s.empty}>No content matches. Turn on a content type above.</div>
      ) : groups.map(g => (
        <div key={g.artistId} style={{ marginBottom: '30px' }}>
          <h2 style={s.h2}>{g.name}</h2>
          {activeSections.map(sec => {
            const items = g.items[sec.key]
            if (!items.length) return null
            return (
              <div key={sec.key} style={{ marginBottom: '14px' }}>
                <div style={s.subHead}>{sec.label} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{items.length}</span></div>
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={{ ...s.th, width: '32px', textAlign: 'right' }}>#</th>
                        {sec.cols.map((c, i) => <th key={c} style={{ ...s.th, textAlign: i === sec.cols.length - 1 ? 'right' : 'left' }}>{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, i) => {
                        const cells = sec.cell(it)
                        return (
                          <tr key={it.id}>
                            <td style={{ ...s.td, textAlign: 'right', color: 'var(--text-muted)' }}>{i + 1}</td>
                            {cells.map((c, ci) => (
                              <td key={ci} style={{ ...s.td, textAlign: ci === cells.length - 1 ? 'right' : 'left', fontWeight: ci === 0 ? 500 : 400 }}>
                                {sec.cols[ci] === 'Status' ? <span style={badge(c)}>{c}</span> : c}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

const badge = (status: string): React.CSSProperties => ({
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
  summary: { border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', background: 'var(--bg-secondary)', marginBottom: '18px' },
  statRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' },
  stat: { flex: '1 1 90px', textAlign: 'center', padding: '10px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg-card)' },
  breakLine: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' },
  toolbar: { display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '24px', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-secondary)' },
  check: { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' },
  btn: { padding: '9px 16px', borderRadius: '999px', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '9px 16px', borderRadius: '999px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  h2: { fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px', borderBottom: '2px solid var(--border)', paddingBottom: '6px' },
  subHead: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', margin: '0 0 6px' },
  tableWrap: { border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '9px 12px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' },
  td: { padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' },
  empty: { fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px 0' },
}
