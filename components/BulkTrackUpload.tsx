'use client'

/**
 * Bulk Track Upload — drop many audio files at once → editable rows → one
 * "Upload all". Shared by the admin portal and the artist dashboard. The host
 * supplies the artist/album context and its own GenrePicker.
 */

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadToCloudinary } from '@/lib/cloudinaryUpload'

type Opt = { id: string; name?: string; title?: string }
type GenrePickerComponent = React.ComponentType<{
  genres: { id: string; name: string }[]
  selected: string[]
  onChange: (v: string[]) => void
  max?: number
}>

type BulkRow = {
  id: string
  file: File
  title: string
  track_number: string
  duration: string
  track_type: string
  image: File | null
  state: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
  progress: number
}

function readAudioDuration(file: File): Promise<string> {
  return new Promise((resolve) => {
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
}

export default function BulkTrackUpload({
  artists, albums, selectedArtistId, selectedAlbumId, genres, albumGenres, onUploaded, GenrePicker,
}: {
  artists: Opt[]
  albums: Opt[]
  selectedArtistId: string
  selectedAlbumId: string
  genres: { id: string; name: string }[]
  albumGenres: string[]
  onUploaded: (t: { title: string; duration: string }) => void
  GenrePicker: GenrePickerComponent
}) {
  const slugify = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const [rows, setRows] = useState<BulkRow[]>([])
  const [defStatus, setDefStatus] = useState('draft')
  const [defOrigin, setDefOrigin] = useState('100% human')
  const [defType, setDefType]     = useState('song')
  const [defPrice, setDefPrice]   = useState('')
  const [defGenres, setDefGenres] = useState<string[]>(albumGenres || [])
  const [busy, setBusy]       = useState(false)
  const [summary, setSummary] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const titleFromFile = (name: string) =>
    name.replace(/\.[^.]+$/, '').replace(/^\d{1,3}[\s._-]+/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim()

  const fileFormat = (name: string) => {
    const ext = (name.split('.').pop() || '').toLowerCase()
    return ['flac', 'wav', 'mp3'].includes(ext) ? ext : 'mp3'
  }

  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return
    const arr = Array.from(files).filter(f => /\.(flac|wav|mp3)$/i.test(f.name) || f.type.startsWith('audio'))
    if (arr.length === 0) return
    setRows(prev => {
      const startNum = prev.length
      const newRows: BulkRow[] = arr.map((file, i) => ({
        id: `${file.name}-${file.size}-${startNum + i}`,
        file, title: titleFromFile(file.name), track_number: String(startNum + i + 1),
        duration: '', track_type: defType, image: null, state: 'pending', progress: 0,
      }))
      newRows.forEach(r => {
        readAudioDuration(r.file).then(dur => setRows(cur => cur.map(x => x.id === r.id ? { ...x, duration: dur } : x)))
      })
      return [...prev, ...newRows]
    })
  }

  const updateRow = (id: string, patch: Partial<BulkRow>) => setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id))
  const pending = rows.filter(r => r.state === 'pending' || r.state === 'error')

  const uploadAll = async () => {
    if (!selectedArtistId) { setSummary({ type: 'error', text: 'No artist selected.' }); return }
    if (pending.length === 0) return
    setBusy(true); setSummary(null)
    const artistName = artists.find(a => a.id === selectedArtistId)?.name || 'unknown'
    const albumTitle = albums.find(a => a.id === selectedAlbumId)?.title || 'singles'
    let ok = 0, fail = 0
    for (const row of pending) {
      if (!row.title.trim()) { updateRow(row.id, { state: 'error', error: 'Title required' }); fail++; continue }
      updateRow(row.id, { state: 'uploading', error: undefined, progress: 0 })
      try {
        const trackSlug = `${String(row.track_number || '00').padStart(2, '0')}-${slugify(row.title)}`
        const folder = `${slugify(artistName)}/albums/${slugify(albumTitle)}/${trackSlug}`
        const audio = await uploadToCloudinary(row.file, folder, 'video', p => updateRow(row.id, { progress: p }))
        const image = row.image ? await uploadToCloudinary(row.image, folder, 'image') : null
        const { data, error } = await supabase.from('tracks').insert({
          album_id: selectedAlbumId || null, artist_id: selectedArtistId,
          title: row.title.trim(),
          track_number: row.track_number ? parseInt(row.track_number) : null,
          track_type: row.track_type, duration: row.duration,
          cloudinary_url: audio.url, cloudinary_public_id: audio.public_id,
          file_format: fileFormat(row.file.name),
          track_image_url: image?.url ?? '',
          price: defPrice ? parseFloat(defPrice) : null,
          status: defStatus, content_origin: defOrigin,
        }).select().single()
        if (error) throw error
        const g = defGenres.length ? defGenres : (albumGenres || [])
        if (g.length) {
          await supabase.from('content_genres').insert(g.map(genreId => ({ content_type: 'track', content_id: data.id, genre_id: genreId })))
        }
        updateRow(row.id, { state: 'done', progress: 100 })
        onUploaded({ title: data.title, duration: data.duration || '' })
        ok++
      } catch (err) {
        updateRow(row.id, { state: 'error', error: (err as Error).message })
        fail++
      }
    }
    setBusy(false)
    setSummary({ type: fail ? 'error' : 'success', text: `Uploaded ${ok} track${ok !== 1 ? 's' : ''}${fail ? ` · ${fail} failed — fix and click Upload again` : ''}.` })
  }

  const stateIcon = (r: BulkRow) =>
    r.state === 'done' ? <span style={{ color: 'var(--accent-primary)' }}>✓</span>
    : r.state === 'uploading' ? <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{r.progress}%</span>
    : r.state === 'error' ? <span style={{ color: '#dc3c3c' }} title={r.error}>✗</span>
    : <span style={{ color: 'var(--text-muted)' }}>•</span>

  const albumLabel = selectedAlbumId ? albums.find(a => a.id === selectedAlbumId)?.title : 'Standalone singles (no album)'
  const artistLabel = artists.find(a => a.id === selectedArtistId)?.name

  return (
    <div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
        Adding tracks to <strong style={{ color: 'var(--text-secondary)' }}>{albumLabel}</strong>
        {artistLabel ? <> by <strong style={{ color: 'var(--text-secondary)' }}>{artistLabel}</strong></> : null}
      </div>

      <label
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        style={{ display: 'block', textAlign: 'center', padding: '28px 16px', borderRadius: '12px', cursor: 'pointer', border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border)'}`, background: dragOver ? 'rgba(43,122,143,0.06)' : 'var(--bg-secondary)', marginBottom: '20px' }}
      >
        <input type="file" accept=".flac,.wav,.mp3,audio/*" multiple style={{ display: 'none' }}
          onChange={e => { addFiles(e.target.files); e.currentTarget.value = '' }} />
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>🎵 Drop audio files here, or click to choose</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>FLAC, WAV or MP3 · select many at once</div>
      </label>

      {rows.length > 0 && (
        <>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Applied to all {rows.length} track{rows.length !== 1 ? 's' : ''}</div>
            <div style={s.row}>
              <div>
                <label style={s.label}>Status</label>
                <select style={s.select} value={defStatus} onChange={e => setDefStatus(e.target.value)}>
                  <option value="draft">Draft</option><option value="private">Private</option><option value="published">Published</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Content Origin</label>
                <select style={s.select} value={defOrigin} onChange={e => setDefOrigin(e.target.value)}>
                  <option value="100% human">🧑 100% Human</option><option value="human+ai">🧑🤖 Human + AI</option><option value="ai generated">🤖 AI Generated</option>
                </select>
              </div>
            </div>
            <div style={s.row}>
              <div>
                <label style={s.label}>Default Type</label>
                <select style={s.select} value={defType} onChange={e => { setDefType(e.target.value); setRows(prev => prev.map(r => r.state === 'pending' ? { ...r, track_type: e.target.value } : r)) }}>
                  <option value="song">Song</option><option value="instrumental">Instrumental</option><option value="audio_story">Audio Story</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Price ($) — blank = not for sale</label>
                <input style={s.input} type="number" step="0.01" value={defPrice} onChange={e => setDefPrice(e.target.value)} placeholder="1.29" />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Genres (up to 3)</label>
              {albumGenres.length > 0 && defGenres.length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginBottom: '8px', cursor: 'pointer' }} onClick={() => setDefGenres(albumGenres)}>↑ Inherit from album</div>
              )}
              <GenrePicker genres={genres} selected={defGenres} onChange={setDefGenres} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            {rows.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderBottom: '1px solid var(--border)', opacity: r.state === 'done' ? 0.6 : 1 }}>
                <div style={{ width: '18px', textAlign: 'center', flexShrink: 0 }}>{stateIcon(r)}</div>
                <input style={{ ...s.input, width: '52px', flexShrink: 0, padding: '6px 8px', textAlign: 'center' }} value={r.track_number} onChange={e => updateRow(r.id, { track_number: e.target.value })} disabled={busy} title="Track number" />
                <input style={{ ...s.input, flex: 1, padding: '6px 10px' }} value={r.title} onChange={e => updateRow(r.id, { title: e.target.value })} disabled={busy} placeholder="Track title" />
                <select style={{ ...s.select, width: '120px', flexShrink: 0, padding: '6px 8px' }} value={r.track_type} onChange={e => updateRow(r.id, { track_type: e.target.value })} disabled={busy}>
                  <option value="song">Song</option><option value="instrumental">Instrumental</option><option value="audio_story">Audio Story</option>
                </select>
                <span style={{ width: '46px', textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>{r.duration || '—'}</span>
                <label style={{ fontSize: '11px', color: r.image ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, width: '54px', textAlign: 'center' }} title={r.image ? r.image.name : 'Optional track image'}>
                  {r.image ? '✓ img' : '+ img'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={busy} onChange={e => updateRow(r.id, { image: e.target.files?.[0] || null })} />
                </label>
                <button onClick={() => removeRow(r.id)} disabled={busy} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }} title="Remove">×</button>
              </div>
            ))}
          </div>

          {summary && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', background: summary.type === 'success' ? 'rgba(43,122,143,0.1)' : 'rgba(220,60,60,0.1)', border: `1px solid ${summary.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c'}`, color: summary.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c' }}>{summary.text}</div>
          )}

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={s.btn} onClick={uploadAll} disabled={busy || pending.length === 0}>{busy ? 'Uploading…' : `Upload ${pending.length} track${pending.length !== 1 ? 's' : ''}`}</button>
            <button style={s.btnSecondary} onClick={() => { setRows([]); setSummary(null) }} disabled={busy}>Clear list</button>
          </div>
        </>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' },
  field: { marginBottom: '14px' },
  label: { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px' },
  select: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px' },
  btn: { padding: '11px 22px', borderRadius: '999px', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '11px 22px', borderRadius: '999px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
}
