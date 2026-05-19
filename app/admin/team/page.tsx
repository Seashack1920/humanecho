'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

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
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
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

type Executive = {
  id: string
  name: string
  title: string
  department: string | null
  bio: string | null
  photo_url: string | null
  intro_video_url: string | null
  is_featured: boolean
  featured_message: string | null
  display_order: number
}

const s = {
  page:       { maxWidth: '800px', margin: '0 auto', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' },
  header:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' },
  h1:         { fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' },
  subtitle:   { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' },
  backBtn:    { padding: '8px 16px', borderRadius: '8px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' },
  card:       { background: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', marginBottom: '16px', border: '1px solid var(--border)' },
  execRow:    { display: 'flex', alignItems: 'center', gap: '16px' },
  photo:      { width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' as const, border: '2px solid var(--border)', flexShrink: 0 },
  photoPlaceholder: { width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-card)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 },
  name:       { fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' },
  title:      { fontSize: '13px', color: 'var(--accent-primary)', marginTop: '2px' },
  dept:       { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  actions:    { display: 'flex', gap: '8px', marginLeft: 'auto', flexShrink: 0 },
  btn:        { padding: '9px 20px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer' },
  btnSm:      { padding: '6px 14px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '12px', border: 'none', cursor: 'pointer' },
  btnSmSecondary: { padding: '6px 14px', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-muted)', fontSize: '12px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnSmDanger: { padding: '6px 14px', borderRadius: '6px', background: 'rgba(220,60,60,0.1)', color: '#dc3c3c', fontSize: '12px', border: '1px solid rgba(220,60,60,0.3)', cursor: 'pointer' },
  btnGold:    { padding: '6px 14px', borderRadius: '6px', background: 'var(--accent-secondary)', color: 'white', fontSize: '12px', border: 'none', cursor: 'pointer' },
  label:      { display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px', marginTop: '12px' },
  input:      { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  textarea:   { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const, minHeight: '80px' },
  fileInput:  { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px dashed var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' as const },
  row:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  divider:    { height: '1px', background: 'var(--border)', margin: '20px 0' },
  checkbox:   { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '12px' },
  featuredBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', background: 'rgba(43,122,143,0.12)', color: 'var(--accent-primary)', marginLeft: '8px' },
  progress:   { height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden', marginTop: '8px' },
  progressBar: (p: number) => ({ height: '100%', width: `${p}%`, background: 'var(--accent-primary)', borderRadius: '3px', transition: 'width 0.2s ease' }),
  confirmBox: { background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.3)', borderRadius: '8px', padding: '12px 16px', marginTop: '12px', fontSize: '13px', color: '#dc3c3c' },
  editCard:   { background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '12px', padding: '20px', marginTop: '16px' },
  msg:        (type: string) => ({ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', background: type === 'success' ? 'rgba(43,122,143,0.1)' : 'rgba(220,60,60,0.1)', border: `1px solid ${type === 'success' ? 'var(--accent-primary)' : '#dc3c3c'}`, color: type === 'success' ? 'var(--accent-primary)' : '#dc3c3c', fontSize: '14px' }),
}

const emptyExec = { name: '', title: '', department: '', bio: '', featured_message: '', display_order: 0, is_featured: false }

export default function AdminTeam() {
  const router = useRouter()
  const [executives, setExecutives] = useState<Executive[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [message, setMessage]       = useState<{ type: string; text: string } | null>(null)
  const [progress, setProgress]     = useState<number | null>(null)

  // Add new exec
  const [showAddForm, setShowAddForm] = useState(false)
  const [newExec, setNewExec]         = useState(emptyExec)
  const [photoFile, setPhotoFile]     = useState<File | null>(null)
  const [videoFile, setVideoFile]     = useState<File | null>(null)

  // Edit existing
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editExec, setEditExec]     = useState<Partial<Executive>>({})
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null)

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)

  const slugify = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  useEffect(() => {
    // Auth check
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
        if (data?.role !== 'admin') router.push('/dashboard')
      })
    })
    loadExecutives()
  }, [])

  const loadExecutives = async () => {
    const { data } = await supabase.from('executives').select('*').order('display_order')
    if (data) setExecutives(data)
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newExec.name || !newExec.title) return setMessage({ type: 'error', text: 'Name and title are required.' })
    setSaving(true); setMessage(null); setProgress(null)
    try {
      const folder = `executives/${slugify(newExec.name)}`
      const photo = photoFile ? await uploadToCloudinary(photoFile, folder, 'auto', p => setProgress(p)) : null
      setProgress(null)
      const video = videoFile ? await uploadToCloudinary(videoFile, folder, 'auto', p => setProgress(p)) : null
      setProgress(null)

      const { data, error } = await supabase.from('executives').insert({
        name: newExec.name,
        title: newExec.title,
        department: newExec.department || null,
        bio: newExec.bio || null,
        photo_url: photo?.url ?? null,
        cloudinary_public_id: photo?.public_id ?? null,
        intro_video_url: video?.url ?? null,
        video_cloudinary_public_id: video?.public_id ?? null,
        is_featured: newExec.is_featured,
        featured_message: newExec.featured_message || null,
        display_order: newExec.display_order || 0,
      }).select().single()

      if (error) throw error
      setExecutives(prev => [...prev, data])
      setNewExec(emptyExec)
      setPhotoFile(null)
      setVideoFile(null)
      setShowAddForm(false)
      setMessage({ type: 'success', text: `${data.name} added to the team!` })
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    }
    setSaving(false)
  }

  const handleSaveEdit = async (execId: string) => {
    setSaving(true); setMessage(null); setProgress(null)
    try {
      const exec = executives.find(e => e.id === execId)
      if (!exec) throw new Error('Executive not found')
      const folder = `executives/${slugify(exec.name)}`
      let updates: any = { ...editExec }

      if (editPhotoFile) {
        const photo = await uploadToCloudinary(editPhotoFile, folder, 'auto', p => setProgress(p))
        updates.photo_url = photo.url
        updates.cloudinary_public_id = photo.public_id
        setProgress(null)
      }
      if (editVideoFile) {
        const video = await uploadToCloudinary(editVideoFile, folder, 'auto', p => setProgress(p))
        updates.intro_video_url = video.url
        updates.video_cloudinary_public_id = video.public_id
        setProgress(null)
      }

      const { error } = await supabase.from('executives').update(updates).eq('id', execId)
      if (error) throw error

      setExecutives(prev => prev.map(e => e.id === execId ? { ...e, ...updates } : e))
      setEditingId(null)
      setEditExec({})
      setEditPhotoFile(null)
      setEditVideoFile(null)
      setMessage({ type: 'success', text: 'Executive updated.' })
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    const { error } = await supabase.from('executives').delete().eq('id', confirmDelete.id)
    if (!error) {
      setExecutives(prev => prev.filter(e => e.id !== confirmDelete.id))
      setMessage({ type: 'success', text: `${confirmDelete.name} removed.` })
    }
    setConfirmDelete(null)
  }

  const handleFeature = async (exec: Executive) => {
    // Unfeature all, then feature this one
    await supabase.from('executives').update({ is_featured: false }).neq('id', 'none')
    await supabase.from('executives').update({ is_featured: true }).eq('id', exec.id)
    setExecutives(prev => prev.map(e => ({ ...e, is_featured: e.id === exec.id })))
    setMessage({ type: 'success', text: `${exec.name} is now featured on the homepage.` })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={s.page}>
        <div style={s.header}>
          <div>
            <h1 style={s.h1}>Executive Team</h1>
            <div style={s.subtitle}>Manage your AI executive roster — Human Echo</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={s.backBtn} onClick={() => router.push('/admin/upload')}>← Upload Portal</button>
            <button style={s.btn} onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? '✕ Cancel' : '+ Add Executive'}
            </button>
          </div>
        </div>

        {message && <div style={s.msg(message.type)}>{message.text}</div>}

        {/* Progress bar */}
        {progress !== null && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Uploading... {progress}%</div>
            <div style={s.progress}><div style={s.progressBar(progress)} /></div>
          </div>
        )}

        {/* Add form */}
        {showAddForm && (
          <div style={s.card}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>New Executive</div>
            <div style={s.row}>
              <div>
                <label style={s.label}>Name *</label>
                <input style={s.input} value={newExec.name} onChange={e => setNewExec(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Morgan Lee" />
              </div>
              <div>
                <label style={s.label}>Title *</label>
                <input style={s.input} value={newExec.title} onChange={e => setNewExec(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Head of Artist Relations" />
              </div>
            </div>
            <div style={s.row}>
              <div>
                <label style={s.label}>Department</label>
                <input style={s.input} value={newExec.department} onChange={e => setNewExec(p => ({ ...p, department: e.target.value }))} placeholder="e.g. A&R, Marketing, Operations" />
              </div>
              <div>
                <label style={s.label}>Display Order</label>
                <input style={s.input} type="number" value={newExec.display_order} onChange={e => setNewExec(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} placeholder="0" />
              </div>
            </div>
            <label style={s.label}>Bio</label>
            <textarea style={s.textarea} value={newExec.bio} onChange={e => setNewExec(p => ({ ...p, bio: e.target.value }))} placeholder="Brief bio in their voice..." />
            <label style={s.label}>Featured Message (shown on homepage when featured)</label>
            <textarea style={s.textarea} value={newExec.featured_message} onChange={e => setNewExec(p => ({ ...p, featured_message: e.target.value }))} placeholder="e.g. 'We're thrilled to announce our first music video contest...'" />
            <div style={s.row}>
              <div>
                <label style={s.label}>Avatar Photo</label>
                <input type="file" accept="image/*" style={s.fileInput} onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
                {photoFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {photoFile.name}</div>}
              </div>
              <div>
                <label style={s.label}>Intro Video (optional)</label>
                <input type="file" accept="video/*" style={s.fileInput} onChange={e => setVideoFile(e.target.files?.[0] || null)} />
                {videoFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {videoFile.name}</div>}
              </div>
            </div>
            <label style={s.checkbox}>
              <input type="checkbox" checked={newExec.is_featured} onChange={e => setNewExec(p => ({ ...p, is_featured: e.target.checked }))} />
              ⭐ Feature this executive on the homepage
            </label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button style={s.btn} onClick={handleAdd} disabled={saving}>{saving ? 'Saving...' : 'Add Executive'}</button>
              <button style={s.btnSmSecondary} onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Executive list */}
        {executives.length === 0 && !showAddForm && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', background: 'var(--bg-secondary)', borderRadius: '14px', border: '1px solid var(--border)' }}>
            No executives yet. Add your first AI executive above.
          </div>
        )}

        {executives.map(exec => (
          <div key={exec.id} style={s.card}>
            <div style={s.execRow}>
              {exec.photo_url
                ? <img src={exec.photo_url} alt={exec.name} style={s.photo} />
                : <div style={s.photoPlaceholder}>🤖</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.name}>
                  {exec.name}
                  {exec.is_featured && <span style={s.featuredBadge}>⭐ Featured</span>}
                </div>
                <div style={s.title}>{exec.title}</div>
                {exec.department && <div style={s.dept}>{exec.department}</div>}
                {exec.intro_video_url && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>🎬 Intro video uploaded</div>}
              </div>
              <div style={s.actions}>
                {!exec.is_featured && (
                  <button style={s.btnGold} onClick={() => handleFeature(exec)}>⭐ Feature</button>
                )}
                <button style={s.btnSmSecondary} onClick={() => { setEditingId(exec.id); setEditExec({}) }}>Edit</button>
                <button style={s.btnSmDanger} onClick={() => setConfirmDelete({ id: exec.id, name: exec.name })}>Delete</button>
              </div>
            </div>

            {/* Bio preview */}
            {exec.bio && editingId !== exec.id && (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: '1.5', paddingLeft: '72px' }}>
                {exec.bio.substring(0, 160)}{exec.bio.length > 160 ? '…' : ''}
              </div>
            )}

            {/* Featured message preview */}
            {exec.featured_message && exec.is_featured && editingId !== exec.id && (
              <div style={{ fontSize: '13px', color: 'var(--accent-primary)', marginTop: '8px', lineHeight: '1.5', paddingLeft: '72px', fontStyle: 'italic' }}>
                "{exec.featured_message.substring(0, 120)}{exec.featured_message.length > 120 ? '…' : ''}"
              </div>
            )}

            {/* Confirm delete */}
            {confirmDelete?.id === exec.id && (
              <div style={s.confirmBox}>
                <div style={{ marginBottom: '10px' }}>⚠️ Remove <strong>{exec.name}</strong> from the team? This cannot be undone.</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={s.btnSmDanger} onClick={handleDelete}>Yes, remove</button>
                  <button style={s.btnSmSecondary} onClick={() => setConfirmDelete(null)}>Cancel</button>
                </div>
              </div>
            )}

            {/* Edit form */}
            {editingId === exec.id && (
              <div style={s.editCard}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '14px' }}>Editing: {exec.name}</div>
                <div style={s.row}>
                  <div>
                    <label style={s.label}>Name</label>
                    <input style={s.input} value={editExec.name ?? exec.name} onChange={e => setEditExec(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={s.label}>Title</label>
                    <input style={s.input} value={editExec.title ?? exec.title} onChange={e => setEditExec(p => ({ ...p, title: e.target.value }))} />
                  </div>
                </div>
                <div style={s.row}>
                  <div>
                    <label style={s.label}>Department</label>
                    <input style={s.input} value={editExec.department ?? exec.department ?? ''} onChange={e => setEditExec(p => ({ ...p, department: e.target.value }))} />
                  </div>
                  <div>
                    <label style={s.label}>Display Order</label>
                    <input style={s.input} type="number" value={editExec.display_order ?? exec.display_order} onChange={e => setEditExec(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
                <label style={s.label}>Bio</label>
                <textarea style={s.textarea} value={editExec.bio ?? exec.bio ?? ''} onChange={e => setEditExec(p => ({ ...p, bio: e.target.value }))} />
                <label style={s.label}>Featured Message</label>
                <textarea style={s.textarea} value={editExec.featured_message ?? exec.featured_message ?? ''} onChange={e => setEditExec(p => ({ ...p, featured_message: e.target.value }))} />
                <div style={s.row}>
                  <div>
                    <label style={s.label}>Replace Photo (optional)</label>
                    <input type="file" accept="image/*" style={s.fileInput} onChange={e => setEditPhotoFile(e.target.files?.[0] || null)} />
                    {editPhotoFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {editPhotoFile.name}</div>}
                    {exec.photo_url && !editPhotoFile && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Current photo uploaded</div>}
                  </div>
                  <div>
                    <label style={s.label}>Replace Intro Video (optional)</label>
                    <input type="file" accept="video/*" style={s.fileInput} onChange={e => setEditVideoFile(e.target.files?.[0] || null)} />
                    {editVideoFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {editVideoFile.name}</div>}
                    {exec.intro_video_url && !editVideoFile && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Current video uploaded</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button style={s.btnSm} onClick={() => handleSaveEdit(exec.id)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                  <button style={s.btnSmSecondary} onClick={() => { setEditingId(null); setEditExec({}); setEditPhotoFile(null); setEditVideoFile(null) }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
