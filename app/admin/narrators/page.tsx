'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

type Narrator = {
  id: string
  name: string
  tagline: string | null
  bio: string | null
  avatar_url: string | null
  voice_sample_url: string | null
  narrator_type: string
  voice_style: string | null
  languages: string[] | null
  eleven_labs_voice_id: string | null
  is_active: boolean
  display_order: number
}

type BgTrack = {
  id: string
  title: string
  mood: string | null
  description: string | null
  cloudinary_url: string
  duration_seconds: number | null
  file_format: string
  loop_enabled: boolean
  is_active: boolean
  display_order: number
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  page:         { maxWidth: '860px', margin: '0 auto', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' },
  h1:           { fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' },
  subtitle:     { fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' },
  card:         { background: 'var(--bg-secondary)', borderRadius: '16px', padding: '28px', marginBottom: '24px', border: '1px solid var(--border)' },
  label:        { display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' },
  input:        { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  select:       { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  textarea:     { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const, minHeight: '80px' },
  fileInput:    { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px dashed var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' as const },
  row:          { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field:        { marginBottom: '16px' },
  btn:          { padding: '12px 28px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '500', border: 'none', cursor: 'pointer' },
  btnSecondary: { padding: '12px 28px', borderRadius: '8px', background: 'none', color: 'var(--text-secondary)', fontSize: '15px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnSmall:     { padding: '7px 16px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', border: 'none', cursor: 'pointer' },
  btnEdit:      { padding: '8px 16px', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnSave:      { padding: '8px 16px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', border: 'none', cursor: 'pointer', marginRight: '8px' },
  btnCancel:    { padding: '8px 16px', borderRadius: '6px', background: 'none', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnDanger:    { padding: '8px 16px', borderRadius: '6px', background: 'rgba(220,60,60,0.1)', color: '#dc3c3c', fontSize: '13px', border: '1px solid rgba(220,60,60,0.3)', cursor: 'pointer' },
  sectionTitle: { fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' },
  divider:      { height: '1px', background: 'var(--border)', margin: '20px 0' },
  checkbox:     { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' },
  manageRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: '8px' },
  manageLabel:  { fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' },
  manageMeta:   { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  editCard:     { background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '12px', padding: '20px', marginBottom: '8px' },
  tab:          (active: boolean) => ({ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: active ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: active ? 'white' : 'var(--text-muted)' }),
}

const MOODS = ['ambient', 'jazz', 'classical', 'nature', 'cinematic', 'meditative', 'folk', 'electronic', 'other']

// ─── Voice Preview ────────────────────────────────────────────────────────────

function VoicePreview({ voiceId }: { voiceId: string }) {
  const [previewText, setPreviewText] = useState("Welcome to Human Echo. I'll be your guide through today's story.")
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [audioUrl, setAudioUrl]       = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handlePreview = async () => {
    if (!voiceId || !previewText) return
    setLoading(true); setError(null); setAudioUrl(null)
    try {
      const res = await fetch('/api/elevenlabs/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voiceId, text: previewText }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Preview failed') }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      setAudioUrl(url)
      if (audioRef.current) { audioRef.current.src = url; audioRef.current.play() }
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  return (
    <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(43,122,143,0.06)', border: '1px solid rgba(43,122,143,0.2)', marginTop: '8px' }}>
      <div style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '10px' }}>Voice Preview</div>
      <div style={s.field}>
        <textarea style={{ ...s.textarea, minHeight: '60px' }} value={previewText} onChange={e => setPreviewText(e.target.value.slice(0, 500))} />
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>{previewText.length}/500</div>
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={s.btnSmall} onClick={handlePreview} disabled={loading || !voiceId || !previewText}>
          {loading ? '⏳ Generating...' : '▶ Generate & Play'}
        </button>
        {audioUrl && !loading && (
          <button style={{ ...s.btnSmall, background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play() } }}>
            ↺ Replay
          </button>
        )}
        {error && <span style={{ fontSize: '12px', color: '#dc3c3c' }}>⚠ {error}</span>}
      </div>
      <audio ref={audioRef} style={{ display: 'none' }} />
      {audioUrl && <audio controls src={audioUrl} style={{ width: '100%', height: '32px', marginTop: '10px' }} />}
    </div>
  )
}

// ─── Narrator Form ────────────────────────────────────────────────────────────

function NarratorForm({ narrator, onSave, onCancel }: {
  narrator?: Narrator | null
  onSave: () => void
  onCancel: () => void
}) {
  const [loading, setLoading]       = useState(false)
  const [message, setMessage]       = useState<{ type: string; text: string } | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [sampleFile, setSampleFile] = useState<File | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const [form, setForm] = useState({
    name:                 narrator?.name || '',
    tagline:              narrator?.tagline || '',
    bio:                  narrator?.bio || '',
    narrator_type:        narrator?.narrator_type || 'avatar',
    voice_style:          narrator?.voice_style || '',
    languages:            narrator?.languages?.join(', ') || 'en',
    eleven_labs_voice_id: narrator?.eleven_labs_voice_id || '',
    is_active:            narrator?.is_active ?? true,
    display_order:        narrator?.display_order || 0,
  })

  const uploadFile = async (file: File, folder: string, type: string): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'humanecho_upload')
    formData.append('folder', folder)
    const res  = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${type}/upload`, { method: 'POST', body: formData })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.secure_url
  }

  const handleSave = async () => {
    if (!form.name) return setMessage({ type: 'error', text: 'Name is required' })
    setLoading(true); setMessage(null)
    try {
      const payload: any = {
        name: form.name, tagline: form.tagline || null, bio: form.bio || null,
        narrator_type: form.narrator_type, voice_style: form.voice_style || null,
        languages: form.languages.split(',').map(l => l.trim()).filter(Boolean),
        eleven_labs_voice_id: form.eleven_labs_voice_id || null,
        is_active: form.is_active, display_order: parseInt(String(form.display_order)) || 0,
      }
      if (avatarFile) payload.avatar_url       = await uploadFile(avatarFile, 'narrators/avatars', 'image')
      if (sampleFile) payload.voice_sample_url = await uploadFile(sampleFile, 'narrators/samples', 'video')
      let error
      if (narrator?.id) {
        ;({ error } = await supabase.from('narrators').update(payload).eq('id', narrator.id))
      } else {
        ;({ error } = await supabase.from('narrators').insert(payload))
      }
      if (error) throw error
      setMessage({ type: 'success', text: `Narrator "${form.name}" ${narrator?.id ? 'updated' : 'created'}!` })
      setTimeout(onSave, 600)
    } catch (err) { setMessage({ type: 'error', text: (err as Error).message }) }
    setLoading(false)
  }

  return (
    <div style={s.editCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent-primary)' }}>{narrator?.id ? `Editing: ${narrator.name}` : 'New Narrator'}</div>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>
      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: message.type === 'success' ? 'rgba(43,122,143,0.1)' : 'rgba(220,60,60,0.1)', border: `1px solid ${message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c'}`, color: message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c', fontSize: '14px' }}>
          {message.text}
        </div>
      )}
      <div style={s.row}>
        <div><label style={s.label}>Name *</label><input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sylvie Cooper" /></div>
        <div><label style={s.label}>Type</label>
          <select style={s.select} value={form.narrator_type} onChange={e => setForm(f => ({ ...f, narrator_type: e.target.value }))}>
            <option value="avatar">Avatar</option>
            <option value="human">Human</option>
          </select>
        </div>
      </div>
      <div style={s.field}><label style={s.label}>Tagline</label><input style={s.input} value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder='"Warm and intimate"' /></div>
      <div style={s.field}><label style={s.label}>Bio</label><textarea style={s.textarea} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} /></div>
      <div style={s.row}>
        <div><label style={s.label}>Voice Style</label><input style={s.input} value={form.voice_style} onChange={e => setForm(f => ({ ...f, voice_style: e.target.value }))} placeholder="Warm, Dramatic, Neutral" /></div>
        <div><label style={s.label}>Languages</label><input style={s.input} value={form.languages} onChange={e => setForm(f => ({ ...f, languages: e.target.value }))} placeholder="en, es, fr" /></div>
      </div>
      <div style={s.row}>
        <div>
          <label style={s.label}>Avatar Image</label>
          <input type="file" accept="image/*" style={s.fileInput} onChange={e => setAvatarFile(e.target.files?.[0] || null)} />
          {avatarFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {avatarFile.name}</div>}
          {narrator?.avatar_url && !avatarFile && <img src={narrator.avatar_url} alt={narrator.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', marginTop: '6px' }} />}
        </div>
        <div>
          <label style={s.label}>Voice Sample</label>
          <input type="file" accept="audio/*" style={s.fileInput} onChange={e => setSampleFile(e.target.files?.[0] || null)} />
          {sampleFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {sampleFile.name}</div>}
          {narrator?.voice_sample_url && !sampleFile && <audio controls src={narrator.voice_sample_url} style={{ width: '100%', height: '32px', marginTop: '6px' }} />}
        </div>
      </div>
      <div style={s.divider} />
      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ElevenLabs Voice</div>
      <div style={s.field}>
        <label style={s.label}>Voice ID</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input style={{ ...s.input, flex: 1, fontFamily: 'monospace', fontSize: '13px' }} value={form.eleven_labs_voice_id} onChange={e => { setForm(f => ({ ...f, eleven_labs_voice_id: e.target.value })); setShowPreview(false) }} placeholder="21m00Tcm4TlvDq8ikWAM" />
          <button style={s.btnSmall} onClick={() => setShowPreview(true)} disabled={!form.eleven_labs_voice_id}>Test Voice</button>
        </div>
      </div>
      {showPreview && form.eleven_labs_voice_id && <VoicePreview voiceId={form.eleven_labs_voice_id} />}
      <div style={s.divider} />
      <div style={s.row}>
        <div><label style={s.label}>Display Order</label><input style={s.input} type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} /></div>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
          <label style={s.checkbox}><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />Active — visible to readers</label>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button style={s.btnSave} onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : narrator?.id ? 'Update' : 'Create Narrator'}</button>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Background Track Form ────────────────────────────────────────────────────

function BgTrackForm({ track, onSave, onCancel }: {
  track?: BgTrack | null
  onSave: () => void
  onCancel: () => void
}) {
  const [loading, setLoading]     = useState(false)
  const [message, setMessage]     = useState<{ type: string; text: string } | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [form, setForm] = useState({
    title:         track?.title || '',
    mood:          track?.mood || 'ambient',
    description:   track?.description || '',
    file_format:   track?.file_format || 'wav',
    loop_enabled:  track?.loop_enabled ?? true,
    is_active:     track?.is_active ?? true,
    display_order: track?.display_order || 0,
  })

  const uploadAudio = async (file: File): Promise<{ url: string; duration: number }> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'humanecho_upload')
      formData.append('folder', 'background-music')
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`)
      xhr.upload.onprogress = e => { if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100)) }
      xhr.onload = () => {
        const data = JSON.parse(xhr.responseText)
        if (data.error) reject(new Error(data.error.message))
        else resolve({ url: data.secure_url, duration: Math.round(data.duration || 0) })
      }
      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.send(formData)
    })
  }

  const handleSave = async () => {
    if (!form.title) return setMessage({ type: 'error', text: 'Title is required' })
    if (!track?.id && !audioFile) return setMessage({ type: 'error', text: 'Audio file is required' })
    setLoading(true); setMessage(null)
    try {
      const payload: any = {
        title: form.title, mood: form.mood || null, description: form.description || null,
        file_format: form.file_format, loop_enabled: form.loop_enabled,
        is_active: form.is_active, display_order: parseInt(String(form.display_order)) || 0,
      }
      if (audioFile) {
        const { url, duration } = await uploadAudio(audioFile)
        payload.cloudinary_url    = url
        payload.duration_seconds  = duration
        payload.file_format       = audioFile.name.split('.').pop()?.toLowerCase() || 'wav'
      }
      let error
      if (track?.id) {
        ;({ error } = await supabase.from('background_tracks').update(payload).eq('id', track.id))
      } else {
        ;({ error } = await supabase.from('background_tracks').insert(payload))
      }
      if (error) throw error
      setUploadProgress(0)
      setMessage({ type: 'success', text: `Track "${form.title}" ${track?.id ? 'updated' : 'added'}!` })
      setTimeout(onSave, 600)
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
      setUploadProgress(0)
    }
    setLoading(false)
  }

  return (
    <div style={s.editCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent-primary)' }}>{track?.id ? `Editing: ${track.title}` : 'New Background Track'}</div>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>
      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: message.type === 'success' ? 'rgba(43,122,143,0.1)' : 'rgba(220,60,60,0.1)', border: `1px solid ${message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c'}`, color: message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c', fontSize: '14px' }}>
          {message.text}
        </div>
      )}
      <div style={s.row}>
        <div><label style={s.label}>Title *</label><input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Quiet Forest Morning" /></div>
        <div>
          <label style={s.label}>Mood</label>
          <select style={s.select} value={form.mood} onChange={e => setForm(f => ({ ...f, mood: e.target.value }))}>
            {MOODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div style={s.field}>
        <label style={s.label}>Description <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— shown to readers in the music picker</span></label>
        <input style={s.input} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Soft ambient pads, gentle and unhurried..." />
      </div>
      <div style={s.field}>
        <label style={s.label}>Audio File <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— WAV or FLAC recommended for seamless looping</span></label>
        <input type="file" accept=".wav,.flac,.mp3,audio/*" style={s.fileInput} onChange={e => setAudioFile(e.target.files?.[0] || null)} />
        {audioFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {audioFile.name}</div>}
        {track?.cloudinary_url && !audioFile && (
          <div style={{ marginTop: '8px' }}>
            <audio controls src={track.cloudinary_url} style={{ width: '100%', height: '32px' }} />
          </div>
        )}
      </div>
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Uploading...</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-primary)' }}>{uploadProgress}%</span>
          </div>
          <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px' }}>
            <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--accent-primary)', borderRadius: '3px', transition: 'width 0.2s' }} />
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' as const }}>
        <label style={s.checkbox}>
          <input type="checkbox" checked={form.loop_enabled} onChange={e => setForm(f => ({ ...f, loop_enabled: e.target.checked }))} />
          🔁 Loop seamlessly (recommended for WAV/FLAC)
        </label>
        <label style={s.checkbox}>
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          Active — available to readers
        </label>
      </div>
      <div style={{ width: '160px' }}>
        <label style={s.label}>Display Order</label>
        <input style={s.input} type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button style={s.btnSave} onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : track?.id ? 'Update Track' : 'Add Track'}</button>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminNarrators() {
  const [activeTab, setActiveTab]   = useState<'narrators' | 'music'>('narrators')
  const [narrators, setNarrators]   = useState<Narrator[]>([])
  const [bgTracks, setBgTracks]     = useState<BgTrack[]>([])
  const [loading, setLoading]       = useState(true)
  const [editingNarratorId, setEditingNarratorId] = useState<string | null>(null)
  const [editingTrackId, setEditingTrackId]       = useState<string | null>(null)
  const [showNewNarrator, setShowNewNarrator]     = useState(false)
  const [showNewTrack, setShowNewTrack]           = useState(false)
  const [confirmDelete, setConfirmDelete]         = useState<{ type: string; id: string; name: string } | null>(null)
  const [previewingId, setPreviewingId]           = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
        if (data?.role !== 'admin') window.location.href = '/dashboard'
      })
    })
  }, [])

  const loadAll = async () => {
    const [{ data: n }, { data: b }] = await Promise.all([
      supabase.from('narrators').select('*').order('display_order'),
      supabase.from('background_tracks').select('*').order('display_order'),
    ])
    setNarrators(n || [])
    setBgTracks(b || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const handleDelete = async () => {
    if (!confirmDelete) return
    const table = confirmDelete.type === 'narrator' ? 'narrators' : 'background_tracks'
    await supabase.from(table).delete().eq('id', confirmDelete.id)
    if (confirmDelete.type === 'narrator') setNarrators(prev => prev.filter(n => n.id !== confirmDelete.id))
    else setBgTracks(prev => prev.filter(t => t.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const handleSaved = () => {
    setShowNewNarrator(false); setShowNewTrack(false)
    setEditingNarratorId(null); setEditingTrackId(null)
    loadAll()
  }

  const formatDuration = (secs: number | null) => {
    if (!secs) return '—'
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  if (loading) return <div style={{ ...s.page, paddingTop: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Audio Management</h1>
      <p style={s.subtitle}>Manage narrators and background music for the reading experience</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', alignItems: 'center' }}>
        <button style={s.tab(activeTab === 'narrators')} onClick={() => setActiveTab('narrators')}>
          🎙 Narrators ({narrators.length})
        </button>
        <button style={s.tab(activeTab === 'music')} onClick={() => setActiveTab('music')}>
          🎵 Background Music ({bgTracks.length})
        </button>
        <div style={{ flex: 1 }} />
        <a href="/admin/stories" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>← Story Editor</a>
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

      {/* ── NARRATORS TAB ── */}
      {activeTab === 'narrators' && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={s.sectionTitle}>Narrators</div>
            <button style={s.btnSmall} onClick={() => { setShowNewNarrator(true); setEditingNarratorId(null) }}>+ New Narrator</button>
          </div>

          {showNewNarrator && (
            <NarratorForm onSave={handleSaved} onCancel={() => setShowNewNarrator(false)} />
          )}

          {narrators.length === 0 && !showNewNarrator && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎙</div>
              <div style={{ marginBottom: '16px' }}>No narrators yet.</div>
              <button style={s.btn} onClick={() => setShowNewNarrator(true)}>Add your first narrator</button>
            </div>
          )}

          {narrators.map(narrator => (
            <div key={narrator.id}>
              {editingNarratorId === narrator.id ? (
                <NarratorForm narrator={narrator} onSave={handleSaved} onCancel={() => setEditingNarratorId(null)} />
              ) : (
                <div style={s.manageRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    {narrator.avatar_url
                      ? <img src={narrator.avatar_url} alt={narrator.name} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--border)' }} />
                      : <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🎙</div>
                    }
                    <div style={{ minWidth: 0 }}>
                      <div style={s.manageLabel}>
                        {narrator.name}
                        {!narrator.is_active && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>(inactive)</span>}
                      </div>
                      <div style={s.manageMeta}>
                        {narrator.narrator_type} · {narrator.voice_style || 'no style'}
                        {narrator.eleven_labs_voice_id ? ` · 🎙 ${narrator.eleven_labs_voice_id.slice(0, 8)}...` : ' · no voice ID'}
                        {narrator.tagline ? ` · "${narrator.tagline}"` : ''}
                      </div>
                      {narrator.voice_sample_url && <audio controls src={narrator.voice_sample_url} style={{ height: '28px', width: '200px', marginTop: '4px' }} />}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center', marginLeft: '12px' }}>
                    {narrator.eleven_labs_voice_id && (
                      <button style={{ ...s.btnEdit, color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                        onClick={() => setPreviewingId(previewingId === narrator.id ? null : narrator.id)}>
                        {previewingId === narrator.id ? 'Hide' : '▶ Test'}
                      </button>
                    )}
                    <button style={s.btnEdit} onClick={() => { setEditingNarratorId(narrator.id); setShowNewNarrator(false) }}>Edit</button>
                    <button style={s.btnDanger} onClick={() => setConfirmDelete({ type: 'narrator', id: narrator.id, name: narrator.name })}>Delete</button>
                  </div>
                </div>
              )}
              {previewingId === narrator.id && narrator.eleven_labs_voice_id && editingNarratorId !== narrator.id && (
                <div style={{ marginBottom: '8px', padding: '0 16px' }}>
                  <VoicePreview voiceId={narrator.eleven_labs_voice_id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── BACKGROUND MUSIC TAB ── */}
      {activeTab === 'music' && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={s.sectionTitle}>Background Music</div>
            <button style={s.btnSmall} onClick={() => { setShowNewTrack(true); setEditingTrackId(null) }}>+ Add Track</button>
          </div>

          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(43,122,143,0.06)', border: '1px solid rgba(43,122,143,0.2)', marginBottom: '20px', fontSize: '13px', color: 'var(--accent-primary)' }}>
            🎵 Use WAV or FLAC files for seamless looping. These tracks appear in the reading experience music picker. After adding tracks here, edit each story to assign up to 4 tracks as available options for readers.
          </div>

          {showNewTrack && (
            <BgTrackForm onSave={handleSaved} onCancel={() => setShowNewTrack(false)} />
          )}

          {bgTracks.length === 0 && !showNewTrack && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎵</div>
              <div style={{ marginBottom: '16px' }}>No background tracks yet.</div>
              <button style={s.btn} onClick={() => setShowNewTrack(true)}>Add your first track</button>
            </div>
          )}

          {bgTracks.map(track => (
            <div key={track.id}>
              {editingTrackId === track.id ? (
                <BgTrackForm track={track} onSave={handleSaved} onCancel={() => setEditingTrackId(null)} />
              ) : (
                <div style={s.manageRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.manageLabel}>
                      {track.title}
                      {!track.is_active && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>(inactive)</span>}
                    </div>
                    <div style={s.manageMeta}>
                      {track.mood || 'no mood'} · {track.file_format?.toUpperCase()} · {formatDuration(track.duration_seconds)}
                      {track.loop_enabled ? ' · 🔁 loops' : ' · plays through'}
                      {track.description ? ` · "${track.description}"` : ''}
                    </div>
                    {track.cloudinary_url && (
                      <audio controls src={track.cloudinary_url} style={{ height: '28px', width: '240px', marginTop: '6px' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                    <button style={s.btnEdit} onClick={() => { setEditingTrackId(track.id); setShowNewTrack(false) }}>Edit</button>
                    <button style={s.btnDanger} onClick={() => setConfirmDelete({ type: 'track', id: track.id, name: track.title })}>Delete</button>
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
