'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { usePlayer } from '@/context/PlayerContext'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

async function uploadToCloudinary(
  file: File,
  folder: string,
  resourceType: string = 'auto',
  onProgress?: (percent: number) => void
) {
  return new Promise<{ url: string; public_id: string }>((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'humanecho_upload')
    formData.append('folder', folder)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText)
      if (data.error) reject(new Error(data.error.message))
      else resolve({ url: data.secure_url, public_id: data.public_id })
    }

    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(formData)
  })
}

async function readAudioDuration(file: File): Promise<string> {
  return new Promise<string>((resolve) => {
    try {
      const audio = new Audio()
      const url = URL.createObjectURL(file)
      audio.src = url
      audio.onloadedmetadata = () => {
        const secs = Math.floor(audio.duration)
        const dur = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
        URL.revokeObjectURL(url)
        resolve(dur)
      }
      audio.onerror = () => resolve('')
    } catch {
      resolve('')
    }
  })
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Artist = { id: string; name: string; bio?: string; photo_url?: string; content_origin?: string }
type Album  = { id: string; artist_id: string; title: string; description?: string; status?: string; cover_url?: string; album_type?: string; content_origin?: string; price?: number }
type Track  = { id: string; album_id?: string; artist_id: string; title: string; track_number?: number; track_type?: string; duration?: string; status?: string; content_origin?: string; price?: number; text_content?: string; cloudinary_url?: string; track_image_url?: string }

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  page:         { maxWidth: '720px', margin: '0 auto', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' },
  h1:           { fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' },
  subtitle:     { fontSize: '14px', color: 'var(--text-muted)', marginBottom: '40px' },
  steps:        { display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' as const },
  stepBtn:      (active: boolean, done: boolean) => ({ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: active ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: active ? 'white' : done ? 'var(--accent-primary)' : 'var(--text-muted)' }),
  manageBtn:    (active: boolean) => ({ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: '1px solid var(--accent-secondary)', cursor: 'pointer', background: active ? 'var(--accent-secondary)' : 'transparent', color: active ? 'white' : 'var(--accent-secondary)' }),
  card:         { background: 'var(--bg-secondary)', borderRadius: '16px', padding: '28px', marginBottom: '24px', border: '1px solid var(--border)' },
  label:        { display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' },
  input:        { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  select:       { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  textarea:     { width: '100%', padding: '10px 14px', borderRadius: '8px 8px 0 8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  fileInput:    { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px dashed var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' as const },
  row:          { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field:        { marginBottom: '16px' },
  btn:          { padding: '12px 28px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '500', border: 'none', cursor: 'pointer' },
  btnSecondary: { padding: '12px 28px', borderRadius: '8px', background: 'none', color: 'var(--text-secondary)', fontSize: '15px', border: '1px solid var(--border)', cursor: 'pointer', marginRight: '12px' },
  btnGold:      { padding: '12px 28px', borderRadius: '8px', background: 'var(--accent-secondary)', color: 'white', fontSize: '15px', fontWeight: '500', border: 'none', cursor: 'pointer' },
  btnDanger:    { padding: '8px 16px', borderRadius: '6px', background: 'rgba(220,60,60,0.1)', color: '#dc3c3c', fontSize: '13px', border: '1px solid rgba(220,60,60,0.3)', cursor: 'pointer' },
  btnEdit:      { padding: '8px 16px', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer', marginRight: '8px' },
  btnSave:      { padding: '8px 16px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', border: 'none', cursor: 'pointer', marginRight: '8px' },
  btnCancel:    { padding: '8px 16px', borderRadius: '6px', background: 'none', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer' },
  toggleRow:    { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' as const },
  toggle:       (active: boolean) => ({ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', border: 'none', cursor: 'pointer', background: active ? 'var(--accent-primary)' : 'var(--bg-card)', color: active ? 'white' : 'var(--text-muted)' }),
  sectionTitle: { fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' },
  divider:      { height: '1px', background: 'var(--border)', margin: '20px 0' },
  checkbox:     { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' },
  resizeHint:   { textAlign: 'right' as const, fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '8px' },
  savedTrack:   { padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', marginBottom: '8px' },
  // Manage tab styles
  manageRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: '8px' },
  manageLabel:  { fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' },
  manageMeta:   { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  editCard:     { background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '12px', padding: '20px', marginBottom: '8px' },
  confirmBox:   { background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.3)', borderRadius: '8px', padding: '14px 16px', marginBottom: '8px', fontSize: '14px', color: '#dc3c3c' },
}

const originEmoji = (o?: string) => o === '100% human' ? '🧑' : o === 'human+ai' ? '🧑🤖' : o === 'ai generated' ? '🤖' : ''
function ProgressBar({ label, percent }: { label: string; percent: number }) {
  return (
    <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-primary)' }}>{percent}%</span>
      </div>
      <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percent}%`, background: 'var(--accent-primary)', borderRadius: '3px', transition: 'width 0.2s ease' }} />
      </div>
    </div>
  )
}
// ─── Manage Tab ──────────────────────────────────────────────────────────────

function GenrePicker({ genres, selected, onChange, max = 3 }: {
  genres: {id: string, name: string}[]
  selected: string[]
  onChange: (ids: string[]) => void
  max?: number
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(g => g !== id))
    } else {
      if (selected.length >= max) return
      onChange([...selected, id])
    }
  }
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
        {genres.map(g => {
          const active = selected.includes(g.id)
          return (
            <button key={g.id} onClick={() => toggle(g.id)} style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
              border: active ? 'none' : '1px solid var(--border)',
              background: active ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: active ? 'white' : 'var(--text-muted)',
              cursor: selected.length >= max && !active ? 'not-allowed' : 'pointer',
              opacity: selected.length >= max && !active ? 0.4 : 1,
            }}>
              {g.name}
            </button>
          )
        })}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        {selected.length}/{max} selected
      </div>
    </div>
  )
}
function ManageTab({ artists, refreshArtists }: { artists: Artist[], refreshArtists: () => void }) {
  const [manageSection, setManageSection] = useState<'artists' | 'albums' | 'tracks'>('artists')
  const [selectedArtistId, setSelectedArtistId] = useState('')
  const [selectedAlbumId, setSelectedAlbumId]   = useState('')
  const [albums, setAlbums]   = useState<Album[]>([])
  const [tracks, setTracks]   = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const [genres, setGenres]   = useState<{id: string, name: string}[]>([])
  const [editingGenres, setEditingGenres] = useState<string[]>([])
  const { playTrack, currentTrack, isPlaying } = usePlayer()

  // Edit state
  const [editingArtistId, setEditingArtistId] = useState<string | null>(null)
  const [editArtist, setEditArtist]           = useState<Partial<Artist>>({})
  const [artistPhotoFile, setArtistPhotoFile] = useState<File | null>(null)

  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null)
  const [editAlbum, setEditAlbum]           = useState<Partial<Album>>({})
  const [albumCoverFile, setAlbumCoverFile] = useState<File | null>(null)

  const [editingTrackId, setEditingTrackId] = useState<string | null>(null)
  const [editTrack, setEditTrack]           = useState<Partial<Track>>({})
  const [trackImageFile, setTrackImageFile] = useState<File | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; name: string } | null>(null)

  const slugify = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const loadContentGenres = async (contentType: string, contentId: string) => {
    const { data } = await supabase
      .from('content_genres')
      .select('genre_id')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
    return data ? data.map(row => row.genre_id) : []
  }

  useEffect(() => {
    supabase.from('genres').select('id, name').eq('content_type', 'music').order('name').then(({ data }) => {
      if (data) setGenres(data)
    })
  }, [])

  // Load albums when artist selected
  useEffect(() => {
    if (selectedArtistId) {
      supabase.from('albums').select('*').eq('artist_id', selectedArtistId).order('title').then(({ data }) => {
        if (data) setAlbums(data)
      })
    } else {
      setAlbums([])
    }
  }, [selectedArtistId])

  // Load tracks when album selected
  useEffect(() => {
    if (selectedAlbumId) {
      supabase.from('tracks').select('*').eq('album_id', selectedAlbumId).order('track_number', { nullsFirst: false }).then(({ data }) => {
        if (data) setTracks(data)
      })
    } else if (selectedArtistId && manageSection === 'tracks') {
      supabase.from('tracks').select('*').eq('artist_id', selectedArtistId).order('track_number', { nullsFirst: false }).then(({ data }) => {
        if (data) setTracks(data)
      })
    } else {
      setTracks([])
    }
  }, [selectedAlbumId, selectedArtistId, manageSection])

  const msg = message && (
    <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: message.type === 'success' ? 'rgba(43,122,143,0.1)' : 'rgba(220,60,60,0.1)', border: `1px solid ${message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c'}`, color: message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c', fontSize: '14px' }}>
      {message.text}
    </div>
  )

  // ── DELETE ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!confirmDelete) return
    setLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.from(
        confirmDelete.type === 'artist' ? 'artists' :
        confirmDelete.type === 'album'  ? 'albums'  : 'tracks'
      ).delete().eq('id', confirmDelete.id)
      if (error) throw error
      setMessage({ type: 'success', text: `${confirmDelete.type.charAt(0).toUpperCase() + confirmDelete.type.slice(1)} "${confirmDelete.name}" deleted.` })
      if (confirmDelete.type === 'artist') { refreshArtists(); setSelectedArtistId('') }
      if (confirmDelete.type === 'album')  { setAlbums(prev => prev.filter(a => a.id !== confirmDelete.id)); setSelectedAlbumId('') }
      if (confirmDelete.type === 'track')  { setTracks(prev => prev.filter(t => t.id !== confirmDelete.id)) }
      setConfirmDelete(null)
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    }
    setLoading(false)
  }

  // ── SAVE ARTIST ────────────────────────────────────────────────────────────

  const handleSaveArtist = async (artistId: string) => {
    setLoading(true)
    setMessage(null)
    try {
      let updates: any = { ...editArtist }
      if (artistPhotoFile) {
        const artistName = artists.find(a => a.id === artistId)?.name || 'unknown'
        updates.photo_url = (await uploadToCloudinary(artistPhotoFile, slugify(artistName), 'image')).url
      }
      const { error } = await supabase.from('artists').update(updates).eq('id', artistId)
      if (error) throw error
      refreshArtists()
      setEditingArtistId(null)
      setArtistPhotoFile(null)
      setMessage({ type: 'success', text: 'Artist updated.' })
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    }
    setLoading(false)
  }

  // ── SAVE ALBUM ─────────────────────────────────────────────────────────────

  const handleSaveAlbum = async (albumId: string) => {
    setLoading(true)
    setMessage(null)
    try {
      let updates: any = { ...editAlbum }
      if (albumCoverFile) {
        const artistName = artists.find(a => a.id === selectedArtistId)?.name || 'unknown'
        const albumTitle = albums.find(a => a.id === albumId)?.title || 'unknown'
        updates.cover_url = (await uploadToCloudinary(albumCoverFile, `${slugify(artistName)}/albums/${slugify(albumTitle)}`, 'image')).url
      }
      if (updates.price !== undefined) updates.price = updates.price ? parseFloat(updates.price) : null
      const { error } = await supabase.from('albums').update(updates).eq('id', albumId)
      if (error) throw error
      await supabase.from('content_genres').delete().eq('content_type', 'album').eq('content_id', albumId)
      if (editingGenres.length > 0) {
        await supabase.from('content_genres').insert(
          editingGenres.map(genreId => ({ content_type: 'album', content_id: albumId, genre_id: genreId }))
        )
      }
      setAlbums(prev => prev.map(a => a.id === albumId ? { ...a, ...updates } : a))
      setEditingAlbumId(null)
      setAlbumCoverFile(null)
      setMessage({ type: 'success', text: 'Album updated.' })
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    }
    setLoading(false)
  }

  // ── SAVE TRACK ─────────────────────────────────────────────────────────────

  const handleSaveTrack = async (trackId: string) => {
    setLoading(true)
    setMessage(null)
    try {
      let updates: any = { ...editTrack }
      if (trackImageFile) {
        const artistName = artists.find(a => a.id === selectedArtistId)?.name || 'unknown'
        const albumTitle = albums.find(a => a.id === selectedAlbumId)?.title || 'singles'
        const trackTitle = tracks.find(t => t.id === trackId)?.title || 'unknown'
        updates.track_image_url = (await uploadToCloudinary(trackImageFile, `${slugify(artistName)}/albums/${slugify(albumTitle)}/${slugify(trackTitle)}`, 'image')).url
      }
      if (updates.price        !== undefined) updates.price        = updates.price        ? parseFloat(updates.price)      : null
      if (updates.track_number !== undefined) updates.track_number = updates.track_number ? parseInt(updates.track_number) : null
      const { error } = await supabase.from('tracks').update(updates).eq('id', trackId)
      if (error) throw error
      await supabase.from('content_genres').delete().eq('content_type', 'track').eq('content_id', trackId)
      if (editingGenres.length > 0) {
        await supabase.from('content_genres').insert(
          editingGenres.map(genreId => ({ content_type: 'track', content_id: trackId, genre_id: genreId }))
        )
      }
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, ...updates } : t))
      setEditingTrackId(null)
      setTrackImageFile(null)
      setMessage({ type: 'success', text: 'Track updated.' })
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    }
    setLoading(false)
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div style={s.card}>
      <div style={s.sectionTitle}>Manage Content</div>

      {/* Section tabs */}
      <div style={s.toggleRow}>
        {(['artists', 'albums', 'tracks'] as const).map(sec => (
          <button key={sec} style={s.toggle(manageSection === sec)} onClick={() => setManageSection(sec)}>
            {sec.charAt(0).toUpperCase() + sec.slice(1)}
          </button>
        ))}
      </div>

      {msg}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.3)', borderRadius: '8px', padding: '14px 16px', marginBottom: '8px', fontSize: '14px', color: '#dc3c3c' }}>
          <div style={{ marginBottom: '12px' }}>
            ⚠️ Delete {confirmDelete.type} <strong>"{confirmDelete.name}"</strong>? This cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={s.btnDanger} onClick={handleDelete} disabled={loading}>{loading ? 'Deleting...' : 'Yes, delete'}</button>
            <button style={s.btnCancel} onClick={() => setConfirmDelete(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── ARTISTS ─────────────────────────────────────────────── */}
      {manageSection === 'artists' && (
        <>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{artists.length} artist{artists.length !== 1 ? 's' : ''} in database</div>
          {artists.map(artist => (
            <div key={artist.id}>
              {editingArtistId === artist.id ? (
                <div style={s.editCard}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '14px' }}>Editing: {artist.name}</div>
                  <div style={s.field}>
                    <label style={s.label}>Name</label>
                    <input style={s.input} value={editArtist.name ?? artist.name} onChange={e => setEditArtist(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Bio</label>
                    <textarea style={{ ...s.textarea, minHeight: '80px' }} value={editArtist.bio ?? artist.bio ?? ''} onChange={e => setEditArtist(p => ({ ...p, bio: e.target.value }))} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Content Origin</label>
                    <select style={s.select} value={editArtist.content_origin ?? artist.content_origin ?? '100% human'} onChange={e => setEditArtist(p => ({ ...p, content_origin: e.target.value }))}>
                      <option value="100% human">🧑 100% Human</option>
                      <option value="human+ai">🧑🤖 Human + AI</option>
                      <option value="ai generated">🤖 AI Generated</option>
                    </select>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Replace Photo (optional)</label>
                    <input type="file" accept="image/*" style={s.fileInput} onChange={e => setArtistPhotoFile(e.target.files?.[0] || null)} />
                    {artistPhotoFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {artistPhotoFile.name}</div>}
                    {artist.photo_url && !artistPhotoFile && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Current: {artist.photo_url.split('/').pop()}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={s.btnSave} onClick={() => handleSaveArtist(artist.id)} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
                    <button style={s.btnCancel} onClick={() => { setEditingArtistId(null); setEditArtist({}); setArtistPhotoFile(null) }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={s.manageRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {artist.photo_url
                      ? <img src={artist.photo_url} alt={artist.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                      : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🎤</div>
                    }
                    <div>
                      <div style={s.manageLabel}>{artist.name}</div>
                      <div style={s.manageMeta}>{originEmoji(artist.content_origin)} {artist.content_origin || 'no origin set'}{artist.bio ? ` · ${artist.bio.substring(0, 50)}${artist.bio.length > 50 ? '…' : ''}` : ''}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button style={s.btnEdit} onClick={() => { setEditingArtistId(artist.id); setEditArtist({}) }}>Edit</button>
                    <button style={s.btnDanger} onClick={() => setConfirmDelete({ type: 'artist', id: artist.id, name: artist.name })}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* ── ALBUMS ──────────────────────────────────────────────── */}
      {manageSection === 'albums' && (
        <>
          <div style={s.field}>
            <label style={s.label}>Filter by Artist</label>
            <select style={s.select} value={selectedArtistId} onChange={e => setSelectedArtistId(e.target.value)}>
              <option value="">— all artists —</option>
              {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          {!selectedArtistId && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Select an artist to see their albums.</div>}
          {selectedArtistId && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{albums.length} album{albums.length !== 1 ? 's' : ''}</div>}
          {albums.map(album => (
            <div key={album.id}>
              {editingAlbumId === album.id ? (
                <div style={s.editCard}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '14px' }}>Editing: {album.title}</div>
                  <div style={s.field}>
                    <label style={s.label}>Title</label>
                    <input style={s.input} value={editAlbum.title ?? album.title} onChange={e => setEditAlbum(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Description</label>
                    <textarea style={{ ...s.textarea, minHeight: '80px' }} value={editAlbum.description ?? album.description ?? ''} onChange={e => setEditAlbum(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div style={s.row}>
                    <div>
                      <label style={s.label}>Album Type</label>
                      <select style={s.select} value={editAlbum.album_type ?? album.album_type ?? 'music'} onChange={e => setEditAlbum(p => ({ ...p, album_type: e.target.value }))}>
                        <option value="music">Music</option>
                        <option value="instrumental">Instrumental</option>
                        <option value="mixed">Mixed</option>
                        <option value="concept">Concept</option>
                        <option value="live">Live</option>
                        <option value="audio_story">Audio Story</option>
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Price ($)</label>
                      <input style={s.input} type="number" step="0.01" value={editAlbum.price ?? album.price ?? ''} onChange={e => setEditAlbum(p => ({ ...p, price: e.target.value as any }))} placeholder="9.00" />
                    </div>
                  </div>
                  <div style={s.row}>
                    <div>
                      <label style={s.label}>Status</label>
                      <select style={s.select} value={editAlbum.status ?? album.status ?? 'draft'} onChange={e => setEditAlbum(p => ({ ...p, status: e.target.value }))}>
                        <option value="draft">Draft</option>
                        <option value="private">Private</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Content Origin</label>
                      <select style={s.select} value={editAlbum.content_origin ?? album.content_origin ?? '100% human'} onChange={e => setEditAlbum(p => ({ ...p, content_origin: e.target.value }))}>
                        <option value="100% human">🧑 100% Human</option>
                        <option value="human+ai">🧑🤖 Human + AI</option>
                        <option value="ai generated">🤖 AI Generated</option>
                      </select>
                    </div>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Replace Cover (optional)</label>
                    <input type="file" accept="image/*" style={s.fileInput} onChange={e => setAlbumCoverFile(e.target.files?.[0] || null)} />
                    {albumCoverFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {albumCoverFile.name}</div>}
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Genres (up to 3)</label>
                    <GenrePicker genres={genres} selected={editingGenres} onChange={setEditingGenres} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={s.btnSave} onClick={() => handleSaveAlbum(album.id)} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
                    <button style={s.btnCancel} onClick={() => { setEditingAlbumId(null); setEditAlbum({}); setAlbumCoverFile(null) }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={s.manageRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {album.cover_url
                      ? <img src={album.cover_url} alt={album.title} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                      : <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🎵</div>
                    }
                    <div>
                      <div style={s.manageLabel}>{album.title}</div>
                      <div style={s.manageMeta}>{album.album_type} · {album.status} · {originEmoji(album.content_origin)} {album.price ? `$${album.price}` : 'no price'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button style={s.btnEdit} onClick={async () => { setEditingAlbumId(album.id); setEditAlbum({}); const g = await loadContentGenres('album', album.id); setEditingGenres(g) }}>Edit</button>
                    <button style={s.btnDanger} onClick={() => setConfirmDelete({ type: 'album', id: album.id, name: album.title })}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* ── TRACKS ──────────────────────────────────────────────── */}
      {manageSection === 'tracks' && (
        <>
          <div style={s.field}>
            <label style={s.label}>Artist</label>
            <select style={s.select} value={selectedArtistId} onChange={e => { setSelectedArtistId(e.target.value); setSelectedAlbumId('') }}>
              <option value="">— select artist —</option>
              {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          {selectedArtistId && (
            <div style={s.field}>
              <label style={s.label}>Album (optional — leave blank to see all tracks for artist)</label>
              <select style={s.select} value={selectedAlbumId} onChange={e => setSelectedAlbumId(e.target.value)}>
                <option value="">— all albums —</option>
                {albums.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>
          )}
          {!selectedArtistId && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Select an artist to see tracks.</div>}
          {selectedArtistId && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{tracks.length} track{tracks.length !== 1 ? 's' : ''}</div>}
          {tracks.map(track => (
            <div key={track.id}>
              {editingTrackId === track.id ? (
                <div style={s.editCard}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '14px' }}>Editing: {track.title}</div>
                  <div style={s.row}>
                    <div>
                      <label style={s.label}>Title</label>
                      <input style={s.input} value={editTrack.title ?? track.title} onChange={e => setEditTrack(p => ({ ...p, title: e.target.value }))} />
                    </div>
                    <div>
                      <label style={s.label}>Track Number</label>
                      <input style={s.input} type="number" value={editTrack.track_number ?? track.track_number ?? ''} onChange={e => setEditTrack(p => ({ ...p, track_number: e.target.value as any }))} />
                    </div>
                  </div>
                  <div style={s.row}>
                    <div>
                      <label style={s.label}>Track Type</label>
                      <select style={s.select} value={editTrack.track_type ?? track.track_type ?? 'song'} onChange={e => setEditTrack(p => ({ ...p, track_type: e.target.value }))}>
                        <option value="song">Song</option>
                        <option value="instrumental">Instrumental</option>
                        <option value="audio_story">Audio Story</option>
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Duration</label>
                      <input style={s.input} value={editTrack.duration ?? track.duration ?? ''} onChange={e => setEditTrack(p => ({ ...p, duration: e.target.value }))} placeholder="3:45" />
                    </div>
                  </div>
                  <div style={s.row}>
                    <div>
                      <label style={s.label}>Status</label>
                      <select style={s.select} value={editTrack.status ?? track.status ?? 'draft'} onChange={e => setEditTrack(p => ({ ...p, status: e.target.value }))}>
                        <option value="draft">Draft</option>
                        <option value="private">Private</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Content Origin</label>
                      <select style={s.select} value={editTrack.content_origin ?? track.content_origin ?? '100% human'} onChange={e => setEditTrack(p => ({ ...p, content_origin: e.target.value }))}>
                        <option value="100% human">🧑 100% Human</option>
                        <option value="human+ai">🧑🤖 Human + AI</option>
                        <option value="ai generated">🤖 AI Generated</option>
                      </select>
                    </div>
                  </div>
                  <div style={s.row}>
                    <div>
                      <label style={s.label}>Price ($)</label>
                      <input style={s.input} type="number" step="0.01" value={editTrack.price ?? track.price ?? ''} onChange={e => setEditTrack(p => ({ ...p, price: e.target.value as any }))} placeholder="1.29" />
                    </div>
                    <div>
                      <label style={s.label}>Replace Track Image (optional)</label>
                      <input type="file" accept="image/*" style={s.fileInput} onChange={e => setTrackImageFile(e.target.files?.[0] || null)} />
                      {trackImageFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {trackImageFile.name}</div>}
                    </div>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Lyrics / Description / Story Text</label>
                    <textarea style={{ ...s.textarea, minHeight: '100px' }} value={editTrack.text_content ?? track.text_content ?? ''} onChange={e => setEditTrack(p => ({ ...p, text_content: e.target.value }))} />
                    <div style={s.resizeHint}>↕ drag to resize</div>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Genres (up to 3)</label>
                    {editingGenres.length === 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginBottom: '8px', cursor: 'pointer' }}
                        onClick={async () => {
                          const albumId = selectedAlbumId || track.album_id
                          if (albumId) { const ag = await loadContentGenres('album', albumId); setEditingGenres(ag) }
                        }}>
                        ↑ Inherit from album
                      </div>
                    )}
                    <GenrePicker genres={genres} selected={editingGenres} onChange={setEditingGenres} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={s.btnSave} onClick={() => handleSaveTrack(track.id)} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
                    <button style={s.btnCancel} onClick={() => { setEditingTrackId(null); setEditTrack({}); setTrackImageFile(null) }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={s.manageRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {track.track_image_url
                      ? <img src={track.track_image_url} alt={track.title} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                      : <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🎵</div>
                    }
                    <div>
                      <div style={s.manageLabel}>{track.track_number ? `${track.track_number}. ` : ''}{track.title}</div>
                      <div style={s.manageMeta}>{track.track_type} · {track.status} · {track.duration || 'no duration'} · {originEmoji(track.content_origin)}</div>
                    </div>
                  </div>
<div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
  <button
    style={{ width: '32px', height: '32px', borderRadius: '50%', background: currentTrack?.id === track.id && isPlaying ? 'var(--accent-primary)' : 'var(--bg-card)', color: currentTrack?.id === track.id && isPlaying ? 'white' : 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    onClick={() => playTrack(track)}
  >
    {currentTrack?.id === track.id && isPlaying ? '⏸' : '▶'}
  </button>
  <button style={s.btnEdit} onClick={async () => { setEditingTrackId(track.id); setEditTrack({}); const g = await loadContentGenres('track', track.id); setEditingGenres(g) }}>Edit</button>
  <button style={s.btnDanger} onClick={() => setConfirmDelete({ type: 'track', id: track.id, name: track.title })}>Delete</button>
</div>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUpload() {
  useEffect(() => {
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) { window.location.href = '/login'; return }
    supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
      if (data?.role !== 'admin') window.location.href = '/dashboard/upload'
    })
  })
}, [])
  const [mode, setMode]         = useState<'upload' | 'manage'>('upload')
  const [step, setStep]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState<{ type: string; text: string } | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ label: string; percent: number } | null>(null)
  const [savedTracks, setSavedTracks] = useState<{ title: string; duration: string; hasLyrics: boolean; lyricsPreview: string }[]>([])
  const [artists, setArtists]   = useState<Artist[]>([])
  const [albums, setAlbums]     = useState<any[]>([])
  const [genres, setGenres] = useState<{id: string, name: string}[]>([])
  const [albumGenres, setAlbumGenres] = useState<string[]>([])
  const [trackGenres, setTrackGenres] = useState<string[]>([])
  const [artistProfileVideoFile, setArtistProfileVideoFile] = useState<File | null>(null)
  const [artistMode, setArtistMode]           = useState('select')
  const [selectedArtistId, setSelectedArtistId] = useState('')
  const [newArtist, setNewArtist]             = useState({ name: '', bio: '', content_origin: '100% human' })
  const [artistPhotoFile, setArtistPhotoFile] = useState<File | null>(null)
  const [artistMessageFile, setArtistMessageFile] = useState<File | null>(null)

  const [albumMode, setAlbumMode]             = useState('select')
  const [selectedAlbumId, setSelectedAlbumId] = useState('')
  const [newAlbum, setNewAlbum]               = useState({ title: '', description: '', price: '', album_type: 'music', content_origin: '100% human', status: 'draft' })
  const [albumCoverFile, setAlbumCoverFile]   = useState<File | null>(null)
  const [albumMessageFile, setAlbumMessageFile] = useState<File | null>(null)

  const emptyTrack = {
    title: '', track_number: '', duration: '', track_type: 'song',
    price: '', status: 'draft', content_origin: '100% human',
    text_content: '', text_content_type: 'lyrics', file_format: 'flac',
    isrc: '', iswc: '', composer: '', lyricist: '', producer: '',
    publisher: '', catalog_number: '', bpm: '', musical_key: '',
    mood: '', theme: '', language: 'en',
    copyright_year: String(new Date().getFullYear()), copyright_owner: '',
    sync_eligible: false, stems_available: false,
    instrumental_available: false, explicit: false,
  }
  const [track, setTrack]                     = useState(emptyTrack)
  const [trackAudioFile, setTrackAudioFile]   = useState<File | null>(null)
  const [trackImageFile, setTrackImageFile]   = useState<File | null>(null)
  const [trackMessageFile, setTrackMessageFile] = useState<File | null>(null)
  const [trackMusicVideoFile, setTrackMusicVideoFile] = useState<File | null>(null)
  const [showPublishing, setShowPublishing]   = useState(false)

  const loadArtists = () => {
    supabase.from('artists').select('id, name, bio, photo_url, content_origin').order('name').then(({ data }) => {
      if (data) setArtists(data)
    })
  }

  useEffect(() => {
  loadArtists()
  supabase.from('genres').select('id, name').eq('content_type', 'music').order('name').then(({ data }) => {
    if (data) setGenres(data)
  })
}, [])

  useEffect(() => {
    if (selectedArtistId) {
      supabase.from('albums').select('id, title').eq('artist_id', selectedArtistId).order('title').then(({ data }) => {
        if (data) setAlbums(data)
      })
    }
  }, [selectedArtistId])

  useEffect(() => {
    if (trackAudioFile) {
      readAudioDuration(trackAudioFile).then((dur: string) => {
        const ext = (trackAudioFile.name.split('.').pop() || 'flac').toLowerCase()
        setTrack(t => ({
          ...t,
          duration: dur || t.duration,
          file_format: ext,
          title: t.title || trackAudioFile.name.replace(/\.[^/.]+$/, '').replace(/^\d+[-\s]+/, '').replace(/[-_]/g, ' ').trim(),
        }))
      })
    }
  }, [trackAudioFile])

  const slugify = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const handleArtistStep = async () => {
    if (artistMode === 'select') {
      if (!selectedArtistId) return setMessage({ type: 'error', text: 'Please select an artist' })
      setStep(2); return
    }
    if (!newArtist.name) return setMessage({ type: 'error', text: 'Artist name is required' })
    setLoading(true); setMessage(null)
    try {
      const folder = slugify(newArtist.name)
      const photo        = artistPhotoFile        ? await uploadToCloudinary(artistPhotoFile, folder, 'image') : null
      const message      = artistMessageFile      ? await uploadToCloudinary(artistMessageFile, folder, 'video') : null
      const profileVideo = artistProfileVideoFile ? await uploadToCloudinary(artistProfileVideoFile, folder, 'video') : null
      const { data, error } = await supabase.from('artists').insert({
        name: newArtist.name, bio: newArtist.bio,
        photo_url: photo?.url ?? '',
        cloudinary_public_id: photo?.public_id ?? null,
        artist_message_url: message?.url ?? '',
        artist_profile_video_url: profileVideo?.url ?? '',
      }).select().single()
      if (error) throw error
      setSelectedArtistId(data.id)
      loadArtists()
      setMessage({ type: 'success', text: `Artist "${data.name}" created!` })
      setStep(2)
    } catch (err) { setMessage({ type: 'error', text: (err as Error).message }) }
    setLoading(false)
  }

  const handleAlbumStep = async () => {
    if (albumMode === 'single') { setSelectedAlbumId(''); setStep(3); return }
    if (albumMode === 'select') {
      if (!selectedAlbumId) return setMessage({ type: 'error', text: 'Please select an album' })
      setStep(3); return
    }
    if (!newAlbum.title) return setMessage({ type: 'error', text: 'Album title is required' })
    setLoading(true); setMessage(null)
    try {
      const artistName  = artists.find(a => a.id === selectedArtistId)?.name || 'unknown'
      const albumFolder = `${slugify(artistName)}/albums/${slugify(newAlbum.title)}`
      const cover   = albumCoverFile   ? await uploadToCloudinary(albumCoverFile, albumFolder, 'image') : null
      const message = albumMessageFile ? await uploadToCloudinary(albumMessageFile, albumFolder, 'video') : null
      const { data, error } = await supabase.from('albums').insert({
        artist_id: selectedArtistId, title: newAlbum.title, description: newAlbum.description,
        price: newAlbum.price ? parseFloat(newAlbum.price) : null,
        album_type: newAlbum.album_type, content_origin: newAlbum.content_origin,
        status: newAlbum.status,
        cover_url: cover?.url ?? '',
        cloudinary_public_id: cover?.public_id ?? null,
        artist_message_url: message?.url ?? '',
      }).select().single()
      if (error) throw error
      if (albumGenres.length > 0) {
  await supabase.from('content_genres').insert(
    albumGenres.map(genreId => ({
      content_type: 'album',
      content_id: data.id,
      genre_id: genreId,
    }))
  )
}
      setSelectedAlbumId(data.id)
      setAlbums(prev => [...prev, { id: data.id, title: data.title }])
      setMessage({ type: 'success', text: `Album "${data.title}" created!` })
      setStep(3)
    } catch (err) { setMessage({ type: 'error', text: (err as Error).message }) }
    setLoading(false)
  }

  const handleTrackSave = async (addAnother = false) => {
    if (!track.title)          return setMessage({ type: 'error', text: 'Track title is required' })
    if (!track.content_origin) return setMessage({ type: 'error', text: 'Content origin is required' })
    setLoading(true); setMessage(null)
    try {
      const artistName = artists.find(a => a.id === selectedArtistId)?.name || 'unknown'
      const albumTitle = albums.find(a => a.id === selectedAlbumId)?.title  || 'singles'
      const trackSlug  = `${String(track.track_number || '00').padStart(2, '0')}-${slugify(track.title)}`
      const trackFolder = `${slugify(artistName)}/albums/${slugify(albumTitle)}/${trackSlug}`
      
      const audio = trackAudioFile ? await uploadToCloudinary(trackAudioFile, trackFolder, 'video', (p) => setUploadProgress({ label: `Uploading audio: ${track.title}`, percent: p })) : null
      const image = trackImageFile ? await uploadToCloudinary(trackImageFile, trackFolder, 'image', (p) => setUploadProgress({ label: `Uploading image: ${track.title}`, percent: p })) : null
      const message    = trackMessageFile    ? await uploadToCloudinary(trackMessageFile, trackFolder, 'video') : null
      const musicVideo = trackMusicVideoFile ? await uploadToCloudinary(trackMusicVideoFile, trackFolder, 'video') : null

      const { data, error } = await supabase.from('tracks').insert({
        album_id: selectedAlbumId || null, artist_id: selectedArtistId,
        title: track.title, track_number: track.track_number ? parseInt(track.track_number) : null,
        track_type: track.track_type, duration: track.duration,
        cloudinary_url: audio?.url ?? '', cloudinary_public_id: audio?.public_id ?? null,
        file_format: track.file_format,
        track_image_url: image?.url ?? '', music_video_url: musicVideo?.url ?? '',
        artist_message_url: message?.url ?? '', text_content: track.text_content,
        text_content_type: track.text_content_type,
        price: track.price ? parseFloat(track.price) : null,
        status: track.status, content_origin: track.content_origin,
        isrc: track.isrc, iswc: track.iswc, composer: track.composer,
        lyricist: track.lyricist, producer: track.producer, publisher: track.publisher,
        catalog_number: track.catalog_number,
        bpm: track.bpm ? parseInt(track.bpm) : null,
        musical_key: track.musical_key, mood: track.mood, theme: track.theme,
        language: track.language,
        copyright_year: track.copyright_year ? parseInt(track.copyright_year) : null,
        copyright_owner: track.copyright_owner,
        sync_eligible: track.sync_eligible, stems_available: track.stems_available,
        instrumental_available: track.instrumental_available, explicit: track.explicit,
      }).select().single()
      if (error) throw error

      setSavedTracks(prev => [...prev, {
        title: data.title, duration: data.duration, hasLyrics: !!track.text_content,
        lyricsPreview: track.text_content ? track.text_content.substring(0, 80) + (track.text_content.length > 80 ? '...' : '') : '',
      }])
      const genresToSave = trackGenres.length > 0 ? trackGenres : albumGenres
if (genresToSave.length > 0) {
  await supabase.from('content_genres').insert(
    genresToSave.map(genreId => ({
      content_type: 'track',
      content_id: data.id,
      genre_id: genreId,
    }))
  )
}
      setMessage({ type: 'success', text: `Track "${data.title}" saved successfully!` })
      setUploadProgress(null)
if (addAnother) {
        const nextNum = String(parseInt(track.track_number || '0') + 1)
        setTrack({ ...emptyTrack, track_number: nextNum, content_origin: track.content_origin, status: track.status, price: track.price, publisher: track.publisher, copyright_owner: track.copyright_owner, copyright_year: track.copyright_year })
        setTrackAudioFile(null); setTrackImageFile(null); setTrackMessageFile(null); setTrackMusicVideoFile(null); setTrackGenres([])
      }
    } catch (err) { setMessage({ type: 'error', text: (err as Error).message }) }
    setLoading(false)
  }

  const msg = message && (
    <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', background: message.type === 'success' ? 'rgba(43,122,143,0.1)' : 'rgba(224,122,95,0.1)', border: `1px solid ${message.type === 'success' ? 'var(--accent-primary)' : 'var(--accent-secondary)'}`, color: message.type === 'success' ? 'var(--accent-primary)' : 'var(--accent-secondary)', fontSize: '14px' }}>
      {message.text}
    </div>
  )

  const lyricsPlaceholder = track.track_type === 'song' ? 'Paste lyrics here...' : track.track_type === 'instrumental' ? 'Describe this piece...' : 'Story text...'
  const lyricsLabel       = track.track_type === 'song' ? 'Lyrics' : track.track_type === 'instrumental' ? 'Description / Blurb' : 'Story Text'

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Upload Portal</h1>
      <p style={s.subtitle}>Private admin upload — Human Echo</p>

      {/* Top nav: Upload steps + Manage tab */}
      <div style={s.steps}>
        {mode === 'upload' && ['Artist', 'Album', 'Track'].map((label, i) => (
          <button key={label} style={s.stepBtn(step === i + 1, step > i + 1)} onClick={() => step > i + 1 && setStep(i + 1)}>
            {step > i + 1 ? '✓ ' : ''}{label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button style={s.manageBtn(mode === 'manage')} onClick={() => { setMode(mode === 'manage' ? 'upload' : 'manage'); setMessage(null) }}>
          {mode === 'manage' ? '← Upload' : '⚙ Manage'}
        </button>
      </div>

      {mode === 'manage' && (
        <ManageTab artists={artists} refreshArtists={loadArtists} />
      )}

      {mode === 'upload' && (
        <>
          {msg}

          {/* STEP 1: ARTIST */}
          {step === 1 && (
            <div style={s.card}>
              <div style={s.sectionTitle}>Artist</div>
              <div style={s.toggleRow}>
                <button style={s.toggle(artistMode === 'select')} onClick={() => setArtistMode('select')}>Select existing</button>
                <button style={s.toggle(artistMode === 'new')} onClick={() => setArtistMode('new')}>Add new artist</button>
              </div>

              {artistMode === 'select' ? (
                <div style={s.field}>
                  <label style={s.label}>Select Artist</label>
                  <select style={s.select} value={selectedArtistId} onChange={e => setSelectedArtistId(e.target.value)}>
                    <option value="">— choose artist —</option>
                    {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              ) : (
                <>
                  <div style={s.field}>
                    <label style={s.label}>Artist Name *</label>
                    <input style={s.input} value={newArtist.name} onChange={e => setNewArtist(n => ({ ...n, name: e.target.value }))} placeholder="e.g. R&B Beach Band" />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Bio</label>
                    <textarea style={s.textarea} value={newArtist.bio} onChange={e => setNewArtist(n => ({ ...n, bio: e.target.value }))} placeholder="Artist biography..." />
                    <div style={s.resizeHint}>↕ drag to resize</div>
                  </div>
                  <div style={s.row}>
                    <div>
                      <label style={s.label}>Artist Photo</label>
                      <input type="file" accept="image/*" style={s.fileInput} onChange={e => setArtistPhotoFile(e.target.files?.[0] || null)} />
                      {artistPhotoFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {artistPhotoFile.name}</div>}
                    </div>
                    <div>
                      <label style={s.label}>Artist Message Video (optional)</label>
                      <input type="file" accept="video/*" style={s.fileInput} onChange={e => setArtistMessageFile(e.target.files?.[0] || null)} />
                      {artistMessageFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {artistMessageFile.name}</div>}
                    </div>
                  </div>
                  <div style={s.row}>
                    <div>
                      <label style={s.label}>Profile Video (optional — plays once on artist page)</label>
                      <input type="file" accept="video/*" style={s.fileInput} onChange={e => setArtistProfileVideoFile(e.target.files?.[0] || null)} />
                      {artistProfileVideoFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {artistProfileVideoFile.name}</div>}
                    </div>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Content Origin</label>
                    <select style={s.select} value={newArtist.content_origin} onChange={e => setNewArtist(n => ({ ...n, content_origin: e.target.value }))}>
                      <option value="100% human">🧑 100% Human</option>
                      <option value="human+ai">🧑🤖 Human + AI</option>
                      <option value="ai generated">🤖 AI Generated</option>
                    </select>
                  </div>
                </>
              )}
              <button style={s.btn} onClick={handleArtistStep} disabled={loading}>{loading ? 'Saving...' : 'Continue →'}</button>
            </div>
          )}

          {/* STEP 2: ALBUM */}
          {step === 2 && (
            <div style={s.card}>
              <div style={s.sectionTitle}>Album</div>
              <div style={s.toggleRow}>
                <button style={s.toggle(albumMode === 'select')} onClick={() => setAlbumMode('select')}>Select existing</button>
                <button style={s.toggle(albumMode === 'new')} onClick={() => setAlbumMode('new')}>Add new album</button>
                <button style={s.toggle(albumMode === 'single')} onClick={() => setAlbumMode('single')}>Standalone single</button>
              </div>

              {albumMode === 'single' && (
                <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  This track will be saved as a standalone single — not attached to any album.
                </div>
              )}
              {albumMode === 'select' && (
                <div style={s.field}>
                  <label style={s.label}>Select Album</label>
                  <select style={s.select} value={selectedAlbumId} onChange={e => setSelectedAlbumId(e.target.value)}>
                    <option value="">— choose album —</option>
                    {albums.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                </div>
              )}
              {albumMode === 'new' && (
                <>
                  <div style={s.field}>
                    <label style={s.label}>Album Title *</label>
                    <input style={s.input} value={newAlbum.title} onChange={e => setNewAlbum(a => ({ ...a, title: e.target.value }))} placeholder="e.g. Beach Lovers" />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Description</label>
                    <textarea style={s.textarea} value={newAlbum.description} onChange={e => setNewAlbum(a => ({ ...a, description: e.target.value }))} placeholder="Album description..." />
                    <div style={s.resizeHint}>↕ drag to resize</div>
                  </div>
                  <div style={s.row}>
                    <div>
                      <label style={s.label}>Price ($)</label>
                      <input style={s.input} type="number" step="0.01" value={newAlbum.price} onChange={e => setNewAlbum(a => ({ ...a, price: e.target.value }))} placeholder="9.00" />
                    </div>
                    <div>
                      <label style={s.label}>Album Type</label>
                      <select style={s.select} value={newAlbum.album_type} onChange={e => setNewAlbum(a => ({ ...a, album_type: e.target.value }))}>
                        <option value="music">Music</option>
                        <option value="instrumental">Instrumental</option>
                        <option value="mixed">Mixed</option>
                        <option value="concept">Concept</option>
                        <option value="live">Live</option>
                        <option value="audio_story">Audio Story</option>
                      </select>
                    </div>
                  </div>
                  <div style={s.row}>
                    <div>
                      <label style={s.label}>Album Cover</label>
                      <input type="file" accept="image/*" style={s.fileInput} onChange={e => setAlbumCoverFile(e.target.files?.[0] || null)} />
                      {albumCoverFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {albumCoverFile.name}</div>}
                    </div>
                    <div>
                      <label style={s.label}>Artist Message Video (optional)</label>
                      <input type="file" accept="video/*" style={s.fileInput} onChange={e => setAlbumMessageFile(e.target.files?.[0] || null)} />
                      {albumMessageFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {albumMessageFile.name}</div>}
                    </div>
                  </div>
                  <div style={s.row}>
                    <div>
                      <label style={s.label}>Content Origin</label>
                      <select style={s.select} value={newAlbum.content_origin} onChange={e => setNewAlbum(a => ({ ...a, content_origin: e.target.value }))}>
                        <option value="100% human">🧑 100% Human</option>
                        <option value="human+ai">🧑🤖 Human + AI</option>
                        <option value="ai generated">🤖 AI Generated</option>
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Status</label>
                      <select style={s.select} value={newAlbum.status} onChange={e => setNewAlbum(a => ({ ...a, status: e.target.value }))}>
                        <option value="draft">Draft</option>
                        <option value="private">Private</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
              <div style={s.field}>
  <label style={s.label}>Genres (up to 3)</label>
  <GenrePicker genres={genres} selected={albumGenres} onChange={setAlbumGenres} />
</div>
              <button style={s.btnSecondary} onClick={() => setStep(1)}>← Back</button>
              <button style={s.btn} onClick={handleAlbumStep} disabled={loading}>{loading ? 'Saving...' : 'Continue →'}</button>
            </div>
          )}

          {/* STEP 3: TRACK */}
          {step === 3 && (
            <div style={s.card}>
              <div style={s.sectionTitle}>Track</div>

              {savedTracks.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {savedTracks.length} track{savedTracks.length > 1 ? 's' : ''} saved this session:
                  </div>
                  {savedTracks.map((t, i) => (
                    <div key={i} style={s.savedTrack}>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--accent-primary)' }}>✓ {t.title} {t.duration && `— ${t.duration}`}</div>
                      {t.hasLyrics && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Lyrics saved: {t.lyricsPreview}</div>}
                    </div>
                  ))}
                  <div style={s.divider} />
                </div>
              )}

              <div style={s.field}>
                <label style={s.label}>Audio File (FLAC/WAV/MP3) *</label>
                <input type="file" accept=".flac,.wav,.mp3,audio/*" style={s.fileInput} onChange={e => setTrackAudioFile(e.target.files?.[0] || null)} />
                {trackAudioFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {trackAudioFile.name}</div>}
              </div>

              <div style={s.row}>
                <div>
                  <label style={s.label}>Track Title *</label>
                  <input style={s.input} value={track.title} onChange={e => setTrack(t => ({ ...t, title: e.target.value }))} placeholder="Track title" />
                </div>
                <div>
                  <label style={s.label}>Track Number</label>
                  <input style={s.input} type="number" value={track.track_number} onChange={e => setTrack(t => ({ ...t, track_number: e.target.value }))} placeholder="1" />
                </div>
              </div>

              <div style={s.row}>
                <div>
                  <label style={s.label}>Duration (auto-detected)</label>
                  <input style={s.input} value={track.duration} onChange={e => setTrack(t => ({ ...t, duration: e.target.value }))} placeholder="3:45" />
                </div>
                <div>
                  <label style={s.label}>Price ($)</label>
                  <input style={s.input} type="number" step="0.01" value={track.price} onChange={e => setTrack(t => ({ ...t, price: e.target.value }))} placeholder="1.29" />
                </div>
              </div>

              <div style={s.row}>
                <div>
                  <label style={s.label}>Track Type</label>
                  <select style={s.select} value={track.track_type} onChange={e => setTrack(t => ({ ...t, track_type: e.target.value, text_content_type: e.target.value === 'song' ? 'lyrics' : e.target.value === 'instrumental' ? 'description' : 'story' }))}>
                    <option value="song">Song</option>
                    <option value="instrumental">Instrumental</option>
                    <option value="audio_story">Audio Story</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Content Origin *</label>
                  <select style={s.select} value={track.content_origin} onChange={e => setTrack(t => ({ ...t, content_origin: e.target.value }))}>
                    <option value="100% human">🧑 100% Human</option>
                    <option value="human+ai">🧑🤖 Human + AI</option>
                    <option value="ai generated">🤖 AI Generated</option>
                  </select>
                </div>
              </div>

              <div style={s.row}>
                <div>
                  <label style={s.label}>Status</label>
                  <select style={s.select} value={track.status} onChange={e => setTrack(t => ({ ...t, status: e.target.value }))}>
                    <option value="draft">Draft</option>
                    <option value="private">Private</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Track Image</label>
                  <input type="file" accept="image/*" style={s.fileInput} onChange={e => setTrackImageFile(e.target.files?.[0] || null)} />
                  {trackImageFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {trackImageFile.name}</div>}
                </div>
              </div>
<div style={s.field}>
  <label style={s.label}>Genres (up to 3)</label>
  {selectedAlbumId && albumGenres.length > 0 && trackGenres.length === 0 && (
    <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginBottom: '8px', cursor: 'pointer' }}
      onClick={() => setTrackGenres(albumGenres)}>
      ↑ Inherit from album
    </div>
  )}
  <GenrePicker genres={genres} selected={trackGenres} onChange={setTrackGenres} />
</div>
              <div style={s.field}>
                <label style={s.label}>{lyricsLabel} (optional)</label>
                <textarea style={s.textarea} value={track.text_content} onChange={e => setTrack(t => ({ ...t, text_content: e.target.value }))} placeholder={lyricsPlaceholder} />
                <div style={s.resizeHint}>↕ drag to resize</div>
              </div>

              <div style={s.row}>
                <div>
                  <label style={s.label}>Music Video (optional)</label>
                  <input type="file" accept="video/*" style={s.fileInput} onChange={e => setTrackMusicVideoFile(e.target.files?.[0] || null)} />
                  {trackMusicVideoFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {trackMusicVideoFile.name}</div>}
                </div>
                <div>
                  <label style={s.label}>Artist Message Video (optional)</label>
                  <input type="file" accept="video/*" style={s.fileInput} onChange={e => setTrackMessageFile(e.target.files?.[0] || null)} />
                  {trackMessageFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {trackMessageFile.name}</div>}
                </div>
              </div>

              <div style={s.divider} />
              <button onClick={() => setShowPublishing(!showPublishing)} style={{ ...s.btnSecondary, marginBottom: '16px', fontSize: '13px' }}>
                {showPublishing ? '▲ Hide' : '▼ Show'} Publishing Details
              </button>

              {showPublishing && (
                <>
                  <div style={s.row}>
                    <div><label style={s.label}>ISRC</label><input style={s.input} value={track.isrc} onChange={e => setTrack(t => ({ ...t, isrc: e.target.value }))} placeholder="US-XXX-YY-NNNNN" /></div>
                    <div><label style={s.label}>ISWC</label><input style={s.input} value={track.iswc} onChange={e => setTrack(t => ({ ...t, iswc: e.target.value }))} placeholder="T-XXXXXXXXX-X" /></div>
                  </div>
                  <div style={s.row}>
                    <div><label style={s.label}>Composer</label><input style={s.input} value={track.composer} onChange={e => setTrack(t => ({ ...t, composer: e.target.value }))} /></div>
                    <div><label style={s.label}>Lyricist</label><input style={s.input} value={track.lyricist} onChange={e => setTrack(t => ({ ...t, lyricist: e.target.value }))} /></div>
                  </div>
                  <div style={s.row}>
                    <div><label style={s.label}>Producer</label><input style={s.input} value={track.producer} onChange={e => setTrack(t => ({ ...t, producer: e.target.value }))} /></div>
                    <div><label style={s.label}>Publisher</label><input style={s.input} value={track.publisher} onChange={e => setTrack(t => ({ ...t, publisher: e.target.value }))} /></div>
                  </div>
                  <div style={s.row}>
                    <div><label style={s.label}>Catalog Number</label><input style={s.input} value={track.catalog_number} onChange={e => setTrack(t => ({ ...t, catalog_number: e.target.value }))} placeholder="HE-001" /></div>
                    <div><label style={s.label}>BPM</label><input style={s.input} type="number" value={track.bpm} onChange={e => setTrack(t => ({ ...t, bpm: e.target.value }))} placeholder="120" /></div>
                  </div>
                  <div style={s.row}>
                    <div><label style={s.label}>Musical Key</label><input style={s.input} value={track.musical_key} onChange={e => setTrack(t => ({ ...t, musical_key: e.target.value }))} placeholder="C major" /></div>
                    <div><label style={s.label}>Language</label><input style={s.input} value={track.language} onChange={e => setTrack(t => ({ ...t, language: e.target.value }))} placeholder="en" /></div>
                  </div>
                  <div style={s.row}>
                    <div><label style={s.label}>Mood</label><input style={s.input} value={track.mood} onChange={e => setTrack(t => ({ ...t, mood: e.target.value }))} placeholder="Romantic, Upbeat..." /></div>
                    <div><label style={s.label}>Theme</label><input style={s.input} value={track.theme} onChange={e => setTrack(t => ({ ...t, theme: e.target.value }))} placeholder="Beach, Love, Summer..." /></div>
                  </div>
                  <div style={s.row}>
                    <div><label style={s.label}>Copyright Year</label><input style={s.input} type="number" value={track.copyright_year} onChange={e => setTrack(t => ({ ...t, copyright_year: e.target.value }))} /></div>
                    <div><label style={s.label}>Copyright Owner</label><input style={s.input} value={track.copyright_owner} onChange={e => setTrack(t => ({ ...t, copyright_owner: e.target.value }))} placeholder="Human Echo Records" /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {(['sync_eligible', 'stems_available', 'instrumental_available', 'explicit'] as const).map((key) => (
                      <label key={key} style={s.checkbox}>
                        <input type="checkbox" checked={track[key] as boolean} onChange={e => setTrack(t => ({ ...t, [key]: e.target.checked }))} />
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </label>
                    ))}
                  </div>
                </>
              )}

{uploadProgress && <ProgressBar label={uploadProgress.label} percent={uploadProgress.percent} />}
<div style={s.divider} />
<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button style={s.btnSecondary} onClick={() => setStep(2)}>← Back</button>
                <button style={s.btn} onClick={() => handleTrackSave(false)} disabled={loading}>{loading ? 'Uploading...' : 'Save Track'}</button>
                <button style={s.btnGold} onClick={() => handleTrackSave(true)} disabled={loading}>{loading ? 'Uploading...' : 'Save + Add Another'}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
