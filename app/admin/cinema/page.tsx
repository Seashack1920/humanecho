'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TipTapLink from '@tiptap/extension-link'

// ─── Types ───────────────────────────────────────────────────────────────────

type Film = {
  id: string
  title: string
  logline: string | null
  description: string | null
  film_type: string
  genre: string[] | null
  runtime_minutes: number | null
  director: string | null
  cast: string | null
  producer: string | null
  rating: string | null
  language: string | null
  release_year: number | null
  video_url: string | null
  trailer_url: string | null
  poster_url: string | null
  hero_video_url: string | null
  filmmaker_message_url: string | null
  artist_id: string | null
  content_origin: string
  status: string
  is_featured: boolean
  price: number | null
  publish_at: string | null
  created_at: string
}

type CinemaProfile = {
  id: string
  name: string
  role: string
  bio: string | null
  photo_url: string | null
  website_url: string | null
  imdb_url: string | null
  film_ids: string[]
  artist_id: string | null
  is_featured: boolean
  status: string
}

type Artist = { id: string; name: string }

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  page:         { maxWidth: '900px', margin: '0 auto', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' },
  h1:           { fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' },
  subtitle:     { fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' },
  card:         { background: 'var(--bg-secondary)', borderRadius: '16px', padding: '28px', marginBottom: '24px', border: '1px solid var(--border)' },
  label:        { display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' },
  input:        { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  select:       { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  textarea:     { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const, minHeight: '80px', resize: 'vertical' as const },
  fileInput:    { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px dashed var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' as const },
  row:          { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  row3:         { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' },
  field:        { marginBottom: '16px' },
  btn:          { padding: '12px 28px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '500', border: 'none', cursor: 'pointer' },
  btnSecondary: { padding: '12px 28px', borderRadius: '8px', background: 'none', color: 'var(--text-secondary)', fontSize: '15px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnSmall:     { padding: '7px 16px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', border: 'none', cursor: 'pointer' },
  btnEdit:      { padding: '8px 16px', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnSave:      { padding: '8px 16px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', border: 'none', cursor: 'pointer', marginRight: '8px' },
  btnCancel:    { padding: '8px 16px', borderRadius: '6px', background: 'none', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnDanger:    { padding: '8px 16px', borderRadius: '6px', background: 'rgba(220,60,60,0.1)', color: '#dc3c3c', fontSize: '13px', border: '1px solid rgba(220,60,60,0.3)', cursor: 'pointer' },
  btnGhost:     { padding: '6px 12px', borderRadius: '6px', background: 'none', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer' },
  sectionTitle: { fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' },
  divider:      { height: '1px', background: 'var(--border)', margin: '20px 0' },
  checkbox:     { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' },
  manageRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: '8px' },
  manageLabel:  { fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' },
  manageMeta:   { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  editCard:     { background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '12px', padding: '20px', marginBottom: '8px' },
  tab:          (active: boolean) => ({ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: active ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: active ? 'white' : 'var(--text-muted)' }),
  badge:        (color: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500', background: color === 'green' ? 'rgba(43,180,100,0.15)' : color === 'blue' ? 'rgba(43,122,143,0.15)' : 'rgba(150,150,150,0.15)', color: color === 'green' ? '#2bb464' : color === 'blue' ? 'var(--accent-primary)' : 'var(--text-muted)' }),
}

const FILM_TYPES = [
  { value: 'film',             label: 'Film' },
  { value: 'documentary',      label: 'Documentary' },
  { value: 'short',            label: 'Short' },
  { value: 'live_performance', label: 'Live Performance' },
  { value: 'music_video',      label: 'Music Video' },
]

const FILM_GENRES = ['Action', 'Animation', 'Comedy', 'Drama', 'Documentary', 'Horror', 'Music', 'Romance', 'Sci-Fi', 'Thriller', 'World Cinema', 'Experimental']

const RATINGS = ['G', 'PG', 'PG-13', 'R', 'NR', 'TV-MA']

// ─── Image Uploader ───────────────────────────────────────────────────────────

function ImageUploader({ value, onChange, label = 'Image', folder = 'cinema/posters' }: {
  value: string
  onChange: (url: string) => void
  label?: string
  folder?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 20 * 1024 * 1024)   { setError('Image must be under 20MB'); return }
    setUploading(true); setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'humanecho_upload')
      formData.append('folder', folder)
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      onChange(data.secure_url)
    } catch (err) { setError((err as Error).message) }
    setUploading(false)
  }

  return (
    <div>
      <label style={s.label}>{label}</label>
      {value && (
        <div style={{ marginBottom: '10px', position: 'relative', display: 'inline-block' }}>
          <img src={value} alt="Preview" style={{ maxWidth: '120px', maxHeight: '160px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)' }} />
          <button onClick={() => onChange('')} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', color: 'white', fontSize: '12px' }}>×</button>
        </div>
      )}
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '2px dashed var(--border)', background: 'var(--bg-card)', cursor: uploading ? 'not-allowed' : 'pointer' }}
        onMouseEnter={e => !uploading && (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <input type="file" style={{ display: 'none' }} disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        <span style={{ fontSize: '18px' }}>{uploading ? '⏳' : '🖼'}</span>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{uploading ? 'Uploading...' : value ? 'Click to replace' : 'Upload from files or Photos'}</span>
      </label>
      {error && <div style={{ fontSize: '12px', color: '#dc3c3c', marginTop: '4px' }}>{error}</div>}
    </div>
  )
}

// ─── Video Input ──────────────────────────────────────────────────────────────

function VideoInput({ value, onChange, label = 'Video', folder = 'cinema/films' }: {
  value: string
  onChange: (url: string) => void
  label?: string
  folder?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const [mode, setMode]           = useState<'upload' | 'embed'>(value && !value.includes('cloudinary') ? 'embed' : 'upload')

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('video/')) { setError('Please select a video file'); return }
    if (file.size > 2048 * 1024 * 1024)  { setError('Video must be under 2GB'); return }
    setUploading(true); setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'humanecho_upload')
      formData.append('folder', folder)
      formData.append('resource_type', 'video')
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`, { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      onChange(data.secure_url)
    } catch (err) { setError((err as Error).message) }
    setUploading(false)
  }

  return (
    <div>
      <label style={s.label}>{label}</label>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        {(['upload', 'embed'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '12px', border: '1px solid var(--border)', cursor: 'pointer', background: mode === m ? 'var(--accent-primary)' : 'none', color: mode === m ? 'white' : 'var(--text-muted)' }}>
            {m === 'upload' ? '⬆ Upload file' : '🔗 Embed URL'}
          </button>
        ))}
      </div>
      {mode === 'upload' && (
        <>
          {value && value.includes('cloudinary') && (
            <div style={{ marginBottom: '8px' }}>
              <video src={value} controls style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '8px', border: '1px solid var(--border)' }} />
              <button onClick={() => onChange('')} style={{ ...s.btnDanger, marginTop: '4px', fontSize: '11px', padding: '3px 8px' }}>Remove</button>
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '2px dashed var(--border)', background: 'var(--bg-card)', cursor: uploading ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => !uploading && (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <input type="file" style={{ display: 'none' }} disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            <span style={{ fontSize: '18px' }}>{uploading ? '⏳' : '🎬'}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{uploading ? 'Uploading — this may take a while...' : value ? 'Click to replace video' : 'Upload MP4, MOV · Max 2GB'}</span>
          </label>
        </>
      )}
      {mode === 'embed' && (
        <div>
          <input style={s.input} value={mode === 'embed' ? value : ''} onChange={e => onChange(e.target.value)} placeholder="YouTube, Vimeo, or direct video URL" />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Paste a YouTube or Vimeo URL</div>
        </div>
      )}
      {error && <div style={{ fontSize: '12px', color: '#dc3c3c', marginTop: '4px' }}>{error}</div>}
    </div>
  )
}

// ─── Film Form ────────────────────────────────────────────────────────────────

function FilmForm({ film, artists, onSave, onCancel }: {
  film?: Film | null
  artists: Artist[]
  onSave: () => void
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  const [form, setForm] = useState({
    title:          film?.title || '',
    logline:        film?.logline || '',
    description:    film?.description || '',
    film_type:      film?.film_type || 'film',
    genre:          film?.genre?.join(', ') || '',
    runtime_minutes: film?.runtime_minutes || '',
    director:       film?.director || '',
    cast:           film?.cast || '',
    producer:       film?.producer || '',
    rating:         film?.rating || '',
    language:       film?.language || 'English',
    release_year:   film?.release_year || new Date().getFullYear(),
    video_url:      film?.video_url || '',
    trailer_url:    film?.trailer_url || '',
    poster_url:     film?.poster_url || '',
    hero_video_url: film?.hero_video_url || '',
    filmmaker_message_url: film?.filmmaker_message_url || '',
    artist_id:      film?.artist_id || '',
    content_origin: film?.content_origin || '100% human',
    status:         film?.status || 'draft',
    is_featured:    film?.is_featured || false,
    price:          film?.price || '',
    publish_at:     film?.publish_at ? film.publish_at.slice(0, 16) : '',
  })

  const handleSave = async () => {
    if (!form.title) return setMessage({ type: 'error', text: 'Title is required' })
    setLoading(true); setMessage(null)
    try {
      const payload: any = {
        title:           form.title,
        logline:         form.logline || null,
        description:     form.description || null,
        film_type:       form.film_type,
        genre:           form.genre ? form.genre.split(',').map(g => g.trim()).filter(Boolean) : null,
        runtime_minutes: form.runtime_minutes ? parseInt(String(form.runtime_minutes)) : null,
        director:        form.director || null,
        cast:            form.cast || null,
        producer:        form.producer || null,
        rating:          form.rating || null,
        language:        form.language || null,
        release_year:    form.release_year ? parseInt(String(form.release_year)) : null,
        video_url:       form.video_url || null,
        trailer_url:     form.trailer_url || null,
        filmmaker_message_url: form.filmmaker_message_url || null,
        poster_url:      form.poster_url || null,
        hero_video_url:  form.hero_video_url || null,
        artist_id:       form.artist_id || null,
        content_origin:  form.content_origin,
        status:          form.status,
        is_featured:     form.is_featured,
        price:           form.price ? parseFloat(String(form.price)) : null,
        publish_at:      form.publish_at ? new Date(form.publish_at).toISOString() : null,
        updated_at:      new Date().toISOString(),
      }

      let error
      if (film?.id) {
        ;({ error } = await supabase.from('films').update(payload).eq('id', film.id))
      } else {
        ;({ error } = await supabase.from('films').insert(payload))
      }
      if (error) throw error

      setMessage({ type: 'success', text: `✓ "${form.title}" ${film?.id ? 'updated' : 'saved'}!` })
      setLoading(false)
      setTimeout(onSave, 1200)
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
      setLoading(false)
    }
  }

  return (
    <div style={s.editCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent-primary)' }}>{film?.id ? `Editing: ${film.title}` : 'New Film'}</div>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: message.type === 'success' ? 'rgba(43,122,143,0.1)' : 'rgba(220,60,60,0.1)', border: `1px solid ${message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c'}`, color: message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c', fontSize: '14px' }}>
          {message.text}
        </div>
      )}

      <div style={s.field}>
        <label style={s.label}>Title *</label>
        <input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Film title" />
      </div>

      <div style={s.field}>
        <label style={s.label}>Logline <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— one sentence hook</span></label>
        <input style={s.input} value={form.logline} onChange={e => setForm(f => ({ ...f, logline: e.target.value }))} placeholder="A one-sentence description that sells the film" />
      </div>

      <div style={s.field}>
        <label style={s.label}>Description</label>
        <textarea style={{ ...s.textarea, minHeight: '100px' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Full description..." />
      </div>

      <div style={s.row}>
        <div>
          <label style={s.label}>Film Type</label>
          <select style={s.select} value={form.film_type} onChange={e => setForm(f => ({ ...f, film_type: e.target.value }))}>
            {FILM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={s.label}>Genre(s) <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— comma separated</span></label>
          <input style={s.input} value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))} placeholder="Drama, Music, Documentary" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
            {FILM_GENRES.map(g => (
              <button key={g} onClick={() => {
                const current = form.genre ? form.genre.split(',').map(x => x.trim()).filter(Boolean) : []
                if (current.includes(g)) setForm(f => ({ ...f, genre: current.filter(x => x !== g).join(', ') }))
                else setForm(f => ({ ...f, genre: [...current, g].join(', ') }))
              }} style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', border: '1px solid var(--border)', cursor: 'pointer', background: form.genre?.includes(g) ? 'var(--accent-primary)' : 'none', color: form.genre?.includes(g) ? 'white' : 'var(--text-muted)' }}>
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={s.row3}>
        <div>
          <label style={s.label}>Runtime (mins)</label>
          <input type="number" style={s.input} value={form.runtime_minutes} onChange={e => setForm(f => ({ ...f, runtime_minutes: e.target.value }))} placeholder="90" />
        </div>
        <div>
          <label style={s.label}>Release Year</label>
          <input type="number" style={s.input} value={form.release_year} onChange={e => setForm(f => ({ ...f, release_year: e.target.value }))} placeholder="2024" />
        </div>
        <div>
          <label style={s.label}>Rating</label>
          <select style={s.select} value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))}>
            <option value="">— select —</option>
            {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div style={s.row}>
        <div>
          <label style={s.label}>Director</label>
          <input style={s.input} value={form.director} onChange={e => setForm(f => ({ ...f, director: e.target.value }))} placeholder="Director name(s)" />
        </div>
        <div>
          <label style={s.label}>Language</label>
          <input style={s.input} value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} placeholder="English" />
        </div>
      </div>

      <div style={s.field}>
        <label style={s.label}>Cast</label>
        <input style={s.input} value={form.cast} onChange={e => setForm(f => ({ ...f, cast: e.target.value }))} placeholder="Actor 1, Actor 2, ..." />
      </div>

      <div style={s.row}>
        <div>
          <label style={s.label}>Producer</label>
          <input style={s.input} value={form.producer} onChange={e => setForm(f => ({ ...f, producer: e.target.value }))} placeholder="Producer name(s)" />
        </div>
        <div>
          <label style={s.label}>Linked Artist (for tipping)</label>
          <select style={s.select} value={form.artist_id} onChange={e => setForm(f => ({ ...f, artist_id: e.target.value }))}>
            <option value="">— no linked artist —</option>
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      <div style={s.divider} />
      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Media</div>

      <div style={s.row}>
        <VideoInput label="Main Film" value={form.video_url} onChange={url => setForm(f => ({ ...f, video_url: url }))} folder="cinema/films" />
        <VideoInput label="Trailer" value={form.trailer_url} onChange={url => setForm(f => ({ ...f, trailer_url: url }))} folder="cinema/trailers" />
      </div>
      <div style={s.field}>
        <VideoInput label="Filmmaker Message" value={form.filmmaker_message_url} onChange={url => setForm(f => ({ ...f, filmmaker_message_url: url }))} folder="cinema/messages" />
      </div>

      <div style={s.field}>
        <VideoInput label="Hero Video (optional — loops silently behind the Cinema hero; overrides the poster)" value={form.hero_video_url} onChange={url => setForm(f => ({ ...f, hero_video_url: url }))} folder="cinema/hero" />
      </div>

      <div style={s.field}>
        <ImageUploader label="Poster / Cover Image" value={form.poster_url} onChange={url => setForm(f => ({ ...f, poster_url: url }))} folder="cinema/posters" />
      </div>

      <div style={s.divider} />
      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Publishing</div>

      <div style={s.row}>
        <div>
          <label style={s.label}>Status</label>
          <select style={s.select} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="draft">Draft</option>
            <option value="private">Private</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div>
          <label style={s.label}>Content Origin</label>
          <select style={s.select} value={form.content_origin} onChange={e => setForm(f => ({ ...f, content_origin: e.target.value }))}>
            <option value="100% human">🧑 100% Human</option>
            <option value="human+ai">🧑🤖 Human + AI</option>
            <option value="ai generated">🤖 AI Generated</option>
          </select>
        </div>
      </div>

      <div style={s.row}>
        <div>
          <label style={s.label}>Schedule Publish At <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— auto-publishes at this time</span></label>
          <input type="datetime-local" style={s.input} value={form.publish_at} onChange={e => setForm(f => ({ ...f, publish_at: e.target.value }))} />
        </div>
        <div>
          <label style={s.label}>Price (leave blank for free)</label>
          <input type="number" step="0.01" style={s.input} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' as const }}>
        <label style={s.checkbox}>
          <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />
          ⭐ Featured
        </label>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button style={s.btnSave} onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : film?.id ? 'Update Film' : 'Save Film'}</button>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Profile Form ─────────────────────────────────────────────────────────────

function ProfileForm({ profile, films, artists, onSave, onCancel }: {
  profile?: CinemaProfile | null
  films: Film[]
  artists: Artist[]
  onSave: () => void
  onCancel: () => void
}) {
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState<{ type: string; text: string } | null>(null)
  const [photoUrl, setPhotoUrl] = useState(profile?.photo_url || '')

  const [form, setForm] = useState({
    name:        profile?.name || '',
    role:        profile?.role || '',
    bio:         profile?.bio || '',
    website_url: profile?.website_url || '',
    imdb_url:    profile?.imdb_url || '',
    artist_id:   profile?.artist_id || '',
    film_ids:    profile?.film_ids || [] as string[],
    is_featured: profile?.is_featured || false,
    status:      profile?.status || 'published',
  })

  const uploadPhoto = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'humanecho_upload')
    formData.append('folder', 'cinema/profiles')
    const res  = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.secure_url
  }

  const handleSave = async () => {
    if (!form.name) return setMessage({ type: 'error', text: 'Name is required' })
    if (!form.role) return setMessage({ type: 'error', text: 'Role is required' })
    setLoading(true); setMessage(null)
    try {
      const payload = {
        name:        form.name,
        role:        form.role,
        bio:         form.bio || null,
        photo_url:   photoUrl || null,
        website_url: form.website_url || null,
        imdb_url:    form.imdb_url || null,
        artist_id:   form.artist_id || null,
        film_ids:    form.film_ids,
        is_featured: form.is_featured,
        status:      form.status,
        updated_at:  new Date().toISOString(),
      }

      let error
      if (profile?.id) {
        ;({ error } = await supabase.from('cinema_profiles').update(payload).eq('id', profile.id))
      } else {
        ;({ error } = await supabase.from('cinema_profiles').insert(payload))
      }
      if (error) throw error

      setMessage({ type: 'success', text: `✓ "${form.name}" ${profile?.id ? 'updated' : 'created'}!` })
      setLoading(false)
      setTimeout(onSave, 1200)
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
      setLoading(false)
    }
  }

  const toggleFilm = (filmId: string) => {
    setForm(f => ({
      ...f,
      film_ids: f.film_ids.includes(filmId)
        ? f.film_ids.filter(id => id !== filmId)
        : [...f.film_ids, filmId]
    }))
  }

  return (
    <div style={s.editCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent-primary)' }}>{profile?.id ? `Editing: ${profile.name}` : 'New Profile'}</div>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: message.type === 'success' ? 'rgba(43,122,143,0.1)' : 'rgba(220,60,60,0.1)', border: `1px solid ${message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c'}`, color: message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c', fontSize: '14px' }}>
          {message.text}
        </div>
      )}

      <div style={s.row}>
        <div>
          <label style={s.label}>Name *</label>
          <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
        </div>
        <div>
          <label style={s.label}>Role * <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>e.g. Director, Actor, Producer</span></label>
          <input style={s.input} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Director" />
        </div>
      </div>

      <div style={s.field}>
        <label style={s.label}>Bio</label>
        <textarea style={s.textarea} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short biography..." />
      </div>

      <div style={s.field}>
        <label style={s.label}>Photo</label>
        {photoUrl && (
          <div style={{ marginBottom: '8px' }}>
            <img src={photoUrl} alt="Profile" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
            <button onClick={() => setPhotoUrl('')} style={{ ...s.btnDanger, marginLeft: '8px', fontSize: '11px', padding: '3px 8px' }}>Remove</button>
          </div>
        )}
        <input type="file" style={s.fileInput} onChange={async e => {
          const f = e.target.files?.[0]
          if (f) { try { const url = await uploadPhoto(f); setPhotoUrl(url) } catch {} }
        }} />
      </div>

      <div style={s.row}>
        <div>
          <label style={s.label}>Website URL</label>
          <input style={s.input} value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} placeholder="https://..." />
        </div>
        <div>
          <label style={s.label}>IMDb URL</label>
          <input style={s.input} value={form.imdb_url} onChange={e => setForm(f => ({ ...f, imdb_url: e.target.value }))} placeholder="https://imdb.com/name/..." />
        </div>
      </div>

      <div style={s.row}>
        <div>
          <label style={s.label}>Linked Artist <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— enables tipping</span></label>
          <select style={s.select} value={form.artist_id} onChange={e => setForm(f => ({ ...f, artist_id: e.target.value }))}>
            <option value="">— no linked artist —</option>
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label style={s.label}>Status</label>
          <select style={s.select} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {films.length > 0 && (
        <div style={s.field}>
          <label style={s.label}>Associated Films</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            {films.map(film => (
              <label key={film.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.film_ids.includes(film.id)} onChange={() => toggleFilm(film.id)} />
                {film.title} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· {film.film_type}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
        <label style={s.checkbox}>
          <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />
          ⭐ Featured profile
        </label>
      </div>

      {/* Block editor — only shown when editing an existing profile */}
      {profile?.id && <ProfileBlockEditor profileId={profile.id} />}

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button style={s.btnSave} onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : profile?.id ? 'Update Profile' : 'Create Profile'}</button>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Profile Block Editor ─────────────────────────────────────────────────────

const PROFILE_BLOCK_TYPES = [
  { value: 'text',         label: '📝 Text',        desc: 'Rich text / interview / essay' },
  { value: 'image',        label: '🖼 Image',        desc: 'Single image with caption' },
  { value: 'pull_quote',   label: '❝ Pull Quote',    desc: 'Large styled quote' },
  { value: 'video',        label: '🎬 Video',        desc: 'Upload or embed video' },
  { value: 'divider',      label: '— Divider',       desc: 'Visual section break' },
]

type ProfileBlock = {
  id: string
  profile_id: string
  block_type: string
  position: number
  content: Record<string, any>
  settings: Record<string, any>
}

// ─── Mini Rich Text Editor ────────────────────────────────────────────────────

function MiniRichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TipTapLink.configure({ openOnClick: false, HTMLAttributes: { style: 'color: var(--accent-primary); text-decoration: underline;' } }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        style: 'min-height: 160px; padding: 12px; font-family: DM Sans, sans-serif; font-size: 15px; line-height: 1.7; color: var(--text-primary); outline: none;',
      },
    },
  })

  const btnStyle = (active: boolean) => ({
    padding: '3px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
    border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
    background: active ? 'rgba(43,122,143,0.12)' : 'var(--bg-card)',
    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
  })

  const handleLink = () => {
    if (!editor) return
    const url = window.prompt('Enter URL:', editor.getAttributes('link').href || 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  if (!editor) return null

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-card)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '4px', padding: '8px 10px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' as const }}>
        <button style={btnStyle(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></button>
        <button style={btnStyle(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
        <button style={btnStyle(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button style={btnStyle(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button style={btnStyle(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>" "</button>
        <button style={btnStyle(editor.isActive('link'))} onClick={handleLink} title="Insert link">🔗</button>
        <div style={{ width: '1px', background: 'var(--border)', margin: '0 2px' }} />
        <button style={btnStyle(false)} onClick={() => editor.chain().focus().undo().run()}>↩</button>
        <button style={btnStyle(false)} onClick={() => editor.chain().focus().redo().run()}>↪</button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

function ProfileBlockFields({ block, onChange }: {
  block: ProfileBlock
  onChange: (content: Record<string, any>, settings: Record<string, any>) => void
}) {
  const c = block.content
  const set = block.settings
  const upd = (content: Partial<typeof c>, settings: Partial<typeof set> = {}) =>
    onChange({ ...c, ...content }, { ...set, ...settings })

  switch (block.block_type) {
    case 'text':
      return (
        <div>
          <label style={s.label}>Text Content</label>
          <MiniRichEditor value={c.html || ''} onChange={html => upd({ html })} />
          <div style={s.field}>
            <label style={{ ...s.label, marginTop: '10px' }}>Width</label>
            <select style={s.select} value={set.width || 'narrow'} onChange={e => upd({}, { width: e.target.value })}>
              <option value="narrow">Narrow (reading column)</option>
              <option value="full">Full width</option>
            </select>
          </div>
        </div>
      )
    case 'image':
      return (
        <div>
          <div style={s.field}>
            <ImageUploader label="Image" value={c.cloudinary_url || ''} onChange={url => upd({ cloudinary_url: url })} folder="cinema/profiles" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Caption</label>
            <input style={s.input} value={c.caption || ''} onChange={e => upd({ caption: e.target.value })} placeholder="Optional caption" />
          </div>
        </div>
      )
    case 'pull_quote':
      return (
        <div>
          <div style={s.field}>
            <label style={s.label}>Quote</label>
            <textarea style={s.textarea} value={c.quote || ''} onChange={e => upd({ quote: e.target.value })} placeholder="A striking quote from the interview..." />
          </div>
          <div style={s.field}>
            <label style={s.label}>Attribution</label>
            <input style={s.input} value={c.attribution || ''} onChange={e => upd({ attribution: e.target.value })} placeholder="— Name" />
          </div>
        </div>
      )
    case 'video':
      return (
        <div>
          <VideoInput label="Video" value={c.cloudinary_url || ''} onChange={url => upd({ cloudinary_url: url, embed_url: '' })} folder="cinema/profiles" />
          <div style={{ marginTop: '8px' }}>
            <label style={s.label}>Or embed URL</label>
            <input style={s.input} value={c.embed_url || ''} onChange={e => upd({ embed_url: e.target.value, cloudinary_url: '' })} placeholder="YouTube or Vimeo URL" />
          </div>
          <div style={{ marginTop: '8px' }}>
            <label style={s.label}>Caption</label>
            <input style={s.input} value={c.caption || ''} onChange={e => upd({ caption: e.target.value })} placeholder="Optional caption" />
          </div>
        </div>
      )
    case 'divider':
      return (
        <div style={s.field}>
          <label style={s.label}>Style</label>
          <select style={s.select} value={set.style || 'line'} onChange={e => upd({}, { style: e.target.value })}>
            <option value="line">Line</option>
            <option value="space">Space</option>
            <option value="ornament">Ornament (✦ ✦ ✦)</option>
          </select>
        </div>
      )
    default:
      return null
  }
}

function ProfileBlockEditor({ profileId }: { profileId: string }) {
  const [blocks, setBlocks]             = useState<ProfileBlock[]>([])
  const [loading, setLoading]           = useState(true)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [message, setMessage]           = useState<string | null>(null)
  const [localContent, setLocalContent] = useState<Record<string, Record<string, any>>>({})
  const [localSettings, setLocalSettings] = useState<Record<string, Record<string, any>>>({})
  const [saving, setSaving]             = useState<string | null>(null)

  useEffect(() => {
    supabase.from('cinema_profile_blocks').select('*').eq('profile_id', profileId).order('position').then(({ data }) => {
      setBlocks(data || [])
      setLoading(false)
    })
  }, [profileId])

  const addBlock = async (type: string) => {
    const maxPos = blocks.length > 0 ? Math.max(...blocks.map(b => b.position)) : 0
    const { data, error } = await supabase.from('cinema_profile_blocks')
      .insert({ profile_id: profileId, block_type: type, position: maxPos + 1, content: {}, settings: {} })
      .select('*').single()
    if (!error && data) { setBlocks(prev => [...prev, data]); flash('Block added') }
    setShowAddPanel(false)
  }

  const deleteBlock = async (id: string) => {
    await supabase.from('cinema_profile_blocks').delete().eq('id', id)
    setBlocks(prev => prev.filter(b => b.id !== id))
    flash('Block removed')
  }

  const saveBlock = async (block: ProfileBlock) => {
    setSaving(block.id)
    const content  = localContent[block.id]  ?? block.content
    const settings = localSettings[block.id] ?? block.settings
    await supabase.from('cinema_profile_blocks').update({ content, settings }).eq('id', block.id)
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content, settings } : b))
    setExpandedId(null)
    setSaving(null)
    flash('Block saved')
  }

  const moveBlock = async (index: number, dir: 'up' | 'down') => {
    const nb = [...blocks]
    const si = dir === 'up' ? index - 1 : index + 1
    if (si < 0 || si >= nb.length) return
    const posA = nb[index].position; const posB = nb[si].position
    nb[index].position = posB; nb[si].position = posA
    await Promise.all([
      supabase.from('cinema_profile_blocks').update({ position: posB }).eq('id', nb[index].id),
      supabase.from('cinema_profile_blocks').update({ position: posA }).eq('id', nb[si].id),
    ])
    ;[nb[index], nb[si]] = [nb[si], nb[index]]
    setBlocks(nb)
  }

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(null), 2000) }

  if (loading) return <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>Loading blocks...</div>

  return (
    <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          In-Depth Profile {blocks.length > 0 ? `(${blocks.length} blocks)` : ''}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hidden from visitors by default — revealed on "Read more"</div>
      </div>

      {message && (
        <div style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(43,122,143,0.1)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', fontSize: '12px', marginBottom: '10px' }}>
          ✓ {message}
        </div>
      )}

      {blocks.map((block, index) => {
        const label = PROFILE_BLOCK_TYPES.find(t => t.value === block.block_type)?.label || block.block_type
        const preview = block.content.html?.replace(/<[^>]+>/g, '').slice(0, 50)
          || block.content.quote?.slice(0, 50)
          || (block.content.cloudinary_url || block.content.embed_url ? '🎬 Video' : '')
          || (block.content.cloudinary_url && block.block_type === 'image' ? '🖼 Image' : '')
          || '—'
        const isExpanded = expandedId === block.id

        return (
          <div key={block.id} style={{ marginBottom: '6px', borderRadius: '8px', border: isExpanded ? '1px solid var(--accent-primary)' : '1px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button onClick={() => moveBlock(index, 'up')} disabled={index === 0} style={{ ...s.btnGhost, padding: '1px 6px', opacity: index === 0 ? 0.3 : 1, fontSize: '10px' }}>↑</button>
                <button onClick={() => moveBlock(index, 'down')} disabled={index === blocks.length - 1} style={{ ...s.btnGhost, padding: '1px 6px', opacity: index === blocks.length - 1 ? 0.3 : 1, fontSize: '10px' }}>↓</button>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>{label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{preview}</div>
              </div>
              <button style={{ 
                ...s.btnEdit, 
                marginRight: 0, 
                fontSize: '12px', 
                padding: '5px 12px',
                background: isExpanded ? 'rgba(43,122,143,0.1)' : 'transparent',
                color: isExpanded ? 'var(--accent-primary)' : 'var(--text-muted)',
                border: isExpanded ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
              }}
                onClick={() => setExpandedId(isExpanded ? null : block.id)}>
                {isExpanded ? 'Close' : 'Edit'}
              </button>
              <button style={{ ...s.btnDanger, fontSize: '12px', padding: '5px 10px' }} onClick={() => deleteBlock(block.id)}>✕</button>
            </div>
            {isExpanded && (
              <div style={{ padding: '12px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <ProfileBlockFields
                  block={{ ...block, content: localContent[block.id] ?? block.content, settings: localSettings[block.id] ?? block.settings }}
                  onChange={(content, settings) => {
                    setLocalContent(prev => ({ ...prev, [block.id]: content }))
                    setLocalSettings(prev => ({ ...prev, [block.id]: settings }))
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button style={s.btnSave} onClick={() => saveBlock(block)} disabled={saving === block.id}>
                    {saving === block.id ? 'Saving...' : 'Save Block'}
                  </button>
                  <button style={s.btnCancel} onClick={() => setExpandedId(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {showAddPanel ? (
        <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid var(--accent-primary)', background: 'rgba(43,122,143,0.04)', marginTop: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Add a Block</div>
            <button style={s.btnCancel} onClick={() => setShowAddPanel(false)}>Cancel</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px' }}>
            {PROFILE_BLOCK_TYPES.map(bt => (
              <button key={bt.value} onClick={() => addBlock(bt.value)}
                style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left' as const }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>{bt.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{bt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddPanel(true)}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px dashed var(--border)', background: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          + Add Block
        </button>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCinema() {
  const [activeTab, setActiveTab]               = useState<'films' | 'profiles'>('films')
  const [films, setFilms]                       = useState<Film[]>([])
  const [profiles, setProfiles]                 = useState<CinemaProfile[]>([])
  const [artists, setArtists]                   = useState<Artist[]>([])
  const [loading, setLoading]                   = useState(true)
  const [editingFilmId, setEditingFilmId]       = useState<string | null>(null)
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [showNewFilm, setShowNewFilm]           = useState(false)
  const [showNewProfile, setShowNewProfile]     = useState(false)
  const [confirmDelete, setConfirmDelete]       = useState<{ type: string; id: string; name: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
        if (data?.role !== 'admin') window.location.href = '/dashboard'
      })
    })
  }, [])

  const loadAll = useCallback(async () => {
    const [{ data: filmsData }, { data: profilesData }, { data: artistsData }] = await Promise.all([
      supabase.from('films').select('*').order('created_at', { ascending: false }),
      supabase.from('cinema_profiles').select('*').order('name'),
      supabase.from('artists').select('id, name').order('name'),
    ])
    setFilms(filmsData || [])
    setProfiles(profilesData || [])
    setArtists(artistsData || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleDelete = async () => {
    if (!confirmDelete) return
    const table = confirmDelete.type === 'film' ? 'films' : 'cinema_profiles'
    await supabase.from(table).delete().eq('id', confirmDelete.id)
    if (confirmDelete.type === 'film') setFilms(prev => prev.filter(f => f.id !== confirmDelete.id))
    else setProfiles(prev => prev.filter(p => p.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const handleSaved = () => {
    setShowNewFilm(false); setShowNewProfile(false)
    setEditingFilmId(null); setEditingProfileId(null)
    loadAll()
  }

  const statusBadge = (status: string) => {
    const color = status === 'published' ? 'green' : status === 'private' ? 'blue' : 'gray'
    return <span style={s.badge(color)}>{status}</span>
  }

  if (loading) return <div style={{ ...s.page, paddingTop: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Cinema</h1>
      <p style={s.subtitle}>Manage films, documentaries, shorts and filmmaker profiles</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', alignItems: 'center' }}>
        <button style={s.tab(activeTab === 'films')} onClick={() => setActiveTab('films')}>
          🎬 Films ({films.length})
        </button>
        <button style={s.tab(activeTab === 'profiles')} onClick={() => setActiveTab('profiles')}>
          🎭 Profiles ({profiles.length})
        </button>
        <div style={{ flex: 1 }} />
        <a href="/cinema" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>View cinema →</a>
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.3)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', fontSize: '14px', color: '#dc3c3c' }}>
          <div style={{ marginBottom: '12px' }}>⚠️ Delete <strong>"{confirmDelete.name}"</strong>? This cannot be undone.</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={s.btnDanger} onClick={handleDelete}>Yes, delete</button>
            <button style={s.btnCancel} onClick={() => setConfirmDelete(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── FILMS TAB ── */}
      {activeTab === 'films' && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={s.sectionTitle}>Films</div>
            <button style={s.btnSmall} onClick={() => { setShowNewFilm(true); setEditingFilmId(null) }}>+ Film Entry</button>
          </div>

          {showNewFilm && (
            <FilmForm artists={artists} onSave={handleSaved} onCancel={() => setShowNewFilm(false)} />
          )}

          {films.length === 0 && !showNewFilm && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎬</div>
              <div style={{ marginBottom: '16px' }}>No films yet.</div>
              <button style={s.btn} onClick={() => setShowNewFilm(true)}>Add your first film</button>
            </div>
          )}

          {films.map(film => (
            <div key={film.id}>
              {editingFilmId === film.id ? (
                <FilmForm film={film} artists={artists} onSave={handleSaved} onCancel={() => setEditingFilmId(null)} />
              ) : (
                <div style={s.manageRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    {film.poster_url ? (
                      <img src={film.poster_url} alt={film.title} style={{ width: '36px', height: '52px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '36px', height: '52px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🎬</div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={s.manageLabel}>{film.title}</div>
                      <div style={s.manageMeta}>
                        {FILM_TYPES.find(t => t.value === film.film_type)?.label || film.film_type}
                        {film.runtime_minutes ? ` · ${film.runtime_minutes} min` : ''}
                        {film.director ? ` · dir. ${film.director}` : ''}
                        {film.release_year ? ` · ${film.release_year}` : ''}
                        {film.publish_at ? ` · publishes ${new Date(film.publish_at).toLocaleDateString()}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
                    {statusBadge(film.status)}
                    {film.is_featured && <span style={{ fontSize: '12px' }}>⭐</span>}
                    <button style={s.btnEdit} onClick={() => { setEditingFilmId(film.id); setShowNewFilm(false) }}>Edit</button>
                    <button style={s.btnDanger} onClick={() => setConfirmDelete({ type: 'film', id: film.id, name: film.title })}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── PROFILES TAB ── */}
      {activeTab === 'profiles' && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={s.sectionTitle}>Cinema Profiles</div>
            <button style={s.btnSmall} onClick={() => { setShowNewProfile(true); setEditingProfileId(null) }}>+ Add Profile</button>
          </div>

          {showNewProfile && (
            <ProfileForm films={films} artists={artists} onSave={handleSaved} onCancel={() => setShowNewProfile(false)} />
          )}

          {profiles.length === 0 && !showNewProfile && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎭</div>
              <div style={{ marginBottom: '16px' }}>No profiles yet.</div>
              <button style={s.btn} onClick={() => setShowNewProfile(true)}>Add your first profile</button>
            </div>
          )}

          {profiles.map(profile => (
            <div key={profile.id}>
              {editingProfileId === profile.id ? (
                <ProfileForm profile={profile} films={films} artists={artists} onSave={handleSaved} onCancel={() => setEditingProfileId(null)} />
              ) : (
                <div style={s.manageRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    {profile.photo_url ? (
                      <img src={profile.photo_url} alt={profile.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🎭</div>
                    )}
                    <div>
                      <div style={s.manageLabel}>{profile.name} {profile.is_featured && '⭐'}</div>
                      <div style={s.manageMeta}>
                        {profile.role}
                        {profile.film_ids?.length > 0 ? ` · ${profile.film_ids.length} film${profile.film_ids.length !== 1 ? 's' : ''}` : ''}
                        {profile.artist_id ? ' · 💰 tip-enabled' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
                    {statusBadge(profile.status)}
                    <button style={s.btnEdit} onClick={() => { setEditingProfileId(profile.id); setShowNewProfile(false) }}>Edit</button>
                    <a href={`/cinema/profiles/${profile.id}`} target="_blank" rel="noopener noreferrer"
                      style={{ ...s.btnEdit, textDecoration: 'none', display: 'inline-block', marginRight: 0 }}>View →</a>
                    <button style={s.btnDanger} onClick={() => setConfirmDelete({ type: 'profile', id: profile.id, name: profile.name })}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
