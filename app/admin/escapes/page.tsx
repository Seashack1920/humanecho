'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TipTapLink from '@tiptap/extension-link'

// ─── Types ───────────────────────────────────────────────────────────────────

type Issue = {
  id: string
  issue_number: number
  slug: string
  title: string
  subtitle: string | null
  logline: string | null
  cover_image_url: string | null
  theme: string
  status: string
  published_at: string | null
  created_at: string
}

type Block = {
  id: string
  issue_id: string
  block_type: string
  position: number
  content: Record<string, any>
  settings: Record<string, any>
}

type Artist = { id: string; name: string; photo_url: string | null }
type Track  = { id: string; title: string; artist_id: string | null; cloudinary_url?: string }
type Story  = { id: string; title: string }

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  page:         { maxWidth: '900px', margin: '0 auto', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' },
  h1:           { fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' },
  subtitle:     { fontSize: '14px', color: 'var(--text-muted)', marginBottom: '40px' },
  topRow:       { display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' as const, alignItems: 'center' },
  card:         { background: 'var(--bg-secondary)', borderRadius: '16px', padding: '28px', marginBottom: '24px', border: '1px solid var(--border)' },
  label:        { display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' },
  input:        { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  select:       { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const },
  textarea:     { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const, minHeight: '80px', resize: 'vertical' as const },
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
  badge:        (color: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500', background: color === 'green' ? 'rgba(43,180,100,0.15)' : color === 'blue' ? 'rgba(43,122,143,0.15)' : 'rgba(150,150,150,0.15)', color: color === 'green' ? '#2bb464' : color === 'blue' ? 'var(--accent-primary)' : 'var(--text-muted)' }),
  manageBtn:    (active: boolean) => ({ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: '1px solid var(--accent-secondary)', cursor: 'pointer', background: active ? 'var(--accent-secondary)' : 'transparent', color: active ? 'white' : 'var(--accent-secondary)' }),
}

// ─── Constants ────────────────────────────────────────────────────────────────

const THEMES = [
  { value: 'midnight', label: '🌙 Midnight', desc: 'Dark, warm accent, cinematic' },
  { value: 'linen',    label: '📄 Linen',    desc: 'Off-white, warm, literary' },
  { value: 'ember',    label: '🔥 Ember',    desc: 'Burgundy, gold accents, rich' },
  { value: 'slate',    label: '🪨 Slate',    desc: 'Cool grey, modern, editorial' },
  { value: 'verdant',  label: '🌿 Verdant',  desc: 'Deep green, calm, natural' },
]

const BLOCK_TYPES = [
  { value: 'hero',           label: '🖼 Hero',           desc: 'Full-width image with title overlay' },
  { value: 'text',           label: '📝 Text',           desc: 'Rich text block' },
  { value: 'image',          label: '🖼 Image',          desc: 'Single image with caption' },
  { value: 'image_pair',     label: '🖼🖼 Image Pair',   desc: 'Two images side by side' },
  { value: 'pull_quote',     label: '❝ Pull Quote',      desc: 'Large styled quote' },
  { value: 'section_header', label: '📌 Section Header', desc: 'Named section break' },
  { value: 'video',          label: '🎬 Video',          desc: 'Upload or embed video' },
  { value: 'audio',          label: '🎵 Audio',          desc: 'Upload audio or link to track' },
  { value: 'artist_card',    label: '🎤 Artist Card',    desc: 'Artist profile card' },
  { value: 'story_teaser',   label: '📖 Story Teaser',   desc: 'Link to a story' },
  { value: 'divider',        label: '— Divider',         desc: 'Visual section break' },
]

// ─── Dimension Requirements ───────────────────────────────────────────────────

type DimReq = { minW: number; minH: number; recW: number; recH: number }

const DIM_REQS: Record<string, DimReq> = {
  'escapes/hero':   { minW: 1200, minH: 600, recW: 1600, recH: 900 },
  'escapes/covers': { minW: 800,  minH: 600, recW: 1200, recH: 900 },
  'escapes/images': { minW: 800,  minH: 500, recW: 1200, recH: 750 },
}

function getImageDimensions(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload  = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(url); reject() }
    img.src = url
  })
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function statusBadge(status: string) {
  const color = status === 'published' ? 'green' : status === 'private' ? 'blue' : 'gray'
  return <span style={s.badge(color)}>{status}</span>
}

function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const sec = Math.floor(secs % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ─── Inline Audio Player ──────────────────────────────────────────────────────

function InlineAudioPlayer({ url, title }: { url: string; title?: string }) {
  const audioRef              = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = new Audio(url)
    audioRef.current = audio
    audio.addEventListener('timeupdate', () => setProgress(audio.currentTime))
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration))
    audio.addEventListener('ended', () => { setPlaying(false); setProgress(0) })
    return () => { audio.pause(); audio.src = '' }
  }, [url])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = parseFloat(e.target.value)
    setProgress(audio.currentTime)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', marginTop: '10px' }}>
      <button onClick={togglePlay} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary)', border: 'none', cursor: 'pointer', color: 'white', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {playing ? '⏸' : '▶'}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>}
        <input type="range" min="0" max={duration || 100} step="0.1" value={progress} onChange={seek} style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }} />
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(progress)} / {formatTime(duration)}
      </div>
    </div>
  )
}

