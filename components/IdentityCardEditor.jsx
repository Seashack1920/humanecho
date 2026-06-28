'use client'

/**
 * IdentityCardEditor — on the member's private /profile page (above playlists).
 *
 * Display + edit of the member's PUBLIC card:
 *   - photo: the member's PRIMARY identity photo (profiles.avatar_url) — uploaded
 *            HERE (this is the photo that travels everywhere the person appears).
 *            Playlist covers are SEPARATE art, not this.
 *   - blurb: profiles.artist_statement (~300)
 *   - up to 3 work links: profiles.work_links (jsonb [{label,url}])
 *   - "What's your cup of tea?": profiles.disciplines (jsonb) — any of
 *     Music / Literature / Film.
 *
 * Props: userId, avatarUrl (current photo), fullName, onPhotoChange (optional
 *   callback so the parent profile page can refresh its header avatar).
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const MAX_BLURB = 300
const MAX_LINKS = 3
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = 'humanecho_upload'
const TEAS = ['Music', 'Literature', 'Film']

export default function IdentityCardEditor({ userId, avatarUrl, fullName, onPhotoChange }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [statement, setStatement] = useState('')
  const [links, setLinks] = useState([])
  const [teas, setTeas] = useState([])
  const [name, setName] = useState(fullName || '')
  const [photo, setPhoto] = useState(avatarUrl || '')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { setPhoto(avatarUrl || '') }, [avatarUrl])

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('artist_statement, work_links, disciplines, avatar_url, full_name')
        .eq('id', userId)
        .maybeSingle()
      setStatement(data?.artist_statement || '')
      setLinks(Array.isArray(data?.work_links) ? data.work_links : [])
      setTeas(Array.isArray(data?.disciplines) ? data.disciplines : [])
      if (data?.full_name) setName(data.full_name)
      if (data?.avatar_url) setPhoto(data.avatar_url)
    } catch {}
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2400) }

  const addLink = () => { if (links.length < MAX_LINKS) setLinks(p => [...p, { label: '', url: '' }]) }
  const updateLink = (i, f, v) => setLinks(p => p.map((l, idx) => idx === i ? { ...l, [f]: v } : l))
  const removeLink = (i) => setLinks(p => p.filter((_, idx) => idx !== i))
  const toggleTea = (t) => setTeas(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('upload_preset', UPLOAD_PRESET)
      form.append('folder', 'members/avatars')
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: form })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const url = data.secure_url
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
      if (error) throw error
      setPhoto(url)
      if (onPhotoChange) onPhotoChange(url)
      showToast('Photo updated.')
    } catch (err) {
      showToast('Photo upload failed: ' + err.message)
    }
    setUploadingPhoto(false)
  }

  const save = async () => {
    setSaving(true)
    const cleanLinks = links
      .map(l => ({ label: (l.label || '').trim(), url: (l.url || '').trim() }))
      .filter(l => l.url).slice(0, MAX_LINKS)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ artist_statement: statement.trim() || null, work_links: cleanLinks, disciplines: teas, full_name: name.trim() || null })
        .eq('id', userId)
      if (error) throw error
      setLinks(cleanLinks)
      setEditing(false)
      showToast('Your card is saved.')
    } catch (err) {
      showToast('Could not save: ' + err.message)
    }
    setSaving(false)
  }

  if (loading) return null

  const hasCard = !!statement || links.length > 0 || teas.length > 0
  const initial = (fullName || '?').trim().charAt(0).toUpperCase()

  const inp = { width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }

  // Photo element (with upload affordance), reused in display + edit
  const PhotoEl = ({ size }) => (
    <label style={{ position: 'relative', flexShrink: 0, cursor: 'pointer', display: 'block', width: size, height: size }} title="Upload / change your photo">
      {photo ? (
        <img src={photo} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)' }} />
      ) : (
        <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 600 }}>{initial}</div>
      )}
      <span style={{ position: 'absolute', bottom: 0, right: 0, width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', border: '2px solid var(--bg-secondary)' }}>
        {uploadingPhoto ? '…' : '✎'}
      </span>
      <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
    </label>
  )

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(196,162,101,0.10), rgba(224,122,95,0.06))' }}>
        {/* signature gold→coral hairline */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-secondary))' }} />

        <div style={{ padding: '26px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '19px', fontWeight: 700, color: 'var(--text-primary)' }}>Your card</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>How the community meets you.</div>
            </div>
            {!editing && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {hasCard && userId && (
                  <a href={`/member/${userId}`} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'underline' }}>See public page ↗</a>
                )}
                <button onClick={() => setEditing(true)} style={{ padding: '7px 16px', borderRadius: '50px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                  {hasCard ? 'Edit' : 'Create your card'}
                </button>
              </div>
            )}
          </div>

          {/* ── DISPLAY MODE ── */}
          {!editing && (
            <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
              <PhotoEl size={72} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  {name || 'A Human Echo member'}
                </div>
                <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '10px' }}>Official Member</div>
                {statement
                  ? <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px' }}>{statement}</p>
                  : <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 10px' }}>Add a line about why you make art…</p>}
                {teas.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: links.length ? '10px' : 0 }}>
                    {teas.map(t => (
                      <span key={t} style={{ padding: '3px 12px', borderRadius: '50px', background: 'rgba(196,162,101,0.18)', color: 'var(--accent-gold)', fontSize: '12px', fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                )}
                {links.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {links.map((l, i) => (
                      <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ padding: '6px 14px', borderRadius: '50px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '13px', textDecoration: 'none' }}>{l.label || 'Link'} ↗</a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── EDIT MODE ── */}
          {editing && (
            <div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '18px' }}>
                <PhotoEl size={72} />
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tap the photo to upload or change it.<br/>This is the picture that represents you across Human Echo.</div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={lbl}>Your name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="The name shown on your card" style={inp} />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={lbl}>In a nutshell, why do you make art?</label>
                <textarea value={statement} onChange={e => setStatement(e.target.value.slice(0, MAX_BLURB))} placeholder="A sentence or two about you and your work…" style={{ ...inp, minHeight: '90px', resize: 'vertical', lineHeight: 1.6 }} />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '4px' }}>{statement.length} / {MAX_BLURB}</div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={lbl}>What’s your cup of tea? <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— pick any that fit</span></label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {TEAS.map(t => {
                    const on = teas.includes(t)
                    return (
                     <button key={t} type="button" onClick={() => toggleTea(t)} style={{ padding: '6px 18px', borderRadius: '50px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: on ? '1px solid var(--accent-gold)' : '1px solid var(--border)', background: on ? 'rgba(196,162,101,0.18)' : 'var(--bg-card)', color: on ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>
                        {on ? '☕ ' : ''}{t}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={lbl}>Where can we see more of your work?</label>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {links.map((l, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input value={l.label} onChange={e => updateLink(i, 'label', e.target.value)} placeholder="Label (e.g. Vimeo)" style={{ ...inp, flex: '0 0 130px' }} />
                      <input value={l.url} onChange={e => updateLink(i, 'url', e.target.value)} placeholder="https://…" style={{ ...inp, flex: 1 }} />
                      <button onClick={() => removeLink(i)} title="Remove" style={{ flexShrink: 0, width: '34px', height: '34px', borderRadius: '8px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                </div>
                {links.length < MAX_LINKS && (
                  <button onClick={addLink} style={{ marginTop: '8px', padding: '8px 16px', borderRadius: '50px', background: 'none', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}>+ Add a link {links.length > 0 ? `(${links.length}/${MAX_LINKS})` : ''}</button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={save} disabled={saving} style={{ padding: '11px 26px', borderRadius: '50px', background: 'var(--accent-primary)', color: 'white', fontSize: '14px', fontWeight: 600, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save card'}</button>
                <button onClick={() => { setEditing(false); load() }} style={{ padding: '11px 22px', borderRadius: '50px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: '28px', transform: 'translateX(-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '12px 20px', borderRadius: '50px', fontSize: '14px', zIndex: 60, boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>{toast}</div>
      )}
    </section>
  )
}
