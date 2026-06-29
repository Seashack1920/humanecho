'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useEditor, EditorContent, Node, mergeAttributes } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TipTapLink from '@tiptap/extension-link'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

type Artist   = { id: string; name: string; photo_url?: string }
type Narrator = { id: string; name: string; tagline: string | null; voice_style: string | null }
type Track    = { id: string; title: string; mood: string | null; description: string | null }
type Story    = {
  id: string
  title: string
  logline: string | null
  story_type: string
  status: string
  content_origin: string
  explicit: boolean
  tip_enabled: boolean
  read_time_minutes: number | null
  word_count: number | null
  artist_id: string | null
  created_at: string
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  page:         { maxWidth: '860px', margin: '0 auto', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' },
  h1:           { fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' },
  subtitle:     { fontSize: '14px', color: 'var(--text-muted)', marginBottom: '40px' },
  topRow:       { display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' as const, alignItems: 'center' },
  manageBtn:    (active: boolean) => ({ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: '1px solid var(--accent-secondary)', cursor: 'pointer', background: active ? 'var(--accent-secondary)' : 'transparent', color: active ? 'white' : 'var(--accent-secondary)' }),
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
  btnSmall:     { padding: '6px 14px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', border: 'none', cursor: 'pointer' },
  btnEdit:      { padding: '8px 16px', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer', marginRight: '8px' },
  btnSave:      { padding: '8px 16px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', border: 'none', cursor: 'pointer', marginRight: '8px' },
  btnCancel:    { padding: '8px 16px', borderRadius: '6px', background: 'none', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnDanger:    { padding: '8px 16px', borderRadius: '6px', background: 'rgba(220,60,60,0.1)', color: '#dc3c3c', fontSize: '13px', border: '1px solid rgba(220,60,60,0.3)', cursor: 'pointer' },
  sectionTitle: { fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' },
  divider:      { height: '1px', background: 'var(--border)', margin: '20px 0' },
  checkbox:     { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' },
  manageRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: '8px' },
  manageLabel:  { fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' },
  manageMeta:   { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  badge:        (color: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500', background: color === 'green' ? 'rgba(43,180,100,0.15)' : color === 'blue' ? 'rgba(43,122,143,0.15)' : 'rgba(150,150,150,0.15)', color: color === 'green' ? '#2bb464' : color === 'blue' ? 'var(--accent-primary)' : 'var(--text-muted)' }),
}

const STORY_TYPES = [
  { value: 'short_story',   label: 'Short Story' },
  { value: 'flash_fiction', label: 'Flash Fiction' },
  { value: 'educational',   label: 'Educational' },
  { value: 'children',      label: "Children's" },
  { value: 'series',        label: 'Series' },
  { value: 'essay',         label: 'Essay' },
]

const STORY_TYPE_LABELS: Record<string, string> = {
  short_story: 'Short Story', flash_fiction: 'Flash Fiction',
  educational: 'Educational', children: "Children's", series: 'Series', essay: 'Essay',
}

// ─── Custom TipTap Extensions ─────────────────────────────────────────────────

// Audio node — renders an inline audio player
const AudioNode = Node.create({
  name: 'audio',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src:   { default: null },
      title: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-audio]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-audio': '' }, HTMLAttributes)]
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      dom.style.cssText = 'margin: 16px 0; padding: 12px 16px; border-radius: 10px; background: var(--bg-secondary); border: 1px solid var(--border); display: flex; align-items: center; gap: 12px;'
      dom.setAttribute('data-audio', '')
      dom.setAttribute('data-src', node.attrs.src)
      if (node.attrs.title) {
        const label = document.createElement('span')
        label.style.cssText = 'font-size: 13px; color: var(--text-muted); flex: 1;'
        label.textContent = '🎵 ' + node.attrs.title
        dom.appendChild(label)
      }
      const audio = document.createElement('audio')
      audio.src = node.attrs.src
      audio.controls = true
      audio.style.cssText = 'height: 32px; flex: 1;'
      dom.appendChild(audio)
      return { dom }
    }
  },
})

// Video node — renders an inline video player
const VideoNode = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src:     { default: null },
      caption: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-video]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-video': '' }, HTMLAttributes)]
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      dom.style.cssText = 'margin: 16px 0;'
      dom.setAttribute('data-video', '')

      const getEmbedUrl = (url: string) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          const id = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]
          return id ? `https://www.youtube.com/embed/${id}` : null
        }
        if (url.includes('vimeo.com')) {
          const id = url.match(/vimeo\.com\/(\d+)/)?.[1]
          return id ? `https://player.vimeo.com/video/${id}` : null
        }
        return null
      }

      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'border-radius: 10px; overflow: hidden; aspect-ratio: 16/9; background: #000;'

      const embedUrl = getEmbedUrl(node.attrs.src)
      if (embedUrl) {
        const iframe = document.createElement('iframe')
        iframe.src = embedUrl
        iframe.style.cssText = 'width: 100%; height: 100%; border: none;'
        iframe.allowFullscreen = true
        wrapper.appendChild(iframe)
      } else {
        const video = document.createElement('video')
        video.src = node.attrs.src
        video.controls = true
        video.style.cssText = 'width: 100%; height: 100%; object-fit: contain;'
        wrapper.appendChild(video)
      }
      dom.appendChild(wrapper)

      if (node.attrs.caption) {
        const cap = document.createElement('div')
        cap.style.cssText = 'font-size: 13px; color: var(--text-muted); margin-top: 8px; text-align: center; font-style: italic;'
        cap.textContent = node.attrs.caption
        dom.appendChild(cap)
      }
      return { dom }
    }
  },
})

