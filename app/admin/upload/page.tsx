'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/context/PlayerContext'

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

type Artist = { id: string; name: string; bio?: string; photo_url?: string; content_origin?: string; creator_type?: string[]; creator_label?: string; artist_profile_video_url?: string; hero_video_url?: string }
type Album  = { id: string; artist_id: string; title: string; description?: string; status?: string; cover_url?: string; hero_image_url?: string; album_type?: string; content_origin?: string; price?: number }
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
  manageRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: '8px' },
  manageLabel:  { fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' },
  manageMeta:   { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  editCard:     { background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '12px', padding: '20px', marginBottom: '8px' },
  confirmBox:   { background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.3)', borderRadius: '8px', padding: '14px 16px', marginBottom: '8px', fontSize: '14px', color: '#dc3c3c' },
}

// FIX: helper to format creator_type array as readable pills for the manage row
const CREATOR_TYPE_LABELS: Record<string, string> = {
  music: '🎵 Music',
  book:  '📚 Book',
  film:  '🎬 Film',
  story: '📖 Story',
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

function GenrePicker({ genres, selected, onChange, max = 3 }: {
  genres: {id: string, name: string}[]
  selected: string[]
  onChange: (ids: string[]) => void
  max?: number
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter(g => g !== id))
    else if (selected.length < max) onChange([...selected, id])
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
      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selected.length}/{max} selected</div>
    </div>
  )
}

// ─── Manage Tab ──────────────────────────────────────────────────────────────

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

  const [editingArtistId, setEditingArtistId] = useState<string | null>(null)
  const [editArtist, setEditArtist]           = useState<Partial<Artist>>({})
  const [artistPhotoFile, setArtistPhotoFile] = useState<File | null>(null)
