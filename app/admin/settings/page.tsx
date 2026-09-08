'use client'

/**
 * Admin → Site Settings. Currently: the default track image shown wherever a
 * track has no cover of its own. Change it anytime; clear it to fall back to
 * the 🎵 placeholder.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { uploadToCloudinary } from '@/lib/cloudinaryUpload'
import { setDefaultTrackImageCache } from '@/lib/siteSettings'

export default function SiteSettingsAdmin() {
  const [defaultTrackImage, setDefaultTrackImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pct, setPct] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'default_track_image').maybeSingle()
      setDefaultTrackImage(data?.value || null)
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
}