// ─── Image Uploader ───────────────────────────────────────────────────────────

function ImageUploader({ value, onChange, folder = 'escapes/images', label = 'Image' }: {
  value: string
  onChange: (url: string) => void
  folder?: string
  label?: string
}) {
  const [uploading, setUploading]   = useState(false)
  const [error, setError]           = useState('')
  const [warning, setWarning]       = useState('')
  const [dims, setDims]             = useState<{ w: number; h: number } | null>(null)

  const req = DIM_REQS[folder] || DIM_REQS['escapes/images']

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 20 * 1024 * 1024)   { setError('Image must be under 20MB'); return }
    setWarning(''); setError('')

    // Check dimensions before uploading
    try {
      const d = await getImageDimensions(file)
      setDims(d)
      if (d.w < req.minW || d.h < req.minH) {
        setWarning(`⚠ Image is ${d.w}×${d.h}px — below the minimum ${req.minW}×${req.minH}px. It may appear soft at full size. You can still upload it.`)
      } else if (d.w < req.recW || d.h < req.recH) {
        setWarning(`Image is ${d.w}×${d.h}px. Recommended ${req.recW}×${req.recH}px for best quality.`)
      }
    } catch {
      // Can't read dimensions — proceed anyway
    }

    setUploading(true)
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

      {/* Dimension hint */}
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
        Recommended: {req.recW}×{req.recH}px · Min: {req.minW}×{req.minH}px · Export at full resolution from Photos or Lightroom
      </div>

      {/* Preview */}
      {value && (
        <div style={{ marginBottom: '10px', position: 'relative', display: 'inline-block' }}>
          <img src={value} alt="Preview" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)' }} />
          {dims && (
            <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: 'white' }}>
              {dims.w}×{dims.h}px
            </div>
          )}
          <button onClick={() => { onChange(''); setDims(null); setWarning('') }} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', color: 'white', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      )}

      {/* Upload area */}
      <label style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '20px', borderRadius: '8px', border: `2px dashed ${warning ? '#d4823a' : 'var(--border)'}`, background: 'var(--bg-card)', cursor: uploading ? 'not-allowed' : 'pointer', gap: '6px' }}
        onMouseEnter={e => !uploading && (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = warning ? '#d4823a' : 'var(--border)')}
      >
        <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        <div style={{ fontSize: '24px' }}>{uploading ? '⏳' : '📷'}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' as const }}>
          {uploading ? 'Uploading...' : value ? 'Click to replace image' : 'Click to upload from files or Photos'}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>JPG, PNG, HEIC, WebP · Max 20MB</div>
      </label>

      {warning && (
        <div style={{ fontSize: '12px', color: '#d4823a', marginTop: '8px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(212,130,58,0.1)', border: '1px solid rgba(212,130,58,0.3)' }}>
          {warning}
        </div>
      )}
      {error && <div style={{ fontSize: '12px', color: '#dc3c3c', marginTop: '6px' }}>{error}</div>}
    </div>
  )
}

// ─── Video Uploader ───────────────────────────────────────────────────────────

