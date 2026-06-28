'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'


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
    } catch { resolve('') }
  })
}

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
  genres: { id: string; name: string }[]
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

// ─── Mood + Coach Tag Pickers ─────────────────────────────────────────────────

const MOOD_TAGS = ['workout', 'victory', 'romance', 'focus', 'sleep', 'spiritual', 'party', 'chill', 'motivation', 'reflection']
const COACH_CATEGORIES = ['gym', 'victory', 'romance', 'workplace', 'sleep', 'spiritual', 'party', 'road', 'mental-health', 'housekeeping']

function TagPicker({ label, tags, selected, onChange, accentColor = 'var(--accent-primary)', max }: {
  label: string
  tags: string[]
  selected: string[]
  onChange: (tags: string[]) => void
  accentColor?: string
  max?: number
}) {
  const toggle = (tag: string) => {
    if (selected.includes(tag)) { onChange(selected.filter(t => t !== tag)); return }
    if (max && selected.length >= max) return
    onChange([...selected, tag])
  }
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px' }}>
        {tags.map(tag => {
          const active = selected.includes(tag)
          return (
            <button key={tag} type="button" onClick={() => toggle(tag)} style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
              border: `1px solid ${active ? accentColor : 'var(--border)'}`,
              background: active ? accentColor : 'none',
              color: active ? 'white' : 'var(--text-muted)',
              cursor: (!active && max && selected.length >= max) ? 'not-allowed' : 'pointer',
              opacity: (!active && max && selected.length >= max) ? 0.4 : 1,
              transition: 'all 0.15s',
            }}>
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const s = {
  page:         { maxWidth: '720px', margin: '0 auto', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' },
  header:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' },
  h1:           { fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' },
  subtitle:     { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' },
  backBtn:      { padding: '8px 16px', borderRadius: '8px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' },
  steps:        { display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' as const },
  stepBtn:      (active: boolean, done: boolean) => ({ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: active ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: active ? 'white' : done ? 'var(--accent-primary)' : 'var(--text-muted)' }),
  card:         { background: 'var(--bg-secondary)', borderRadius: '16px', padding: '28px', marginBottom: '24px', border: '1px solid var(--border)' },
  artistCard:   { background: 'var(--bg-card)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' },
  artistPhoto:  { width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' as const, border: '2px solid var(--border)', flexShrink: 0 },
  artistName:   { fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' },
  artistNote:   { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  label:        { display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' },
  input:        { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  select:       { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  textarea:     { width: '100%', padding: '10px 14px', borderRadius: '8px 8px 0 8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const, minHeight: '100px' },
  fileInput:    { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px dashed var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' as const },
  row:          { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field:        { marginBottom: '16px' },
  btn:          { padding: '12px 28px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '500', border: 'none', cursor: 'pointer' },
  btnSecondary: { padding: '12px 28px', borderRadius: '8px', background: 'none', color: 'var(--text-secondary)', fontSize: '15px', border: '1px solid var(--border)', cursor: 'pointer', marginRight: '12px' },
  btnGold:      { padding: '12px 28px', borderRadius: '8px', background: 'var(--accent-secondary)', color: 'white', fontSize: '15px', fontWeight: '500', border: 'none', cursor: 'pointer' },
  sectionTitle: { fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' },
  toggleRow:    { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' as const },
  toggle:       (active: boolean) => ({ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', border: 'none', cursor: 'pointer', background: active ? 'var(--accent-primary)' : 'var(--bg-card)', color: active ? 'white' : 'var(--text-muted)' }),
  divider:      { height: '1px', background: 'var(--border)', margin: '20px 0' },
  resizeHint:   { textAlign: 'right' as const, fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '8px' },
  savedTrack:   { padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', marginBottom: '8px' },
  checkbox:     { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' },
  infoBox:      { padding: '12px 16px', borderRadius: '8px', background: 'rgba(43,122,143,0.08)', border: '1px solid rgba(43,122,143,0.2)', fontSize: '13px', color: 'var(--accent-primary)', marginBottom: '16px' },
}

export default function ArtistUpload() {
  const router = useRouter()
  const [step, setStep]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [message, setMessage]     = useState<{ type: string; text: string } | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ label: string; percent: number } | null>(null)
  
  const [artist, setArtist]       = useState<{ id: string; name: string; photo_url?: string } | null>(null)
  const [albums, setAlbums]       = useState<{ id: string; title: string }[]>([])
  const [albumMode, setAlbumMode] = useState('select')
  const [selectedAlbumId, setSelectedAlbumId] = useState('')
  const [newAlbum, setNewAlbum]   = useState({ title: '', description: '', price: '', album_type: 'music', content_origin: '100% human', status: 'draft' })
  const [albumCoverFile, setAlbumCoverFile] = useState<File | null>(null)
  const [albumGenres, setAlbumGenres] = useState<string[]>([])
  const [genres, setGenres]       = useState<{ id: string; name: string }[]>([])
  const [savedTracks, setSavedTracks] = useState<{ title: string; duration: string }[]>([])
  const [trackGenres, setTrackGenres] = useState<string[]>([])

  const emptyTrack = {
    title: '', track_number: '', duration: '', track_type: 'song',
    price: '', status: 'draft', content_origin: '100% human',
    text_content: '', file_format: 'flac',
    composer: '', lyricist: '', producer: '', publisher: '',
    bpm: '', musical_key: '', mood: '', theme: '', language: 'en',
    copyright_year: String(new Date().getFullYear()), copyright_owner: '',
    cover_welcome: false, music_video_welcome: false,
    sync_eligible: false, explicit: false,
    mood_tags: [] as string[],
    coach_categories: [] as string[],
  }

  const [track, setTrack]         = useState(emptyTrack)
  const [trackAudioFile, setTrackAudioFile] = useState<File | null>(null)
  const [trackImageFile, setTrackImageFile] = useState<File | null>(null)
  const [trackSongStoryFile, setTrackSongStoryFile] = useState<File | null>(null)
const [trackMusicVideoFile, setTrackMusicVideoFile] = useState<File | null>(null) 
  const [showPublishing, setShowPublishing] = useState(false)
  const [savedTrackInfo, setSavedTrackInfo] = useState<{ title: string; duration: string } | null>(null)

  const slugify = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      if (!profile) { router.push('/login'); return }

      let artistId = profile.artist_id

      if (profile.role === 'admin' && !artistId) {
        const params = new URLSearchParams(window.location.search)
        const artistParam = params.get('artist')
        if (artistParam) {
          const { data: artistData } = await supabase
            .from('artists').select('id, name, photo_url').eq('id', artistParam).single()
          if (artistData) { setArtist(artistData); artistId = artistData.id }
          const { data: albumsData } = await supabase
            .from('albums').select('id, title').eq('artist_id', artistParam).order('title')
          if (albumsData) setAlbums(albumsData)
        }
        const { data: genresData } = await supabase
          .from('genres').select('id, name').eq('content_type', 'music').order('name')
        if (genresData) setGenres(genresData)
        setInitializing(false)
        return
      }

      if (artistId) {
        const { data: artistData } = await supabase
          .from('artists').select('id, name, photo_url').eq('id', artistId).single()
        if (artistData) setArtist(artistData)
        const { data: albumsData } = await supabase
          .from('albums').select('id, title').eq('artist_id', artistId).order('title')
        if (albumsData) setAlbums(albumsData)
      }

      const { data: genresData } = await supabase
        .from('genres').select('id, name').eq('content_type', 'music').order('name')
      if (genresData) setGenres(genresData)

      const params = new URLSearchParams(window.location.search)
      const mode = params.get('mode')
      if (mode === 'album') setStep(2)
      else if (mode === 'track') setStep(3)
      else if (mode === 'single') { setAlbumMode('single'); setStep(3) }
      else setStep(1)

      setInitializing(false)
    }
    init()
  }, [])

  const saveGenres = async (contentType: string, contentId: string, genreIds: string[]) => {
    if (genreIds.length === 0) return
    await supabase.from('content_genres').insert(
      genreIds.map(genreId => ({ content_type: contentType, content_id: contentId, genre_id: genreId }))
    )
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
      const artistName  = artist?.name || 'unknown'
      const albumFolder = `${slugify(artistName)}/albums/${slugify(newAlbum.title)}`
      const cover       = albumCoverFile ? await uploadToCloudinary(albumCoverFile, albumFolder, 'image') : null
      const { data, error } = await supabase.from('albums').insert({
        artist_id: artist?.id,
        title: newAlbum.title, description: newAlbum.description,
        price: newAlbum.price ? parseFloat(newAlbum.price) : null,
        album_type: newAlbum.album_type, content_origin: newAlbum.content_origin,
        status: newAlbum.status,
        cover_url: cover?.url ?? '',
        cloudinary_public_id: cover?.public_id ?? null,
      }).select().single()
      if (error) throw error
      await saveGenres('album', data.id, albumGenres)
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
      const artistName  = artist?.name || 'unknown'
      const albumTitle  = albums.find(a => a.id === selectedAlbumId)?.title || 'singles'
      const trackSlug   = `${String(track.track_number || '00').padStart(2, '0')}-${slugify(track.title)}`
      const trackFolder = `${slugify(artistName)}/albums/${slugify(albumTitle)}/${trackSlug}`

      const image = trackImageFile
        ? await uploadToCloudinary(trackImageFile, trackFolder, 'image', (p) => setUploadProgress({ label: `Uploading image: ${track.title}`, percent: p }))
        : null

      const audio = trackAudioFile
        ? await uploadToCloudinary(trackAudioFile, trackFolder, 'video', (p) => setUploadProgress({ label: `Uploading audio: ${track.title}`, percent: p }))
        : null
const songStory = trackSongStoryFile
        ? await uploadToCloudinary(trackSongStoryFile, trackFolder, 'video', (p) => setUploadProgress({ label: `Uploading Song Story: ${track.title}`, percent: p }))
        : null

      const musicVideo = trackMusicVideoFile
        ? await uploadToCloudinary(trackMusicVideoFile, trackFolder, 'video', (p) => setUploadProgress({ label: `Uploading Music Video: ${track.title}`, percent: p }))
        : null
      setUploadProgress({ label: 'Saving track...', percent: 100 })

      const { data, error } = await supabase.from('tracks').insert({
        album_id: selectedAlbumId || null,
        artist_id: artist?.id,
        title: track.title,
        track_number: track.track_number ? parseInt(track.track_number) : null,
        track_type: track.track_type,
        duration: track.duration,
        cloudinary_url: audio?.url ?? '',
        cloudinary_public_id: audio?.public_id ?? null,
        file_format: track.file_format,
        track_image_url: image?.url ?? '',
        text_content: track.text_content,
        text_content_type: track.track_type === 'song' ? 'lyrics' : track.track_type === 'instrumental' ? 'description' : 'story',
        price: track.price ? parseFloat(track.price) : null,
        status: track.status,
        content_origin: track.content_origin,
        composer: track.composer, lyricist: track.lyricist,
        producer: track.producer, publisher: track.publisher,
        bpm: track.bpm ? parseInt(track.bpm) : null,
        musical_key: track.musical_key, mood: track.mood, theme: track.theme,
        language: track.language,
        copyright_year: track.copyright_year ? parseInt(track.copyright_year) : null,
        copyright_owner: track.copyright_owner,
        cover_welcome: track.cover_welcome,
        music_video_welcome: track.music_video_welcome,
        sync_eligible: track.sync_eligible,
        explicit: track.explicit,
        artist_message_url: songStory?.url ?? null,
        music_video_url: musicVideo?.url ?? null,
        mood_tags: track.mood_tags.length > 0 ? track.mood_tags : null,
        coach_categories: track.coach_categories.length > 0 ? track.coach_categories : null,
      }).select().single()

      clearTimeout(progressTimeout)
      setUploadProgress(null)

      if (error) {
        setMessage({ type: 'error', text: `Track saved to Cloudinary but database error: ${error.message}` })
        setLoading(false)
        return
      }

      const genresToSave = trackGenres.length > 0 ? trackGenres : albumGenres
      await saveGenres('track', data.id, genresToSave)

      setSavedTracks(prev => [...prev, { title: data.title, duration: data.duration || '' }])
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

  const lyricsLabel       = track.track_type === 'song' ? 'Lyrics' : track.track_type === 'instrumental' ? 'Description / Blurb' : 'Story Text'
  const lyricsPlaceholder = track.track_type === 'song' ? 'Paste lyrics here...' : track.track_type === 'instrumental' ? 'Describe this piece...' : 'Story text...'

  if (initializing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>
      </div>
    )
  }

  if (!artist) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' as const, color: 'var(--text-muted)', fontSize: '14px' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎵</div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No artist selected</div>
          <div style={{ marginBottom: '24px' }}>Select an artist from the dashboard first.</div>
          <button style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px' }} onClick={() => router.push('/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={s.page}>
        <div style={s.header}>
          <div>
            <h1 style={s.h1}>Upload Music</h1>
            <div style={s.subtitle}>Add tracks and albums to your Human Echo profile</div>
          </div>
          <button style={s.backBtn} onClick={() => router.push('/dashboard')}>← Dashboard</button>
        </div>

        <div style={s.steps}>
          {['Album', 'Track'].map((label, i) => (
            <button key={label} style={s.stepBtn(step === i + 2, step > i + 2)} onClick={() => step > i + 2 && setStep(i + 2)}>
              {step > i + 2 ? '✓ ' : ''}{label}
            </button>
          ))}
        </div>

        {msg}

        {artist && (
          <div style={s.artistCard}>
            {artist.photo_url && (
              <img src={artist.photo_url} alt={artist.name} style={s.artistPhoto} />
            )}
            <div>
              <div style={s.artistName}>{artist.name}</div>
              <div style={s.artistNote}>Uploading as this artist</div>
            </div>
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
              <div style={s.infoBox}>This track will be saved as a standalone single — not attached to any album.</div>
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
                  <input style={s.input} value={newAlbum.title} onChange={e => setNewAlbum(a => ({ ...a, title: e.target.value }))} placeholder="Album title" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Description</label>
                  <textarea style={s.textarea} value={newAlbum.description} onChange={e => setNewAlbum(a => ({ ...a, description: e.target.value }))} placeholder="What is this album about?" />
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
                <div style={s.field}>
                  <label style={s.label}>Album Cover</label>
                  <input type="file" accept="image/*" style={s.fileInput} onChange={e => setAlbumCoverFile(e.target.files?.[0] || null)} />
                  {albumCoverFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {albumCoverFile.name}</div>}
                </div>
                <div style={s.field}>
                  <label style={s.label}>Genres (up to 3)</label>
                  <GenrePicker genres={genres} selected={albumGenres} onChange={setAlbumGenres} />
                </div>
              </>
            )}

            <button style={s.btn} onClick={handleAlbumStep} disabled={loading}>
              {loading ? 'Saving...' : 'Continue →'}
            </button>
          </div>
        )}

        {/* STEP 3: TRACK */}
        {step === 3 && (
          <div style={s.card}>
            <div style={s.sectionTitle}>Track</div>

            {savedTracks.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {savedTracks.length} track{savedTracks.length > 1 ? 's' : ''} saved this session:
                </div>
                {savedTracks.map((t, i) => (
                  <div key={i} style={s.savedTrack}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--accent-primary)' }}>
                      ✓ {t.title} {t.duration && `— ${t.duration}`}
                    </div>
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
                <select style={s.select} value={track.track_type} onChange={e => setTrack(t => ({ ...t, track_type: e.target.value }))}>
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
              {trackGenres.length === 0 && selectedAlbumId && albumGenres.length > 0 && (
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

            {/* Permissions */}
            <div style={{ ...s.infoBox, marginTop: '8px' }}>
              Let fans know if you welcome covers or music videos of this track.
            </div>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', flexWrap: 'wrap' as const }}>
              <label style={s.checkbox}>
                <input type="checkbox" checked={track.cover_welcome} onChange={e => setTrack(t => ({ ...t, cover_welcome: e.target.checked }))} />
                🎤 Covers welcome
              </label>
              <label style={s.checkbox}>
                <input type="checkbox" checked={track.music_video_welcome} onChange={e => setTrack(t => ({ ...t, music_video_welcome: e.target.checked }))} />
                🎬 Music videos welcome
              </label>
              <label style={s.checkbox}>
                <input type="checkbox" checked={track.explicit} onChange={e => setTrack(t => ({ ...t, explicit: e.target.checked }))} />
                🅴 Explicit
              </label>
            </div>

            {/* ── MOOD TAGS ── */}
            {/* Media Videos */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '12px' }}>Media Videos (optional)</div>
              <div style={s.field}>
                <label style={s.label}>Song Story <span style={{ fontWeight: '400', textTransform: 'none' as const, letterSpacing: 0, color: 'var(--text-muted)' }}>— tell the story behind this track with a video up to :30, any ratio</span></label>
                <input type="file" accept="video/*" style={s.fileInput} onChange={e => setTrackSongStoryFile(e.target.files?.[0] || null)} />
                {trackSongStoryFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {trackSongStoryFile.name}</div>}
              </div>
              <div style={s.field}>
                <label style={s.label}>Music Video <span style={{ fontWeight: '400', textTransform: 'none' as const, letterSpacing: 0, color: 'var(--text-muted)' }}>— official music video, 16:9 recommended</span></label>
                <input type="file" accept="video/*" style={s.fileInput} onChange={e => setTrackMusicVideoFile(e.target.files?.[0] || null)} />
                {trackMusicVideoFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {trackMusicVideoFile.name}</div>}
              </div>
            </div>

            <div style={s.divider} />
            <div style={s.divider} />
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Playlist Tags
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', fontStyle: 'italic' }}>
  Both sections are optional — skip them if you're unsure. You can always update tags later.
</div>
<TagPicker
  label="Mood Tags — how does this track feel? (optional · up to 3)"
  tags={MOOD_TAGS}
  selected={track.mood_tags}
  onChange={tags => tags.length <= 3 && setTrack(t => ({ ...t, mood_tags: tags }))}
  accentColor="var(--accent-primary)"
  max={3}
/>
<TagPicker
  label="Escape Coach Categories — which lifestyle playlists fit this track? (optional · up to 2)"
  tags={COACH_CATEGORIES}
  selected={track.coach_categories}
  onChange={cats => cats.length <= 2 && setTrack(t => ({ ...t, coach_categories: cats }))}
  accentColor="var(--accent-secondary)"
  max={2}
/>
            <div style={s.divider} />

            <button onClick={() => setShowPublishing(!showPublishing)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', marginBottom: '16px' }}>
              {showPublishing ? '▲ Hide' : '▼ Show'} Publishing Details
            </button>

            {showPublishing && (
              <>
                <div style={s.row}>
                  <div><label style={s.label}>Composer</label><input style={s.input} value={track.composer} onChange={e => setTrack(t => ({ ...t, composer: e.target.value }))} placeholder="Songwriter name" /></div>
                  <div><label style={s.label}>Lyricist</label><input style={s.input} value={track.lyricist} onChange={e => setTrack(t => ({ ...t, lyricist: e.target.value }))} placeholder="Lyric writer" /></div>
                </div>
                <div style={s.row}>
                  <div><label style={s.label}>Producer</label><input style={s.input} value={track.producer} onChange={e => setTrack(t => ({ ...t, producer: e.target.value }))} /></div>
                  <div><label style={s.label}>Publisher</label><input style={s.input} value={track.publisher} onChange={e => setTrack(t => ({ ...t, publisher: e.target.value }))} /></div>
                </div>
                <div style={s.row}>
                  <div><label style={s.label}>BPM</label><input style={s.input} type="number" value={track.bpm} onChange={e => setTrack(t => ({ ...t, bpm: e.target.value }))} placeholder="120" /></div>
                  <div><label style={s.label}>Musical Key</label><input style={s.input} value={track.musical_key} onChange={e => setTrack(t => ({ ...t, musical_key: e.target.value }))} placeholder="C major" /></div>
                </div>
                <div style={s.row}>
                  <div><label style={s.label}>Mood</label><input style={s.input} value={track.mood} onChange={e => setTrack(t => ({ ...t, mood: e.target.value }))} placeholder="Romantic, Upbeat..." /></div>
                  <div><label style={s.label}>Theme</label><input style={s.input} value={track.theme} onChange={e => setTrack(t => ({ ...t, theme: e.target.value }))} placeholder="Beach, Love, Summer..." /></div>
                </div>
                <div style={s.row}>
                  <div><label style={s.label}>Copyright Year</label><input style={s.input} type="number" value={track.copyright_year} onChange={e => setTrack(t => ({ ...t, copyright_year: e.target.value }))} /></div>
                  <div><label style={s.label}>Copyright Owner</label><input style={s.input} value={track.copyright_owner} onChange={e => setTrack(t => ({ ...t, copyright_owner: e.target.value }))} placeholder="Your name or label" /></div>
                </div>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' as const, marginBottom: '16px' }}>
                  <label style={s.checkbox}>
                    <input type="checkbox" checked={track.sync_eligible} onChange={e => setTrack(t => ({ ...t, sync_eligible: e.target.checked }))} />
                    Sync Eligible
                  </label>
                </div>
              </>
            )}

            {uploadProgress && <ProgressBar label={uploadProgress.label} percent={uploadProgress.percent} />}
            <div style={s.divider} />

            {savedTrackInfo ? (
              <div>
                <div style={{ padding: '16px 20px', borderRadius: '10px', background: 'rgba(43,122,143,0.1)', border: '1px solid var(--accent-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '20px' }}>✓</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent-primary)' }}>
                      "{savedTrackInfo.title}" saved{savedTrackInfo.duration ? ` — ${savedTrackInfo.duration}` : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Track saved successfully to your profile
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
                  <button
                    style={s.btnGold}
                    onClick={() => {
                      const nextNum = String(parseInt(track.track_number || '0') + 1)
                      setTrack({ ...emptyTrack, track_number: nextNum, content_origin: track.content_origin, status: track.status, price: track.price, publisher: track.publisher, copyright_owner: track.copyright_owner, copyright_year: track.copyright_year })
                      setTrackAudioFile(null); setTrackImageFile(null); setTrackGenres([]); setTrackSongStoryFile(null); setTrackMusicVideoFile(null)
                      setSavedTrackInfo(null)
                    }}
                  >
                    + Add another track
                  </button>
                  <button style={s.btnSecondary} onClick={() => setStep(2)}>← Back to albums</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
                <button style={s.btnSecondary} onClick={() => setStep(2)}>← Back</button>
                <button style={s.btn} onClick={() => handleTrackSave(false)} disabled={loading}>
                  {loading ? 'Uploading...' : 'Save Track'}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div style={s.card}>
            <div style={s.sectionTitle}>Let's get started</div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
              Choose an existing album to add tracks to, or create a new album first.
            </p>
            <button style={s.btn} onClick={() => setStep(2)}>Start uploading →</button>
          </div>
        )}
      </div>
    </div>
  )
}
