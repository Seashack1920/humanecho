'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type EscapeCoach = { id: string; name: string; category: string }

type AudioClip = {
  id: string
  title: string
  speaker: string | null
  clip_type: string
  theme: string | null
  duration: string | null
  cloudinary_url: string | null
  transcript: string | null
  mood_tags: string[]
  coach_categories: string[]
  status: string
  display_order: number
  coach_id?: string | null
  created_at: string
}

const CLIP_TYPES = [
  { value: 'affirmation',   label: '✨ Affirmation',   desc: 'Positive self-talk and belief statements' },
  { value: 'meditation',    label: '🧘 Meditation',    desc: 'Guided stillness and mindfulness' },
  { value: 'soundbite',     label: '🎙 Soundbite',     desc: 'Short motivational or inspirational clip' },
  { value: 'reflection',    label: '🪞 Reflection',    desc: 'Ancient or historical wisdom' },
  { value: 'prayer',        label: '🙏 Prayer',        desc: 'Spiritual invocation or blessing' },
  { value: 'breathwork',    label: '🌬 Breathwork',    desc: 'Guided breathing exercise' },
  { value: 'visualization', label: '🌟 Visualization', desc: 'Guided imagery and mental rehearsal' },
]

const MOOD_TAGS = ['workout', 'victory', 'romance', 'focus', 'sleep', 'spiritual', 'party', 'chill', 'motivation', 'reflection']
const COACH_CATEGORIES = ['gym', 'victory', 'romance', 'workplace', 'sleep', 'spiritual', 'party', 'road', 'mental-health', 'housekeeping']

