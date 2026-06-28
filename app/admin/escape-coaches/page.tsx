'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type EscapeCoach = {
  id: string
  name: string
  category: string
  tagline: string | null
  description: string | null
  avatar_url: string | null
  avatar_video_url: string | null
  mood_tags: string[]
  display_order: number
  is_active: boolean
  created_at: string
}

const COACH_CATEGORIES = [
  { value: 'gym',           label: '💪 Gym / Workout' },
  { value: 'victory',       label: '🏆 Victory / Achievement' },
  { value: 'romance',       label: '❤️ Romance / Connection' },
  { value: 'workplace',     label: '💼 Workplace Focus' },
  { value: 'sleep',         label: '🌙 Sleep / Wind Down' },
  { value: 'spiritual',     label: '✨ Spiritual / Reflection' },
  { value: 'party',         label: '🎉 Party / Celebration' },
  { value: 'road',          label: '🚗 Road Companion' },
  { value: 'mental-health', label: '🧠 Mental Health' },
  { value: 'housekeeping',  label: '🏠 Housekeeping' },
]

const MOOD_TAGS = ['workout', 'victory', 'romance', 'focus', 'sleep', 'spiritual', 'party', 'chill', 'motivation', 'reflection']

const s = {
  page:         { maxWidth: '900px', margin: '0 auto', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' },
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
  manageRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: '8px' },
  manageLabel:  { fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' },
  manageMeta:   { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  editCard:     { background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '12px', padding: '20px', marginBottom: '8px' },
  badge:        (active: boolean) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500', background: active ? 'rgba(43,180,100,0.15)' : 'rgba(150,150,150,0.15)', color: active ? '#2bb464' : 'var(--text-muted)' }),
  divider:      { height: '1px', background: 'var(--border)', margin: '16px 0' },
}

function ImageUploader({ value, onChange, label = 'Image', folder = 'coaches' }: {
  value: string; onChange: (url: string) => void; label?: string; folder?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')

  const handleFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) { setError('Image must be under 20MB'); return }
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
        <div style={{ marginBottom: '8px', position: 'relative', display: 'inline-block' }}>
          <img src={value} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
          <button onClick={() => onChange('')} style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', color: 'white', fontSize: '12px' }}>×</button>
        </div>
      )}
      <input type="file" style={s.fileInput} disabled={uploading}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      {uploading && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>Uploading...</div>}
      {error && <div style={{ fontSize: '12px', color: '#dc3c3c', marginTop: '4px' }}>{error}</div>}
    </div>
  )
}

