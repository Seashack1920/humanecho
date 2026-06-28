'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type TeamMember = {
  id: string
  name: string
  title: string
  video_url: string | null
  section: string
  display_order: number
  is_active: boolean
}

const s = {
  page:         { maxWidth: '860px', margin: '0 auto', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' },
  h1:           { fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' },
  subtitle:     { fontSize: '14px', color: 'var(--text-muted)', marginBottom: '40px' },
  topRow:       { display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' as const, alignItems: 'center' },
  card:         { background: 'var(--bg-secondary)', borderRadius: '16px', padding: '28px', marginBottom: '24px', border: '1px solid var(--border)' },
  label:        { display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' },
  input:        { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  select:       { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  row:          { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field:        { marginBottom: '16px' },
  btn:          { padding: '12px 28px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '500', border: 'none', cursor: 'pointer' },
  btnSecondary: { padding: '12px 28px', borderRadius: '8px', background: 'none', color: 'var(--text-secondary)', fontSize: '15px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnSmall:     { padding: '6px 14px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', border: 'none', cursor: 'pointer' },
  btnEdit:      { padding: '8px 16px', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer', marginRight: '8px' },
  btnSave:      { padding: '8px 16px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', border: 'none', cursor: 'pointer', marginRight: '8px' },
  btnCancel:    { padding: '8px 16px', borderRadius: '6px', background: 'none', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnDanger:    { padding: '8px 16px', borderRadius: '6px', background: 'rgba(220,60,60,0.1)', color: '#dc3c3c', fontSize: '13px', border: '1px solid rgba(220,60,60,0.3)', cursor: 'pointer' },
  btnGhost:     { padding: '6px 12px', borderRadius: '6px', background: 'none', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer' },
  sectionTitle: { fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' },
  divider:      { height: '1px', background: 'var(--border)', margin: '20px 0' },
  manageRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: '8px' },
  manageLabel:  { fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' },
  manageMeta:   { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  manageBtn:    (active: boolean) => ({ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: '1px solid var(--accent-secondary)', cursor: 'pointer', background: active ? 'var(--accent-secondary)' : 'transparent', color: active ? 'white' : 'var(--accent-secondary)' }),
}

function VideoUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('video/')) { setError('Please select a video file'); return }
    if (file.size > 500 * 1024 * 1024)  { setError('Video must be under 500MB'); return }
    setUploading(true); setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'humanecho_upload')
      formData.append('folder', 'team/videos')
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
      <label style={s.label}>Portrait Video (9:16)</label>

      {value && (
        <div style={{ marginBottom: '10px' }}>
          <video src={value} controls style={{ maxHeight: '200px', borderRadius: '8px', border: '1px solid var(--border)', aspectRatio: '9/16', objectFit: 'cover' }} />
          <button onClick={() => onChange('')} style={{ ...s.btnDanger, marginTop: '6px', fontSize: '12px', padding: '4px 10px' }}>Remove video</button>
        </div>
      )}

      <label style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '20px', borderRadius: '8px', border: '2px dashed var(--border)', background: 'var(--bg-card)', cursor: uploading ? 'not-allowed' : 'pointer', gap: '6px' }}
        onMouseEnter={e => !uploading && (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <input type="file" accept="video/*" style={{ display: 'none' }} disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        <div style={{ fontSize: '24px' }}>{uploading ? '⏳' : '🎬'}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' as const }}>
          {uploading ? 'Uploading — this may take a moment...' : value ? 'Click to replace video' : 'Click to upload portrait video'}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>9:16 portrait format · MP4, MOV · Max 500MB</div>
      </label>
      {error && <div style={{ fontSize: '12px', color: '#dc3c3c', marginTop: '6px' }}>{error}</div>}
    </div>
  )
}

function MemberForm({ member, onSave, onCancel, nextOrder }: {
  member?: TeamMember | null
  onSave: () => void
  onCancel: () => void
  nextOrder: number
}) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const [form, setForm] = useState({
    name:          member?.name || '',
    title:         member?.title || '',
    section:       member?.section || 'executives',
    display_order: member?.display_order ?? nextOrder,
    is_active:     member?.is_active ?? true,
    video_url:     member?.video_url || '',
  })

  const handleSave = async () => {
    if (!form.name)  return setMessage({ type: 'error', text: 'Name is required' })
    if (!form.title) return setMessage({ type: 'error', text: 'Title is required' })
    setLoading(true); setMessage(null)
    try {
      const payload = {
        name:          form.name,
        title:         form.title,
        section:       form.section,
        display_order: form.display_order,
        is_active:     form.is_active,
        video_url:     form.video_url || null,
      }
      if (member?.id) {
        const { error } = await supabase.from('team_members').update(payload).eq('id', member.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('team_members').insert(payload)
        if (error) throw error
      }
      setMessage({ type: 'success', text: `✓ ${form.name} saved!` })
      setLoading(false)
      setTimeout(() => onSave(), 1200)
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
      setLoading(false)
    }
  }

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={s.sectionTitle}>{member?.id ? 'Edit Member' : 'New Team Member'}</div>
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
          <label style={s.label}>Title *</label>
          <input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Head of Music" />
        </div>
      </div>

      <div style={s.row}>
        <div>
          <label style={s.label}>Section</label>
          <select style={s.select} value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}>
            <option value="executives">Leadership / Executives</option>
            <option value="djs">DJs</option>
            <option value="coaches">Escape Coaches</option>
          </select>
        </div>
        <div>
          <label style={s.label}>Display Order</label>
          <input type="number" style={s.input} value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
        </div>
      </div>

      <div style={{ ...s.field, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
        <label style={{ ...s.label, marginBottom: 0, cursor: 'pointer' }}>Active (visible on team page)</label>
      </div>

      <div style={s.field}>
        <VideoUploader value={form.video_url} onChange={url => setForm(f => ({ ...f, video_url: url }))} />
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
        <button style={s.btn} onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : member?.id ? 'Save Changes' : 'Add Member'}
        </button>
        <button style={s.btnSecondary} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

export default function AdminTeam() {
  const [mode, setMode]                   = useState<'list' | 'new' | 'edit'>('list')
  const [members, setMembers]             = useState<TeamMember[]>([])
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [loading, setLoading]             = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
        if (data?.role !== 'admin') window.location.href = '/dashboard'
      })
    })
  }, [])

  const loadAll = useCallback(async () => {
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .order('section')
      .order('display_order')
    setMembers(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleDelete = async () => {
    if (!confirmDelete) return
    await supabase.from('team_members').delete().eq('id', confirmDelete.id)
    setMembers(prev => prev.filter(m => m.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const executives = members.filter(m => m.section === 'executives')
  const djs        = members.filter(m => m.section === 'djs')
  const coaches    = members.filter(m => m.section === 'coaches')
  const nextOrder  = members.length > 0 ? Math.max(...members.map(m => m.display_order)) + 1 : 1

  if (loading) return (
    <div style={{ ...s.page, paddingTop: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
  )

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Team</h1>
      <p style={s.subtitle}>Manage team members and their portrait videos</p>

      <div style={s.topRow}>
        <button style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: mode === 'new' ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: mode === 'new' ? 'white' : 'var(--text-muted)' }}
          onClick={() => { setMode('new'); setEditingMember(null) }}>
          + Add Member
        </button>
        <button style={s.manageBtn(mode === 'list')} onClick={() => setMode('list')}>All Members</button>
        <div style={{ flex: 1 }} />
        <a href="/team" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>View team page →</a>
      </div>

      {(mode === 'new' || mode === 'edit') && (
        <MemberForm
          member={editingMember}
          nextOrder={nextOrder}
          onSave={() => { loadAll(); setMode('list') }}
          onCancel={() => setMode('list')}
        />
      )}

      {mode === 'list' && (
        <div style={s.card}>
          {confirmDelete && (
            <div style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.3)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', fontSize: '14px', color: '#dc3c3c' }}>
              <div style={{ marginBottom: '12px' }}>⚠️ Remove <strong>{confirmDelete.name}</strong> from the team? This cannot be undone.</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={s.btnDanger} onClick={handleDelete}>Yes, remove</button>
                <button style={s.btnCancel} onClick={() => setConfirmDelete(null)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Executives */}
          {executives.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '12px' }}>
                Leadership / Executives ({executives.length})
              </div>
              {executives.map(member => (
                <div key={member.id} style={s.manageRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    {member.video_url ? (
                      <video src={member.video_url} style={{ width: '36px', height: '64px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '36px', height: '64px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🎬</div>
                    )}
                    <div>
                      <div style={{ ...s.manageLabel, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {member.name}
                        {!member.is_active && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(150,150,150,0.15)', color: 'var(--text-muted)' }}>Hidden</span>}
                      </div>
                      <div style={s.manageMeta}>{member.title} · Order: {member.display_order}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <button style={s.btnEdit} onClick={() => { setEditingMember(member); setMode('edit') }}>Edit</button>
                    <button style={s.btnDanger} onClick={() => setConfirmDelete({ id: member.id, name: member.name })}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DJs */}
          {djs.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '12px' }}>
                DJs ({djs.length})
              </div>
              {djs.map(member => (
                <div key={member.id} style={s.manageRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    {member.video_url ? (
                      <video src={member.video_url} style={{ width: '36px', height: '64px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '36px', height: '64px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🎬</div>
                    )}
                    <div>
                      <div style={{ ...s.manageLabel, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {member.name}
                        {!member.is_active && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(150,150,150,0.15)', color: 'var(--text-muted)' }}>Hidden</span>}
                      </div>
                      <div style={s.manageMeta}>{member.title} · Order: {member.display_order}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <button style={s.btnEdit} onClick={() => { setEditingMember(member); setMode('edit') }}>Edit</button>
                    <button style={s.btnDanger} onClick={() => setConfirmDelete({ id: member.id, name: member.name })}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
{/* Escape Coaches */}
          {coaches.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '12px' }}>
                Escape Coaches ({coaches.length})
              </div>
              {coaches.map(member => (
                <div key={member.id} style={s.manageRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    {member.video_url ? (
                      <video src={member.video_url} style={{ width: '36px', height: '64px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '36px', height: '64px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🎬</div>
                    )}
                    <div>
                      <div style={{ ...s.manageLabel, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {member.name}
                        {!member.is_active && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(150,150,150,0.15)', color: 'var(--text-muted)' }}>Hidden</span>}
                      </div>
                      <div style={s.manageMeta}>{member.title} · Order: {member.display_order}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <button style={s.btnEdit} onClick={() => { setEditingMember(member); setMode('edit') }}>Edit</button>
                    <button style={s.btnDanger} onClick={() => setConfirmDelete({ id: member.id, name: member.name })}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {members.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎬</div>
              <div style={{ fontSize: '15px', marginBottom: '16px' }}>No team members yet.</div>
              <button style={s.btn} onClick={() => setMode('new')}>Add your first team member</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