function VideoUploader({ value, onChange, embedUrl, onEmbedChange }: {
  value: string
  onChange: (url: string) => void
  embedUrl: string
  onEmbedChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const [mode, setMode]           = useState<'upload' | 'embed'>(value ? 'upload' : embedUrl ? 'embed' : 'upload')

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('video/')) { setError('Please select a video file'); return }
    if (file.size > 500 * 1024 * 1024)  { setError('Video must be under 500MB'); return }
    setUploading(true); setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'humanecho_upload')
      formData.append('folder', 'escapes/video')
      formData.append('resource_type', 'video')
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`, { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      onChange(data.secure_url)
      onEmbedChange('')
    } catch (err) { setError((err as Error).message) }
    setUploading(false)
  }

  return (
    <div>
      <label style={s.label}>Video</label>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {(['upload', 'embed'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer', background: mode === m ? 'var(--accent-primary)' : 'none', color: mode === m ? 'white' : 'var(--text-muted)' }}>
            {m === 'upload' ? '⬆ Upload file' : '🔗 Embed URL'}
          </button>
        ))}
      </div>
      {mode === 'upload' && (
        <>
          {value && (
            <div style={{ marginBottom: '10px' }}>
              <video src={value} controls style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', border: '1px solid var(--border)' }} />
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
              {uploading ? 'Uploading — this may take a moment...' : value ? 'Click to replace video' : 'Click to upload video from files'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MP4, MOV, WebM · Max 500MB</div>
          </label>
        </>
      )}
      {mode === 'embed' && (
        <div>
          <input style={s.input} value={embedUrl} onChange={e => { onEmbedChange(e.target.value); onChange('') }} placeholder="YouTube, Vimeo, or direct video URL" />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Paste a YouTube, Vimeo, or direct .mp4 URL</div>
        </div>
      )}
      {error && <div style={{ fontSize: '12px', color: '#dc3c3c', marginTop: '6px' }}>{error}</div>}
    </div>
  )
}

// ─── Audio Uploader ───────────────────────────────────────────────────────────

function AudioUploader({ uploadUrl, trackId, trackTitle, onUploadChange, onTrackChange, onTrackTitleChange, tracks }: {
  uploadUrl: string
  trackId: string
  trackTitle: string
  onUploadChange: (url: string) => void
  onTrackChange: (id: string) => void
  onTrackTitleChange: (title: string) => void
  tracks: Track[]
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const [mode, setMode]           = useState<'upload' | 'track'>(trackId ? 'track' : 'upload')

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('audio/')) { setError('Please select an audio file'); return }
    if (file.size > 100 * 1024 * 1024)  { setError('Audio must be under 100MB'); return }
    setUploading(true); setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'humanecho_upload')
      formData.append('folder', 'escapes/audio')
      formData.append('resource_type', 'video')
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`, { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      onUploadChange(data.secure_url)
      onTrackChange('')
    } catch (err) { setError((err as Error).message) }
    setUploading(false)
  }

  const activeUrl   = uploadUrl || tracks.find(t => t.id === trackId)?.cloudinary_url || ''
  const activeTitle = uploadUrl ? trackTitle : tracks.find(t => t.id === trackId)?.title || ''

  return (
    <div>
      <label style={s.label}>Audio</label>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {(['upload', 'track'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer', background: mode === m ? 'var(--accent-primary)' : 'none', color: mode === m ? 'white' : 'var(--text-muted)' }}>
            {m === 'upload' ? '⬆ Upload audio' : '🎵 Platform track'}
          </button>
        ))}
      </div>
      {mode === 'upload' && (
        <>
          <label style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '20px', borderRadius: '8px', border: '2px dashed var(--border)', background: 'var(--bg-card)', cursor: uploading ? 'not-allowed' : 'pointer', gap: '6px' }}
            onMouseEnter={e => !uploading && (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <input type="file" accept="audio/*" style={{ display: 'none' }} disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            <div style={{ fontSize: '24px' }}>{uploading ? '⏳' : '🎵'}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' as const }}>
              {uploading ? 'Uploading...' : uploadUrl ? 'Click to replace audio' : 'Click to upload audio from files'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MP3, WAV, AAC, FLAC · Max 100MB</div>
          </label>
          {uploadUrl && (
            <div style={s.field}>
              <label style={{ ...s.label, marginTop: '10px' }}>Track title (shown in player)</label>
              <input style={s.input} value={trackTitle} onChange={e => onTrackTitleChange(e.target.value)} placeholder="Optional title" />
            </div>
          )}
        </>
      )}
      {mode === 'track' && (
        <select style={s.select} value={trackId} onChange={e => { onTrackChange(e.target.value); onUploadChange('') }}>
          <option value="">— Select a platform track —</option>
          {tracks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      )}
      {activeUrl && <InlineAudioPlayer url={activeUrl} title={activeTitle} />}
      {error && <div style={{ fontSize: '12px', color: '#dc3c3c', marginTop: '6px' }}>{error}</div>}
    </div>
  )
}

// ─── Block Editor Fields ──────────────────────────────────────────────────────

function BlockFields({ block, artists, tracks, stories, onChange }: {
  block: Block
  artists: Artist[]
  tracks: Track[]
  stories: Story[]
  onChange: (content: Record<string, any>, settings: Record<string, any>) => void
}) {
  const c = block.content
  const set = block.settings
  const upd = (content: Partial<typeof c>, settings: Partial<typeof set> = {}) =>
    onChange({ ...c, ...content }, { ...set, ...settings })

  switch (block.block_type) {
    case 'hero':
      return (
        <div>
          <div style={s.field}>
            <ImageUploader label="Hero Image" value={c.image_url || ''} onChange={url => upd({ image_url: url })} folder="escapes/hero" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Title</label>
            <input style={s.input} value={c.title || ''} onChange={e => upd({ title: e.target.value })} placeholder="Hero headline" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Subtitle</label>
            <input style={s.input} value={c.subtitle || ''} onChange={e => upd({ subtitle: e.target.value })} placeholder="Supporting text" />
          </div>
          <div style={s.row}>
            <div>
              <label style={s.label}>Text Alignment</label>
              <select style={s.select} value={set.text_align || 'left'} onChange={e => upd({}, { text_align: e.target.value })}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Overlay Opacity (0–100)</label>
              <input type="number" min="0" max="100" style={s.input} value={set.overlay_opacity ?? 50} onChange={e => upd({}, { overlay_opacity: parseInt(e.target.value) })} />
            </div>
          </div>
        </div>
      )

    case 'text':
      return (
        <div>
          <div style={s.field}>
            <label style={s.label}>Text Content</label>
            <MiniRichEditor value={c.html || ''} onChange={html => upd({ html })} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Width</label>
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
            <ImageUploader label="Image" value={c.cloudinary_url || ''} onChange={url => upd({ cloudinary_url: url })} folder="escapes/images" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Caption</label>
            <input style={s.input} value={c.caption || ''} onChange={e => upd({ caption: e.target.value })} placeholder="Optional caption" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Alt Text</label>
            <input style={s.input} value={c.alt || ''} onChange={e => upd({ alt: e.target.value })} placeholder="Describe the image for accessibility" />
          </div>
          <div style={s.row}>
            <div>
              <label style={s.label}>Width</label>
              <select style={s.select} value={set.width || 'full'} onChange={e => upd({}, { width: e.target.value })}>
                <option value="full">Full width</option>
                <option value="wide">Wide</option>
                <option value="narrow">Narrow</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Alignment</label>
              <select style={s.select} value={set.alignment || 'center'} onChange={e => upd({}, { alignment: e.target.value })}>
                <option value="center">Center</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
        </div>
      )

    case 'image_pair':
      return (
        <div style={s.row}>
          <div>
            <ImageUploader label="Image 1" value={c.image_1_url || ''} onChange={url => upd({ image_1_url: url })} folder="escapes/images" />
            <input style={{ ...s.input, marginTop: '8px' }} value={c.caption_1 || ''} onChange={e => upd({ caption_1: e.target.value })} placeholder="Caption 1 (optional)" />
          </div>
          <div>
            <ImageUploader label="Image 2" value={c.image_2_url || ''} onChange={url => upd({ image_2_url: url })} folder="escapes/images" />
            <input style={{ ...s.input, marginTop: '8px' }} value={c.caption_2 || ''} onChange={e => upd({ caption_2: e.target.value })} placeholder="Caption 2 (optional)" />
          </div>
        </div>
      )

    case 'pull_quote':
      return (
        <div>
          <div style={s.field}>
            <label style={s.label}>Quote</label>
            <textarea style={s.textarea} value={c.quote || ''} onChange={e => upd({ quote: e.target.value })} placeholder="The words that stop a reader mid-scroll..." />
          </div>
          <div style={s.row}>
            <div>
              <label style={s.label}>Attribution</label>
              <input style={s.input} value={c.attribution || ''} onChange={e => upd({ attribution: e.target.value })} placeholder="— Author Name" />
            </div>
            <div>
              <label style={s.label}>Style</label>
              <select style={s.select} value={set.style || 'accent'} onChange={e => upd({}, { style: e.target.value })}>
                <option value="accent">Accent (highlighted)</option>
                <option value="minimal">Minimal (subtle)</option>
              </select>
            </div>
          </div>
        </div>
      )

    case 'section_header':
      return (
        <div>
          <div style={s.field}>
            <label style={s.label}>Section Title</label>
            <input style={s.input} value={c.title || ''} onChange={e => upd({ title: e.target.value })} placeholder="In This Issue" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Subtitle (optional)</label>
            <input style={s.input} value={c.subtitle || ''} onChange={e => upd({ subtitle: e.target.value })} placeholder="Supporting line" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Style</label>
            <select style={s.select} value={set.style || 'standard'} onChange={e => upd({}, { style: e.target.value })}>
              <option value="standard">Standard</option>
              <option value="bold">Bold</option>
              <option value="subtle">Subtle</option>
            </select>
          </div>
        </div>
      )

    case 'video':
      return (
        <div>
          <div style={s.field}>
            <VideoUploader value={c.cloudinary_url || ''} onChange={url => upd({ cloudinary_url: url })} embedUrl={c.embed_url || ''} onEmbedChange={url => upd({ embed_url: url })} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Caption (optional)</label>
            <input style={s.input} value={c.caption || ''} onChange={e => upd({ caption: e.target.value })} placeholder="Optional caption" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Width</label>
            <select style={s.select} value={set.width || 'full'} onChange={e => upd({}, { width: e.target.value })}>
              <option value="full">Full width</option>
              <option value="wide">Wide</option>
              <option value="narrow">Narrow</option>
            </select>
          </div>
        </div>
      )

    case 'audio':
      return (
        <div>
          <AudioUploader
            uploadUrl={c.upload_url || ''} trackId={c.track_id || ''} trackTitle={c.track_title || ''}
            onUploadChange={url => upd({ upload_url: url, track_id: '' })}
            onTrackChange={id => upd({ track_id: id, upload_url: '' })}
            onTrackTitleChange={title => upd({ track_title: title })}
            tracks={tracks}
          />
        </div>
      )

    case 'artist_card':
      return (
        <div>
          <div style={s.field}>
            <label style={s.label}>Artist</label>
            <select style={s.select} value={c.artist_id || ''} onChange={e => upd({ artist_id: e.target.value })}>
              <option value="">— Select an artist —</option>
              {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>Style</label>
            <select style={s.select} value={set.style || 'full'} onChange={e => upd({}, { style: e.target.value })}>
              <option value="full">Full (photo + bio)</option>
              <option value="compact">Compact (photo + name)</option>
            </select>
          </div>
        </div>
      )

    case 'story_teaser':
      return (
        <div>
          <div style={s.field}>
            <label style={s.label}>Story</label>
            <select style={s.select} value={c.story_id || ''} onChange={e => upd({ story_id: e.target.value })}>
              <option value="">— Select a story —</option>
              {stories.map(st => <option key={st.id} value={st.id}>{st.title}</option>)}
            </select>
          </div>
          <div style={s.field}>
            <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={set.show_excerpt ?? true} onChange={e => upd({}, { show_excerpt: e.target.checked })} />
              Show excerpt/logline
            </label>
          </div>
        </div>
      )

    case 'divider':
      return (
        <div style={s.field}>
          <label style={s.label}>Style</label>
          <select style={s.select} value={set.style || 'line'} onChange={e => upd({}, { style: e.target.value })}>
            <option value="line">Line</option>
            <option value="space">Space (invisible break)</option>
            <option value="ornament">Ornament (decorative)</option>
          </select>
        </div>
      )

    default:
      return <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No fields for this block type.</div>
  }
}

// ─── Block Row ────────────────────────────────────────────────────────────────

function BlockRow({ block, index, total, artists, tracks, stories, onMove, onDelete, onUpdate }: {
  block: Block
  index: number
  total: number
  artists: Artist[]
  tracks: Track[]
  stories: Story[]
  onMove: (index: number, direction: 'up' | 'down') => void
  onDelete: (id: string) => void
  onUpdate: (id: string, content: Record<string, any>, settings: Record<string, any>) => void
}) {
  const [expanded, setExpanded]         = useState(false)
  const [localContent, setLocalContent] = useState(block.content)
  const [localSettings, setLocalSettings] = useState(block.settings)
  const [saving, setSaving]             = useState(false)

  const blockLabel = BLOCK_TYPES.find(b => b.value === block.block_type)?.label || block.block_type

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(block.id, localContent, localSettings)
    setSaving(false)
    setExpanded(false)
  }

  const preview = block.content.title
    || block.content.quote
    || block.content.html?.replace(/<[^>]+>/g, '').slice(0, 60)
    || (block.content.cloudinary_url || block.content.image_url ? '📷 Image uploaded' : '')
    || (block.content.upload_url ? '🎵 Audio uploaded' : '')
    || (block.content.track_id ? '🎵 Platform track linked' : '')
    || (block.content.embed_url ? `🎬 ${block.content.embed_url.slice(0, 40)}...` : '')
    || '—'

  return (
    <div style={{ marginBottom: '8px', borderRadius: '10px', border: expanded ? '1px solid var(--accent-primary)' : '1px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden', transition: 'border-color 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <button onClick={() => onMove(index, 'up')} disabled={index === 0} style={{ ...s.btnGhost, padding: '2px 8px', opacity: index === 0 ? 0.3 : 1, fontSize: '11px' }}>↑</button>
          <button onClick={() => onMove(index, 'down')} disabled={index === total - 1} style={{ ...s.btnGhost, padding: '2px 8px', opacity: index === total - 1 ? 0.3 : 1, fontSize: '11px' }}>↓</button>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{blockLabel}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{preview}</div>
        </div>
<button style={{
  ...s.btnEdit,
  marginRight: 0,
  background: expanded ? 'rgba(43,122,143,0.1)' : 'transparent',
  color: expanded ? 'var(--accent-primary)' : 'var(--text-muted)',
  border: expanded ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
}}
  onClick={() => setExpanded(e => !e)}>
  {expanded ? 'Close' : 'Edit'}
</button>
        <button style={s.btnDanger} onClick={() => onDelete(block.id)}>✕</button>
      </div>
      {expanded && (
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <BlockFields
            block={{ ...block, content: localContent, settings: localSettings }}
            artists={artists} tracks={tracks} stories={stories}
            onChange={(content, settings) => { setLocalContent(content); setLocalSettings(settings) }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button style={s.btnSave} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Block'}</button>
            <button style={s.btnCancel} onClick={() => { setExpanded(false); setLocalContent(block.content); setLocalSettings(block.settings) }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Add Block Panel ──────────────────────────────────────────────────────────

function AddBlockPanel({ onAdd, onClose }: { onAdd: (type: string) => void; onClose: () => void }) {
  return (
    <div style={{ ...s.card, border: '1px solid var(--accent-primary)', background: 'rgba(43,122,143,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Add a Block</div>
        <button style={s.btnCancel} onClick={onClose}>Cancel</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
        {BLOCK_TYPES.map(bt => (
          <button key={bt.value} onClick={() => { onAdd(bt.value); onClose() }}
            style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left' as const, transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' }}>{bt.label}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{bt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Issue Form ───────────────────────────────────────────────────────────────

function IssueForm({ issue, onSave, onCancel }: {
  issue?: Issue | null
  onSave: (id: string) => void
  onCancel: () => void
}) {
  const [loading, setLoading]                       = useState(false)
  const [message, setMessage]                       = useState<{ type: string; text: string } | null>(null)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const [form, setForm] = useState({
    issue_number:    issue?.issue_number || '',
    slug:            issue?.slug || '',
    title:           issue?.title || '',
    subtitle:        issue?.subtitle || '',
    logline:         issue?.logline || '',
    theme:           issue?.theme || 'midnight',
    status:          issue?.status || 'draft',
    cover_image_url: issue?.cover_image_url || '',
  })

  const handleTitleChange = (title: string) => {
    setForm(f => ({ ...f, title, slug: slugManuallyEdited ? f.slug : slugify(title) }))
  }

  const handleSave = async () => {
    if (!form.title)        return setMessage({ type: 'error', text: 'Title is required' })
    if (!form.slug)         return setMessage({ type: 'error', text: 'Slug is required' })
    if (!form.issue_number) return setMessage({ type: 'error', text: 'Issue number is required' })
    setLoading(true); setMessage(null)
    try {
      const payload: any = {
        issue_number:    parseInt(String(form.issue_number)),
        slug:            form.slug,
        title:           form.title,
        subtitle:        form.subtitle || null,
        logline:         form.logline || null,
        theme:           form.theme,
        status:          form.status,
        cover_image_url: form.cover_image_url || null,
        updated_at:      new Date().toISOString(),
      }
      if (form.status === 'published' && !issue?.published_at) {
        payload.published_at = new Date().toISOString()
      }
      let id = issue?.id
      if (issue?.id) {
        const { error } = await supabase.from('issues').update(payload).eq('id', issue.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('issues').insert(payload).select('id').single()
        if (error) throw error
        id = data.id
      }
      setMessage({ type: 'success', text: `✓ Issue "${form.title}" saved!` })
      setLoading(false)
      setTimeout(() => onSave(id!), 1500)
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message })
      setLoading(false)
    }
  }

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={s.sectionTitle}>{issue?.id ? 'Edit Issue Details' : 'New Issue'}</div>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: message.type === 'success' ? 'rgba(43,122,143,0.1)' : 'rgba(220,60,60,0.1)', border: `1px solid ${message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c'}`, color: message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c', fontSize: '14px' }}>
          {message.text}
        </div>
      )}

      <div style={s.row}>
        <div>
          <label style={s.label}>Issue Number *</label>
          <input type="number" style={s.input} value={form.issue_number} onChange={e => setForm(f => ({ ...f, issue_number: e.target.value }))} placeholder="1" />
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
        <label style={s.label}>Title *</label>
        <input style={s.input} value={form.title} onChange={e => handleTitleChange(e.target.value)} placeholder="The Quiet Issue" />
      </div>

      <div style={s.field}>
        <label style={s.label}>Slug * <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>— URL: /escapes/your-slug</span></label>
        <input style={s.input} value={form.slug} onChange={e => { setSlugManuallyEdited(true); setForm(f => ({ ...f, slug: slugify(e.target.value) })) }} placeholder="the-quiet-issue" />
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Auto-generated from title. Edit to customise.</div>
      </div>

      <div style={s.field}>
        <label style={s.label}>Subtitle</label>
        <input style={s.input} value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Music, words and stillness" />
      </div>

      <div style={s.field}>
        <label style={s.label}>Logline</label>
        <textarea style={s.textarea} value={form.logline} onChange={e => setForm(f => ({ ...f, logline: e.target.value }))} placeholder="A sentence or two that captures the mood of this issue." />
      </div>

      <div style={s.row}>
        <div>
          <ImageUploader label="Cover Image" value={form.cover_image_url} onChange={url => setForm(f => ({ ...f, cover_image_url: url }))} folder="escapes/covers" />
        </div>
        <div>
          <label style={s.label}>Issue Theme</label>
          <select style={s.select} value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))}>
            {THEMES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
          </select>
          <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)' }}>
            {THEMES.find(t => t.value === form.theme)?.desc}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
        <button style={s.btn} onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : issue?.id ? 'Save Changes' : 'Create Issue →'}</button>
        <button style={s.btnSecondary} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Block Editor ─────────────────────────────────────────────────────────────

function BlockEditor({ issue, artists, tracks, stories, onDone }: {
  issue: Issue
  artists: Artist[]
  tracks: Track[]
  stories: Story[]
  onDone: () => void
}) {
  const [blocks, setBlocks]             = useState<Block[]>([])
  const [loading, setLoading]           = useState(true)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [message, setMessage]           = useState<string | null>(null)

  const loadBlocks = useCallback(async () => {
    const { data } = await supabase.from('issue_blocks').select('*').eq('issue_id', issue.id).order('position')
    setBlocks(data || [])
    setLoading(false)
  }, [issue.id])

  useEffect(() => { loadBlocks() }, [loadBlocks])

  const addBlock = async (type: string) => {
    const maxPos = blocks.length > 0 ? Math.max(...blocks.map(b => b.position)) : 0
    const { data, error } = await supabase.from('issue_blocks')
      .insert({ issue_id: issue.id, block_type: type, position: maxPos + 1, content: {}, settings: {} })
      .select('*').single()
    if (!error && data) { setBlocks(prev => [...prev, data]); flash('Block added') }
  }

  const deleteBlock = async (id: string) => {
    await supabase.from('issue_blocks').delete().eq('id', id)
    setBlocks(prev => prev.filter(b => b.id !== id))
    flash('Block removed')
  }

  const updateBlock = async (id: string, content: Record<string, any>, settings: Record<string, any>) => {
    await supabase.from('issue_blocks').update({ content, settings }).eq('id', id)
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content, settings } : b))
    flash('Block saved')
  }

  const moveBlock = async (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...blocks]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newBlocks.length) return
    const posA = newBlocks[index].position
    const posB = newBlocks[swapIndex].position
    newBlocks[index].position = posB
    newBlocks[swapIndex].position = posA
    await Promise.all([
      supabase.from('issue_blocks').update({ position: posB }).eq('id', newBlocks[index].id),
      supabase.from('issue_blocks').update({ position: posA }).eq('id', newBlocks[swapIndex].id),
    ])
    ;[newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]]
    setBlocks(newBlocks)
  }

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(null), 2000) }

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <div style={s.sectionTitle}>Block Editor — {issue.title}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Issue #{issue.issue_number} · {issue.theme} theme · {blocks.length} block{blocks.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href={`/escapes/${issue.slug}`} target="_blank" rel="noopener noreferrer" style={{ ...s.btnEdit, textDecoration: 'none', display: 'inline-block' }}>Preview →</a>
          <button style={s.btnSecondary} onClick={onDone}>← All Issues</button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '8px 14px', borderRadius: '6px', background: 'rgba(43,122,143,0.1)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', fontSize: '13px', marginBottom: '12px' }}>
          ✓ {message}
        </div>
      )}

      <div style={s.divider} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '14px' }}>Loading blocks...</div>
      ) : (
        <>
          {blocks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📰</div>
              <div style={{ fontSize: '15px', marginBottom: '16px' }}>No blocks yet — add your first block below.</div>
            </div>
          )}
          {blocks.map((block, index) => (
            <BlockRow key={block.id} block={block} index={index} total={blocks.length}
              artists={artists} tracks={tracks} stories={stories}
              onMove={moveBlock} onDelete={deleteBlock} onUpdate={updateBlock} />
          ))}
          {showAddPanel ? (
            <AddBlockPanel onAdd={addBlock} onClose={() => setShowAddPanel(false)} />
          ) : (
            <button onClick={() => setShowAddPanel(true)}
              style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '2px dashed var(--border)', background: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              + Add Block
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminEscapes() {
  const [mode, setMode]                   = useState<'list' | 'new' | 'edit-details' | 'edit-blocks'>('list')
  const [issues, setIssues]               = useState<Issue[]>([])
  const [artists, setArtists]             = useState<Artist[]>([])
  const [tracks, setTracks]               = useState<Track[]>([])
  const [stories, setStories]             = useState<Story[]>([])
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
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
    const [{ data: issuesData }, { data: artistsData }, { data: tracksData }, { data: storiesData }] = await Promise.all([
      supabase.from('issues').select('*').order('issue_number', { ascending: false }),
      supabase.from('artists').select('id, name, photo_url').order('name'),
      supabase.from('tracks').select('id, title, artist_id, cloudinary_url').order('title'),
      supabase.from('stories').select('id, title').eq('status', 'published').order('title'),
    ])
    setIssues(issuesData || [])
    setArtists(artistsData || [])
    setTracks(tracksData || [])
    setStories(storiesData || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleDelete = async () => {
    if (!confirmDelete) return
    await supabase.from('issues').delete().eq('id', confirmDelete.id)
    setIssues(prev => prev.filter(i => i.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const handleIssueSaved = async (id: string) => {
    await loadAll()
    const { data } = await supabase.from('issues').select('*').eq('id', id).single()
    if (data) { setSelectedIssue(data); setMode('edit-blocks') }
  }

  if (loading) return (
    <div style={{ ...s.page, paddingTop: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
  )

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Escapes</h1>
      <p style={s.subtitle}>Create and publish magazine-style issues</p>

      <div style={s.topRow}>
        <button style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: mode === 'new' ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: mode === 'new' ? 'white' : 'var(--text-muted)' }}
          onClick={() => { setMode('new'); setSelectedIssue(null) }}>
          + New Issue
        </button>
        <button style={s.manageBtn(mode === 'list')} onClick={() => setMode('list')}>All Issues</button>
      </div>

      {mode === 'new' && <IssueForm onSave={handleIssueSaved} onCancel={() => setMode('list')} />}

      {mode === 'edit-details' && selectedIssue && (
        <IssueForm issue={selectedIssue} onSave={async () => { await loadAll(); setMode('list') }} onCancel={() => setMode('list')} />
      )}

      {mode === 'edit-blocks' && selectedIssue && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', fontSize: '13px', padding: 0 }}
              onClick={() => setMode('edit-details')}>← Edit issue details</button>
          </div>
          <BlockEditor issue={selectedIssue} artists={artists} tracks={tracks} stories={stories} onDone={() => { setMode('list'); loadAll() }} />
        </>
      )}

      {mode === 'list' && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
            <div style={s.sectionTitle}>All Issues</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{issues.length} total</div>
          </div>

          {confirmDelete && (
            <div style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.3)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', fontSize: '14px', color: '#dc3c3c' }}>
              <div style={{ marginBottom: '12px' }}>⚠️ Delete <strong>"{confirmDelete.title}"</strong>? This will also delete all blocks and cannot be undone.</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={s.btnDanger} onClick={handleDelete}>Yes, delete</button>
                <button style={s.btnCancel} onClick={() => setConfirmDelete(null)}>Cancel</button>
              </div>
            </div>
          )}

          {issues.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📰</div>
              <div style={{ fontSize: '15px', marginBottom: '16px' }}>No issues yet.</div>
              <button style={s.btn} onClick={() => setMode('new')}>Create your first issue</button>
            </div>
          )}

          {issues.map(issue => (
            <div key={issue.id} style={s.manageRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.manageLabel}>Issue #{issue.issue_number} — {issue.title}</div>
                <div style={s.manageMeta}>
                  /{issue.slug} · {issue.theme} theme
                  {issue.published_at ? ` · Published ${new Date(issue.published_at).toLocaleDateString()}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
                {statusBadge(issue.status)}
                <button style={s.btnEdit} onClick={() => { setSelectedIssue(issue); setMode('edit-blocks') }}>Edit Blocks</button>
                <button style={{ ...s.btnEdit, marginRight: 0 }} onClick={() => { setSelectedIssue(issue); setMode('edit-details') }}>Details</button>
                <a href={`/escapes/${issue.slug}`} target="_blank" rel="noopener noreferrer" style={{ ...s.btnEdit, textDecoration: 'none', display: 'inline-block', marginRight: 0 }}>View →</a>
                <button style={s.btnDanger} onClick={() => setConfirmDelete({ id: issue.id, title: issue.title })}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
