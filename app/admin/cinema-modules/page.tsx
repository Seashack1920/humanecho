'use client'

/**
 * Admin — Cinema Content Modules  (/admin/cinema-modules)
 * Curated editorial modules for the cinema page: interviews, filmmaker
 * profiles, "films to watch". Rich text via TipTap (HTML stored in `body`,
 * same pattern as admin/stories). Lighter toolbar: bold, italic, H2/H3,
 * blockquote, lists, link, image embed.
 *
 * Save as app/admin/cinema-modules/page.tsx
 * (Protected by the existing app/admin/layout.tsx guard.)
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TipTapLink from '@tiptap/extension-link'

const TYPES = [
  { value: 'interview',         label: 'Interview' },
  { value: 'filmmaker_profile', label: 'Filmmaker Profile' },
  { value: 'film_to_watch',     label: 'Film to Watch' },
]
const typeLabel = (t) => TYPES.find(x => x.value === t)?.label || t
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

// ─── Image insert modal ───
function ImageModal({ onInsert, onClose }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [alt, setAlt] = useState('')

  const handleFile = async (file) => {
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { setError('Image must be under 20MB'); return }
    setUploading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('upload_preset', 'humanecho_upload')
      fd.append('folder', 'cinema/modules')
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      onInsert({ src: data.secure_url, alt })
    } catch (e) { setError(e.message); setUploading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '460px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>🖼 Insert Image</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }}>×</button>
        </div>
        {error && <div style={{ fontSize: '13px', color: '#dc3c3c', marginBottom: '12px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(220,60,60,0.1)' }}>{error}</div>}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>Caption / alt text (optional)</label>
          <input value={alt} onChange={e => setAlt(e.target.value)} placeholder="Describe the image" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <input type="file" accept="image/*" disabled={uploading} onChange={e => handleFile(e.target.files?.[0])}
          style={{ width: '100%', padding: '40px 20px', borderRadius: '10px', border: '2px dashed var(--border)', background: 'var(--bg-card)', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', boxSizing: 'border-box' }} />
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>{uploading ? 'Uploading…' : 'Max 20MB'}</div>
      </div>
    </div>
  )
}

// ─── Link modal ───
function LinkModal({ currentUrl, onInsert, onRemove, onClose }) {
  const [url, setUrl] = useState(currentUrl || '')
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '400px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>🔗 Insert Link</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }}>×</button>
        </div>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." autoFocus
          onKeyDown={e => { if (e.key === 'Enter') onInsert(url) }}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => onInsert(url)} disabled={!url} style={{ padding: '8px 16px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', border: 'none', cursor: 'pointer' }}>Insert</button>
          {currentUrl && <button onClick={onRemove} style={{ padding: '8px 16px', borderRadius: '6px', background: 'rgba(220,60,60,0.1)', color: '#dc3c3c', fontSize: '13px', border: '1px solid rgba(220,60,60,0.3)', cursor: 'pointer' }}>Remove link</button>}
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', background: 'none', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Toolbar ───
function Toolbar({ editor, onLink, onImage }) {
  if (!editor) return null
  const btn = (active) => ({
    padding: '4px 10px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
    border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
    background: active ? 'rgba(43,122,143,0.12)' : 'var(--bg-card)',
    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
    fontWeight: active ? 600 : 400,
  })
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '10px 12px', background: 'var(--bg-card)', borderRadius: '8px 8px 0 0', border: '1px solid var(--border)', borderBottom: 'none' }}>
      <button style={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></button>
      <button style={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
      <button style={btn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
      <button style={btn(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
      <div style={{ width: '1px', background: 'var(--border)', margin: '0 2px' }} />
      <button style={btn(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>" "</button>
      <button style={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
      <button style={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
      <button style={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Section break">— —</button>
      <div style={{ width: '1px', background: 'var(--border)', margin: '0 2px' }} />
      <button style={btn(editor.isActive('link'))} onClick={onLink} title="Insert link">🔗</button>
      <button style={btn(false)} onClick={onImage} title="Insert image">🖼</button>
      <div style={{ width: '1px', background: 'var(--border)', margin: '0 2px' }} />
      <button style={btn(false)} onClick={() => editor.chain().focus().undo().run()}>↩</button>
      <button style={btn(false)} onClick={() => editor.chain().focus().redo().run()}>↪</button>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center', whiteSpace: 'nowrap' }}>
        {editor.getText().split(/\s+/).filter(Boolean).length} words
      </span>
    </div>
  )
}

export default function AdminCinemaModules() {
  const [modules, setModules] = useState([])
  const [films, setFilms] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: mods }, { data: filmRows }] = await Promise.all([
      supabase.from('cinema_modules').select('*').order('created_at', { ascending: false }),
      supabase.from('films').select('id, title').eq('status', 'published').order('title'),
    ])
    setModules(mods || [])
    setFilms(filmRows || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  if (editing) {
    return <ModuleForm
      module={editing === 'new' ? null : editing}
      films={films}
      onDone={() => { setEditing(null); load() }}
      onCancel={() => setEditing(null)}
    />
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Cinema Content</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Interviews, filmmaker profiles, and films to watch.</p>
        </div>
        <button onClick={() => setEditing('new')} style={{ padding: '11px 22px', borderRadius: '50px', background: 'var(--accent-primary)', color: 'white', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>+ New module</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading…</div>
      ) : modules.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '14px' }}>
          No modules yet. Create your first interview or profile.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {modules.map(m => {
            const film = films.find(f => f.id === m.film_id)
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(43,122,143,0.1)', borderRadius: '6px', padding: '2px 8px' }}>{typeLabel(m.type)}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: m.status === 'published' ? 'var(--accent-gold)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.status}</span>
                    {m.is_featured && <span style={{ fontSize: '11px' }}>⭐</span>}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{m.title}</div>
                  {film && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>🎬 {film.title}</div>}
                </div>
                <button onClick={() => setEditing(m)} style={{ padding: '8px 18px', borderRadius: '50px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}>Edit</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ModuleForm({ module, films, onDone, onCancel }) {
  const [form, setForm] = useState({
    type:     module?.type || 'interview',
    title:    module?.title || '',
    subtitle: module?.subtitle || '',
    film_id:  module?.film_id || '',
    status:   module?.status || 'draft',
    is_featured: module?.is_featured || false,
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [linkModal, setLinkModal] = useState(false)
  const [imageModal, setImageModal] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      TipTapLink.configure({ openOnClick: false, HTMLAttributes: { class: 'cinema-link' } }),
    ],
    content: module?.body || '',
    editorProps: {
      attributes: {
        style: 'min-height: 320px; padding: 16px; font-family: Georgia, serif; font-size: 15px; line-height: 1.8; color: var(--text-primary); outline: none;',
      },
    },
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.title.trim()) return setMsg({ type: 'error', text: 'Title is required.' })
    const html = editor?.getHTML() || ''
    if (!editor || editor.getText().trim().length === 0) return setMsg({ type: 'error', text: 'Body text is required.' })
    setSaving(true); setMsg(null)
    const payload = {
      type: form.type,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      body: html,
      film_id: form.film_id || null,
      status: form.status,
      is_featured: form.is_featured,
    }
    try {
      if (module?.id) {
        const { error } = await supabase.from('cinema_modules').update(payload).eq('id', module.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('cinema_modules').insert(payload)
        if (error) throw error
      }
      onDone()
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
      setSaving(false)
    }
  }

  const del = async () => {
    if (!module?.id) return
    if (!confirm('Delete this module? This cannot be undone.')) return
    setSaving(true)
    try {
      await supabase.from('cinema_modules').delete().eq('id', module.id)
      onDone()
    } catch (e) { setMsg({ type: 'error', text: e.message }); setSaving(false) }
  }

  const insertLink = (url) => {
    if (editor && url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    setLinkModal(false)
  }
  const removeLink = () => { if (editor) editor.chain().focus().unsetLink().run(); setLinkModal(false) }
  const insertImage = (attrs) => {
    if (editor) editor.chain().focus().setImage({ src: attrs.src, alt: attrs.alt || '' }).run()
    setImageModal(false)
  }

  const inp = { width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }
  const currentLinkUrl = editor?.getAttributes('link').href || ''

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' }}>
      <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '14px', cursor: 'pointer', padding: 0, marginBottom: '20px' }}>← Back to modules</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 24px' }}>{module?.id ? 'Edit module' : 'New module'}</h1>

      {msg && <div style={{ padding: '12px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', background: 'rgba(220,60,60,0.1)', border: '1px solid #dc3c3c', color: '#dc3c3c' }}>{msg.text}</div>}

      <div style={{ display: 'grid', gap: '18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={lbl}>Type</label>
            <select style={inp} value={form.type} onChange={e => set('type', e.target.value)}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Status</label>
            <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div>
          <label style={lbl}>Title</label>
          <input style={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. A Conversation with the Director" />
        </div>

        <div>
          <label style={lbl}>Subtitle <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— optional</span></label>
          <input style={inp} value={form.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="e.g. On craft, doubt, and the long road" />
        </div>

        <div>
          <label style={lbl}>Connected film <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— optional; surfaces this module up top when that film is featured</span></label>
          <select style={inp} value={form.film_id} onChange={e => set('film_id', e.target.value)}>
            <option value="">— none —</option>
            {films.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
        </div>

        <div>
          <label style={lbl}>Body text</label>
          <Toolbar editor={editor} onLink={() => setLinkModal(true)} onImage={() => setImageModal(true)} />
          <div style={{ border: '1px solid var(--border)', borderRadius: '0 0 8px 8px', background: 'var(--bg-card)', overflow: 'hidden', borderTop: 'none' }}>
            <EditorContent editor={editor} />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            <strong>B</strong> bold · <em>I</em> italic · H2/H3 · " " quote · lists · 🔗 link · 🖼 image. Select text then 🔗 to link it.
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)} />
          Pin as featured (optional manual highlight)
        </label>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
          <button onClick={save} disabled={saving} style={{ padding: '12px 28px', borderRadius: '50px', background: 'var(--accent-primary)', color: 'white', fontSize: '14px', fontWeight: 600, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save module'}</button>
          <button onClick={onCancel} style={{ padding: '12px 22px', borderRadius: '50px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
          {module?.id && <button onClick={del} style={{ marginLeft: 'auto', padding: '12px 18px', borderRadius: '50px', background: 'none', border: '1px solid var(--accent-secondary)', color: 'var(--accent-secondary)', fontSize: '13px', cursor: 'pointer' }}>Delete</button>}
        </div>
      </div>

      {linkModal && <LinkModal currentUrl={currentLinkUrl} onInsert={insertLink} onRemove={removeLink} onClose={() => setLinkModal(false)} />}
      {imageModal && <ImageModal onInsert={insertImage} onClose={() => setImageModal(false)} />}
    </div>
  )
}