const [artistIntroFile, setArtistIntroFile] = useState<File | null>(null)
const [heroVideoFile, setHeroVideoFile]     = useState<File | null>(null)

  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null)
  const [editAlbum, setEditAlbum]           = useState<Partial<Album>>({})
  const [albumCoverFile, setAlbumCoverFile] = useState<File | null>(null)
  const [albumHeroFile, setAlbumHeroFile] = useState<File | null>(null)
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null)
  const [editTrack, setEditTrack]           = useState<Partial<Track>>({})
  const [trackImageFile, setTrackImageFile] = useState<File | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; name: string } | null>(null)

  const [artistSearch, setArtistSearch] = useState('')

  // Track search / filter / bulk selection
  const [trackSearch, setTrackSearch] = useState('')
  const [trackStatusFilter, setTrackStatusFilter] = useState<'all' | 'draft' | 'private' | 'published'>('all')
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

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

  useEffect(() => {
    if (selectedArtistId) {
      supabase.from('albums').select('*').eq('artist_id', selectedArtistId).order('title').then(({ data }) => {
        if (data) setAlbums(data)
      })
    } else {
      setAlbums([])
    }
  }, [selectedArtistId])

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

  const handleSaveArtist = async (artistId: string) => {
    setLoading(true)
    setMessage(null)
    try {
      let updates: any = { ...editArtist }
      const artistName = artists.find(a => a.id === artistId)?.name || 'unknown'
      // Each media file uploads independently — editing one (e.g. just the hero
      // video) must not require also replacing the photo.
      if (artistPhotoFile) {
        updates.photo_url = (await uploadToCloudinary(artistPhotoFile, slugify(artistName), 'image')).url
      }
      if (artistIntroFile) {
        const res = await uploadToCloudinary(artistIntroFile, slugify(artistName), 'video')
        updates.artist_profile_video_url = res.url
      }
      if (heroVideoFile) {
        const res = await uploadToCloudinary(heroVideoFile, `${slugify(artistName)}/hero`, 'video')
        updates.hero_video_url = res.url
      }
      const { error } = await supabase.from('artists').update(updates).eq('id', artistId)
      if (error) throw error
      refreshArtists()
      setEditingArtistId(null)
      setArtistPhotoFile(null)
      setArtistIntroFile(null)
      setHeroVideoFile(null)
      setMessage({ type: 'success', text: 'Artist updated.' })
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    }
    setLoading(false)
  }

  const handleSaveAlbum = async (albumId: string) => {
    setLoading(true)
    setMessage(null)
    try {
      let updates: any = { ...editAlbum }
      const artistName = artists.find(a => a.id === selectedArtistId)?.name || 'unknown'
      const albumTitle = albums.find(a => a.id === albumId)?.title || 'unknown'
      if (albumCoverFile) {
        updates.cover_url = (await uploadToCloudinary(albumCoverFile, `${slugify(artistName)}/albums/${slugify(albumTitle)}`, 'image')).url
      }
      if (albumHeroFile) {
        updates.hero_image_url = (await uploadToCloudinary(albumHeroFile, `${slugify(artistName)}/albums/${slugify(albumTitle)}/hero`, 'image')).url
        setAlbumHeroFile(null)
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

  // ── Track filtering + bulk actions ──
  const filteredTracks = tracks.filter(t => {
    if (trackStatusFilter !== 'all' && (t.status || 'draft') !== trackStatusFilter) return false
    if (trackSearch.trim() && !(t.title || '').toLowerCase().includes(trackSearch.trim().toLowerCase())) return false
    return true
  })

  const toggleTrackSelect = (id: string) =>
    setSelectedTrackIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const handleBulkStatus = async (status: string) => {
    const ids = [...selectedTrackIds]
    if (ids.length === 0) return
    setBulkBusy(true); setMessage(null)
    try {
      const { error } = await supabase.from('tracks').update({ status }).in('id', ids)
      if (error) throw error
      setTracks(prev => prev.map(t => ids.includes(t.id) ? { ...t, status } : t))
      setSelectedTrackIds(new Set())
      setMessage({ type: 'success', text: `${ids.length} track${ids.length !== 1 ? 's' : ''} set to ${status}.` })
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    }
    setBulkBusy(false)
  }

  const handleBulkDelete = async () => {
    const ids = [...selectedTrackIds]
    if (ids.length === 0) return
    setBulkBusy(true); setMessage(null)
    try {
      const { error } = await supabase.from('tracks').delete().in('id', ids)
      if (error) throw error
      setTracks(prev => prev.filter(t => !ids.includes(t.id)))
      setSelectedTrackIds(new Set())
      setBulkDeleteConfirm(false)
      setMessage({ type: 'success', text: `${ids.length} track${ids.length !== 1 ? 's' : ''} deleted.` })
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    }
    setBulkBusy(false)
  }

  return (
    <div style={s.card}>
      <div style={s.sectionTitle}>Manage Content</div>

      <div style={s.toggleRow}>
        {(['artists', 'albums', 'tracks'] as const).map(sec => (
          <button key={sec} style={s.toggle(manageSection === sec)} onClick={() => setManageSection(sec)}>
            {sec.charAt(0).toUpperCase() + sec.slice(1)}
          </button>
        ))}
      </div>

      {msg}

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

      {/* ── ARTISTS ── */}
      {manageSection === 'artists' && (
        <>
          <input
            style={{ ...s.input, marginBottom: '12px' }}
            placeholder="Search artists by name…"
            value={artistSearch}
            onChange={e => setArtistSearch(e.target.value)}
          />
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {(() => { const n = artists.filter(a => (a.name || '').toLowerCase().includes(artistSearch.trim().toLowerCase())).length; return n === artists.length ? `${artists.length}` : `${n} of ${artists.length}` })()} artist{artists.length !== 1 ? 's' : ''} in database
          </div>
          {artists.filter(a => (a.name || '').toLowerCase().includes(artistSearch.trim().toLowerCase())).map(artist => (
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

                  {/* FIX: Creator Type checkboxes */}
                  <div style={s.field}>
                    <label style={s.label}>Creator Type</label>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const, marginTop: '4px' }}>
                      {(['music', 'book', 'film', 'story'] as const).map(type => {
                        const current = editArtist.creator_type ?? artist.creator_type ?? ['music']
                        return (
                          <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={current.includes(type)}
                              onChange={e => {
                                const updated = e.target.checked
                                  ? [...current, type]
                                  : current.filter((t: string) => t !== type)
                                setEditArtist(p => ({ ...p, creator_type: updated }))
                              }}
                            />
                            {CREATOR_TYPE_LABELS[type]}
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* FIX: Creator Label — was missing entirely */}
                  <div style={s.field}>
                    <label style={s.label}>Creator Label <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— shown on artist card & profile</span></label>
                    <input
                      style={s.input}
                      value={editArtist.creator_label ?? artist.creator_label ?? ''}
                      onChange={e => setEditArtist(p => ({ ...p, creator_label: e.target.value }))}
                      placeholder='e.g. "Singer-Songwriter", "R&B Band", "Fiction Author"'
                    />
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
                    <label style={s.label}>Replace Photo — square, min 400×400px</label>
                    <input type="file" accept="image/*" style={s.fileInput} onChange={e => setArtistPhotoFile(e.target.files?.[0] || null)} />
                    {artistPhotoFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {artistPhotoFile.name}</div>}
                    {artist.photo_url && !artistPhotoFile && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Current: {artist.photo_url.split('/').pop()}</div>}
                  </div>
               <div style={s.field}>
                    <label style={s.label}>Artist Introduction <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— up to :30, any aspect ratio</span></label>
                    <input type="file" accept="video/*" style={s.fileInput} onChange={e => setArtistIntroFile(e.target.files?.[0] || null)} />
                    {artistIntroFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {artistIntroFile.name}</div>}
                    {artist.artist_profile_video_url && !artistIntroFile && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Current: {artist.artist_profile_video_url.split('/').pop()}
                      </div>
                    )}
                  </div>

                  <div style={s.field}>
                    <label style={s.label}>Hero Background Video <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— 16:9, up to :30, loops muted on artist page</span></label>
                    <input type="file" accept="video/*" style={s.fileInput} onChange={e => setHeroVideoFile(e.target.files?.[0] || null)} />
                    {heroVideoFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {heroVideoFile.name}</div>}
                    {artist.hero_video_url && !heroVideoFile && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Current: {artist.hero_video_url.split('/').pop()}
                        <button onClick={() => setEditArtist(p => ({ ...p, hero_video_url: null }))} style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#dc3c3c' }}>Remove (use default)</button>
                      </div>
                    )}
                    {!artist.hero_video_url && !heroVideoFile && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>None set — a platform default will play on this artist's page</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={s.btnSave} onClick={() => handleSaveArtist(artist.id)} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
                    <button style={s.btnCancel} onClick={() => { setEditingArtistId(null); setEditArtist({}); setArtistPhotoFile(null); setArtistIntroFile(null); setHeroVideoFile(null) }}>Cancel</button>
                  </div>
                </div>
              ) : (
                // FIX: manage row now shows creator_label and creator_type
                <div style={s.manageRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {artist.photo_url
                      ? <img src={artist.photo_url} alt={artist.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                      : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🎤</div>
                    }
                    <div>
                      <div style={s.manageLabel}>{artist.name}</div>
                      <div style={s.manageMeta}>
                        {originEmoji(artist.content_origin)} {artist.content_origin || 'no origin'}
                        {artist.creator_label ? ` · ${artist.creator_label}` : ' · no label set'}
                        {artist.creator_type?.length
                          ? ` · ${artist.creator_type.map(t => CREATOR_TYPE_LABELS[t] || t).join(', ')}`
                          : ' · no type set'}
                      </div>
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

      {/* ── ALBUMS ── */}
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
                    <label style={s.label}>Replace Cover — square, min 800×800px</label>
                    <input type="file" accept="image/*" style={s.fileInput} onChange={e => setAlbumCoverFile(e.target.files?.[0] || null)} />
                    {albumCoverFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {albumCoverFile.name}</div>}
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Hero Image <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— wide landscape, shown as album page background</span></label>
                    <input type="file" accept="image/*" style={s.fileInput} onChange={e => setAlbumHeroFile(e.target.files?.[0] || null)} />
                    {albumHeroFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {albumHeroFile.name}</div>}
                    {album.hero_image_url && !albumHeroFile && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Current hero set · <a href={album.hero_image_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>view</a></div>}
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Genres (up to 3)</label>
                    <GenrePicker genres={genres} selected={editingGenres} onChange={setEditingGenres} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={s.btnSave} onClick={() => handleSaveAlbum(album.id)} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
                    <button style={s.btnCancel} onClick={() => { setEditingAlbumId(null); setEditAlbum({}); setAlbumCoverFile(null); setAlbumHeroFile(null) }}>Cancel</button>
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

      {/* ── TRACKS ── */}
      {manageSection === 'tracks' && (
        <>
          <div style={s.field}>
            <label style={s.label}>Artist</label>
            <select style={s.select} value={selectedArtistId} onChange={e => { setSelectedArtistId(e.target.value); setSelectedAlbumId(''); setSelectedTrackIds(new Set()) }}>
              <option value="">— select artist —</option>
              {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          {selectedArtistId && (
            <div style={s.field}>
              <label style={s.label}>Album (optional — leave blank to see all tracks for artist)</label>
              <select style={s.select} value={selectedAlbumId} onChange={e => { setSelectedAlbumId(e.target.value); setSelectedTrackIds(new Set()) }}>
                <option value="">— all albums —</option>
                {albums.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>
          )}
          {!selectedArtistId && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Select an artist to see tracks.</div>}

          {/* Search + status filter */}
          {selectedArtistId && tracks.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
              <input
                style={{ ...s.input, flex: '1 1 180px', minWidth: '140px' }}
                placeholder="Search tracks by title…"
                value={trackSearch}
                onChange={e => setTrackSearch(e.target.value)}
              />
              {(['all', 'published', 'private', 'draft'] as const).map(st => (
                <button key={st} onClick={() => setTrackStatusFilter(st)}
                  style={{
                    padding: '7px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', textTransform: 'capitalize',
                    border: `1px solid ${trackStatusFilter === st ? 'var(--accent-primary)' : 'var(--border)'}`,
                    background: trackStatusFilter === st ? 'var(--accent-primary)' : 'transparent',
                    color: trackStatusFilter === st ? '#fff' : 'var(--text-secondary)',
                  }}>
                  {st}
                </button>
              ))}
            </div>
          )}

          {/* Bulk action bar */}
          {selectedTrackIds.size > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginRight: '4px' }}>{selectedTrackIds.size} selected</span>
              <button style={s.btnSave} disabled={bulkBusy} onClick={() => handleBulkStatus('published')}>Publish</button>
              <button style={s.btnEdit} disabled={bulkBusy} onClick={() => handleBulkStatus('draft')}>Unpublish</button>
              <button style={s.btnDanger} disabled={bulkBusy} onClick={() => setBulkDeleteConfirm(true)}>Delete</button>
              <button style={s.btnCancel} disabled={bulkBusy} onClick={() => setSelectedTrackIds(new Set())}>Clear</button>
            </div>
          )}
          {bulkDeleteConfirm && (
            <div style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.3)', borderRadius: '8px', padding: '14px 16px', marginBottom: '8px', fontSize: '14px', color: '#dc3c3c' }}>
              <div style={{ marginBottom: '12px' }}>⚠️ Delete {selectedTrackIds.size} selected track{selectedTrackIds.size !== 1 ? 's' : ''}? This cannot be undone.</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={s.btnDanger} onClick={handleBulkDelete} disabled={bulkBusy}>{bulkBusy ? 'Deleting…' : 'Yes, delete'}</button>
                <button style={s.btnCancel} onClick={() => setBulkDeleteConfirm(false)}>Cancel</button>
              </div>
            </div>
          )}

          {selectedArtistId && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {filteredTracks.length === tracks.length ? `${tracks.length}` : `${filteredTracks.length} of ${tracks.length}`} track{tracks.length !== 1 ? 's' : ''}
            </div>
          )}
          {selectedArtistId && filteredTracks.length > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', cursor: 'pointer' }}>
              <input type="checkbox"
                checked={filteredTracks.every(t => selectedTrackIds.has(t.id))}
                onChange={e => setSelectedTrackIds(prev => {
                  const n = new Set(prev)
                  if (e.target.checked) filteredTracks.forEach(t => n.add(t.id))
                  else filteredTracks.forEach(t => n.delete(t.id))
                  return n
                })} />
              Select all {filteredTracks.length} shown
            </label>
          )}
          {filteredTracks.map(track => (
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
                      <label style={s.label}>Replace Track Image — square, min 600×600px</label>
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
                  <div style={s.field}>
                    <label style={s.label}>Album (reassign)</label>
                    <select style={s.select} value={editTrack.album_id ?? track.album_id ?? ''} onChange={e => setEditTrack(p => ({ ...p, album_id: e.target.value || null }))}>
                      <option value="">— standalone single —</option>
                      {albums.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={s.btnSave} onClick={() => handleSaveTrack(track.id)} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
                    <button style={s.btnCancel} onClick={() => { setEditingTrackId(null); setEditTrack({}); setTrackImageFile(null) }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={s.manageRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="checkbox" checked={selectedTrackIds.has(track.id)} onChange={() => toggleTrackSelect(track.id)} style={{ width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer' }} />
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

// ─── Bulk Track Upload ───────────────────────────────────────────────────────
// Drop many audio files at once → editable rows → one "Upload all". Fills an
// album in one pass instead of the one-track-at-a-time wizard.

type BulkRow = {
  id: string
  file: File
  title: string
  track_number: string
  duration: string
  track_type: string
  image: File | null
  state: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
  progress: number
}

function BulkTrackUpload({
  artists, albums, selectedArtistId, selectedAlbumId, genres, albumGenres, onUploaded,
}: {
  artists: Artist[]
  albums: Album[]
  selectedArtistId: string
  selectedAlbumId: string
  genres: { id: string; name: string }[]
  albumGenres: string[]
  onUploaded: (t: { title: string; duration: string }) => void
}) {
  const slugify = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const [rows, setRows] = useState<BulkRow[]>([])
  const [defStatus, setDefStatus] = useState('draft')
  const [defOrigin, setDefOrigin] = useState('100% human')
  const [defType, setDefType]     = useState('song')
  const [defPrice, setDefPrice]   = useState('')
  const [defGenres, setDefGenres] = useState<string[]>(albumGenres || [])
  const [busy, setBusy]       = useState(false)
  const [summary, setSummary] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const titleFromFile = (name: string) =>
    name.replace(/\.[^.]+$/, '')          // drop extension
        .replace(/^\d{1,3}[\s._-]+/, '')  // drop leading "01 - " / "01_" / "01."
        .replace(/[_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

  const fileFormat = (name: string) => {
    const ext = (name.split('.').pop() || '').toLowerCase()
    return ['flac', 'wav', 'mp3'].includes(ext) ? ext : 'mp3'
  }

  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return
    const arr = Array.from(files).filter(f => /\.(flac|wav|mp3)$/i.test(f.name) || f.type.startsWith('audio'))
    if (arr.length === 0) return
    setRows(prev => {
      const startNum = prev.length
      const newRows: BulkRow[] = arr.map((file, i) => ({
        id: `${file.name}-${file.size}-${startNum + i}`,
        file,
        title: titleFromFile(file.name),
        track_number: String(startNum + i + 1),
        duration: '',
        track_type: defType,
        image: null,
        state: 'pending',
        progress: 0,
      }))
      // detect duration for each new row asynchronously
      newRows.forEach(r => {
        readAudioDuration(r.file).then(dur =>
          setRows(cur => cur.map(x => x.id === r.id ? { ...x, duration: dur } : x))
        )
      })
      return [...prev, ...newRows]
    })
  }

  const updateRow = (id: string, patch: Partial<BulkRow>) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id))

  const pending = rows.filter(r => r.state === 'pending' || r.state === 'error')

  const uploadAll = async () => {
    if (!selectedArtistId) { setSummary({ type: 'error', text: 'Pick an artist first (step 1).' }); return }
    if (pending.length === 0) return
    setBusy(true); setSummary(null)
    const artistName = artists.find(a => a.id === selectedArtistId)?.name || 'unknown'
    const albumTitle = albums.find(a => a.id === selectedAlbumId)?.title || 'singles'
    let ok = 0, fail = 0
    for (const row of pending) {
      if (!row.title.trim()) { updateRow(row.id, { state: 'error', error: 'Title required' }); fail++; continue }
      updateRow(row.id, { state: 'uploading', error: undefined, progress: 0 })
      try {
        const trackSlug = `${String(row.track_number || '00').padStart(2, '0')}-${slugify(row.title)}`
        const folder = `${slugify(artistName)}/albums/${slugify(albumTitle)}/${trackSlug}`
        const audio = await uploadToCloudinary(row.file, folder, 'video', p => updateRow(row.id, { progress: p }))
        const image = row.image ? await uploadToCloudinary(row.image, folder, 'image') : null
        const { data, error } = await supabase.from('tracks').insert({
          album_id: selectedAlbumId || null, artist_id: selectedArtistId,
          title: row.title.trim(),
          track_number: row.track_number ? parseInt(row.track_number) : null,
          track_type: row.track_type,
          duration: row.duration,
          cloudinary_url: audio.url, cloudinary_public_id: audio.public_id,
          file_format: fileFormat(row.file.name),
          track_image_url: image?.url ?? '',
          price: defPrice ? parseFloat(defPrice) : null,
          status: defStatus, content_origin: defOrigin,
        }).select().single()
        if (error) throw error
        const g = defGenres.length ? defGenres : (albumGenres || [])
        if (g.length) {
          await supabase.from('content_genres').insert(
            g.map(genreId => ({ content_type: 'track', content_id: data.id, genre_id: genreId }))
          )
        }
        updateRow(row.id, { state: 'done', progress: 100 })
        onUploaded({ title: data.title, duration: data.duration || '' })
        ok++
      } catch (err) {
        updateRow(row.id, { state: 'error', error: (err as Error).message })
        fail++
      }
    }
    setBusy(false)
    setSummary({
      type: fail ? 'error' : 'success',
      text: `Uploaded ${ok} track${ok !== 1 ? 's' : ''}${fail ? ` · ${fail} failed — fix and click Upload again` : ''}.`,
    })
  }

  const stateIcon = (r: BulkRow) =>
    r.state === 'done' ? <span style={{ color: 'var(--accent-primary)' }}>✓</span>
    : r.state === 'uploading' ? <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{r.progress}%</span>
    : r.state === 'error' ? <span style={{ color: '#dc3c3c' }} title={r.error}>✗</span>
    : <span style={{ color: 'var(--text-muted)' }}>•</span>

  const albumLabel = selectedAlbumId
    ? albums.find(a => a.id === selectedAlbumId)?.title
    : 'Standalone singles (no album)'
  const artistLabel = artists.find(a => a.id === selectedArtistId)?.name

  return (
    <div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
        Adding tracks to <strong style={{ color: 'var(--text-secondary)' }}>{albumLabel}</strong>
        {artistLabel ? <> by <strong style={{ color: 'var(--text-secondary)' }}>{artistLabel}</strong></> : null}
      </div>

      {/* Dropzone */}
      <label
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        style={{
          display: 'block', textAlign: 'center', padding: '28px 16px', borderRadius: '12px', cursor: 'pointer',
          border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border)'}`,
          background: dragOver ? 'rgba(43,122,143,0.06)' : 'var(--bg-secondary)', marginBottom: '20px',
        }}
      >
        <input type="file" accept=".flac,.wav,.mp3,audio/*" multiple style={{ display: 'none' }}
          onChange={e => { addFiles(e.target.files); e.currentTarget.value = '' }} />
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
          🎵 Drop audio files here, or click to choose
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>FLAC, WAV or MP3 · select many at once</div>
      </label>

      {rows.length > 0 && (
        <>
          {/* Batch defaults — applied to every track on upload */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Applied to all {rows.length} track{rows.length !== 1 ? 's' : ''}
            </div>
            <div style={s.row}>
              <div>
                <label style={s.label}>Status</label>
                <select style={s.select} value={defStatus} onChange={e => setDefStatus(e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="private">Private</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Content Origin</label>
                <select style={s.select} value={defOrigin} onChange={e => setDefOrigin(e.target.value)}>
                  <option value="100% human">🧑 100% Human</option>
                  <option value="human+ai">🧑🤖 Human + AI</option>
                  <option value="ai generated">🤖 AI Generated</option>
                </select>
              </div>
            </div>
            <div style={s.row}>
              <div>
                <label style={s.label}>Default Type</label>
                <select style={s.select} value={defType} onChange={e => { setDefType(e.target.value); setRows(prev => prev.map(r => r.state === 'pending' ? { ...r, track_type: e.target.value } : r)) }}>
                  <option value="song">Song</option>
                  <option value="instrumental">Instrumental</option>
                  <option value="audio_story">Audio Story</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Price ($) — blank = not for sale</label>
                <input style={s.input} type="number" step="0.01" value={defPrice} onChange={e => setDefPrice(e.target.value)} placeholder="1.29" />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Genres (up to 3)</label>
              {albumGenres.length > 0 && defGenres.length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginBottom: '8px', cursor: 'pointer' }} onClick={() => setDefGenres(albumGenres)}>↑ Inherit from album</div>
              )}
              <GenrePicker genres={genres} selected={defGenres} onChange={setDefGenres} />
            </div>
          </div>

          {/* Rows */}
          <div style={{ marginBottom: '16px' }}>
            {rows.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderBottom: '1px solid var(--border)', opacity: r.state === 'done' ? 0.6 : 1 }}>
                <div style={{ width: '18px', textAlign: 'center', flexShrink: 0 }}>{stateIcon(r)}</div>
                <input style={{ ...s.input, width: '52px', flexShrink: 0, padding: '6px 8px', textAlign: 'center' }} value={r.track_number}
                  onChange={e => updateRow(r.id, { track_number: e.target.value })} disabled={busy} title="Track number" />
                <input style={{ ...s.input, flex: 1, padding: '6px 10px' }} value={r.title}
                  onChange={e => updateRow(r.id, { title: e.target.value })} disabled={busy} placeholder="Track title" />
                <select style={{ ...s.select, width: '120px', flexShrink: 0, padding: '6px 8px' }} value={r.track_type}
                  onChange={e => updateRow(r.id, { track_type: e.target.value })} disabled={busy}>
                  <option value="song">Song</option>
                  <option value="instrumental">Instrumental</option>
                  <option value="audio_story">Audio Story</option>
                </select>
                <span style={{ width: '46px', textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>{r.duration || '—'}</span>
                <label style={{ fontSize: '11px', color: r.image ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, width: '54px', textAlign: 'center' }} title={r.image ? r.image.name : 'Optional track image'}>
                  {r.image ? '✓ img' : '+ img'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={busy} onChange={e => updateRow(r.id, { image: e.target.files?.[0] || null })} />
                </label>
                <button onClick={() => removeRow(r.id)} disabled={busy} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }} title="Remove">×</button>
              </div>
            ))}
          </div>

          {summary && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', background: summary.type === 'success' ? 'rgba(43,122,143,0.1)' : 'rgba(220,60,60,0.1)', border: `1px solid ${summary.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c'}`, color: summary.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c' }}>
              {summary.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={s.btn} onClick={uploadAll} disabled={busy || pending.length === 0}>
              {busy ? 'Uploading…' : `Upload ${pending.length} track${pending.length !== 1 ? 's' : ''}`}
            </button>
            <button style={s.btnSecondary} onClick={() => { setRows([]); setSummary(null) }} disabled={busy}>Clear list</button>
          </div>
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
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single')
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState<{ type: string; text: string } | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ label: string; percent: number } | null>(null)
  const [savedTracks, setSavedTracks] = useState<{ title: string; duration: string; hasLyrics: boolean; lyricsPreview: string }[]>([])
  const [artists, setArtists]   = useState<Artist[]>([])
  const [albums, setAlbums]     = useState<any[]>([])
  const [genres, setGenres]     = useState<{id: string, name: string}[]>([])
  const [albumGenres, setAlbumGenres] = useState<string[]>([])
  const [trackGenres, setTrackGenres] = useState<string[]>([])
  const [artistProfileVideoFile, setArtistProfileVideoFile] = useState<File | null>(null)
  const [artistMode, setArtistMode]             = useState('select')
  const [selectedArtistId, setSelectedArtistId] = useState('')
  const [newArtist, setNewArtist]               = useState({ name: '', bio: '', content_origin: '100% human' })
  const [artistPhotoFile, setArtistPhotoFile]   = useState<File | null>(null)
  const [artistIntroFile, setArtistIntroFile] = useState<File | null>(null)
const [heroVideoFile, setHeroVideoFile]     = useState<File | null>(null)
  const [artistMessageFile, setArtistMessageFile] = useState<File | null>(null)

  const [albumMode, setAlbumMode]               = useState('select')
  const [selectedAlbumId, setSelectedAlbumId]   = useState('')
  const [newAlbum, setNewAlbum]                 = useState({ title: '', description: '', price: '', album_type: 'music', content_origin: '100% human', status: 'draft' })
  const [albumCoverFile, setAlbumCoverFile]     = useState<File | null>(null)
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
  const [track, setTrack]                           = useState(emptyTrack)
  const [trackAudioFile, setTrackAudioFile]         = useState<File | null>(null)
  const [trackImageFile, setTrackImageFile]         = useState<File | null>(null)
  const [trackMessageFile, setTrackMessageFile]     = useState<File | null>(null)
  const [trackMusicVideoFile, setTrackMusicVideoFile] = useState<File | null>(null)
  const [showPublishing, setShowPublishing]         = useState(false)
  const [savedTrackInfo, setSavedTrackInfo]         = useState<{ title: string; duration: string } | null>(null)

  // FIX: select creator_type and creator_label so ManageTab has them
  const loadArtists = () => {
    supabase
      .from('artists')
      .select('id, name, bio, photo_url, content_origin, creator_type, creator_label, artist_profile_video_url, hero_video_url')
      .order('name')
      .then(({ data }) => { if (data) setArtists(data) })
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
          albumGenres.map(genreId => ({ content_type: 'album', content_id: data.id, genre_id: genreId }))
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

    const progressTimeout = setTimeout(() => setUploadProgress(null), 5000)

    try {
      const artistName = artists.find(a => a.id === selectedArtistId)?.name || 'unknown'
      const albumTitle = albums.find(a => a.id === selectedAlbumId)?.title  || 'singles'
      const trackSlug  = `${String(track.track_number || '00').padStart(2, '0')}-${slugify(track.title)}`
      const trackFolder = `${slugify(artistName)}/albums/${slugify(albumTitle)}/${trackSlug}`

      const audio      = trackAudioFile      ? await uploadToCloudinary(trackAudioFile, trackFolder, 'video', (p) => setUploadProgress({ label: `Uploading audio: ${track.title}`, percent: p })) : null
      const image      = trackImageFile      ? await uploadToCloudinary(trackImageFile, trackFolder, 'image', (p) => setUploadProgress({ label: `Uploading image: ${track.title}`, percent: p })) : null
      const message    = trackMessageFile    ? await uploadToCloudinary(trackMessageFile, trackFolder, 'video') : null
      const musicVideo = trackMusicVideoFile ? await uploadToCloudinary(trackMusicVideoFile, trackFolder, 'video') : null

      setUploadProgress({ label: 'Saving track...', percent: 100 })

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

      clearTimeout(progressTimeout)
      setUploadProgress(null)

      if (error) {
        setMessage({ type: 'error', text: `Track saved to Cloudinary but database error: ${error.message}` })
        setLoading(false)
        return
      }

      setSavedTracks(prev => [...prev, {
        title: data.title, duration: data.duration, hasLyrics: !!track.text_content,
        lyricsPreview: track.text_content ? track.text_content.substring(0, 80) + (track.text_content.length > 80 ? '...' : '') : '',
      }])

      const genresToSave = trackGenres.length > 0 ? trackGenres : albumGenres
      if (genresToSave.length > 0) {
        await supabase.from('content_genres').insert(
          genresToSave.map(genreId => ({ content_type: 'track', content_id: data.id, genre_id: genreId }))
        )
      }

      setSavedTrackInfo({ title: data.title, duration: data.duration || '' })
      setMessage(null)
    } catch (err) {
      clearTimeout(progressTimeout)
      setUploadProgress(null)
      setMessage({ type: 'error', text: (err as Error).message })
    }
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

      {/* Persistent context — reminds you which artist/album you're uploading to */}
      {mode === 'upload' && step > 1 && (() => {
        const aName = artists.find(a => a.id === selectedArtistId)?.name
          || (artistMode === 'new' ? newArtist.name : '') || 'Unknown artist'
        const albName = selectedAlbumId
          ? albums.find(a => a.id === selectedAlbumId)?.title
          : (step === 3
              ? (albumMode === 'new' ? (newAlbum.title || 'New album') : albumMode === 'single' ? 'Standalone single' : null)
              : null)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '10px 14px', marginBottom: '16px', borderRadius: '10px', background: 'rgba(43,122,143,0.08)', border: '1px solid var(--accent-primary)', fontSize: '14px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Working on</span>
            <strong style={{ color: 'var(--accent-primary)' }}>🎤 {aName}</strong>
            {albName && <>
              <span style={{ color: 'var(--text-muted)' }}>›</span>
              <strong style={{ color: 'var(--text-secondary)' }}>💿 {albName}</strong>
            </>}
          </div>
        )
      })()}

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
                      <label style={s.label}>Artist Photo <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— square, min 400×400px</span></label>
                      <input type="file" accept="image/*" style={s.fileInput} onChange={e => setArtistPhotoFile(e.target.files?.[0] || null)} />
                      {artistPhotoFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {artistPhotoFile.name}</div>}
                    </div>
                    <div>
                      <label style={s.label}>Song Story (optional)</label>
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
                      <label style={s.label}>Album Cover <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— square, min 800×800px</span></label>
                      <input type="file" accept="image/*" style={s.fileInput} onChange={e => setAlbumCoverFile(e.target.files?.[0] || null)} />
                      {albumCoverFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {albumCoverFile.name}</div>}
                    </div>
                    <div>
                      <label style={s.label}>Song Story (optional)</label>
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

              <div style={s.toggleRow}>
                <button style={s.toggle(uploadMode === 'single')} onClick={() => setUploadMode('single')}>One at a time</button>
                <button style={s.toggle(uploadMode === 'bulk')} onClick={() => setUploadMode('bulk')}>⚡ Bulk drop</button>
              </div>

              {uploadMode === 'bulk' && (
                <BulkTrackUpload
                  artists={artists}
                  albums={albums}
                  selectedArtistId={selectedArtistId}
                  selectedAlbumId={selectedAlbumId}
                  genres={genres}
                  albumGenres={albumGenres}
                  onUploaded={(t) => setSavedTracks(prev => [...prev, { title: t.title, duration: t.duration, hasLyrics: false, lyricsPreview: '' }])}
                />
              )}

              {uploadMode === 'single' && (<>

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
                  <label style={s.label}>Track Image <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— square, min 600×600px</span></label>
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
                  <label style={s.label}>Song Story (optional)</label>
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

              {savedTrackInfo ? (
                // ── SUCCESS STATE ────────────────────────────────────────────
                <div>
                  <div style={{ padding: '16px 20px', borderRadius: '10px', background: 'rgba(43,122,143,0.1)', border: '1px solid var(--accent-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '20px' }}>✓</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent-primary)' }}>
                        "{savedTrackInfo.title}" saved{savedTrackInfo.duration ? ` — ${savedTrackInfo.duration}` : ''}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Track saved successfully
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      style={s.btnGold}
                      onClick={() => {
                        const nextNum = String(parseInt(track.track_number || '0') + 1)
                        setTrack({ ...emptyTrack, track_number: nextNum, content_origin: track.content_origin, status: track.status, price: track.price, publisher: track.publisher, copyright_owner: track.copyright_owner, copyright_year: track.copyright_year })
                        setTrackAudioFile(null); setTrackImageFile(null); setTrackMessageFile(null); setTrackMusicVideoFile(null); setTrackGenres([])
                        setSavedTrackInfo(null)
                      }}
                    >
                      + Add another track
                    </button>
                    <button style={s.btnSecondary} onClick={() => setStep(2)}>← Back to albums</button>
                    <button style={s.btn} onClick={() => window.location.href = '/dashboard'}>Go to dashboard</button>
                  </div>
                </div>
              ) : (
                // ── SAVE BUTTONS ─────────────────────────────────────────────
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button style={s.btnSecondary} onClick={() => setStep(2)}>← Back</button>
                  <button style={s.btn} onClick={() => handleTrackSave(false)} disabled={loading}>{loading ? 'Uploading...' : 'Save Track'}</button>
                </div>
              )}
              </>)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
