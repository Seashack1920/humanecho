'use client'

/**
 * Admin → Homepage Spotlights.
 * Edits the "Featured Music Video" and "Brain Candy" homepage sections
 * (homepage_features table). Text fields + Cloudinary uploads for video /
 * thumbnail / image, an active toggle, and a link target for Brain Candy.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import FeaturedMusicVideo from '@/components/FeaturedMusicVideo'
import BrainCandy from '@/components/BrainCandy'

const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

function uploadToCloudinary(file: File, folder: string, resourceType: string, onProgress?: (p: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const fd = new FormData()
    fd.append('file', file); fd.append('upload_preset', 'humanecho_upload'); fd.append('folder', folder)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`)
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => { const d = JSON.parse(xhr.responseText); d.error ? reject(new Error(d.error.message)) : resolve(d.secure_url) }
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(fd)
  })
}

type Row = Record<string, any>

export default function HomepageFeaturesAdmin() {
  const [rows, setRows]       = useState<Record<string, Row>>({})
  const [picks, setPicks]     = useState<{ artists: any[]; films: any[]; issues: any[] }>({ artists: [], films: [], issues: [] })
  const [loading, setLoading] = useState(true)
  const [msg, setMsg]         = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    ;(async () => {
      const [feat, a, f, i] = await Promise.all([
        supabase.from('homepage_features').select('*'),
        supabase.from('artists').select('id, name, photo_url').order('name'),
        supabase.from('films').select('id, title, poster_url').is('deleted_at', null).order('title'),
        supabase.from('issues').select('id, slug, title, issue_number, cover_image_url').order('issue_number', { ascending: false }),
      ])
      const map: Record<string, Row> = {}
      for (const r of feat.data || []) map[r.key] = r
      setRows(map)
      setPicks({ artists: a.data || [], films: f.data || [], issues: i.data || [] })
      setLoading(false)
    })()
  }, [])

  const patch = (key: string, field: string, value: any) =>
    setRows(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))

  const save = async (key: string) => {
    setMsg(null)
    const r = rows[key]
    const { error } = await supabase.from('homepage_features').update({
      is_active: !!r.is_active, eyebrow: r.eyebrow || null, title: r.title || null, subhead: r.subhead || null,
      body: r.body || null, video_url: r.video_url || null, thumbnail_url: r.thumbnail_url || null,
      image_url: r.image_url || null, quote: r.quote || null, quote_attribution: r.quote_attribution || null,
      link_url: r.link_url || null, link_label: r.link_label || null, updated_at: new Date().toISOString(),
    }).eq('key', key)
    setMsg(error ? { type: 'error', text: error.message } : { type: 'success', text: 'Saved. Refresh the homepage to see it.' })
  }

  if (loading) return <div style={{ ...s.page, color: 'var(--text-muted)', textAlign: 'center', paddingTop: '80px' }}>Loading…</div>

  return (
    <div style={s.page}>
      <div style={s.navRow}>
        <div>
          <h1 style={s.h1}>Homepage Spotlights</h1>
          <p style={s.subtitle}>Two sections below “Are you an artist?” that showcase the range of content on the site.</p>
        </div>
        <Link href="/admin/content" style={s.link}>← Content</Link>
      </div>

      {msg && <div style={{ ...s.banner, background: msg.type === 'success' ? 'rgba(52,168,83,0.12)' : 'rgba(220,60,60,0.12)', color: msg.type === 'success' ? '#34a853' : '#dc3c3c' }}>{msg.text}</div>}

      <Editor
        r={rows['featured_music_video'] || {}} onPatch={(f, v) => patch('featured_music_video', f, v)} onSave={() => save('featured_music_video')}
        heading="Featured Music Video" folder="homepage/featured-video"
        fields={['active', 'eyebrow', 'title', 'subhead', 'video', 'thumbnail', 'body']}
        help="Collapsed, visitors see the title, subhead and thumbnail; clicking reveals the video and your text." />
      <Preview label="Featured Music Video — live preview"><FeaturedMusicVideo data={rows['featured_music_video']} preview /></Preview>

      <Editor
        r={rows['brain_candy'] || {}} onPatch={(f, v) => patch('brain_candy', f, v)} onSave={() => save('brain_candy')}
        heading="Brain Candy" folder="homepage/brain-candy"
        fields={['active', 'eyebrow', 'title', 'subhead', 'video', 'thumbnail', 'image', 'quote', 'quote_attribution', 'body', 'link']}
        picks={picks}
        help="Spotlight an artist, a film, or the newest Escapes issue. Use a video, OR an image with a quote. Add a button link to send people there." />
      <Preview label="Brain Candy — live preview"><BrainCandy data={rows['brain_candy']} preview /></Preview>
    </div>
  )
}

function Preview({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ margin: '0 0 30px', padding: '14px 16px 0', border: '1px dashed var(--border)', borderRadius: '14px', background: 'var(--bg-primary)' }}>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>{label}</div>
      <div style={{ marginBottom: '-60px' }}>{children}</div>
    </div>
  )
}

function Editor({ r, onPatch, onSave, heading, folder, fields, help, picks }: {
  r: Row; onPatch: (f: string, v: any) => void; onSave: () => void
  heading: string; folder: string; fields: string[]; help: string
  picks?: { artists: any[]; films: any[]; issues: any[] }
}) {
  const [pct, setPct] = useState<Record<string, number | null>>({})
  const [spotType, setSpotType] = useState<'artist' | 'film' | 'issue'>('artist')
  const has = (f: string) => fields.includes(f)

  const spotItems = picks ? (spotType === 'artist' ? picks.artists : spotType === 'film' ? picks.films : picks.issues) : []
  const applyPick = (id: string) => {
    if (!id || !picks) return
    if (spotType === 'artist') {
      const a = picks.artists.find(x => x.id === id); if (!a) return
      onPatch('link_url', `/artist/${id}`); onPatch('link_label', `Meet ${a.name} →`)
      if (!r.image_url && a.photo_url) onPatch('image_url', a.photo_url)
    } else if (spotType === 'film') {
      const f = picks.films.find(x => x.id === id); if (!f) return
      onPatch('link_url', `/cinema/films/${id}`); onPatch('link_label', `Watch ${f.title} →`)
      if (!r.image_url && f.poster_url) onPatch('image_url', f.poster_url)
    } else {
      const i = picks.issues.find(x => x.id === id); if (!i) return
      onPatch('link_url', `/escapes/${i.slug}`); onPatch('link_label', `Read ${i.title || 'Issue #' + i.issue_number} →`)
      if (!r.image_url && i.cover_image_url) onPatch('image_url', i.cover_image_url)
    }
  }

  const doUpload = async (field: string, file: File | null, kind: 'image' | 'video') => {
    if (!file) return
    try {
      setPct(p => ({ ...p, [field]: 0 }))
      const url = await uploadToCloudinary(file, folder, kind, n => setPct(p => ({ ...p, [field]: n })))
      onPatch(field, url)
    } catch (e) { alert((e as Error).message) }
    setPct(p => ({ ...p, [field]: null }))
  }

  const MediaRow = ({ field, label, kind }: { field: string; label: string; kind: 'image' | 'video' }) => (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      {r[field] && <div style={s.current}>Current · <a href={r[field]} target="_blank" rel="noreferrer" style={s.a}>view</a> · <button onClick={() => onPatch(field, null)} style={s.remove}>remove</button></div>}
      <input type="file" accept={kind === 'video' ? 'video/*' : 'image/*'} style={s.file} onChange={e => doUpload(field, e.target.files?.[0] || null, kind)} />
      {pct[field] != null && <div style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>Uploading {pct[field]}%</div>}
    </div>
  )

  return (
    <div style={s.card}>
      <div style={s.cardHead}>
        <h2 style={s.h2}>{heading}</h2>
        <label style={s.toggle}>
          <input type="checkbox" checked={!!r.is_active} onChange={e => onPatch('is_active', e.target.checked)} />
          {r.is_active ? 'Live on homepage' : 'Hidden'}
        </label>
      </div>
      <p style={s.help}>{help}</p>

      {has('eyebrow') && <Text label="Eyebrow (small label)" v={r.eyebrow} on={v => onPatch('eyebrow', v)} />}
      {has('title') && <Text label="Title" v={r.title} on={v => onPatch('title', v)} />}
      {has('subhead') && <Text label="Subhead" v={r.subhead} on={v => onPatch('subhead', v)} />}
      {has('video') && <MediaRow field="video_url" label="Video" kind="video" />}
      {has('thumbnail') && <MediaRow field="thumbnail_url" label={`Thumbnail ${has('image') ? '(video poster)' : '(16:9)'}`} kind="image" />}
      {has('image') && <MediaRow field="image_url" label="Image (used if no video — pairs with the quote)" kind="image" />}
      {has('quote') && <TextArea label="Quote (overlaid on the image)" v={r.quote} on={v => onPatch('quote', v)} rows={2} />}
      {has('quote_attribution') && <Text label="Quote attribution" v={r.quote_attribution} on={v => onPatch('quote_attribution', v)} />}
      {has('body') && <TextArea label="Body (a few sentences)" v={r.body} on={v => onPatch('body', v)} rows={4} />}
      {has('link') && picks && (
        <div style={{ ...s.field, padding: '12px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg-card)' }}>
          <label style={s.label}>Spotlight a… <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>auto-fills the link & button (and image, if empty)</span></label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select value={spotType} onChange={e => setSpotType(e.target.value as any)} style={{ ...s.input, maxWidth: '150px' }}>
              <option value="artist">Artist</option>
              <option value="film">Film</option>
              <option value="issue">Escapes issue</option>
            </select>
            <select key={spotType} defaultValue="" onChange={e => applyPick(e.target.value)} style={s.input}>
              <option value="">— choose —</option>
              {spotItems.map((it: any) => <option key={it.id} value={it.id}>{it.name || it.title || `Issue #${it.issue_number}`}</option>)}
            </select>
          </div>
        </div>
      )}
      {has('link') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Text label="Link URL (e.g. /artist/…, /cinema, /escapes)" v={r.link_url} on={v => onPatch('link_url', v)} />
          <Text label="Button label" v={r.link_label} on={v => onPatch('link_label', v)} />
        </div>
      )}

      <button onClick={onSave} style={s.saveBtn}>Save {heading}</button>
    </div>
  )
}

const Text = ({ label, v, on }: { label: string; v: any; on: (v: string) => void }) => (
  <div style={s.field}><label style={s.label}>{label}</label>
    <input value={v || ''} onChange={e => on(e.target.value)} style={s.input} /></div>
)
const TextArea = ({ label, v, on, rows }: { label: string; v: any; on: (v: string) => void; rows: number }) => (
  <div style={s.field}><label style={s.label}>{label}</label>
    <textarea value={v || ''} onChange={e => on(e.target.value)} rows={rows} style={{ ...s.input, resize: 'vertical', fontFamily: 'inherit' }} /></div>
)

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: '720px', margin: '0 auto', padding: '32px 24px 80px', fontFamily: 'DM Sans, sans-serif' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' },
  h1: { fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0', maxWidth: '520px', lineHeight: 1.5 },
  link: { fontSize: '14px', color: 'var(--accent-primary)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 },
  banner: { padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '18px' },
  card: { border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', background: 'var(--bg-secondary)', marginBottom: '22px' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' },
  h2: { fontFamily: 'Playfair Display, serif', fontSize: '21px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  toggle: { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' },
  help: { fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 16px', lineHeight: 1.5 },
  field: { marginBottom: '14px' },
  label: { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px' },
  file: { display: 'block', fontSize: '12px', color: 'var(--text-secondary)' },
  current: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' },
  a: { color: 'var(--accent-primary)' },
  remove: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#dc3c3c', padding: 0 },
  saveBtn: { marginTop: '8px', padding: '11px 22px', borderRadius: '999px', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
}
