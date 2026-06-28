'use client'

/**
 * Human Echo — Subscriber Playlist Builder
 * ------------------------------------------------------------------
 * Subscriber-only. Gated on profiles.is_subscriber === true.
 * Matches site design: DM Sans body, Playfair Display headings,
 * site CSS variables, and the real PlayerContext for audition.
 *
 * BEFORE USE:
 *  1) Run migrations:
 *       alter table playlists add column if not exists hero_url text;
 *       alter table playlists add column if not exists is_public boolean default false;
 *  2) Install reorder lib in your app:
 *       npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
 *  3) Cloudinary unsigned preset `Playlist_Builder` + NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.
 *
 * Save as e.g. app/playlists/page.jsx
 * ------------------------------------------------------------------
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/context/PlayerContext'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, verticalListSortingStrategy,
  useSortable, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = 'Playlist_Builder'

const TABS = [
  { id: 'search', label: 'Search tracks' },
  { id: 'faves', label: 'Your Faves' },
  { id: 'artists', label: 'Artists' },
  { id: 'genres', label: 'Genres' },
  { id: 'new', label: 'New' },
]

/* ----------------------------- helpers ----------------------------- */

function durationToSeconds(d) {
  if (!d) return 0
  if (typeof d === 'number') return d
  const parts = String(d).split(':').map((n) => parseInt(n, 10))
  if (parts.some(Number.isNaN)) return 0
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}
function formatRuntime(total) {
  if (!total) return '0 min'
  const h = Math.floor(total / 3600)
  const m = Math.round((total % 3600) / 60)
  return h > 0 ? `${h} hr ${m} min` : `${m} min`
}
function gradientFromString(str) {
  let hash = 0
  const s = str || 'untitled'
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash)
  const h1 = Math.abs(hash) % 360
  return `linear-gradient(135deg, hsl(${h1} 45% 30%), hsl(${(h1 + 50) % 360} 50% 16%))`
}
async function uploadToCloudinary(file) {
  if (!CLOUD_NAME) throw new Error('Image uploads aren’t configured yet.')
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', UPLOAD_PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST', body: form,
  })
  if (!res.ok) throw new Error('That image didn’t upload. Try another one.')
  return (await res.json()).secure_url
}
// Match the homepage's safe pattern: fetch artist names per-id, no FK join.
async function attachArtistNames(tracks) {
  const ids = [...new Set(tracks.map((t) => t.artist_id).filter(Boolean))]
  if (ids.length === 0) return tracks.map((t) => ({ ...t, artistName: 'Unknown artist' }))
  const { data } = await supabase.from('artists').select('id, name').in('id', ids)
  const nameById = Object.fromEntries((data || []).map((a) => [a.id, a.name]))
  return tracks.map((t) => ({ ...t, artistName: nameById[t.artist_id] || 'Unknown artist' }))
}

/* --------------------------- cover art ----------------------------- */

function CoverArt({ url, title, className, style }) {
  if (url) {
    return <img src={url} alt={title ? `${title} cover` : 'cover'} className={className}
      style={{ objectFit: 'cover', ...style }} />
  }
  return <div className={className} style={{ background: gradientFromString(title), ...style }} />
}

/* ------------------------- sortable row ---------------------------- */

function SortableTrack({ t, index, isPlaying, onPreview, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: t.rowId })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }
  return (
    <li ref={setNodeRef} style={style} className={`he-trackRow ${isPlaying ? 'is-playing' : ''}`}>
      <span className="he-grip" {...attributes} {...listeners} aria-label="Drag to reorder">⋮⋮</span>
      <span className="he-num">{index + 1}</span>
      <button className="he-playBtn" onClick={() => onPreview(t)} title={isPlaying ? 'Playing' : 'Play'} aria-label="Play track">
        {isPlaying ? <span className="he-eq"><i/><i/><i/></span> : <span className="he-playIcon">▶</span>}
      </button>
      <CoverArt url={t.track_image_url} title={t.title} className="he-trackThumb" />
      <button className="he-trackMain" onClick={() => onPreview(t)} title="Preview">
        <span className="he-trackTitle">{t.title}</span>
        <span className="he-trackArtist">{t.artistName}</span>
      </button>
      <span className="he-trackDur">{t.duration || ''}</span>
      <button className="he-iconBtn" onClick={() => onRemove(t.rowId)} title="Remove">✕</button>
    </li>
  )
}

