'use client'

/**
 * Admin → Homepage Hero.
 *
 * A dedicated picker for the big hero at the top of the homepage, decoupled
 * from the "★ Featured" toggles. Whatever is chosen here is written to
 * `scheduled_content` (slot='hero'), which the homepage prefers over the
 * is_featured fallback.
 *
 * The hero shows: the album's cover + title, the artist's name, and (optionally)
 * a track as "Now playing" with a Play button. The full-bleed background is the
 * album's hero VIDEO if set, otherwise its hero IMAGE, otherwise its cover.
 * Image/video for the hero are managed here too (they live on the album).
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { playableVideoUrl } from '@/components/HeroMedia'

const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

function uploadToCloudinary(
  file: File,
  folder: string,
  resourceType: string,
  onProgress?: (pct: number) => void
) {
  return new Promise<string>((resolve, reject) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', 'humanecho_upload')
    fd.append('folder', folder)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`)
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => { const d = JSON.parse(xhr.responseText); d.error ? reject(new Error(d.error.message)) : resolve(d.secure_url) }
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(fd)
  })
}

type Album = { id: string; title: string; cover_url: string | null; hero_image_url: string | null; hero_video_url: string | null; artist_id: string | null; status: string | null; artist_name?: string }
type Track = { id: string; title: string; duration: string | null; album_id: string | null; artist_id: string | null }
type Artist = { id: string; name: string }

export default function HomepageHeroAdmin() {
  const [albums, setAlbums]   = useState<Album[]>([])
  const [tracks, setTracks]   = useState<Track[]>([])
  const [artists, setArtists] = useState<Artist[]>([])

  const [heroAlbumId, setHeroAlbumId]   = useState('')
  const [heroTrackId, setHeroTrackId]   = useState('')
  const [heroArtistId, setHeroArtistId] = useState('')

  const [imgFile, setImgFile] = useState<File | null>(null)
  const [vidFile, setVidFile] = useState<File | null>(null)
  const [imgPct, setImgPct]   = useState<number | null>(null)
  const [vidPct, setVidPct]   = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    ;(async () => {
      const [albRes, trkRes, artRes, schedRes] = await Promise.all([
        // No FK from albums→artists, so resolve names in JS instead of an embed.
        supabase.from('albums').select('id, title, cover_url, hero_image_url, hero_video_url, artist_id, status').order('title'),
        supabase.from('tracks').select('id, title, duration, album_id, artist_id').eq('status', 'published').order('track_number'),
        supabase.from('artists').select('id, name').order('name'),
        supabase.from('scheduled_content').select('content_type, content_id').eq('slot', 'hero').eq('is_active', true),
      ])
      const artRows = (artRes.data as Artist[]) || []
      const nameById: Record<string, string> = {}
      for (const a of artRows) nameById[a.id] = a.name
      setAlbums(((albRes.data as any[]) || []).map(a => ({ ...a, artist_name: a.artist_id ? nameById[a.artist_id] : undefined })))
      setTracks((trkRes.data as any) || [])
      setArtists(artRows)
      for (const row of (schedRes.data || [])) {
        if (row.content_type === 'album')  setHeroAlbumId(row.content_id)
        if (row.content_type === 'track')  setHeroTrackId(row.content_id)
        if (row.content_type === 'artist') setHeroArtistId(row.content_id)
      }
      setLoading(false)
    })()
  }, [])

  const selectedAlbum = albums.find(a => a.id === heroAlbumId) || null
  const albumTracks   = tracks.filter(t => t.album_id === heroAlbumId)

  const pickAlbum = (id: string) => {
    setHeroAlbumId(id)
    setImgFile(null); setVidFile(null)
    // sensible defaults: match the hero artist to the album, and if the current
    // hero track isn't from this album, clear it.
    const alb = albums.find(a => a.id === id)
    if (alb?.artist_id) setHeroArtistId(alb.artist_id)
    if (heroTrackId && !tracks.some(t => t.id === heroTrackId && t.album_id === id)) setHeroTrackId('')
  }

  // Immediately persist a hero image/video onto the selected album.
  const patchAlbum = (patch: Partial<Album>) => {
    setAlbums(prev => prev.map(a => a.id === heroAlbumId ? { ...a, ...patch } : a))
  }
  const doUploadImage = async () => {
    if (!imgFile || !selectedAlbum) return
    try {
      setImgPct(0)
      const url = await uploadToCloudinary(imgFile, `homepage/hero/${heroAlbumId}`, 'image', setImgPct)
      const { error } = await supabase.from('albums').update({ hero_image_url: url }).eq('id', heroAlbumId)
      if (error) throw error
      patchAlbum({ hero_image_url: url }); setImgFile(null)
      setMsg({ type: 'success', text: 'Hero image saved.' })
    } catch (e) { setMsg({ type: 'error', text: (e as Error).message }) }
    setImgPct(null)
  }
  const doUploadVideo = async () => {
    if (!vidFile || !selectedAlbum) return
    try {
      setVidPct(0)
      const url = await uploadToCloudinary(vidFile, `homepage/hero/${heroAlbumId}`, 'video', setVidPct)
      const { error } = await supabase.from('albums').update({ hero_video_url: url }).eq('id', heroAlbumId)
      if (error) throw error
      patchAlbum({ hero_video_url: url }); setVidFile(null)
      setMsg({ type: 'success', text: 'Hero video saved.' })
    } catch (e) { setMsg({ type: 'error', text: (e as Error).message }) }
    setVidPct(null)
  }
  const removeMedia = async (field: 'hero_image_url' | 'hero_video_url') => {
    if (!selectedAlbum) return
    const { error } = await supabase.from('albums').update({ [field]: null }).eq('id', heroAlbumId)
    if (error) { setMsg({ type: 'error', text: error.message }); return }
    patchAlbum({ [field]: null } as Partial<Album>)
    setMsg({ type: 'success', text: 'Removed.' })
  }

  // Write the three hero slots into scheduled_content (delete-then-insert so
  // there's exactly one active row per content_type).
  const setSlot = async (content_type: string, content_id: string) => {
    await supabase.from('scheduled_content').delete().eq('slot', 'hero').eq('content_type', content_type)
    if (content_id) {
      const { error } = await supabase.from('scheduled_content').insert({
        slot: 'hero', content_type, content_id,
        go_live_at: new Date().toISOString(), is_active: true,
      })
      if (error) throw error
    }
  }
  const saveHero = async () => {
    if (!heroAlbumId) { setMsg({ type: 'error', text: 'Choose a hero album first.' }); return }
    setSaving(true); setMsg(null)
    try {
      await setSlot('album', heroAlbumId)
      await setSlot('artist', heroArtistId)
      await setSlot('track', heroTrackId)
      setMsg({ type: 'success', text: 'Homepage hero saved. Refresh the homepage to see it.' })
    } catch (e) { setMsg({ type: 'error', text: (e as Error).message }) }
    setSaving(false)
  }

  const bg = selectedAlbum ? (selectedAlbum.hero_video_url ? null : (selectedAlbum.hero_image_url || selectedAlbum.cover_url)) : null

  if (loading) return <div style={{ ...s.page, color: 'var(--text-muted)', textAlign: 'center', paddingTop: '80px' }}>Loading…</div>

  return (
    <div style={s.page}>
      <div style={s.navRow}>
        <div>
          <h1 style={s.h1}>Homepage Hero</h1>
          <p style={s.subtitle}>Pick the album that headlines the homepage — a still image or a video, decoupled from the ★ Featured toggles.</p>
        </div>
        <Link href="/admin/content" style={s.link}>← Content</Link>
      </div>

      {msg && (
        <div style={{ ...s.banner, background: msg.type === 'success' ? 'rgba(52,168,83,0.12)' : 'rgba(220,60,60,0.12)', color: msg.type === 'success' ? '#34a853' : '#dc3c3c' }}>{msg.text}</div>
      )}

      {/* Live preview */}
      <div style={s.previewWrap}>
        {selectedAlbum ? (
          <>
            {selectedAlbum.hero_video_url ? (
              <video src={playableVideoUrl(selectedAlbum.hero_video_url) || undefined} autoPlay loop muted playsInline
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
            ) : bg ? (
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.6)' }} />
            ) : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#0d1f2d,#0a0a0b 60%,#1a0d0d)' }} />}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,11,0.95), rgba(10,10,11,0.2) 60%, transparent)' }} />
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'flex-end', gap: '18px', height: '100%', padding: '20px' }}>
              {selectedAlbum.cover_url && <img src={selectedAlbum.cover_url} alt="" style={{ width: '84px', height: '84px', borderRadius: '8px', objectFit: 'cover', boxShadow: '0 12px 30px rgba(0,0,0,0.6)' }} />}
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 600 }}>Featured Release</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 700, color: '#fff', lineHeight: 1.05 }}>{selectedAlbum.title}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{artists.find(a => a.id === heroArtistId)?.name || selectedAlbum.artist_name || ''}</div>
                {heroTrackId && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Now playing: {albumTracks.find(t => t.id === heroTrackId)?.title}</div>}
              </div>
            </div>
            <div style={{ position: 'absolute', top: '10px', right: '12px', zIndex: 3, fontSize: '10px', color: 'rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.4)', padding: '3px 8px', borderRadius: '20px' }}>
              {selectedAlbum.hero_video_url ? '▶ video hero' : selectedAlbum.hero_image_url ? '🖼 image hero' : '💿 cover (no hero set)'}
            </div>
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Choose an album to preview the hero</div>
        )}
      </div>

      {/* Album picker */}
      <div style={s.field}>
        <label style={s.label}>Hero album</label>
        <select value={heroAlbumId} onChange={e => pickAlbum(e.target.value)} style={s.select}>
          <option value="">— Select an album —</option>
          {albums.map(a => <option key={a.id} value={a.id}>{a.title}{a.artist_name ? ` — ${a.artist_name}` : ''}{a.status !== 'published' ? ` (${a.status})` : ''}</option>)}
        </select>
      </div>

      {selectedAlbum && (
        <>
          {/* Hero media management */}
          <div style={s.mediaGrid}>
            <div style={s.mediaCard}>
              <div style={s.mediaTitle}>Hero Image <span style={s.hint}>16:9 still</span></div>
              {selectedAlbum.hero_image_url
                ? <div style={s.current}>Current · <a href={selectedAlbum.hero_image_url} target="_blank" rel="noreferrer" style={s.a}>view</a> · <button onClick={() => removeMedia('hero_image_url')} style={s.remove}>remove</button></div>
                : <div style={s.none}>None — the album cover will be used</div>}
              <input type="file" accept="image/*" onChange={e => setImgFile(e.target.files?.[0] || null)} style={s.file} />
              {imgFile && <button onClick={doUploadImage} disabled={imgPct !== null} style={s.upBtn}>{imgPct !== null ? `Uploading ${imgPct}%` : `Upload “${imgFile.name}”`}</button>}
            </div>
            <div style={s.mediaCard}>
              <div style={s.mediaTitle}>Hero Video <span style={s.hint}>16:9 · overrides the image</span></div>
              {selectedAlbum.hero_video_url
                ? <div style={s.current}>Current · <a href={selectedAlbum.hero_video_url} target="_blank" rel="noreferrer" style={s.a}>view</a> · <button onClick={() => removeMedia('hero_video_url')} style={s.remove}>remove</button></div>
                : <div style={s.none}>None</div>}
              <input type="file" accept="video/*" onChange={e => setVidFile(e.target.files?.[0] || null)} style={s.file} />
              {vidFile && <button onClick={doUploadVideo} disabled={vidPct !== null} style={s.upBtn}>{vidPct !== null ? `Uploading ${vidPct}%` : `Upload “${vidFile.name}”`}</button>}
            </div>
          </div>

          {/* Artist + track slots */}
          <div style={s.field}>
            <label style={s.label}>Hero artist <span style={s.hint}>shown under the title</span></label>
            <select value={heroArtistId} onChange={e => setHeroArtistId(e.target.value)} style={s.select}>
              <option value="">— None —</option>
              {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>“Now playing” track <span style={s.hint}>optional · from this album</span></label>
            <select value={heroTrackId} onChange={e => setHeroTrackId(e.target.value)} style={s.select} disabled={albumTracks.length === 0}>
              <option value="">— None —</option>
              {albumTracks.map(t => <option key={t.id} value={t.id}>{t.title}{t.duration ? ` · ${t.duration}` : ''}</option>)}
            </select>
            {albumTracks.length === 0 && <div style={s.none}>This album has no published tracks.</div>}
          </div>

          <button onClick={saveHero} disabled={saving} style={s.saveBtn}>{saving ? 'Saving…' : 'Save homepage hero'}</button>
        </>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: '760px', margin: '0 auto', padding: '32px 24px 80px', fontFamily: 'DM Sans, sans-serif' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' },
  h1: { fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0', maxWidth: '520px', lineHeight: 1.5 },
  link: { fontSize: '14px', color: 'var(--accent-primary)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 },
  banner: { padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '18px' },
  previewWrap: { position: 'relative', width: '100%', aspectRatio: '16 / 7', borderRadius: '14px', overflow: 'hidden', background: '#0a0a0b', border: '1px solid var(--border)', marginBottom: '22px' },
  field: { marginBottom: '18px' },
  label: { display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '8px' },
  hint: { fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)', marginLeft: '6px', fontSize: '11px' },
  select: { width: '100%', padding: '11px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' },
  mediaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '18px' },
  mediaCard: { border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', background: 'var(--bg-secondary)' },
  mediaTitle: { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' },
  current: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' },
  none: { fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '8px' },
  a: { color: 'var(--accent-primary)' },
  remove: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#dc3c3c', padding: 0 },
  file: { display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', width: '100%' },
  upBtn: { padding: '8px 14px', borderRadius: '8px', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  saveBtn: { padding: '13px 26px', borderRadius: '999px', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginTop: '6px' },
}