// ─── Media Upload Modal ───────────────────────────────────────────────────────

function MediaModal({ type, onInsert, onClose }: {
  type: 'image' | 'audio' | 'video'
  onInsert: (attrs: Record<string, string>) => void
  onClose: () => void
}) {
  const [uploading, setUploading]   = useState(false)
  const [error, setError]           = useState('')
  const [embedUrl, setEmbedUrl]     = useState('')
  const [caption, setCaption]       = useState('')
  const [title, setTitle]           = useState('')
  const [mode, setMode]             = useState<'upload' | 'embed'>('upload')
  const fileInputRef                = useRef<HTMLInputElement>(null)

  const accept = type === 'image' ? 'image/*' : type === 'audio' ? 'audio/*' : 'video/*'
  const folder = type === 'image' ? 'stories/images' : type === 'audio' ? 'stories/audio' : 'stories/video'
  const resourceType = type === 'image' ? 'image' : 'video'
  const maxSize = type === 'image' ? 20 : type === 'audio' ? 100 : 500

  const handleFile = async (file: File) => {
    if (file.size > maxSize * 1024 * 1024) { setError(`File must be under ${maxSize}MB`); return }
    setUploading(true); setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'humanecho_upload')
      formData.append('folder', folder)
      if (type !== 'image') formData.append('resource_type', 'video')
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      if (type === 'image') onInsert({ src: data.secure_url, alt: caption })
      else if (type === 'audio') onInsert({ src: data.secure_url, title })
      else onInsert({ src: data.secure_url, caption })
    } catch (err) { setError((err as Error).message) }
    setUploading(false)
  }

  const handleEmbed = () => {
    if (!embedUrl) return
    if (type === 'video') onInsert({ src: embedUrl, caption })
    else if (type === 'image') onInsert({ src: embedUrl, alt: caption })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '480px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Insert {type === 'image' ? '🖼 Image' : type === 'audio' ? '🎵 Audio' : '🎬 Video'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }}>×</button>
        </div>

        {error && <div style={{ fontSize: '13px', color: '#dc3c3c', marginBottom: '12px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(220,60,60,0.1)' }}>{error}</div>}

        {/* Mode toggle for video */}
        {type === 'video' && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {(['upload', 'embed'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer', background: mode === m ? 'var(--accent-primary)' : 'none', color: mode === m ? 'white' : 'var(--text-muted)' }}>
                {m === 'upload' ? '⬆ Upload' : '🔗 YouTube / Vimeo'}
              </button>
            ))}
          </div>
        )}

        {/* Upload area */}
        {(type !== 'video' || mode === 'upload') && (
  <div style={{ marginBottom: '16px' }}>
    <input
      type="file"
accept="image/*,video/*,audio/*"
      disabled={uploading}
      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      style={{
        width: '100%',
        padding: '40px 20px',
        borderRadius: '10px',
        border: '2px dashed var(--border)',
        background: 'var(--bg-card)',
        cursor: uploading ? 'not-allowed' : 'pointer',
        fontSize: '13px',
        color: 'var(--text-muted)',
        textAlign: 'center',
      }}
    />
    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>
      {uploading ? 'Uploading...' : `Max ${maxSize}MB`}
    </div>
  </div>
)}

        {/* Embed URL for video */}
        {type === 'video' && mode === 'embed' && (
          <div style={{ marginBottom: '16px' }}>
            <input style={s.input} value={embedUrl} onChange={e => setEmbedUrl(e.target.value)} placeholder="Paste YouTube or Vimeo URL" />
          </div>
        )}

        {/* Caption / title */}
        {type === 'image' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={s.label}>Caption (optional)</label>
            <input style={s.input} value={caption} onChange={e => setCaption(e.target.value)} placeholder="Image caption" />
          </div>
        )}
        {type === 'audio' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={s.label}>Title (shown in player)</label>
            <input style={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Optional title" />
          </div>
        )}
        {type === 'video' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={s.label}>Caption (optional)</label>
            <input style={s.input} value={caption} onChange={e => setCaption(e.target.value)} placeholder="Optional caption" />
          </div>
        )}

        {/* Embed insert button */}
        {type === 'video' && mode === 'embed' && (
          <button style={s.btn} onClick={handleEmbed} disabled={!embedUrl}>Insert Video</button>
        )}
      </div>
    </div>
  )
}

// ─── Link Modal ───────────────────────────────────────────────────────────────