/* ------------------------------ page ------------------------------- */

export default function PlaylistBuilder() {
  const player = (() => { try { return usePlayer() } catch { return null } })()
  const playTrack = player?.playTrack
  const currentTrack = player?.currentTrack
  const isPlaying = player?.isPlaying

  const [authState, setAuthState] = useState('loading')
  const [userId, setUserId] = useState(null)

  const [playlists, setPlaylists] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [tracksInPlaylist, setTracksInPlaylist] = useState([])
  const [loadingActive, setLoadingActive] = useState(false)

  const [tab, setTab] = useState('search')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [finderLoading, setFinderLoading] = useState(false)
  const [artists, setArtists] = useState([])
  const [genres, setGenres] = useState([])
  const [openArtist, setOpenArtist] = useState(null)
  const [openGenre, setOpenGenre] = useState(null)

  const [toast, setToast] = useState(null)
  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(showToast._t)
    showToast._t = setTimeout(() => setToast(null), 2600)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  /* gate */
  useEffect(() => {
    let off = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (off) return
        if (!user) return setAuthState('anon')
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles').select('is_subscriber').eq('id', user.id).single()
        if (off) return
        setAuthState(profile?.is_subscriber ? 'ok' : 'not_subscribed')
      } catch { if (!off) setAuthState('anon') }
    })()
    return () => { off = true }
  }, [])

  /* load playlists */
  const loadPlaylists = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('playlists')
      .select('id, title, description, cover_url, hero_url, mood_tags, is_public, created_at')
      .eq('user_id', userId).eq('is_curated', false)
      .order('created_at', { ascending: false })
    if (data) setPlaylists(data)
  }, [userId])
  useEffect(() => { if (authState === 'ok') loadPlaylists() }, [authState, loadPlaylists])

  /* load active tracks */
  const loadActiveTracks = useCallback(async (pid) => {
    setLoadingActive(true)
    const { data } = await supabase
      .from('playlist_tracks')
      .select('id, position, track_id, tracks(id, title, duration, cloudinary_url, stream_url, track_image_url, artist_id)')
      .eq('playlist_id', pid).order('position', { ascending: true })
    setLoadingActive(false)
    if (!data) return setTracksInPlaylist([])
    const base = data.map((r) => ({ rowId: r.id, position: r.position, ...r.tracks }))
    setTracksInPlaylist(await attachArtistNames(base))
  }, [])
  useEffect(() => { activeId ? loadActiveTracks(activeId) : setTracksInPlaylist([]) }, [activeId, loadActiveTracks])

  const activePlaylist = useMemo(
    () => playlists.find((p) => p.id === activeId) || null, [playlists, activeId])

  /* finder data: artists + genres lists */
  useEffect(() => {
    if (authState !== 'ok') return
    ;(async () => {
      const { data: a } = await supabase.from('artists')
        .select('id, name, photo_url').is('deleted_at', null).order('name')
      if (a) setArtists(a)
      const { data: g } = await supabase.from('genres')
        .select('id, name').eq('content_type', 'music').order('name')
      if (g) setGenres(g)
    })()
  }, [authState])

  /* search by title */
  useEffect(() => {
    if (tab !== 'search') return
    if (!search.trim()) { setResults([]); return }
    let off = false
    setFinderLoading(true)
    const t = setTimeout(async () => {
      const { data } = await supabase.from('tracks')
        .select('id, title, duration, cloudinary_url, stream_url, track_image_url, artist_id')
        .eq('status', 'published').ilike('title', `%${search.trim()}%`).limit(25)
      if (off) return
      setResults(await attachArtistNames(data || []))
      setFinderLoading(false)
    }, 280)
    return () => { off = true; clearTimeout(t) }
  }, [search, tab])

  /* new tab */
  useEffect(() => {
    if (tab !== 'new') return
    let off = false
    setFinderLoading(true)
    ;(async () => {
      const { data } = await supabase.from('tracks')
        .select('id, title, duration, cloudinary_url, stream_url, track_image_url, artist_id')
        .eq('status', 'published').order('created_at', { ascending: false }).limit(10)
      if (off) return
      setResults(await attachArtistNames(data || []))
      setFinderLoading(false)
    })()
    return () => { off = true }
  }, [tab])

  /* your faves — hearted tracks */
  useEffect(() => {
    if (tab !== 'faves' || !userId) return
    let off = false
    setFinderLoading(true)
    ;(async () => {
      const { data: likes } = await supabase.from('likes')
        .select('content_id, created_at')
        .eq('user_id', userId).eq('content_type', 'track')
        .order('created_at', { ascending: false })
      const ids = (likes || []).map((l) => l.content_id)
      if (off) return
      if (ids.length === 0) { setResults([]); setFinderLoading(false); return }
      const { data } = await supabase.from('tracks')
        .select('id, title, duration, cloudinary_url, stream_url, track_image_url, artist_id')
        .eq('status', 'published').in('id', ids)
      if (off) return
      // preserve the heart order
      const order = Object.fromEntries(ids.map((id, i) => [id, i]))
      const sorted = (data || []).sort((a, b) => (order[a.id] ?? 0) - (order[b.id] ?? 0))
      setResults(await attachArtistNames(sorted))
      setFinderLoading(false)
    })()
    return () => { off = true }
  }, [tab, userId])

  /* artist -> tracks */
  async function openArtistTracks(artist) {
    setOpenArtist(artist); setFinderLoading(true)
    const { data } = await supabase.from('tracks')
      .select('id, title, duration, cloudinary_url, stream_url, track_image_url, artist_id')
      .eq('status', 'published').eq('artist_id', artist.id).order('title')
    setResults(await attachArtistNames(data || []))
    setFinderLoading(false)
  }
  /* genre -> tracks (via content_genres) */
  async function openGenreTracks(genre) {
    setOpenGenre(genre); setFinderLoading(true)
    const { data: links } = await supabase.from('content_genres')
      .select('content_id').eq('content_type', 'track').eq('genre_id', genre.id)
    const ids = (links || []).map((l) => l.content_id)
    if (ids.length === 0) { setResults([]); setFinderLoading(false); return }
    const { data } = await supabase.from('tracks')
      .select('id, title, duration, cloudinary_url, stream_url, track_image_url, artist_id')
      .eq('status', 'published').in('id', ids).order('title')
    setResults(await attachArtistNames(data || []))
    setFinderLoading(false)
  }

  /* audition via real player */
  const preview = useCallback((track) => {
    if (playTrack) playTrack(track)
    else showToast('Player isn’t available here.')
  }, [playTrack, showToast])

  /* mutations */
  async function createPlaylist() {
    const { data, error } = await supabase.from('playlists')
      .insert({ user_id: userId, title: 'Untitled playlist', is_curated: false, status: 'active' })
      .select('id, title, description, cover_url, hero_url, mood_tags, is_public, created_at').single()
    if (error) return showToast('Could not create playlist.')
    setPlaylists((p) => [data, ...p]); setActiveId(data.id)
  }
  async function updateActive(patch) {
    if (!activeId) return
    setPlaylists((p) => p.map((x) => (x.id === activeId ? { ...x, ...patch } : x)))
    const { error } = await supabase.from('playlists').update(patch).eq('id', activeId)
    if (error) showToast('Change not saved — try again.')
  }
  async function deletePlaylist(id) {
    await supabase.from('playlist_tracks').delete().eq('playlist_id', id)
    const { error } = await supabase.from('playlists').delete().eq('id', id)
    if (error) return showToast('Could not delete.')
    setPlaylists((p) => p.filter((x) => x.id !== id))
    if (activeId === id) setActiveId(null)
  }
  async function addTrack(track) {
    if (tracksInPlaylist.some((t) => t.id === track.id)) return showToast('Already added.')
    const position = tracksInPlaylist.length
    const { data, error } = await supabase.from('playlist_tracks')
      .insert({ playlist_id: activeId, track_id: track.id, position }).select('id').single()
    if (error) return showToast('Could not add track.')
    setTracksInPlaylist((p) => [...p, { rowId: data.id, position, ...track }])
  }
  async function removeTrack(rowId) {
    const next = tracksInPlaylist.filter((t) => t.rowId !== rowId).map((t, i) => ({ ...t, position: i }))
    setTracksInPlaylist(next)
    await supabase.from('playlist_tracks').delete().eq('id', rowId)
    persistOrder(next)
  }
  async function persistOrder(list) {
    for (let i = 0; i < list.length; i++) {
      await supabase.from('playlist_tracks').update({ position: i }).eq('id', list[i].rowId)
    }
  }
  function onDragEnd(e) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = tracksInPlaylist.findIndex((t) => t.rowId === active.id)
    const to = tracksInPlaylist.findIndex((t) => t.rowId === over.id)
    const next = arrayMove(tracksInPlaylist, from, to).map((t, i) => ({ ...t, position: i }))
    setTracksInPlaylist(next); persistOrder(next)
  }

  /* image upload */
  const coverInputRef = useRef(null)
  const heroInputRef = useRef(null)
  const [uploading, setUploading] = useState(null)
  async function handleImage(e, kind) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return showToast('That image is over 10MB — pick a smaller one.')
    setUploading(kind)
    try {
      const url = await uploadToCloudinary(file)
      await updateActive(kind === 'cover' ? { cover_url: url } : { hero_url: url })
    } catch (err) { showToast(err.message || 'Upload failed.') }
    finally { setUploading(null) }
  }

  /* share */
  function shareUrl(p) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/playlist/${p.id}`
  }
  async function copyShare(p) {
    if (!p.is_public) await updateActive({ is_public: true })
    try { await navigator.clipboard.writeText(shareUrl(p)); showToast('Link copied — your playlist is now shareable.') }
    catch { showToast('Could not copy link.') }
  }

  const totalSeconds = useMemo(
    () => tracksInPlaylist.reduce((a, t) => a + durationToSeconds(t.duration), 0), [tracksInPlaylist])

  /* ------------------------------ states ------------------------------ */
  if (authState === 'loading')
    return <Shell><Styles /><div className="he-center he-muted">Loading your studio…</div></Shell>
  if (authState === 'anon')
    return <Shell><Styles /><Gate title="Sign in to build playlists"
      body="Your playlists live with your Human Echo account. Log in to start one." cta="Log in" href="/login" /></Shell>
  if (authState === 'not_subscribed')
    return <Shell><Styles /><Gate title="Playlists are a member perk"
      body="Become a member to build your own playlists, add your own cover art, and share them with the world." cta="Become a member" href="/subscribe" /></Shell>

  return (
    <Shell>
      <Styles />
      <header className="he-head">
        <div>
          <a href="/profile" className="he-eyebrow" style={{ textDecoration: 'none' }}>← Your studio</a>
          <h1 className="he-title">Playlists</h1>
        </div>
        <button className="he-btn he-btn--primary" onClick={createPlaylist}>+ New playlist</button>
      </header>

      <div className="he-layout">
        <aside className="he-rail">
          {playlists.length === 0 && (
            <div className="he-empty he-empty--rail">
              <p>No playlists yet.</p>
              <button className="he-link" onClick={createPlaylist}>Make your first one →</button>
            </div>
          )}
          <ul className="he-railList">
            {playlists.map((p) => (
              <li key={p.id}>
                <button className={`he-railItem ${p.id === activeId ? 'is-active' : ''}`} onClick={() => setActiveId(p.id)}>
                  <CoverArt url={p.cover_url} title={p.title} className="he-railThumb" />
                  <span className="he-railMeta">
                    <span className="he-railName">{p.title || 'Untitled playlist'}</span>
                    {p.description && <span className="he-railVibe">{p.description}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="he-main">
          {!activePlaylist && (
            <div className="he-empty he-empty--main">
              <p className="he-muted">Pick a playlist on the left, or start a new one.</p>
            </div>
          )}

          {activePlaylist && (
            <>
              <section className="he-hero"
                style={activePlaylist.hero_url
                  ? { backgroundImage: `url(${activePlaylist.hero_url})` }
                  : { background: gradientFromString(activePlaylist.title) }}>
                <div className="he-hero__inner">
                  <button className="he-coverWrap" onClick={() => coverInputRef.current?.click()} disabled={uploading === 'cover'} title="Choose a cover photo">
                    <CoverArt url={activePlaylist.cover_url} title={activePlaylist.title} className="he-cover" />
                    <span className="he-coverHint">{uploading === 'cover' ? 'Uploading…' : (activePlaylist.cover_url ? 'Change photo' : 'Choose photo')}</span>
                  </button>
                  <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={(e) => handleImage(e, 'cover')} />

                  <div className="he-hero__text">
                    <input className="he-titleInput" value={activePlaylist.title || ''} placeholder="Name your playlist"
                      onChange={(e) => updateActive({ title: e.target.value })} />
                    <input className="he-vibeInput" value={activePlaylist.description || ''}
                      placeholder="What's this playlist for? (a mood, a moment, a dedication)"
                      onChange={(e) => updateActive({ description: e.target.value })} />
                    <p className="he-stats">
                      {tracksInPlaylist.length} {tracksInPlaylist.length === 1 ? 'track' : 'tracks'}
                      <span className="he-dot">·</span>{formatRuntime(totalSeconds)}
                    </p>
                  </div>
                </div>
              </section>

              <div className="he-actionRow">
                <button className="he-chipBtn" onClick={() => copyShare(activePlaylist)} title="Copy share link">
                  {activePlaylist.is_public ? '🔗 Copy link' : '🔗 Share'}
                </button>
                <a className="he-chipBtn"
                  href={`sms:?&body=${encodeURIComponent('Listen to my playlist "' + activePlaylist.title + '" on Human Echo: ' + shareUrl(activePlaylist))}`}
                  onClick={() => !activePlaylist.is_public && updateActive({ is_public: true })}>Text</a>
                <a className="he-chipBtn"
                  href={`mailto:?subject=${encodeURIComponent('A playlist for you: ' + activePlaylist.title)}&body=${encodeURIComponent('I made this on Human Echo: ' + shareUrl(activePlaylist))}`}
                  onClick={() => !activePlaylist.is_public && updateActive({ is_public: true })}>Email</a>
                <button className="he-chipBtn" onClick={() => heroInputRef.current?.click()} disabled={uploading === 'hero'}>
                  {uploading === 'hero' ? 'Uploading…' : (activePlaylist.hero_url ? 'Change banner' : 'Add banner')}
                </button>
                <input ref={heroInputRef} type="file" accept="image/*" hidden onChange={(e) => handleImage(e, 'hero')} />
              </div>

              <section className="he-tracks">
                {loadingActive && <p className="he-muted he-pad">Loading tracks…</p>}
                {!loadingActive && tracksInPlaylist.length === 0 && (
                  <div className="he-empty he-empty--tracks">
                    <p className="he-muted">Empty for now. Use the finder below to add tracks.</p>
                  </div>
                )}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={tracksInPlaylist.map((t) => t.rowId)} strategy={verticalListSortingStrategy}>
                    <ul className="he-trackList">
                      {tracksInPlaylist.map((t, i) => (
                        <SortableTrack key={t.rowId} t={t} index={i}
                          isPlaying={currentTrack?.id === t.id && isPlaying}
                          onPreview={preview} onRemove={removeTrack} />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              </section>

              <section className="he-finder">
                <div className="he-tabs">
                  {TABS.map((tb) => (
                    <button key={tb.id} className={`he-tab ${tab === tb.id ? 'is-on' : ''}`}
                      onClick={() => { setTab(tb.id); setOpenArtist(null); setOpenGenre(null); setResults([]) }}>
                      {tb.label}
                    </button>
                  ))}
                </div>

                {tab === 'search' && (
                  <input className="he-searchInput" value={search} placeholder="Search tracks by title…"
                    onChange={(e) => setSearch(e.target.value)} />
                )}

                {tab === 'artists' && !openArtist && (
                  <div className="he-browseGrid">
                    {artists.map((a) => (
                      <button key={a.id} className="he-browseCard" onClick={() => openArtistTracks(a)}>
                        <CoverArt url={a.photo_url} title={a.name} className="he-browseThumb he-round" />
                        <span className="he-browseName">{a.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {tab === 'artists' && openArtist && (
                  <button className="he-link he-back" onClick={() => { setOpenArtist(null); setResults([]) }}>← All artists</button>
                )}

                {tab === 'genres' && !openGenre && (
                  <div className="he-chips">
                    {genres.map((g) => (
                      <button key={g.id} className="he-moodChip" onClick={() => openGenreTracks(g)}>{g.name}</button>
                    ))}
                  </div>
                )}
                {tab === 'genres' && openGenre && (
                  <button className="he-link he-back" onClick={() => { setOpenGenre(null); setResults([]) }}>← All genres</button>
                )}

                {finderLoading && <p className="he-muted he-pad">Loading…</p>}
                {!finderLoading && (results.length > 0) && (
                  <ul className="he-resultList">
                    {results.map((t) => (
                      <li key={t.id} className="he-resultRow">
                        <button className="he-playBtn" onClick={() => preview(t)} title="Play" aria-label="Play track"><span className="he-playIcon">▶</span></button>
                        <CoverArt url={t.track_image_url} title={t.title} className="he-trackThumb" />
                        <button className="he-trackMain" onClick={() => preview(t)} title="Preview">
                          <span className="he-trackTitle">{t.title}</span>
                          <span className="he-trackArtist">{t.artistName}</span>
                        </button>
                        <span className="he-trackDur">{t.duration || ''}</span>
                        <button className="he-btn he-btn--ghost" onClick={() => addTrack(t)}>Add</button>
                      </li>
                    ))}
                  </ul>
                )}
                {!finderLoading && tab === 'search' && search.trim() && results.length === 0 && (
                  <p className="he-muted he-pad">No tracks match “{search.trim()}”.</p>
                )}
                {!finderLoading && tab === 'faves' && results.length === 0 && (
                  <p className="he-muted he-pad">No faves yet — heart tracks as you explore and they’ll show up here.</p>
                )}
              </section>

              <section className="he-foot">
                <button className="he-link he-link--danger" onClick={() => deletePlaylist(activePlaylist.id)}>Delete this playlist</button>
              </section>
            </>
          )}
        </main>
      </div>

      {toast && <div className="he-toast" role="status">{toast}</div>}
    </Shell>
  )
}

/* ------------------------- shell / gate / css ------------------------- */

function Shell({ children }) { return <div className="he-shell">{children}</div> }

function Gate({ title, body, cta, href }) {
  return (
    <div className="he-gate">
      <h1 className="he-gate__title">{title}</h1>
      <p className="he-gate__body">{body}</p>
      <a className="he-btn he-btn--primary" href={href}>{cta}</a>
    </div>
  )
}

function Styles() {
  return (
    <style>{`
      .he-shell{
        min-height:100vh; background:var(--bg-primary);
        color:var(--text-primary); font-family:'DM Sans',sans-serif;
        padding:clamp(16px,4vw,40px);
      }
      .he-center{min-height:60vh;display:grid;place-items:center}
      .he-muted{color:var(--text-muted)}
      .he-pad{padding:14px 4px}

      .he-head{display:flex;align-items:flex-end;justify-content:space-between;
        gap:16px;margin-bottom:28px;flex-wrap:wrap}
      .he-eyebrow{font-size:11px;letter-spacing:.2em;text-transform:uppercase;
        color:var(--accent-primary);font-weight:600;margin:0 0 6px}
      .he-title{font-family:'Playfair Display',serif;font-size:clamp(30px,5vw,44px);
        font-weight:700;line-height:1;margin:0;letter-spacing:-.02em}

      .he-btn{border:1px solid rgba(255,255,255,.18);background:var(--bg-card);color:var(--text-primary);
        border-radius:999px;padding:10px 18px;font-size:14px;font-weight:500;cursor:pointer;
        transition:transform .12s ease,border-color .2s ease}
      .he-btn:hover{transform:translateY(-1px)}
      .he-btn--primary{background:var(--accent-primary);border-color:transparent;color:#fff;
        font-weight:600;box-shadow:0 8px 28px rgba(43,122,143,.35)}
      .he-btn--ghost{padding:7px 14px;font-size:13px}
      .he-btn--ghost:hover{border-color:var(--accent-primary)}
      .he-link{background:none;border:none;color:var(--accent-primary);cursor:pointer;
        font-size:14px;padding:0;text-decoration:underline;text-underline-offset:3px}
      .he-link--danger{color:var(--accent-secondary)}
      .he-back{display:inline-block;margin:4px 0 10px}

      .he-layout{display:grid;grid-template-columns:300px 1fr;gap:28px;align-items:start}
      @media (max-width:860px){.he-layout{grid-template-columns:1fr}}

      .he-rail{position:sticky;top:20px}
      .he-railList{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
      .he-railItem{display:flex;gap:12px;align-items:center;width:100%;text-align:left;
        background:linear-gradient(135deg,rgba(232,180,90,.10),rgba(232,180,90,.04));
        border:1px solid var(--accent-primary);border-radius:14px;padding:8px;cursor:pointer;
        transition:background .15s ease,border-color .15s ease,box-shadow .15s ease}
      .he-railItem:hover{background:linear-gradient(135deg,rgba(232,180,90,.16),rgba(232,180,90,.06));
        border-color:var(--accent-primary);box-shadow:0 0 0 1px var(--accent-primary)}
      .he-railItem.is-active{background:linear-gradient(135deg,rgba(232,180,90,.20),rgba(232,180,90,.08));
        border-color:var(--accent-primary);box-shadow:0 4px 18px rgba(43,122,143,.22)}
      .he-railThumb{width:48px;height:48px;border-radius:10px;flex:none}
      .he-railMeta{display:flex;flex-direction:column;min-width:0}
      .he-railName{font-family:'Playfair Display',serif;font-weight:600;font-size:15px;
        color:rgba(232,180,90,.95);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .he-railVibe{font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

      .he-main{min-width:0}
      .he-empty{display:grid;place-items:center;text-align:center;gap:8px}
      .he-empty--rail{padding:24px 8px;border:1px dashed var(--border);border-radius:14px}
      .he-empty--main{min-height:50vh}
      .he-empty--tracks{padding:32px}

      .he-hero{position:relative;border-radius:22px;overflow:hidden;background-size:cover;
        background-position:center;margin-bottom:18px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
      .he-hero::after{content:'';position:absolute;inset:0;
        background:linear-gradient(180deg,rgba(10,10,11,.15),rgba(10,10,11,.9))}
      .he-actionRow{display:flex;gap:8px;flex-wrap:wrap;margin:-6px 0 20px}
      .he-chipBtn{background:var(--bg-card);color:var(--text-primary);
        border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:8px 16px;font-size:13px;
        cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;line-height:1;
        transition:border-color .2s ease,transform .12s ease}
      .he-chipBtn:hover{border-color:var(--accent-primary);transform:translateY(-1px)}
      .he-hero__inner{position:relative;z-index:1;display:flex;gap:22px;align-items:flex-end;
        padding:clamp(20px,4vw,34px);flex-wrap:wrap}
      .he-hero__text{flex:1;min-width:240px}

      .he-coverWrap{position:relative;flex:none;width:clamp(120px,28vw,180px);aspect-ratio:1;
        border-radius:16px;overflow:hidden;border:none;cursor:pointer;padding:0;background:none;
        box-shadow:0 12px 36px rgba(0,0,0,.5)}
      .he-cover{width:100%;height:100%}
      .he-coverHint{position:absolute;inset:auto 0 0 0;background:rgba(10,10,11,.72);color:#fff;
        font-size:12px;padding:7px;opacity:0;transition:opacity .15s ease}
      .he-coverWrap:hover .he-coverHint{opacity:1}

      .he-titleInput{display:block;width:100%;background:transparent;border:none;color:#fff;
        font-family:'Playfair Display',serif;font-size:clamp(24px,4vw,40px);font-weight:700;
        letter-spacing:-.02em;padding:0;margin:0 0 6px}
      .he-titleInput::placeholder{color:rgba(255,255,255,.55)}
      .he-titleInput:focus{outline:none;border-bottom:1px solid var(--accent-primary)}
      .he-vibeInput{display:block;width:100%;background:transparent;border:none;
        color:rgba(255,255,255,.75);font-size:15px;font-style:italic;padding:0 0 8px}
      .he-vibeInput::placeholder{color:rgba(255,255,255,.45)}
      .he-vibeInput:focus{outline:none;color:#fff}
      .he-stats{margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.7)}
      .he-dot{margin:0 8px;opacity:.6}

      .he-moods,.he-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px}
      .he-moodChip{background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-muted);
        border-radius:999px;padding:6px 14px;font-size:13px;cursor:pointer;transition:all .15s ease}
      .he-moodChip:hover{color:var(--text-primary)}
      .he-moodChip.is-on{background:rgba(43,122,143,.16);border-color:var(--accent-primary);color:var(--accent-primary)}

      .he-trackList,.he-resultList{list-style:none;margin:0;padding:0}
      .he-trackRow,.he-resultRow{display:flex;align-items:center;gap:14px;padding:8px;
        border-radius:12px;transition:background .12s ease;background:transparent}
      .he-trackRow:hover,.he-resultRow:hover{background:var(--bg-secondary)}
      .he-trackRow.is-playing{background:rgba(43,122,143,.1)}
      .he-grip{color:var(--text-muted);font-size:12px;letter-spacing:-2px;opacity:.6;cursor:grab;
        touch-action:none;padding:0 2px}
      .he-num{width:20px;text-align:center;color:var(--text-muted);font-size:13px;flex:none}
      .he-playBtn{flex:none;width:30px;height:30px;border-radius:50%;border:1px solid rgba(255,255,255,.18);
        background:var(--bg-card);color:var(--text-primary);cursor:pointer;display:flex;align-items:center;
        justify-content:center;padding:0;transition:background .15s ease,border-color .15s ease,transform .12s ease}
      .he-playBtn:hover{background:var(--accent-primary);border-color:transparent;color:#fff;transform:scale(1.06)}
      .he-playIcon{font-size:10px;margin-left:1px}
      .he-eq{display:flex;align-items:flex-end;gap:2px;height:12px}
      .he-eq i{width:3px;background:var(--accent-primary);border-radius:1px;animation:he-eq 0.9s ease-in-out infinite}
      .he-eq i:nth-child(1){height:6px;animation-delay:0s}
      .he-eq i:nth-child(2){height:11px;animation-delay:.2s}
      .he-eq i:nth-child(3){height:8px;animation-delay:.4s}
      @keyframes he-eq{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}
      .he-trackThumb{width:44px;height:44px;border-radius:8px;flex:none}
      .he-trackMain{flex:1;min-width:0;display:flex;flex-direction:column;text-align:left;
        background:none;border:none;color:inherit;cursor:pointer;padding:0}
      .he-trackTitle{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .he-trackArtist{font-size:12px;color:var(--text-muted)}
      .he-trackDur{font-size:13px;color:var(--text-muted);flex:none}
      .he-iconBtn{background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:13px;
        padding:6px;border-radius:8px}
      .he-iconBtn:hover{color:var(--accent-secondary);background:rgba(224,122,95,.12)}

      .he-finder{margin-top:26px;border-top:1px solid var(--border);padding-top:18px}
      .he-tabs{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap}
      .he-tab{background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-muted);
        border-radius:999px;padding:7px 16px;font-size:13px;font-weight:500;cursor:pointer}
      .he-tab.is-on{background:var(--accent-primary);border-color:transparent;color:#fff}
      .he-searchInput{width:100%;background:var(--bg-card);border:1px solid var(--border);
        color:var(--text-primary);border-radius:12px;padding:12px 16px;font-size:15px;margin-bottom:8px}
      .he-searchInput::placeholder{color:var(--text-muted)}
      .he-searchInput:focus{outline:none;border-color:var(--accent-primary)}

      .he-browseGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:14px;margin-bottom:10px}
      .he-browseCard{background:none;border:none;cursor:pointer;display:flex;flex-direction:column;
        align-items:center;gap:8px;padding:6px;border-radius:12px;color:var(--text-primary)}
      .he-browseCard:hover{background:var(--bg-secondary)}
      .he-browseThumb{width:72px;height:72px;border-radius:10px}
      .he-round{border-radius:50%}
      .he-browseName{font-size:12px;text-align:center;white-space:nowrap;overflow:hidden;
        text-overflow:ellipsis;max-width:100%}

      .he-foot{margin-top:30px;padding-top:18px;border-top:1px solid var(--border)}

      .he-gate{min-height:70vh;display:grid;place-content:center;justify-items:start;gap:14px;max-width:520px}
      .he-gate__title{font-family:'Playfair Display',serif;font-size:clamp(28px,5vw,42px);margin:0;font-weight:700}
      .he-gate__body{color:var(--text-muted);font-size:17px;line-height:1.5;margin:0 0 8px}

      .he-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:var(--bg-card);
        border:1px solid var(--border);color:var(--text-primary);padding:12px 20px;border-radius:999px;
        font-size:14px;z-index:50;box-shadow:0 12px 40px rgba(0,0,0,.5)}

      @media (prefers-reduced-motion:reduce){.he-btn{transition:none}}
    `}</style>
  )
}