function CoachForm({ coach, onSave, onCancel }: {
  coach?: EscapeCoach | null
  onSave: () => void
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const [form, setForm] = useState({
    name:          coach?.name || '',
    category:      coach?.category || 'gym',
    tagline:       coach?.tagline || '',
    description:   coach?.description || '',
    avatar_url:    coach?.avatar_url || '',
    mood_tags:     coach?.mood_tags || [] as string[],
    display_order: coach?.display_order ?? 0,
    is_active:     coach?.is_active ?? true,
  })

  const handleSave = async () => {
    if (!form.name) return setMessage({ type: 'error', text: 'Name is required' })
    setLoading(true); setMessage(null)
    try {
      const payload = {
        name: form.name, category: form.category, tagline: form.tagline || null,
        description: form.description || null, avatar_url: form.avatar_url || null,
        mood_tags: form.mood_tags.length > 0 ? form.mood_tags : [],
        display_order: form.display_order, is_active: form.is_active,
      }
      let error
      if (coach?.id) {
        ;({ error } = await supabase.from('escape_coaches').update(payload).eq('id', coach.id))
      } else {
        ;({ error } = await supabase.from('escape_coaches').insert(payload))
      }
      if (error) throw error
      setMessage({ type: 'success', text: `✓ ${form.name} ${coach?.id ? 'updated' : 'created'}!` })
      setTimeout(onSave, 1000)
    } catch (err) { setMessage({ type: 'error', text: (err as Error).message }) }
    setLoading(false)
  }

  const toggleMood = (tag: string) => {
    setForm(f => ({ ...f, mood_tags: f.mood_tags.includes(tag) ? f.mood_tags.filter(t => t !== tag) : [...f.mood_tags, tag] }))
  }

  return (
    <div style={s.editCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {coach?.id ? `Editing: ${coach.name}` : 'New Escape Coach'}
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
          <label style={s.label}>Name *</label>
          <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Coach Maya" />
        </div>
        <div>
          <label style={s.label}>Category *</label>
          <select style={s.select} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {COACH_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div style={s.field}>
        <label style={s.label}>Tagline <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>— one sentence shown on the coach card</span></label>
        <input style={s.input} value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Your workout, your soundtrack, your victory." />
      </div>

      <div style={s.field}>
        <label style={s.label}>Description <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>— shown on the coach's full page</span></label>
        <textarea style={s.textarea} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Tell listeners what this coach's escape is all about..." />
      </div>

      <div style={s.row}>
        <div>
          <ImageUploader label="Avatar Image" value={form.avatar_url} onChange={url => setForm(f => ({ ...f, avatar_url: url }))} folder="coaches/avatars" />
        </div>
        <div>
          <label style={s.label}>Display Order</label>
          <input style={s.input} type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} placeholder="1" />
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              Active — show on music page
            </label>
          </div>
        </div>
      </div>

      <div style={s.field}>
        <label style={s.label}>Associated Moods <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>— used to match tracks to this coach</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginTop: '6px' }}>
          {MOOD_TAGS.map(tag => {
            const active = form.mood_tags.includes(tag)
            return (
              <button key={tag} type="button" onClick={() => toggleMood(tag)}
                style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border)'}`, background: active ? 'var(--accent-primary)' : 'none', color: active ? 'white' : 'var(--text-muted)', cursor: 'pointer' }}>
                {tag}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button style={s.btnSave} onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : coach?.id ? 'Update Coach' : 'Create Coach'}</button>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

export default function AdminEscapeCoaches() {
  const [coaches, setCoaches]       = useState<EscapeCoach[]>([])
  const [loading, setLoading]       = useState(true)
  const [showNew, setShowNew]       = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)

  const loadAll = useCallback(async () => {
    const { data } = await supabase.from('escape_coaches').select('*').order('display_order')
    setCoaches(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleDelete = async () => {
    if (!confirmDelete) return
    await supabase.from('escape_coaches').delete().eq('id', confirmDelete.id)
    setCoaches(prev => prev.filter(c => c.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const toggleActive = async (coach: EscapeCoach) => {
    await supabase.from('escape_coaches').update({ is_active: !coach.is_active }).eq('id', coach.id)
    setCoaches(prev => prev.map(c => c.id === coach.id ? { ...c, is_active: !c.is_active } : c))
  }

  const categoryLabel = (cat: string) => COACH_CATEGORIES.find(c => c.value === cat)?.label || cat

  if (loading) return (
    <div style={{ ...s.page, paddingTop: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
  )

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Escape Coaches</h1>
      <p style={s.subtitle}>Create and manage lifestyle coach avatars for the music page playlist system.</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
        <button style={s.btn} onClick={() => { setShowNew(true); setEditingId(null) }}>+ New Coach</button>
        <a href="/admin/audio-clips" style={{ ...s.btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Manage Audio Clips →</a>
      </div>

      {showNew && (
        <CoachForm onSave={() => { setShowNew(false); loadAll() }} onCancel={() => setShowNew(false)} />
      )}

      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>All Coaches</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{coaches.length} total</div>
        </div>

        {confirmDelete && (
          <div style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.3)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', fontSize: '14px', color: '#dc3c3c' }}>
            <div style={{ marginBottom: '10px' }}>⚠️ Delete <strong>"{confirmDelete.name}"</strong>? This cannot be undone.</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={s.btnSmDanger} onClick={handleDelete}>Yes, delete</button>
              <button style={s.btnSmSecondary} onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        )}

        {coaches.length === 0 && !showNew && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎭</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>No coaches yet</div>
            <div style={{ fontSize: '14px', marginBottom: '20px' }}>Create your first Escape Coach to get started.</div>
            <button style={s.btn} onClick={() => setShowNew(true)}>+ New Coach</button>
          </div>
        )}

        {coaches.map(coach => (
          <div key={coach.id}>
            {editingId === coach.id ? (
              <CoachForm coach={coach} onSave={() => { setEditingId(null); loadAll() }} onCancel={() => setEditingId(null)} />
            ) : (
              <div style={s.manageRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                  {coach.avatar_url ? (
                    <img src={coach.avatar_url} alt={coach.name} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                      {COACH_CATEGORIES.find(c => c.value === coach.category)?.label.split(' ')[0] || '🎭'}
                    </div>
                  )}
                  <div>
                    <div style={s.manageLabel}>{coach.name}</div>
                    <div style={s.manageMeta}>
                      {categoryLabel(coach.category)}
                      {coach.tagline ? ` · "${coach.tagline.slice(0, 50)}${coach.tagline.length > 50 ? '…' : ''}"` : ''}
                      {coach.mood_tags?.length > 0 ? ` · ${coach.mood_tags.join(', ')}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
                  <span style={s.badge(coach.is_active)}>{coach.is_active ? 'active' : 'inactive'}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#{coach.display_order}</span>
                  <button style={s.btnSmSecondary} onClick={() => toggleActive(coach)}>{coach.is_active ? 'Deactivate' : 'Activate'}</button>
                  <button style={s.btnSmSecondary} onClick={() => { setEditingId(coach.id); setShowNew(false) }}>Edit</button>
                  <button style={s.btnSmDanger} onClick={() => setConfirmDelete({ id: coach.id, name: coach.name })}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