function LinkModal({ currentUrl, onInsert, onRemove, onClose }: {
  currentUrl: string
  onInsert: (url: string) => void
  onRemove: () => void
  onClose: () => void
}) {
  const [url, setUrl] = useState(currentUrl)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '400px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>🔗 Insert Link</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={s.label}>URL</label>
          <input style={s.input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." autoFocus
            onKeyDown={e => { if (e.key === 'Enter') onInsert(url) }} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={s.btnSave} onClick={() => onInsert(url)} disabled={!url}>Insert</button>
          {currentUrl && <button style={s.btnDanger} onClick={onRemove}>Remove link</button>}
          <button style={s.btnCancel} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── TipTap Toolbar ──────────────────────────────────────────────────────────

function EditorToolbar({ editor, onFindReplace, onPreview, onInsertMedia }: {
  editor: any
  onFindReplace: () => void
  onPreview: () => void
  onInsertMedia: (type: 'image' | 'audio' | 'video' | 'link') => void
}) {
  if (!editor) return null

  const btnStyle = (active: boolean) => ({
    padding: '4px 10px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
    border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
    background: active ? 'rgba(43,122,143,0.12)' : 'var(--bg-card)',
    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
    fontWeight: active ? '600' : '400',
  })

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '10px 12px', background: 'var(--bg-card)', borderRadius: '8px 8px 0 0', border: '1px solid var(--border)', borderBottom: 'none' }}>
      <button style={btnStyle(editor.isActive('bold'))}        onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></button>
      <button style={btnStyle(editor.isActive('italic'))}      onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
      <button style={btnStyle(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
      <button style={btnStyle(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
      <div style={{ width: '1px', background: 'var(--border)', margin: '0 2px' }} />
      <button style={btnStyle(editor.isActive('blockquote'))}  onClick={() => editor.chain().focus().toggleBlockquote().run()}>" "</button>
      <button style={btnStyle(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Section break">— —</button>
      <div style={{ width: '1px', background: 'var(--border)', margin: '0 2px' }} />
      {/* Link */}
      <button style={btnStyle(editor.isActive('link'))} onClick={() => onInsertMedia('link')} title="Insert link">🔗</button>
      <div style={{ width: '1px', background: 'var(--border)', margin: '0 2px' }} />
      {/* Media embeds */}
      <button style={btnStyle(false)} onClick={() => onInsertMedia('image')} title="Insert image">🖼</button>
      <button style={btnStyle(false)} onClick={() => onInsertMedia('audio')} title="Insert audio">🎵</button>
      <button style={btnStyle(false)} onClick={() => onInsertMedia('video')} title="Insert video">🎬</button>
      <div style={{ width: '1px', background: 'var(--border)', margin: '0 2px' }} />
      <button style={btnStyle(false)} onClick={() => editor.chain().focus().undo().run()}>↩</button>
      <button style={btnStyle(false)} onClick={() => editor.chain().focus().redo().run()}>↪</button>
      <div style={{ width: '1px', background: 'var(--border)', margin: '0 2px' }} />
      <button style={{ ...btnStyle(false), color: 'var(--text-muted)' }} onClick={onFindReplace} title="Find & Replace">🔍</button>
      <button style={{ ...btnStyle(false), color: 'var(--accent-primary)' }} onClick={onPreview} title="Preview story">👁 Preview</button>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center', whiteSpace: 'nowrap' }}>
        {editor.getText().split(/\s+/).filter(Boolean).length} words
      </span>
    </div>
  )
}

// ─── Find & Replace ───────────────────────────────────────────────────────────

function FindReplace({ editor, onClose }: { editor: any; onClose: () => void }) {
  const [find, setFind]       = useState('')
  const [replace, setReplace] = useState('')
  const [matches, setMatches] = useState(0)
  const [message, setMessage] = useState('')

  const countMatches = (text: string, term: string) => {
    if (!term) return 0
    return (text.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
  }

  const handleFind = () => {
    if (!find || !editor) return
    const text = editor.getText()
    const count = countMatches(text, find)
    setMatches(count)
    setMessage(count > 0 ? `${count} match${count !== 1 ? 'es' : ''} found` : 'No matches found')
  }

  const handleReplace = () => {
    if (!find || !editor) return
    const html = editor.getHTML()
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const newHtml = html.replace(new RegExp(escaped, 'gi'), replace)
    editor.commands.setContent(newHtml)
    const count = countMatches(editor.getText(), find)
    setMessage(count === 0 ? `All replaced ✓` : `${count} remaining`)
    setMatches(count)
  }

  return (
    <div style={{ padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: 'none', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <input style={{ ...s.input, width: '180px' }} placeholder="Find..." value={find} onChange={e => { setFind(e.target.value); setMessage('') }} onKeyDown={e => { if (e.key === 'Enter') handleFind() }} />
      <input style={{ ...s.input, width: '180px' }} placeholder="Replace with..." value={replace} onChange={e => setReplace(e.target.value)} />
      <button style={s.btnSmall} onClick={handleFind}>Find</button>
      <button style={{ ...s.btnSmall, background: 'var(--accent-secondary)' }} onClick={handleReplace} disabled={!find}>Replace All</button>
      {message && <span style={{ fontSize: '12px', color: matches === 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{message}</span>}
      <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)' }}>×</button>
    </div>
  )
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ title, logline, html, authorName, onClose }: {
  title: string; logline: string; html: string; authorName: string; onClose: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#ffffff', borderRadius: '16px', width: '90%', maxWidth: '680px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: '13px', color: '#888', fontFamily: 'DM Sans, sans-serif' }}>Story Preview — Light theme</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#888', lineHeight: '1' }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '40px 48px', background: '#ffffff' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '36px', fontWeight: '700', color: '#1a1a1a', lineHeight: '1.15', marginBottom: '12px' }}>{title || 'Untitled Story'}</h1>
          {logline && <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', color: '#666', lineHeight: '1.6', marginBottom: '20px', fontStyle: 'italic' }}>{logline}</p>}
          {authorName && <div style={{ fontSize: '14px', color: '#888', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #e5e5e5', fontFamily: 'DM Sans, sans-serif' }}>By {authorName}</div>}
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', lineHeight: '1.8', color: '#1a1a1a' }} dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </div>
  )
}

// ─── Contributor Picker ───────────────────────────────────────────────────────

function ContributorPicker({ artists, contributors, onChange }: {
  artists: Artist[]
  contributors: { name: string; artist_id: string | null }[]
  onChange: (contributors: { name: string; artist_id: string | null }[]) => void
}) {
  const [input, setInput]             = useState('')
  const [suggestions, setSuggestions] = useState<Artist[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleInput = (val: string) => {
    setInput(val)
    if (val.length > 1) {
      const matches = artists.filter(a => a.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5)
      setSuggestions(matches)
      setShowSuggestions(matches.length > 0)
    } else { setShowSuggestions(false) }
  }

  const addContributor = (name: string, artist_id: string | null) => {
    if (!name.trim()) return
    onChange([...contributors, { name: name.trim(), artist_id }])
    setInput(''); setShowSuggestions(false)
  }

  const removeContributor = (index: number) => onChange(contributors.filter((_, i) => i !== index))

  return (
    <div>
      {contributors.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          {contributors.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: c.artist_id ? 'rgba(43,122,143,0.1)' : 'var(--bg-card)', border: c.artist_id ? '1px solid var(--accent-primary)' : '1px solid var(--border)', fontSize: '13px', color: c.artist_id ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
              {c.artist_id ? '🔗' : ''} {c.name}
              <button onClick={() => removeContributor(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)', padding: '0' }}>×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input style={{ ...s.input, flex: 1 }} value={input} onChange={e => handleInput(e.target.value)} placeholder="Type contributor name..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addContributor(input, null) } }} />
          <button style={{ ...s.btnSecondary, padding: '10px 16px', fontSize: '13px' }} onClick={() => addContributor(input, null)}>+ Add</button>
        </div>
        {showSuggestions && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '0 0 8px 8px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            {suggestions.map(artist => (
              <div key={artist.id} onClick={() => addContributor(artist.name, artist.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {artist.photo_url ? <img src={artist.photo_url} alt={artist.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🎤</div>}
                <span>{artist.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--accent-primary)' }}>🔗 link</span>
              </div>
            ))}
            <div onClick={() => addContributor(input, null)} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              + Add "{input}" as plain text byline
            </div>
          </div>
        )}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>🔗 = linked to artist profile · plain text = byline only</div>
    </div>
  )
}

// ─── Inline New Author Form ───────────────────────────────────────────────────

function InlineNewAuthor({ onCreated, onCancel }: {
  onCreated: (artist: Artist) => void
  onCancel: () => void
}) {
  const [name, setName]   = useState('')
  const [bio, setBio]     = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name) return setError('Name is required')
    setLoading(true); setError('')
    try {
      let photo_url = ''
      if (photo) {
        const formData = new FormData()
        formData.append('file', photo)
        formData.append('upload_preset', 'humanecho_upload')
        formData.append('folder', name.toLowerCase().replace(/\s+/g, '-'))
        const res  = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData })
        const data = await res.json()
        if (!data.error) photo_url = data.secure_url
      }
      const { data, error } = await supabase.from('artists').insert({
        name, bio: bio || null, photo_url,
        creator_type: ['story'], creator_label: 'Author', content_origin: '100% human',
      }).select('id, name, photo_url').single()
      if (error) throw error
      onCreated(data)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  return (
    <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(43,122,143,0.06)', border: '1px solid rgba(43,122,143,0.2)', marginTop: '8px' }}>
      <div style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '12px' }}>New Author</div>
      {error && <div style={{ fontSize: '12px', color: '#dc3c3c', marginBottom: '8px' }}>{error}</div>}
      <div style={s.field}><label style={s.label}>Name *</label><input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Author name" /></div>
      <div style={s.field}><label style={s.label}>Bio (optional)</label><textarea style={{ ...s.textarea, minHeight: '60px' }} value={bio} onChange={e => setBio(e.target.value)} placeholder="Brief bio..." /></div>
      <div style={s.field}><label style={s.label}>Photo (optional)</label><input type="file" style={s.fileInput} onChange={e => setPhoto(e.target.files?.[0] || null)} /></div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>Will be created with creator_type: Story and creator_label: Author</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={s.btnSave} onClick={handleCreate} disabled={loading}>{loading ? 'Creating...' : 'Create Author'}</button>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Story Form ───────────────────────────────────────────────────────────────

function StoryForm({ artists: initialArtists, narrators, bgTracks, story, onSave, onCancel }: {
  artists: Artist[]
  narrators: Narrator[]
  bgTracks: Track[]
  story?: Story | null
  onSave: () => void
  onCancel: () => void
}) {
  const [loading, setLoading]         = useState(false)
  const [message, setMessage]         = useState<{ type: string; text: string } | null>(null)
  const [savedDone, setSavedDone]     = useState(false)
  const [coverFile, setCoverFile]     = useState<File | null>(null)
  const [heroVideoFile, setHeroVideoFile] = useState<File | null>(null)
  const [artists, setArtists]         = useState<Artist[]>(initialArtists)
  const [showNewAuthor, setShowNewAuthor]       = useState(false)
  const [showFindReplace, setShowFindReplace]   = useState(false)
  const [showPreview, setShowPreview]           = useState(false)
  const [mediaModal, setMediaModal]             = useState<'image' | 'audio' | 'video' | 'link' | null>(null)

  const [form, setForm] = useState({
    title:            story?.title || '',
    logline:          story?.logline || '',
    story_type:       story?.story_type || 'short_story',
    content_origin:   story?.content_origin || '100% human',
    status:           story?.status || 'draft',
    explicit:         story?.explicit || false,
    tip_enabled:      story?.tip_enabled ?? true,
    artist_id:        story?.artist_id || '',
    reading_theme:    'light',
    content_warnings: '',
  })

  const [contributors, setContributors]           = useState<{ name: string; artist_id: string | null }[]>([])
  const [availableNarrators, setAvailableNarrators] = useState<string[]>([])
  const [availableBgTracks, setAvailableBgTracks] = useState<string[]>([])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      TipTapLink.configure({ openOnClick: false, HTMLAttributes: { class: 'story-link' } }),
      AudioNode,
      VideoNode,
    ],
    content: '',
    editorProps: {
      attributes: {
        style: 'min-height: 400px; padding: 16px; font-family: Playfair Display, serif; font-size: 16px; line-height: 1.8; color: var(--text-primary); outline: none;',
      },
    },
  })

  useEffect(() => {
    if (!savedDone) return
    const timer = setTimeout(() => { onSave(); onCancel() }, 2500)
    return () => clearTimeout(timer)
  }, [savedDone])

  const editorReady = editor?.isEditable
  useEffect(() => {
    if (!story?.id || !editor || !editorReady) return
    let cancelled = false
    const loadStory = async () => {
      const { data } = await supabase.from('stories').select('text_content, available_narrators, available_bg_music, contributors, content_warnings, reading_theme').eq('id', story.id).single()
      if (!data || cancelled) return
      if (data.text_content) editor.commands.setContent(data.text_content)
      if (data.available_narrators?.length) setAvailableNarrators(data.available_narrators)
      if (data.available_bg_music?.length)  setAvailableBgTracks(data.available_bg_music)
      if (data.contributors?.length)        setContributors(data.contributors)
      if (data.content_warnings?.length)    setForm(f => ({ ...f, content_warnings: data.content_warnings.join(', ') }))
      if (data.reading_theme)               setForm(f => ({ ...f, reading_theme: data.reading_theme }))
    }
    loadStory()
    return () => { cancelled = true }
  }, [story?.id, editorReady])

  const editorText       = editor?.getText() || ''
  const wordCount        = editorText.split(/\s+/).filter(Boolean).length
  const readTime         = Math.max(1, Math.round(wordCount / 200))
  const editorHasContent = wordCount > 0

  const uploadCover = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'humanecho_upload')
    formData.append('folder', 'stories/covers')
    const res  = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.secure_url
  }

  const uploadHeroVideo = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'humanecho_upload')
    formData.append('folder', 'stories/hero')
    const res  = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`, { method: 'POST', body: formData })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.secure_url
  }

  const handleSave = async () => {
    if (!form.title)       return setMessage({ type: 'error', text: 'Title is required' })
    if (!editorHasContent) return setMessage({ type: 'error', text: 'Story content is required' })
    setLoading(true); setMessage(null)
    try {
      let cover_image_url = undefined
      if (coverFile) cover_image_url = await uploadCover(coverFile)
      let hero_video_url = undefined
      if (heroVideoFile) hero_video_url = await uploadHeroVideo(heroVideoFile)
      const payload: any = {
        title: form.title, logline: form.logline || null, story_type: form.story_type,
        content_origin: form.content_origin, status: form.status, explicit: form.explicit,
        tip_enabled: form.tip_enabled, artist_id: form.artist_id || null,
        reading_theme: form.reading_theme, text_content: editor!.getHTML(),
        word_count: wordCount, read_time_minutes: readTime,
        contributors: contributors.length > 0 ? contributors : null,
        available_narrators: availableNarrators.length > 0 ? availableNarrators : null,
        available_bg_music: availableBgTracks.length > 0 ? availableBgTracks : null,
        content_warnings: form.content_warnings ? form.content_warnings.split(',').map((s: string) => s.trim()).filter(Boolean) : null,
      }
      if (cover_image_url) payload.cover_image_url = cover_image_url
      if (hero_video_url) payload.hero_video_url = hero_video_url
      let error
      if (story?.id) {
        ;({ error } = await supabase.from('stories').update(payload).eq('id', story.id))
      } else {
        ;({ error } = await supabase.from('stories').insert(payload))
      }
      if (error) throw error
      setMessage({ type: 'success', text: `✓ Story "${form.title}" ${story?.id ? 'updated' : 'saved'} successfully!` })
      setLoading(false)
      setSavedDone(true)
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
      setLoading(false)
    }
  }

  // Handle media insertion
  const handleMediaInsert = (type: 'image' | 'audio' | 'video' | 'link') => {
    setMediaModal(type)
  }

  const handleInsert = (type: 'image' | 'audio' | 'video', attrs: Record<string, string>) => {
    if (!editor) return
    if (type === 'image') {
      editor.chain().focus().setImage({ src: attrs.src, alt: attrs.alt || '' }).run()
    } else if (type === 'audio') {
      editor.chain().focus().insertContent({ type: 'audio', attrs: { src: attrs.src, title: attrs.title || '' } }).run()
    } else if (type === 'video') {
      editor.chain().focus().insertContent({ type: 'video', attrs: { src: attrs.src, caption: attrs.caption || '' } }).run()
    }
    setMediaModal(null)
  }

  const handleLinkInsert = (url: string) => {
    if (!editor) return
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
    setMediaModal(null)
  }

  const handleLinkRemove = () => {
    if (!editor) return
    editor.chain().focus().unsetLink().run()
    setMediaModal(null)
  }

  const currentLinkUrl = editor?.getAttributes('link').href || ''
  const selectedAuthorName = artists.find(a => a.id === form.artist_id)?.name || ''

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={s.sectionTitle}>{story?.id ? 'Edit Story' : 'New Story'}</div>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: message.type === 'success' ? 'rgba(43,122,143,0.1)' : 'rgba(220,60,60,0.1)', border: `1px solid ${message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c'}`, color: message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c', fontSize: '14px' }}>
          {message.text}
        </div>
      )}

      <div style={s.field}>
        <label style={s.label}>Title *</label>
        <input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Story title" />
      </div>

      <div style={s.field}>
        <label style={s.label}>Logline <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— one or two sentences shown on cards and hero</span></label>
        <textarea style={s.textarea} value={form.logline} onChange={e => setForm(f => ({ ...f, logline: e.target.value }))} placeholder="Hook the reader in two sentences." />
      </div>

      <div style={s.row}>
        <div>
          <label style={s.label}>Story Type</label>
          <select style={s.select} value={form.story_type} onChange={e => setForm(f => ({ ...f, story_type: e.target.value }))}>
            {STORY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={s.label}>Primary Author</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select style={{ ...s.select, flex: 1 }} value={form.artist_id} onChange={e => setForm(f => ({ ...f, artist_id: e.target.value }))}>
              <option value="">— no primary author —</option>
              {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button style={{ ...s.btnSmall, whiteSpace: 'nowrap', background: 'var(--bg-card)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }} onClick={() => setShowNewAuthor(!showNewAuthor)}>+ New</button>
          </div>
          {showNewAuthor && <InlineNewAuthor onCreated={artist => { setArtists(prev => [...prev, artist]); setForm(f => ({ ...f, artist_id: artist.id })); setShowNewAuthor(false) }} onCancel={() => setShowNewAuthor(false)} />}
        </div>
      </div>

      <div style={s.field}>
        <label style={s.label}>Additional Contributors</label>
        <ContributorPicker artists={artists} contributors={contributors} onChange={setContributors} />
      </div>

      <div style={s.row}>
        <div>
          <label style={s.label}>Content Origin</label>
          <select style={s.select} value={form.content_origin} onChange={e => setForm(f => ({ ...f, content_origin: e.target.value }))}>
            <option value="100% human">🧑 100% Human</option>
            <option value="human+ai">🧑🤖 Human + AI</option>
            <option value="ai generated">🤖 AI Generated</option>
          </select>
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

      <div style={s.row}>
        <div>
          <label style={s.label}>Cover Image</label>
          <input type="file" style={s.fileInput} onChange={e => setCoverFile(e.target.files?.[0] || null)} />
          {coverFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {coverFile.name}</div>}
          <div style={{ marginTop: '12px' }}>
            <label style={s.label}>Hero Video <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— optional; loops silently behind the Stories hero (overrides the cover)</span></label>
            <input type="file" accept="video/*" style={s.fileInput} onChange={e => setHeroVideoFile(e.target.files?.[0] || null)} />
            {heroVideoFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>✓ {heroVideoFile.name}</div>}
          </div>
        </div>
        <div>
          <label style={s.label}>Default Reading Theme</label>
          <select style={s.select} value={form.reading_theme} onChange={e => setForm(f => ({ ...f, reading_theme: e.target.value }))}>
            <option value="light">Light</option>
            <option value="sepia">Sepia</option>
            <option value="dark">Dark</option>
            <option value="night">Night</option>
          </select>
        </div>
      </div>

      <div style={s.field}>
        <label style={s.label}>Content Warnings <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— comma-separated</span></label>
        <input style={s.input} value={form.content_warnings} onChange={e => setForm(f => ({ ...f, content_warnings: e.target.value }))} placeholder="grief, strong language, mature themes" />
      </div>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', flexWrap: 'wrap' as const }}>
        <label style={s.checkbox}><input type="checkbox" checked={form.explicit} onChange={e => setForm(f => ({ ...f, explicit: e.target.checked }))} /> 🅴 Explicit (18+)</label>
        <label style={s.checkbox}><input type="checkbox" checked={form.tip_enabled} onChange={e => setForm(f => ({ ...f, tip_enabled: e.target.checked }))} /> 💰 Pay-what-you-want tips enabled</label>
      </div>

      <div style={s.divider} />

      {/* Reading experience */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reading Experience</div>
        <div style={s.row}>
          <div>
            <label style={s.label}>Available Narrators <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— max 3 · {availableNarrators.length} selected</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {narrators.map(n => (
                <label key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={availableNarrators.includes(n.id)} disabled={!availableNarrators.includes(n.id) && availableNarrators.length >= 3}
                    onChange={e => { if (e.target.checked) setAvailableNarrators(p => [...p, n.id]); else setAvailableNarrators(p => p.filter(id => id !== n.id)) }} />
                  {n.name}{n.voice_style ? ` · ${n.voice_style}` : ''}
                </label>
              ))}
              {narrators.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No narrators yet. <a href="/admin/narrators" style={{ color: 'var(--accent-primary)' }}>Add narrators →</a></div>}
            </div>
          </div>
          <div>
            <label style={s.label}>Background Music <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— max 4 · {availableBgTracks.length} selected</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
              {bgTracks.map(t => (
                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={availableBgTracks.includes(t.id)} disabled={!availableBgTracks.includes(t.id) && availableBgTracks.length >= 4}
                    onChange={e => { if (e.target.checked) setAvailableBgTracks(p => [...p, t.id]); else setAvailableBgTracks(p => p.filter(id => id !== t.id)) }} />
                  {t.title}
                </label>
              ))}
              {bgTracks.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No background tracks yet. <a href="/admin/narrators" style={{ color: 'var(--accent-primary)' }}>Add tracks →</a></div>}
            </div>
          </div>
        </div>
      </div>

      <div style={s.divider} />

      {/* TipTap editor */}
      <div style={s.field}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
          <label style={s.label}>Story Content *</label>
          <span style={{ fontSize: '12px', color: editorHasContent ? 'var(--text-muted)' : '#dc3c3c' }}>
            {wordCount.toLocaleString()} words · ~{readTime} min read
          </span>
        </div>
        <EditorToolbar editor={editor} onFindReplace={() => setShowFindReplace(f => !f)} onPreview={() => setShowPreview(true)} onInsertMedia={handleMediaInsert} />
        {showFindReplace && editor && <FindReplace editor={editor} onClose={() => setShowFindReplace(false)} />}
        <div style={{ border: '1px solid var(--border)', borderRadius: showFindReplace ? '0' : '0 0 8px 8px', background: 'var(--bg-card)', overflow: 'hidden', borderTop: 'none' }}>
          <EditorContent editor={editor} />
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
          Toolbar: <strong>B</strong> bold · <em>I</em> italic · H2/H3 headings · " " blockquote · 🔗 link · 🖼 image · 🎵 audio · 🎬 video · 🔍 find &amp; replace · 👁 preview
        </div>
      </div>

      <div style={{ padding: '14px 16px', borderRadius: '8px', background: 'rgba(43,122,143,0.06)', border: '1px solid rgba(43,122,143,0.2)', fontSize: '13px', color: 'var(--accent-primary)', marginBottom: '20px' }}>
        💡 Select text then click 🔗 to add a link. Click 🖼 🎵 🎬 to embed media inline within the story.
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
        <button style={s.btn} onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : story?.id ? 'Update Story' : 'Save Story'}</button>
        <button style={s.btnSecondary} onClick={() => setShowPreview(true)}>👁 Preview</button>
        <button style={s.btnSecondary} onClick={onCancel}>Cancel</button>
      </div>

      {/* Modals */}
      {mediaModal === 'link' && (
        <LinkModal currentUrl={currentLinkUrl} onInsert={handleLinkInsert} onRemove={handleLinkRemove} onClose={() => setMediaModal(null)} />
      )}
      {(mediaModal === 'image' || mediaModal === 'audio' || mediaModal === 'video') && (
        <MediaModal type={mediaModal} onInsert={attrs => handleInsert(mediaModal, attrs)} onClose={() => setMediaModal(null)} />
      )}
      {showPreview && editor && (
        <PreviewModal title={form.title} logline={form.logline} html={editor.getHTML()} authorName={selectedAuthorName} onClose={() => setShowPreview(false)} />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminStories() {
  const [mode, setMode]                   = useState<'list' | 'new' | 'edit'>('list')
  const [stories, setStories]             = useState<Story[]>([])
  const [artists, setArtists]             = useState<Artist[]>([])
  const [narrators, setNarrators]         = useState<Narrator[]>([])
  const [bgTracks, setBgTracks]           = useState<Track[]>([])
  const [editingStory, setEditingStory]   = useState<Story | null>(null)
  const [loading, setLoading]             = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
        if (data?.role !== 'admin') window.location.href = '/dashboard'
      })
    })
  }, [])

  const loadAll = useCallback(async () => {
    const [{ data: storiesData }, { data: artistsData }, { data: narratorsData }, { data: tracksData }] = await Promise.all([
      supabase.from('stories').select('id, title, logline, story_type, status, content_origin, explicit, tip_enabled, read_time_minutes, word_count, artist_id, created_at').order('created_at', { ascending: false }),
      supabase.from('artists').select('id, name, photo_url').order('name'),
      supabase.from('narrators').select('id, name, tagline, voice_style').eq('is_active', true).order('display_order'),
      supabase.from('background_tracks').select('id, title, mood, description').eq('is_active', true).order('display_order'),
    ])
    setStories(storiesData || [])
    setArtists(artistsData || [])
    setNarrators(narratorsData || [])
    setBgTracks(tracksData || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleDelete = async () => {
    if (!confirmDelete) return
    await supabase.from('stories').delete().eq('id', confirmDelete.id)
    setStories(prev => prev.filter(s => s.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const artistName = (id: string | null) => artists.find(a => a.id === id)?.name || '—'
  const statusBadge = (status: string) => {
    const color = status === 'published' ? 'green' : status === 'private' ? 'blue' : 'gray'
    return <span style={s.badge(color)}>{status}</span>
  }

  if (loading) return <div style={{ ...s.page, paddingTop: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Story Editor</h1>
      <p style={s.subtitle}>Write, edit, and publish stories · <a href="/admin/narrators" style={{ color: 'var(--accent-primary)' }}>Manage Narrators →</a></p>

      <div style={s.topRow}>
        <button style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: mode !== 'list' ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: mode !== 'list' ? 'white' : 'var(--text-muted)' }}
          onClick={() => { setMode('new'); setEditingStory(null) }}>
          + New Story
        </button>
        <button style={s.manageBtn(mode === 'list')} onClick={() => setMode('list')}>
          {mode === 'list' ? 'All Stories' : '← All Stories'}
        </button>
        <div style={{ flex: 1 }} />
        <Link href="/admin/content" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>← Content Library</Link>
      </div>

      {(mode === 'new' || mode === 'edit') && (
        <StoryForm artists={artists} narrators={narrators} bgTracks={bgTracks} story={editingStory} onSave={() => { loadAll() }} onCancel={() => setMode('list')} />
      )}

      {mode === 'list' && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
            <div style={s.sectionTitle}>All Stories</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{stories.length} total</div>
          </div>

          {confirmDelete && (
            <div style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.3)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', fontSize: '14px', color: '#dc3c3c' }}>
              <div style={{ marginBottom: '12px' }}>⚠️ Delete <strong>"{confirmDelete.title}"</strong>? This cannot be undone.</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={s.btnDanger} onClick={handleDelete}>Yes, delete</button>
                <button style={s.btnCancel} onClick={() => setConfirmDelete(null)}>Cancel</button>
              </div>
            </div>
          )}

          {stories.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📖</div>
              <div style={{ fontSize: '15px', marginBottom: '16px' }}>No stories yet.</div>
              <button style={s.btn} onClick={() => setMode('new')}>Write your first story</button>
            </div>
          )}

          {stories.map(story => (
            <div key={story.id} style={s.manageRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.manageLabel}>{story.title}</div>
                <div style={s.manageMeta}>
                  {artistName(story.artist_id)} · {STORY_TYPE_LABELS[story.story_type] || story.story_type}
                  {story.read_time_minutes ? ` · ${story.read_time_minutes} min read` : ''}
                  {story.word_count ? ` · ${story.word_count.toLocaleString()} words` : ''}
                  {story.explicit ? ' · 🅴' : ''}
                  {story.tip_enabled ? ' · 💰' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
                {statusBadge(story.status)}
                <button style={s.btnEdit} onClick={() => { setEditingStory(story); setMode('edit') }}>Edit</button>
                <Link href={`/stories/${story.id}`} target="_blank" style={{ ...s.btnEdit, textDecoration: 'none', display: 'inline-block' }}>View →</Link>
                <button style={s.btnDanger} onClick={() => setConfirmDelete({ id: story.id, title: story.title })}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
