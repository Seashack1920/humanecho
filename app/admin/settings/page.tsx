'use client'

/**
 * Admin → Site Settings.
 *  - Default track image (shown wherever a track has no cover of its own).
 *  - Front porch songs: the hand-picked, ordered songs shown on /welcome,
 *    stored in site_settings under key 'porch_picks' (JSON array of track ids).
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { uploadToCloudinary } from '@/lib/cloudinaryUpload'
import { setDefaultTrackImageCache } from '@/lib/siteSettings'

type TrackLite = { id: string; title: string; track_image_url: string | null; artist_id: string | null; artist_name?: string }

const MAX_PORCH = 5

export default function SiteSettingsAdmin() {
  const [defaultTrackImage, setDefaultTrackImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pct, setPct] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Front porch
  const [tracks, setTracks] = useState<TrackLite[]>([])
  const [picks, setPicks]   = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const [savingPorch, setSavingPorch] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [{ data: dti }, { data: pp }, { data: trk }, { data: arts }] = await Promise.all([
        supabase.from('site_settings').select('value').eq('key', 'default_track_image').maybeSingle(),
        supabase.from('site_settings').select('value').eq('key', 'porch_picks').maybeSingle(),
        supabase.from('tracks').select('id, title, track_image_url, artist_id').eq('status', 'published').order('title'),
        supabase.from('artists').select('id, name'),
      ])
      setDefaultTrackImage(dti?.value || null)
      const names: Record<string, string> = Object.fromEntries(((arts as any[]) || []).map(a => [a.id, a.name]))
      setTracks(((trk as any[]) || []).map(t => ({ ...t, artist_name: t.artist_id ? names[t.artist_id] : undefined })))
      try { setPicks(pp?.value ? JSON.parse(pp.value) : []) } catch { setPicks([]) }
      setLoading(false)
    })()
  }, [])

  const save = async (value: string | null) => {
    setMsg(null)
    const { error } = await supabase.from('site_settings')
      .upsert({ key: 'default_track_image', value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) { setMsg({ type: 'error', text: error.message }); return }
    setDefaultTrackImage(value)
    setDefaultTrackImageCache(value)
    setMsg({ type: 'success', text: value ? 'Default track image updated.' : 'Default track image cleared — using the 🎵 placeholder.' })
  }

  const onFile = async (file: File | null) => {
    if (!file) return
    try {
      setPct(0)
      const { url } = await uploadToCloudinary(file, 'site/defaults', 'image', setPct)
      await save(url)
    } catch (e) { setMsg({ type: 'error', text: (e as Error).message }) }
    setPct(null)
  }

  // ── Front porch helpers ──
  const trackById = (id: string) => tracks.find(t => t.id === id)
  const addPick = (id: string) => { if (picks.length < MAX_PORCH && !picks.includes(id)) setPicks(p => [...p, id]) }
  const removePick = (id: string) => setPicks(p => p.filter(x => x !== id))
  const movePick = (i: number, dir: -1 | 1) => setPicks(p => {
    const j = i + dir
    if (j < 0 || j >= p.length) return p
    const next = [...p]; [next[i], next[j]] = [next[j], next[i]]; return next
  })

  const savePorch = async () => {
    setSavingPorch(true); setMsg(null)
    const { error } = await supabase.from('site_settings')
      .upsert({ key: 'porch_picks', value: JSON.stringify(picks), updated_at: new Date().toISOString() }, { onConflict: 'key' })
    setSavingPorch(false)
    if (error) { setMsg({ type: 'error', text: error.message }); return }
    setMsg({ type: 'success', text: picks.length ? `Front porch set — ${picks.length} song${picks.length !== 1 ? 's' : ''}.` : 'Front porch cleared — it will fall back to featured/recent songs.' })
  }

  const q = filter.trim().toLowerCase()
  const matches = (q
    ? tracks.filter(t => t.title.toLowerCase().includes(q) || (t.artist_name || '').toLowerCase().includes(q))
    : tracks
  ).filter(t => !picks.includes(t.id)).slice(0, 25)

  if (loading) return <div style={{ ...s.page, color: 'var(--text-muted)', textAlign: 'center', paddingTop: '80px' }}>Loading…</div>

  return (
    <div style={s.page}>
      <div style={s.navRow}>
        <div>
          <h1 style={s.h1}>Site Settings</h1>
          <p style={s.subtitle}>Small site-wide options you can change anytime.</p>
        </div>
        <Link href="/admin/content" style={s.link}>← Content</Link>
      </div>

      {msg && <div style={{ ...s.banner, background: msg.type === 'success' ? 'rgba(52,168,83,0.12)' : 'rgba(220,60,60,0.12)', color: msg.type === 'success' ? '#34a853' : '#dc3c3c' }}>{msg.text}</div>}

      {/* ── Front porch songs ── */}
      <div style={{ ...s.card, marginBottom: '20px' }}>
        <h2 style={s.h2}>Front porch songs</h2>
        <p style={s.help}>The handful of songs newcomers see on the welcome page (<code>/welcome</code>), in this order. Pick up to {MAX_PORCH}. Leave empty to fall back to featured (then most recent) songs.</p>

        {/* Current picks */}
        {picks.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '16px' }}>No songs picked yet — add some below.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
            {picks.map((id, i) => {
              const t = trackById(id)
              return (
                <div key={id} style={s.pickRow}>
                  <span style={s.pickNum}>{i + 1}</span>
                  <div style={s.thumb}>{t?.track_image_url ? <img src={t.track_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '16px' }}>🎵</span>}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t?.title || '(unknown — unpublished?)'}</div>
                    {t?.artist_name && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.artist_name}</div>}
                  </div>
                  <button onClick={() => movePick(i, -1)} disabled={i === 0} style={s.iconBtn} title="Move up">↑</button>
                  <button onClick={() => movePick(i, 1)} disabled={i === picks.length - 1} style={s.iconBtn} title="Move down">↓</button>
                  <button onClick={() => removePick(id)} style={{ ...s.iconBtn, color: '#dc3c3c' }} title="Remove">✕</button>
                </div>
              )
            })}
          </div>
        )}

        {/* Add songs */}
        {picks.length < MAX_PORCH && (
          <div>
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search songs by title or artist…" style={s.filter} />
            <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '10px', marginTop: '8px' }}>
              {matches.length === 0 ? (
                <div style={{ padding: '14px', fontSize: '13px', color: 'var(--text-muted)' }}>No matches.</div>
              ) : matches.map(t => (
                <button key={t.id} onClick={() => addPick(t.id)} style={s.addRow}>
                  <div style={s.thumbSm}>{t.track_image_url ? <img src={t.track_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '13px' }}>🎵</span>}</div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    {t.artist_name && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.artist_name}</div>}
                  </div>
                  <span style={{ fontSize: '18px', color: 'var(--accent-primary)', flexShrink: 0 }}>+</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={savePorch} disabled={savingPorch} style={s.saveBtn}>{savingPorch ? 'Saving…' : 'Save front porch'}</button>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{picks.length}/{MAX_PORCH} selected</span>
        </div>
      </div>

      {/* ── Default track image ── */}
      <div style={s.card}>
        <h2 style={s.h2}>Default track image</h2>
        <p style={s.help}>Shown wherever a track has no cover of its own — across the music pages, album &amp; artist pages, and the player. Square works best. Clear it to fall back to the 🎵 placeholder.</p>

        <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={s.previewBox}>
            {defaultTrackImage
              ? <img src={defaultTrackImage} alt="Default track image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: 'var(--text-muted)' }}>🎵</div>}
          </div>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={s.label}>Upload a new default image</label>
            <input type="file" accept="image/*" style={s.file} onChange={e => onFile(e.target.files?.[0] || null)} />
            {pct != null && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '6px' }}>Uploading {pct}%</div>}
            {defaultTrackImage && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <a href={defaultTrackImage} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: 'var(--accent-primary)' }}>view full size</a>
                <button onClick={() => save(null)} style={s.remove}>Clear (use 🎵)</button>
              </div>
            )}
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: 1.5 }}>Changes apply on each visitor's next page load.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: '720px', margin: '0 auto', padding: '32px 24px 80px', fontFamily: 'DM Sans, sans-serif' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' },
  h1: { fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0' },
  link: { fontSize: '14px', color: 'var(--accent-primary)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 },
  banner: { padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '18px' },
  card: { border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', background: 'var(--bg-secondary)' },
  h2: { fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  help: { fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 18px', lineHeight: 1.5 },
  previewBox: { width: '132px', height: '132px', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', flexShrink: 0 },
  label: { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' },
  file: { display: 'block', fontSize: '13px', color: 'var(--text-secondary)' },
  remove: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#dc3c3c', padding: 0, fontWeight: 600 },
  pickRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)' },
  pickNum: { width: '18px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 },
  thumb: { width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  thumbSm: { width: '34px', height: '34px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconBtn: { width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 },
  filter: { width: '100%', padding: '11px 13px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' },
  addRow: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 10px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer' },
  saveBtn: { padding: '11px 22px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' },
}
