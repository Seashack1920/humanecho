'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

async function uploadToCloudinary(file: File, folder: string, resourceType: string = 'auto') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', 'humanecho_upload')
  formData.append('folder', folder)
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.secure_url
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

export default function AdminUpload() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const [savedTracks, setSavedTracks] = useState<{ title: string; duration: string; hasLyrics: boolean; lyricsPreview: string }[]>([])
  const [artists, setArtists] = useState<any[]>([])
  const [albums, setAlbums] = useState<any[]>([])
  const [artistProfileVideoFile, setArtistProfileVideoFile] = useState(null)
  const [artistMode, setArtistMode] = useState('select')
  const [selectedArtistId, setSelectedArtistId] = useState('')
  const [newArtist, setNewArtist] = useState({ name: '', bio: '', content_origin: '100% human' })
  const [artistPhotoFile, setArtistPhotoFile] = useState<File | null>(null)
  const [artistMessageFile, setArtistMessageFile] = useState<File | null>(null)
  
  const [albumMode, setAlbumMode] = useState('select')
  const [selectedAlbumId, setSelectedAlbumId] = useState('')
  const [newAlbum, setNewAlbum] = useState({
    title: '', description: '', price: '', album_type: 'music',
    content_origin: '100% human', status: 'draft',
  })
  const [albumCoverFile, setAlbumCoverFile] = useState<File | null>(null)
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
  const [track, setTrack] = useState(emptyTrack)
  const [trackAudioFile, setTrackAudioFile] = useState<File | null>(null)
  const [trackImageFile, setTrackImageFile] = useState<File | null>(null)
  const [trackMessageFile, setTrackMessageFile] = useState<File | null>(null)
  const [trackMusicVideoFile, setTrackMusicVideoFile] = useState<File | null>(null)
  const [showPublishing, setShowPublishing] = useState(false)

  useEffect(() => {
    supabase.from('artists').select('id, name').order('name').then(({ data }) => {
      if (data) setArtists(data)
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
      setStep(2)
      return
    }
    if (!newArtist.name) return setMessage({ type: 'error', text: 'Artist name is required' })
    setLoading(true)
    setMessage(null)
    try {
      const folder = slugify(newArtist.name)
      const photoUrl = artistPhotoFile ? await uploadToCloudinary(artistPhotoFile, folder, 'image') : ''
      const messageUrl = artistMessageFile ? await uploadToCloudinary(artistMessageFile, folder, 'video') : ''
      const profileVideoUrl = artistProfileVideoFile ? await uploadToCloudinary(artistProfileVideoFile, folder, 'video') : ''
      const { data, error } = await supabase.from('artists').insert({
  name: newArtist.name, bio: newArtist.bio,
  photo_url: photoUrl, artist_message_url: messageUrl,
  artist_profile_video_url: profileVideoUrl,
}).select().single()
      if (error) throw error
      setSelectedArtistId(data.id)
      setArtists(prev => [...prev, { id: data.id, name: data.name }])
      setMessage({ type: 'success', text: `Artist "${data.name}" created!` })
      setStep(2)
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message })
    }
    setLoading(false)
  }

  const handleAlbumStep = async () => {
    if (albumMode === 'single') {
      setSelectedAlbumId('')
      setStep(3)
      return
    }
    if (albumMode === 'select') {
      if (!selectedAlbumId) return setMessage({ type: 'error', text: 'Please select an album' })
      setStep(3)
      return
    }
    if (!newAlbum.title) return setMessage({ type: 'error', text: 'Album title is required' })
    setLoading(true)
    setMessage(null)
    try {
      const artistName = artists.find(a => a.id === selectedArtistId)?.name || 'unknown'
      const albumFolder = `${slugify(artistName)}/albums/${slugify(newAlbum.title)}`
      const coverUrl = albumCoverFile ? await uploadToCloudinary(albumCoverFile, albumFolder, 'image') : ''
      const messageUrl = albumMessageFile ? await uploadToCloudinary(albumMessageFile, albumFolder, 'video') : ''
      const { data, error } = await supabase.from('albums').insert({
        artist_id: selectedArtistId,
        title: newAlbum.title, description: newAlbum.description,
        price: newAlbum.price ? parseFloat(newAlbum.price) : null,
        album_type: newAlbum.album_type, content_origin: newAlbum.content_origin,
        status: newAlbum.status, cover_url: coverUrl, artist_message_url: messageUrl,
      }).select().single()
      if (error) throw error
      setSelectedAlbumId(data.id)
      setAlbums(prev => [...prev, { id: data.id, title: data.title }])
      setMessage({ type: 'success', text: `Album "${data.title}" created!` })
      setStep(3)
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message })
    }
    setLoading(false)
  }

  const handleTrackSave = async (addAnother = false) => {
    if (!track.title) return setMessage({ type: 'error', text: 'Track title is required' })
    if (!track.content_origin) return setMessage({ type: 'error', text: 'Content origin is required' })
    setLoading(true)
    setMessage(null)
    try {
      const artistName = artists.find(a => a.id === selectedArtistId)?.name || 'unknown'
      const albumTitle = albums.find(a => a.id === selectedAlbumId)?.title || 'singles'
      const trackSlug = `${String(track.track_number || '00').padStart(2, '0')}-${slugify(track.title)}`
      const trackFolder = `${slugify(artistName)}/albums/${slugify(albumTitle)}/${trackSlug}`

      const audioUrl = trackAudioFile ? await uploadToCloudinary(trackAudioFile, trackFolder, 'video') : ''
      const imageUrl = trackImageFile ? await uploadToCloudinary(trackImageFile, trackFolder, 'image') : ''
      const messageUrl = trackMessageFile ? await uploadToCloudinary(trackMessageFile, trackFolder, 'video') : ''
      const musicVideoUrl = trackMusicVideoFile ? await uploadToCloudinary(trackMusicVideoFile, trackFolder, 'video') : ''

      const { data, error } = await supabase.from('tracks').insert({
        album_id: selectedAlbumId || null,
        artist_id: selectedArtistId,
        title: track.title,
        track_number: track.track_number ? parseInt(track.track_number) : null,
        track_type: track.track_type,
        duration: track.duration,
        cloudinary_url: audioUrl,
        file_format: track.file_format,
        track_image_url: imageUrl,
        music_video_url: musicVideoUrl,
        artist_message_url: messageUrl,
        text_content: track.text_content,
        text_content_type: track.text_content_type,
        price: track.price ? parseFloat(track.price) : null,
        status: track.status,
        content_origin: track.content_origin,
        isrc: track.isrc, iswc: track.iswc,
        composer: track.composer, lyricist: track.lyricist,
        producer: track.producer, publisher: track.publisher,
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

      // Show saved track summary
      setSavedTracks(prev => [...prev, {
        title: data.title,
        duration: data.duration,
        hasLyrics: !!track.text_content,
        lyricsPreview: track.text_content ? track.text_content.substring(0, 80) + (track.text_content.length > 80 ? '...' : '') : '',
      }])

      setMessage({ type: 'success', text: `Track "${data.title}" saved successfully!` })

      if (addAnother) {
        const nextNum = String(parseInt(track.track_number || '0') + 1)
        setTrack({ ...emptyTrack, track_number: nextNum, content_origin: track.content_origin, status: track.status, price: track.price, publisher: track.publisher, copyright_owner: track.copyright_owner, copyright_year: track.copyright_year })
        setTrackAudioFile(null)
        setTrackImageFile(null)
        setTrackMessageFile(null)
        setTrackMusicVideoFile(null)
      }
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message })
    }
    setLoading(false)
  }

  // Styles
  const s = {
    page: { maxWidth: '720px', margin: '0 auto', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' },
    h1: { fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' },
    subtitle: { fontSize: '14px', color: 'var(--text-muted)', marginBottom: '40px' },
    steps: { display: 'flex', gap: '8px', marginBottom: '32px' },
    stepBtn: (active: boolean, done: boolean) => ({ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: active ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: active ? 'white' : done ? 'var(--accent-primary)' : 'var(--text-muted)' }),
    card: { background: 'var(--bg-secondary)', borderRadius: '16px', padding: '28px', marginBottom: '24px', border: '1px solid var(--border)' },
    label: { display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' },
    input: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
    select: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px 14px', borderRadius: '8px 8px 0 8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
    fileInput: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px dashed var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' as const },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
    field: { marginBottom: '16px' },
    btn: { padding: '12px 28px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '500', border: 'none', cursor: 'pointer' },
    btnSecondary: { padding: '12px 28px', borderRadius: '8px', background: 'none', color: 'var(--text-secondary)', fontSize: '15px', border: '1px solid var(--border)', cursor: 'pointer', marginRight: '12px' },
    btnGold: { padding: '12px 28px', borderRadius: '8px', background: 'var(--accent-secondary)', color: 'white', fontSize: '15px', fontWeight: '500', border: 'none', cursor: 'pointer' },
    toggleRow: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' as const },
    toggle: (active: boolean) => ({ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', border: 'none', cursor: 'pointer', background: active ? 'var(--accent-primary)' : 'var(--bg-card)', color: active ? 'white' : 'var(--text-muted)' }),
    sectionTitle: { fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' },
    divider: { height: '1px', background: 'var(--border)', margin: '20px 0' },
    checkbox: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' },
    resizeHint: { textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '8px' },
    savedTrack: { padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', marginBottom: '8px' },
  }

  const msg = message && (
    <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', background: message.type === 'success' ? 'rgba(43,122,143,0.1)' : 'rgba(224,122,95,0.1)', border: `1px solid ${message.type === 'success' ? 'var(--accent-primary)' : 'var(--accent-secondary)'}`, color: message.type === 'success' ? 'var(--accent-primary)' : 'var(--accent-secondary)', fontSize: '14px' }}>
      {message.text}
    </div>
  )

  const lyricsPlaceholder = track.track_type === 'song' ? 'Paste lyrics here...' : track.track_type === 'instrumental' ? 'Describe this piece...' : 'Story text...'
  const lyricsLabel = track.track_type === 'song' ? 'Lyrics' : track.track_type === 'instrumental' ? 'Description / Blurb' : 'Story Text'

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Upload Portal</h1>
      <p style={s.subtitle}>Private admin upload — Human Echo</p>

      <div style={s.steps}>
        {['Artist', 'Album', 'Track'].map((label, i) => (
          <button key={label} style={s.stepBtn(step === i + 1, step > i + 1)} onClick={() => step > i + 1 && setStep(i + 1)}>
            {step > i + 1 ? '✓ ' : ''}{label}
          </button>
        ))}
      </div>

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
    <input type="file" accept="image/*" style={s.fileInput} onChange={e => setArtistPhotoFile(e.target.files[0])} />
    {artistPhotoFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {artistPhotoFile.name}</div>}
  </div>
  <div>
    <label style={s.label}>Artist Message Video (optional)</label>
    <input type="file" accept="video/*" style={s.fileInput} onChange={e => setArtistMessageFile(e.target.files[0])} />
    {artistMessageFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {artistMessageFile.name}</div>}
  </div>
</div>

<div style={s.row}>
  <div>
    <label style={s.label}>Profile Video (optional — plays once on artist page)</label>
    <input type="file" accept="video/*" style={s.fileInput} onChange={e => setArtistProfileVideoFile(e.target.files[0])} />
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

          <button style={s.btn} onClick={handleArtistStep} disabled={loading}>
            {loading ? 'Saving...' : 'Continue →'}
          </button>
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
              This track will be saved as a standalone single — not attached to any album. You can assign it to an album later.
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
                  <input type="file" accept="image/*" style={s.fileInput} onChange={e => setAlbumCoverFile(e.target.files[0])} />
                  {albumCoverFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {albumCoverFile.name}</div>}
                </div>
                <div>
                  <label style={s.label}>Artist Message Video (optional)</label>
                  <input type="file" accept="video/*" style={s.fileInput} onChange={e => setAlbumMessageFile(e.target.files[0])} />
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

          <button style={s.btnSecondary} onClick={() => setStep(1)}>← Back</button>
          <button style={s.btn} onClick={handleAlbumStep} disabled={loading}>
            {loading ? 'Saving...' : 'Continue →'}
          </button>
        </div>
      )}

      {/* STEP 3: TRACK */}
      {step === 3 && (
        <div style={s.card}>
          <div style={s.sectionTitle}>Track</div>

          {/* Saved tracks summary */}
          {savedTracks.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '8px' }}>
                {savedTracks.length} track{savedTracks.length > 1 ? 's' : ''} saved this session:
              </div>
              {savedTracks.map((t, i) => (
                <div key={i} style={s.savedTrack}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--accent-primary)' }}>
                    ✓ {t.title} {t.duration && `— ${t.duration}`}
                  </div>
                  {t.hasLyrics && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Lyrics saved: {t.lyricsPreview}
                    </div>
                  )}
                </div>
              ))}
              <div style={s.divider} />
            </div>
          )}

          <div style={s.field}>
            <label style={s.label}>Audio File (FLAC/WAV/MP3) *</label>
            <input type="file" accept=".flac,.wav,.mp3,audio/*" style={s.fileInput} onChange={e => setTrackAudioFile(e.target.files[0])} />
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
              <input type="file" accept="image/*" style={s.fileInput} onChange={e => setTrackImageFile(e.target.files[0])} />
              {trackImageFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {trackImageFile.name}</div>}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>{lyricsLabel} (optional)</label>
            <textarea
              style={s.textarea}
              value={track.text_content}
              onChange={e => setTrack(t => ({ ...t, text_content: e.target.value }))}
              placeholder={lyricsPlaceholder}
            />
            <div style={s.resizeHint}>↕ drag to resize</div>
          </div>

          <div style={s.row}>
            <div>
              <label style={s.label}>Music Video (optional)</label>
              <input type="file" accept="video/*" style={s.fileInput} onChange={e => setTrackMusicVideoFile(e.target.files[0])} />
              {trackMusicVideoFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {trackMusicVideoFile.name}</div>}
            </div>
            <div>
              <label style={s.label}>Artist Message Video (optional)</label>
              <input type="file" accept="video/*" style={s.fileInput} onChange={e => setTrackMessageFile(e.target.files[0])} />
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
                <div><label style={s.label}>Composer</label><input style={s.input} value={track.composer} onChange={e => setTrack(t => ({ ...t, composer: e.target.value }))} placeholder="Songwriter name" /></div>
                <div><label style={s.label}>Lyricist</label><input style={s.input} value={track.lyricist} onChange={e => setTrack(t => ({ ...t, lyricist: e.target.value }))} placeholder="Lyric writer" /></div>
              </div>
              <div style={s.row}>
                <div><label style={s.label}>Producer</label><input style={s.input} value={track.producer} onChange={e => setTrack(t => ({ ...t, producer: e.target.value }))} placeholder="Producer name" /></div>
                <div><label style={s.label}>Publisher</label><input style={s.input} value={track.publisher} onChange={e => setTrack(t => ({ ...t, publisher: e.target.value }))} placeholder="Publishing company" /></div>
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
                {[['sync_eligible', 'Sync Eligible'], ['stems_available', 'Stems Available'], ['instrumental_available', 'Instrumental Available'], ['explicit', 'Explicit Content']].map(([key, label]) => (
                  <label key={key} style={s.checkbox}>
                    <input type="checkbox" checked={track[key]} onChange={e => setTrack(t => ({ ...t, [key]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>
            </>
          )}

          <div style={s.divider} />

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button style={s.btnSecondary} onClick={() => setStep(2)}>← Back</button>
            <button style={s.btn} onClick={() => handleTrackSave(false)} disabled={loading}>
              {loading ? 'Uploading...' : 'Save Track'}
            </button>
            <button style={s.btnGold} onClick={() => handleTrackSave(true)} disabled={loading}>
              {loading ? 'Uploading...' : 'Save + Add Another'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