const s = {
  page:         { maxWidth: '960px', margin: '0 auto', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' },
  h1:           { fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' },
  subtitle:     { fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' },
  card:         { background: 'var(--bg-secondary)', borderRadius: '16px', padding: '28px', marginBottom: '24px', border: '1px solid var(--border)' },
  label:        { display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  input:        { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  select:       { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  textarea:     { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const, minHeight: '80px', resize: 'vertical' as const },
  fileInput:    { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px dashed var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' as const },
  row:          { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field:        { marginBottom: '16px' },
  btn:          { padding: '10px 24px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer' },
  btnSecondary: { padding: '10px 24px', borderRadius: '8px', background: 'none', color: 'var(--text-secondary)', fontSize: '14px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnSm:        { padding: '6px 14px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' },
  btnSmSecondary: { padding: '6px 14px', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '12px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnSmDanger:  { padding: '6px 14px', borderRadius: '6px', background: 'rgba(220,60,60,0.1)', color: '#dc3c3c', fontSize: '12px', border: '1px solid rgba(220,60,60,0.3)', cursor: 'pointer' },
  btnSave:      { padding: '8px 20px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer', marginRight: '8px' },
  btnCancel:    { padding: '8px 20px', borderRadius: '6px', background: 'none', color: 'var(--text-secondary)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnDanger:    { padding: '8px 20px', borderRadius: '6px', background: 'rgba(220,60,60,0.1)', color: '#dc3c3c', fontSize: '13px', border: '1px solid rgba(220,60,60,0.3)', cursor: 'pointer' },
  manageRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: '8px' },
  manageLabel:  { fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' },
  manageMeta:   { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  editCard:     { background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '12px', padding: '20px', marginBottom: '8px' },
  badge:        (color: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500', background: color === 'green' ? 'rgba(43,180,100,0.15)' : color === 'blue' ? 'rgba(43,122,143,0.15)' : 'rgba(150,150,150,0.15)', color: color === 'green' ? '#2bb464' : color === 'blue' ? 'var(--accent-primary)' : 'var(--text-muted)' }),
  divider:      { height: '1px', background: 'var(--border)', margin: '16px 0' },
  progressBar:  { height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' },
}

// ─── Audio Uploader ───────────────────────────────────────────────────────────

function AudioUploader({ value, onChange }: { value: string; onChange: (url: string, duration: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [error, setError]         = useState('')

  const handleFile = async (file: File) => {
    if (file.size > 200 * 1024 * 1024) { setError('File must be under 200MB'); return }
    setUploading(true); setError(''); setProgress(0)

    // Read duration
    const duration = await new Promise<string>(resolve => {
      try {
        const audio = new Audio()
        const url = URL.createObjectURL(file)
        audio.src = url
        audio.onloadedmetadata = () => {
          const secs = Math.floor(audio.duration)
          URL.revokeObjectURL(url)
          resolve(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`)
        }
        audio.onerror = () => resolve('')
      } catch { resolve('') }
    })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'humanecho_upload')
      formData.append('folder', 'audio-clips')
      formData.append('resource_type', 'video')

      const xhr = new XMLHttpRequest()
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`)
      xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)) }
      xhr.onload = () => {
        const data = JSON.parse(xhr.responseText)
        if (data.error) { setError(data.error.message); setUploading(false); return }
        onChange(data.secure_url, duration)
        setUploading(false); setProgress(0)
      }
      xhr.onerror = () => { setError('Upload failed'); setUploading(false) }
      xhr.send(formData)
    } catch (err) { setError((err as Error).message); setUploading(false) }
  }

  return (
    <div>
      <label style={s.label}>Audio File <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>— MP3, WAV, FLAC · max 200MB</span></label>
      {value && (
        <div style={{ marginBottom: '8px' }}>
          <audio src={value} controls style={{ width: '100%', height: '36px', borderRadius: '8px' }} />
          <button onClick={() => onChange('', '')} style={{ ...s.btnSmDanger, marginTop: '4px', fontSize: '11px' }}>Remove</button>
        </div>
      )}
      <input type="file" accept="audio/*,.flac,.wav,.mp3,.aac,.ogg" style={s.fileInput} disabled={uploading}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      {uploading && (
        <div>
          <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>Uploading... {progress}%</div>
          <div style={s.progressBar}><div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent-primary)', transition: 'width 0.2s' }} /></div>
        </div>
      )}
      {error && <div style={{ fontSize: '12px', color: '#dc3c3c', marginTop: '4px' }}>{error}</div>}
    </div>
  )
}

// ─── Clip Form ────────────────────────────────────────────────────────────────

function ClipForm({ clip, coaches, onSave, onCancel }: {
  clip?: AudioClip | null
  coaches: EscapeCoach[]
  onSave: () => void
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const [form, setForm] = useState({
    title:            clip?.title || '',
    speaker:          clip?.speaker || '',
    clip_type:        clip?.clip_type || 'affirmation',
    theme:            clip?.theme || '',
    duration:         clip?.duration || '',
    cloudinary_url:   clip?.cloudinary_url || '',
    transcript:       clip?.transcript || '',
    mood_tags:        clip?.mood_tags || [] as string[],
    coach_categories: clip?.coach_categories || [] as string[],
    status:           clip?.status || 'draft',
    display_order:    clip?.display_order ?? 0,
    coach_id:         clip?.coach_id || '',
  })

  const handleSave = async () => {
    if (!form.title) return setMessage({ type: 'error', text: 'Title is required' })
    setLoading(true); setMessage(null)
    try {
      const payload: any = {
        title: form.title, speaker: form.speaker || null,
        clip_type: form.clip_type, theme: form.theme || null,
        duration: form.duration || null, cloudinary_url: form.cloudinary_url || null,
        transcript: form.transcript || null,
        mood_tags: form.mood_tags, coach_categories: form.coach_categories,
        status: form.status, display_order: form.display_order,
        coach_id: form.coach_id || null,
      }
      let error
      if (clip?.id) {
        ;({ error } = await supabase.from('audio_clips').update(payload).eq('id', clip.id))
      } else {
        ;({ error } = await supabase.from('audio_clips').insert(payload))
      }
      if (error) throw error
      setMessage({ type: 'success', text: `✓ "${form.title}" ${clip?.id ? 'updated' : 'saved'}!` })
      setTimeout(onSave, 1000)
    } catch (err) { setMessage({ type: 'error', text: (err as Error).message }) }
    setLoading(false)
  }

  const toggleTag = (list: 'mood_tags' | 'coach_categories', tag: string, max: number) => {
    setForm(f => {
      const current = f[list] as string[]
      const updated = current.includes(tag) ? current.filter(t => t !== tag) : current.length < max ? [...current, tag] : current
      return { ...f, [list]: updated }
    })
  }

  const statusColor = form.status === 'published' ? 'green' : form.status === 'private' ? 'blue' : 'gray'

  return (
    <div style={s.editCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {clip?.id ? `Editing: ${clip.title}` : 'New Audio Clip'}
        </div>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>

      {message && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', background: message.type === 'success' ? 'rgba(43,122,143,0.1)' : 'rgba(220,60,60,0.1)', border: `1px solid ${message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c'}`, color: message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c', fontSize: '13px' }}>
          {message.text}
        </div>
      )}

      <div style={s.row}>
        <div>
          <label style={s.label}>Title *</label>
          <input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. You Are Unstoppable" />
        </div>
        <div>
          <label style={s.label}>Clip Type *</label>
          <select style={s.select} value={form.clip_type} onChange={e => setForm(f => ({ ...f, clip_type: e.target.value }))}>
            {CLIP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div style={s.row}>
        <div>
          <label style={s.label}>Speaker <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>— voice on the clip</span></label>
          <input style={s.input} value={form.speaker} onChange={e => setForm(f => ({ ...f, speaker: e.target.value }))} placeholder="e.g. Coach Maya" />
        </div>
        <div>
          <label style={s.label}>Linked Coach</label>
          <select style={s.select} value={form.coach_id} onChange={e => setForm(f => ({ ...f, coach_id: e.target.value }))}>
            <option value="">— no linked coach —</option>
            {coaches.map(c => <option key={c.id} value={c.id}>{c.name} · {c.category}</option>)}
          </select>
        </div>
      </div>

      <div style={s.row}>
        <div>
          <label style={s.label}>Theme <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>— e.g. confidence, gratitude</span></label>
          <input style={s.input} value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))} placeholder="confidence" />
        </div>
        <div>
          <label style={s.label}>Status</label>
          <select style={s.select} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="draft">Draft</option>
            <option value="private">Private</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      <div style={s.field}>
        <AudioUploader
          value={form.cloudinary_url}
          onChange={(url, duration) => setForm(f => ({ ...f, cloudinary_url: url, duration: duration || f.duration }))}
        />
      </div>

      <div style={s.row}>
        <div>
          <label style={s.label}>Duration <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>— auto-detected on upload</span></label>
          <input style={s.input} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="1:30" />
        </div>
        <div>
          <label style={s.label}>Display Order</label>
          <input style={s.input} type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
        </div>
      </div>

      <div style={s.field}>
        <label style={s.label}>Transcript <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>— optional, for accessibility and search</span></label>
        <textarea style={s.textarea} value={form.transcript} onChange={e => setForm(f => ({ ...f, transcript: e.target.value }))} placeholder="Full text of the clip..." />
      </div>

      <div style={s.divider} />

      {/* Mood Tags */}
      <div style={s.field}>
        <label style={s.label}>Mood Tags <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>— optional · up to 3</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginTop: '6px' }}>
          {MOOD_TAGS.map(tag => {
            const active = form.mood_tags.includes(tag)
            const atMax = form.mood_tags.length >= 3 && !active
            return (
              <button key={tag} type="button" onClick={() => !atMax && toggleTag('mood_tags', tag, 3)}
                style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border)'}`, background: active ? 'var(--accent-primary)' : 'none', color: active ? 'white' : 'var(--text-muted)', cursor: atMax ? 'not-allowed' : 'pointer', opacity: atMax ? 0.4 : 1 }}>
                {tag}
              </button>
            )
          })}
        </div>
      </div>

      {/* Coach Categories */}
      <div style={s.field}>
        <label style={s.label}>Escape Coach Categories <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>— optional · up to 2</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginTop: '6px' }}>
          {COACH_CATEGORIES.map(cat => {
            const active = form.coach_categories.includes(cat)
            const atMax = form.coach_categories.length >= 2 && !active
            return (
              <button key={cat} type="button" onClick={() => !atMax && toggleTag('coach_categories', cat, 2)}
                style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', border: `1px solid ${active ? 'var(--accent-secondary)' : 'var(--border)'}`, background: active ? 'var(--accent-secondary)' : 'none', color: active ? 'white' : 'var(--text-muted)', cursor: atMax ? 'not-allowed' : 'pointer', opacity: atMax ? 0.4 : 1 }}>
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button style={s.btnSave} onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : clip?.id ? 'Update Clip' : 'Save Clip'}</button>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminAudioClips() {
  const [clips, setClips]         = useState<AudioClip[]>([])
  const [coaches, setCoaches]     = useState<EscapeCoach[]>([])
  const [loading, setLoading]     = useState(true)
  const [showNew, setShowNew]     = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const loadAll = useCallback(async () => {
    const [{ data: clipsData }, { data: coachesData }] = await Promise.all([
      supabase.from('audio_clips').select('*').order('display_order').order('created_at', { ascending: false }),
      supabase.from('escape_coaches').select('id, name, category').order('display_order'),
    ])
    setClips(clipsData || [])
    setCoaches(coachesData || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleDelete = async () => {
    if (!confirmDelete) return
    await supabase.from('audio_clips').delete().eq('id', confirmDelete.id)
    setClips(prev => prev.filter(c => c.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const togglePlay = (clip: AudioClip) => {
    if (!clip.cloudinary_url) return
    if (playingId === clip.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) audioRef.current.pause()
      audioRef.current = new Audio(clip.cloudinary_url)
      audioRef.current.play()
      audioRef.current.onended = () => setPlayingId(null)
      setPlayingId(clip.id)
    }
  }

  const statusColor = (s: string) => s === 'published' ? 'green' : s === 'private' ? 'blue' : 'gray'
  const clipTypeLabel = (t: string) => CLIP_TYPES.find(c => c.value === t)?.label || t
  const coachName = (id?: string | null) => coaches.find(c => c.id === id)?.name || null

  const filteredClips = filterType === 'all' ? clips : clips.filter(c => c.clip_type === filterType)
  const availableTypes = ['all', ...Array.from(new Set(clips.map(c => c.clip_type)))]

  if (loading) return (
    <div style={{ ...s.page, paddingTop: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
  )

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Audio Clips</h1>
      <p style={s.subtitle}>Affirmations, meditations, soundbites, reflections, prayers, breathwork and visualizations for Escape Coach playlists.</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' as const, alignItems: 'center' }}>
        <button style={s.btn} onClick={() => { setShowNew(true); setEditingId(null) }}>+ New Clip</button>
        <a href="/admin/escape-coaches" style={{ ...s.btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>← Manage Coaches</a>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, marginBottom: '24px' }}>
        {availableTypes.map(type => (
          <button key={type} onClick={() => setFilterType(type)}
            style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '12px', border: 'none', cursor: 'pointer', background: filterType === type ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: filterType === type ? 'white' : 'var(--text-muted)', fontWeight: filterType === type ? '600' : '400' }}>
            {type === 'all' ? `All (${clips.length})` : `${clipTypeLabel(type)} (${clips.filter(c => c.clip_type === type).length})`}
          </button>
        ))}
      </div>

      {showNew && (
        <ClipForm coaches={coaches} onSave={() => { setShowNew(false); loadAll() }} onCancel={() => setShowNew(false)} />
      )}

      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {filterType === 'all' ? 'All Clips' : clipTypeLabel(filterType)}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{filteredClips.length} clips</div>
        </div>

        {confirmDelete && (
          <div style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.3)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', fontSize: '14px', color: '#dc3c3c' }}>
            <div style={{ marginBottom: '10px' }}>⚠️ Delete <strong>"{confirmDelete.title}"</strong>? This cannot be undone.</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={s.btnSmDanger} onClick={handleDelete}>Yes, delete</button>
              <button style={s.btnSmSecondary} onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        )}

        {filteredClips.length === 0 && !showNew && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎙</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>No clips yet</div>
            <div style={{ fontSize: '14px', marginBottom: '20px' }}>Upload your first audio clip to get started.</div>
            <button style={s.btn} onClick={() => setShowNew(true)}>+ New Clip</button>
          </div>
        )}

        {filteredClips.map(clip => (
          <div key={clip.id}>
            {editingId === clip.id ? (
              <ClipForm clip={clip} coaches={coaches} onSave={() => { setEditingId(null); loadAll() }} onCancel={() => setEditingId(null)} />
            ) : (
              <div style={s.manageRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  {/* Play button */}
                  <button onClick={() => togglePlay(clip)}
                    style={{ width: '34px', height: '34px', borderRadius: '50%', background: playingId === clip.id ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: playingId === clip.id ? 'white' : 'var(--text-muted)', border: '1px solid var(--border)', cursor: clip.cloudinary_url ? 'pointer' : 'not-allowed', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: clip.cloudinary_url ? 1 : 0.4 }}>
                    {playingId === clip.id ? '⏸' : '▶'}
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <div style={s.manageLabel}>{clip.title}</div>
                    <div style={s.manageMeta}>
                      {clipTypeLabel(clip.clip_type)}
                      {clip.speaker ? ` · ${clip.speaker}` : ''}
                      {coachName(clip.coach_id) ? ` · ${coachName(clip.coach_id)}` : ''}
                      {clip.duration ? ` · ${clip.duration}` : ''}
                      {clip.theme ? ` · ${clip.theme}` : ''}
                      {clip.mood_tags?.length > 0 ? ` · 🏷 ${clip.mood_tags.join(', ')}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
                  <span style={s.badge(statusColor(clip.status))}>{clip.status}</span>
                  <button style={s.btnSmSecondary} onClick={() => { setEditingId(clip.id); setShowNew(false) }}>Edit</button>
                  <button style={s.btnSmDanger} onClick={() => setConfirmDelete({ id: clip.id, title: clip.title })}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
