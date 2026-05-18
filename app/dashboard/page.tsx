'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { usePlayer } from '@/context/PlayerContext'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Types ───────────────────────────────────────────────────────────────────

type Profile = { id: string; role: string; full_name: string | null; artist_id: string | null }
type Artist  = { id: string; name: string; bio: string | null; photo_url: string | null }
type Track   = {
  id: string; title: string; duration: string | null; status: string | null
  track_type: string | null; content_origin: string | null; track_number: number | null
  cloudinary_url: string | null; track_image_url: string | null; album_id: string | null
  price: number | null; text_content: string | null; cover_welcome: boolean | null
  music_video_welcome: boolean | null; explicit: boolean | null
}
type Album = {
  id: string; title: string; status: string | null; album_type: string | null
  cover_url: string | null; price: number | null; description: string | null
  tracks?: Track[]
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  page:         { minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' },
  header:       { borderBottom: '1px solid var(--border)', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', background: 'var(--bg-secondary)' },
  logoText:     { fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' },
  headerRight:  { display: 'flex', alignItems: 'center', gap: '16px' },
  userName:     { fontSize: '13px', color: 'var(--text-muted)' },
  signOutBtn:   { padding: '7px 16px', borderRadius: '8px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' },
  main:         { maxWidth: '960px', margin: '0 auto', padding: '40px 24px' },
  greeting:     { fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' },
  subGreeting:  { fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' },
  statsRow:     { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '40px' },
  statCard:     { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px 24px' },
  statNum:      { fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '4px' },
  statLabel:    { fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  section:      { marginBottom: '40px' },
  sectionHead:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  sectionTitle: { fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' },
  btn:          { padding: '9px 20px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer' },
  btnSm:        { padding: '6px 12px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '12px', border: 'none', cursor: 'pointer' },
  btnSmSecondary: { padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-muted)', fontSize: '12px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnSmDanger:  { padding: '6px 12px', borderRadius: '6px', background: 'rgba(220,60,60,0.1)', color: '#dc3c3c', fontSize: '12px', border: '1px solid rgba(220,60,60,0.3)', cursor: 'pointer' },
  btnSecondary: { padding: '9px 20px', borderRadius: '8px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' },
  albumCard:    { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '12px' },
  albumHeader:  { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' },
  albumCover:   { width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' as const, background: 'var(--bg-card)', flexShrink: 0 },
  albumTitle:   { fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' },
  albumMeta:    { fontSize: '12px', color: 'var(--text-muted)' },
  albumActions: { display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' as const },
  trackRow:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border)', gap: '8px' },
  trackLeft:    { display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 },
  trackThumb:   { width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' as const, flexShrink: 0, background: 'var(--bg-card)' },
  trackTitle:   { fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  trackMeta:    { fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' },
  trackActions: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  statusBadge:  (status: string) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', background: status === 'published' ? 'rgba(43,122,143,0.12)' : status === 'private' ? 'rgba(150,100,200,0.12)' : 'rgba(150,150,150,0.12)', color: status === 'published' ? 'var(--accent-primary)' : status === 'private' ? '#9664c8' : 'var(--text-muted)', cursor: 'pointer' }),
  playBtn:      (active: boolean) => ({ width: '30px', height: '30px', borderRadius: '50%', background: active ? 'var(--accent-primary)' : 'var(--bg-card)', color: active ? 'white' : 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  adminBanner:  { background: 'rgba(224,122,95,0.08)', border: '1px solid rgba(224,122,95,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: 'var(--accent-secondary)' },
  artistSelector: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', marginLeft: '12px' },
  emptyState:   { padding: '40px', textAlign: 'center' as const, color: 'var(--text-muted)', fontSize: '14px', background: 'var(--bg-secondary)', borderRadius: '14px', border: '1px solid var(--border)' },
  confirmBox:   { background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.3)', borderRadius: '8px', padding: '12px 16px', marginTop: '8px', fontSize: '13px', color: '#dc3c3c' },
  editCard:     { background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '10px', padding: '16px', marginTop: '8px' },
  input:        { width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const },
  select:       { width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const },
  textarea:     { width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const, minHeight: '80px' },
  label:        { display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '4px', marginTop: '10px' },
  fieldRow:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  contentTab:   (active: boolean) => ({ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: active ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: active ? 'white' : 'var(--text-muted)' }),
  comingSoon:   { padding: '32px', textAlign: 'center' as const, color: 'var(--text-muted)', fontSize: '14px', background: 'var(--bg-secondary)', borderRadius: '14px', border: '1px dashed var(--border)' },
  privateLink:  { fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '4px', marginTop: '4px', wordBreak: 'break-all' as const },
}

const originEmoji = (o?: string | null) => o === '100% human' ? '🧑' : o === 'human+ai' ? '🧑🤖' : o === 'ai generated' ? '🤖' : ''
const statusCycle = (s: string) => s === 'draft' ? 'private' : s === 'private' ? 'published' : 'draft'
const statusNext  = (s: string) => s === 'draft' ? 'Make Private' : s === 'private' ? 'Publish' : 'Unpublish'

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter()
  const { playTrack, currentTrack, isPlaying } = usePlayer()

  const [profile, setProfile]         = useState<Profile | null>(null)
  const [artist, setArtist]           = useState<Artist | null>(null)
  const [allArtists, setAllArtists]   = useState<Artist[]>([])
  const [albums, setAlbums]           = useState<Album[]>([])
  const [loading, setLoading]         = useState(true)
  const [adminViewArtistId, setAdminViewArtistId] = useState<string>('')
  const [contentTab, setContentTab]   = useState<'music' | 'books' | 'films' | 'stories'>('music')

  // Edit state
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null)
  const [editTrack, setEditTrack]           = useState<Partial<Track>>({})
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null)
  const [editAlbum, setEditAlbum]           = useState<Partial<Album>>({})

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; name: string; albumId?: string } | null>(null)

  // Private link
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Message
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  // Stats
  const totalTracks     = albums.reduce((sum, a) => sum + (a.tracks?.length || 0), 0)
  const publishedTracks = albums.reduce((sum, a) => sum + (a.tracks?.filter(t => t.status === 'published').length || 0), 0)
  const publishedAlbums = albums.filter(a => a.status === 'published').length
  const draftTracks     = albums.reduce((sum, a) => sum + (a.tracks?.filter(t => t.status === 'draft').length || 0), 0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      if (!profileData) { router.push('/login'); return }
      setProfile(profileData)

      if (profileData.role === 'admin') {
        const { data: artistsData } = await supabase
          .from('artists').select('id, name, bio, photo_url').order('name')
        if (artistsData) setAllArtists(artistsData)
      }

      if (profileData.artist_id) {
        await loadArtistData(profileData.artist_id)
      } else {
        setLoading(false)
      }
    }
    init()
  }, [])

  const loadArtistData = async (artistId: string) => {
    setLoading(true)
    const { data: artistData } = await supabase
      .from('artists').select('id, name, bio, photo_url').eq('id', artistId).single()
    if (artistData) setArtist(artistData)

    const { data: albumsData } = await supabase
      .from('albums').select('id, title, status, album_type, cover_url, price, description')
      .eq('artist_id', artistId).order('title')

    if (albumsData) {
      const albumsWithTracks = await Promise.all(
        albumsData.map(async (album) => {
          const { data: tracks } = await supabase
            .from('tracks')
            .select('id, title, duration, status, track_type, content_origin, track_number, cloudinary_url, track_image_url, album_id, price, text_content, cover_welcome, music_video_welcome, explicit')
            .eq('album_id', album.id).order('track_number', { nullsFirst: false })
          return { ...album, tracks: tracks || [] }
        })
      )
      setAlbums(albumsWithTracks)
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleAdminArtistChange = (artistId: string) => {
    setAdminViewArtistId(artistId)
    if (artistId) loadArtistData(artistId)
    else { setArtist(null); setAlbums([]) }
  }

  // ── Status toggle ───────────────────────────────────────────────────────────

  const toggleTrackStatus = async (track: Track) => {
    const newStatus = statusCycle(track.status || 'draft')
    const { error } = await supabase.from('tracks').update({ status: newStatus }).eq('id', track.id)
    if (!error) {
      setAlbums(prev => prev.map(a => ({
        ...a,
        tracks: a.tracks?.map(t => t.id === track.id ? { ...t, status: newStatus } : t)
      })))
    }
  }

  const toggleAlbumStatus = async (album: Album) => {
    const newStatus = statusCycle(album.status || 'draft')
    const { error } = await supabase.from('albums').update({ status: newStatus }).eq('id', album.id)
    if (!error) {
      setAlbums(prev => prev.map(a => a.id === album.id ? { ...a, status: newStatus } : a))
    }
  }

  // ── Save track edit ─────────────────────────────────────────────────────────

  const handleSaveTrack = async (trackId: string) => {
    const updates: any = { ...editTrack }
    if (updates.price !== undefined) updates.price = updates.price ? parseFloat(updates.price) : null
    if (updates.track_number !== undefined) updates.track_number = updates.track_number ? parseInt(updates.track_number) : null
    const { error } = await supabase.from('tracks').update(updates).eq('id', trackId)
    if (!error) {
      setAlbums(prev => prev.map(a => ({
        ...a,
        tracks: a.tracks?.map(t => t.id === trackId ? { ...t, ...updates } : t)
      })))
      setEditingTrackId(null)
      setEditTrack({})
      setMessage({ type: 'success', text: 'Track updated.' })
    } else {
      setMessage({ type: 'error', text: error.message })
    }
  }

  // ── Save album edit ─────────────────────────────────────────────────────────

  const handleSaveAlbum = async (albumId: string) => {
    const updates: any = { ...editAlbum }
    if (updates.price !== undefined) updates.price = updates.price ? parseFloat(updates.price) : null
    const { error } = await supabase.from('albums').update(updates).eq('id', albumId)
    if (!error) {
      setAlbums(prev => prev.map(a => a.id === albumId ? { ...a, ...updates } : a))
      setEditingAlbumId(null)
      setEditAlbum({})
      setMessage({ type: 'success', text: 'Album updated.' })
    } else {
      setMessage({ type: 'error', text: error.message })
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!confirmDelete) return
    const table = confirmDelete.type === 'album' ? 'albums' : 'tracks'
    const { error } = await supabase.from(table).delete().eq('id', confirmDelete.id)
    if (!error) {
      if (confirmDelete.type === 'album') {
        setAlbums(prev => prev.filter(a => a.id !== confirmDelete.id))
      } else {
        setAlbums(prev => prev.map(a => ({
          ...a,
          tracks: a.tracks?.filter(t => t.id !== confirmDelete.id)
        })))
      }
      setMessage({ type: 'success', text: `${confirmDelete.type === 'album' ? 'Album' : 'Track'} deleted.` })
    } else {
      setMessage({ type: 'error', text: error.message })
    }
    setConfirmDelete(null)
  }

  // ── Private link ────────────────────────────────────────────────────────────

  const copyPrivateLink = async (trackId: string) => {
    const link = `${window.location.origin}/track/${trackId}?preview=true`
    await navigator.clipboard.writeText(link)
    setCopiedId(trackId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin'
  const greetingName = isAdmin ? (profile?.full_name?.split(' ')[0] || 'Les') : (artist?.name || 'Artist')
  const uploadPath = isAdmin ? '/admin/upload' : '/dashboard/upload'

  const msg = message && (
    <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', background: message.type === 'success' ? 'rgba(43,122,143,0.1)' : 'rgba(220,60,60,0.1)', border: `1px solid ${message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c'}`, color: message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c', fontSize: '14px' }}>
      {message.text}
    </div>
  )

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logoText}>Human Echo</div>
        <div style={s.headerRight}>
          <span style={s.userName}>{isAdmin ? '⚙ Admin' : artist?.name || 'Artist'}</span>
          <button style={s.signOutBtn} onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      <div style={s.main}>
        <div style={s.greeting}>Welcome back, {greetingName}.</div>
        <div style={s.subGreeting}>
          {isAdmin ? 'Full admin access.' : 'Your Human Echo artist dashboard.'}
        </div>

        {msg}

        {/* Admin banner */}
        {isAdmin && (
          <div style={s.adminBanner}>
            ⚙ Admin — viewing any artist's content.
            <select style={s.artistSelector} value={adminViewArtistId} onChange={e => handleAdminArtistChange(e.target.value)}>
              <option value="">— select an artist —</option>
              {allArtists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}

        {/* Empty states */}
        {!artist && !isAdmin && (
          <div style={s.emptyState}>Your artist profile hasn't been linked yet. Contact the Human Echo team.</div>
        )}
        {!artist && isAdmin && !adminViewArtistId && (
          <div style={s.emptyState}>Select an artist above to view their content.</div>
        )}

        {artist && (
          <>
            {/* Artist profile strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '14px', border: '1px solid var(--border)' }}>
              {artist.photo_url && (
                <img src={artist.photo_url} alt={artist.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{artist.name}</div>
                {artist.bio && <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{artist.bio.substring(0, 120)}{artist.bio.length > 120 ? '…' : ''}</div>}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button style={s.btn} onClick={() => router.push(uploadPath)}>+ Upload</button>
                {isAdmin && <button style={s.btnSecondary} onClick={() => router.push('/admin/upload')}>Admin Portal</button>}
              </div>
            </div>

            {/* Stats */}
            <div style={s.statsRow}>
              <div style={s.statCard}>
                <div style={s.statNum}>{albums.length}</div>
                <div style={s.statLabel}>Albums</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statNum}>{totalTracks}</div>
                <div style={s.statLabel}>Tracks</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statNum}>{publishedTracks}</div>
                <div style={s.statLabel}>Published</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statNum}>{draftTracks}</div>
                <div style={s.statLabel}>Drafts</div>
              </div>
            </div>

            {/* Content type tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' as const }}>
              {(['music', 'books', 'films', 'stories'] as const).map(tab => (
                <button key={tab} style={s.contentTab(contentTab === tab)} onClick={() => setContentTab(tab)}>
                  {tab === 'music' ? '🎵 Music' : tab === 'books' ? '📚 Books' : tab === 'films' ? '🎬 Films' : '📖 Stories'}
                </button>
              ))}
            </div>

            {/* ── MUSIC ── */}
            {contentTab === 'music' && (
              <div style={s.section}>
                <div style={s.sectionHead}>
                  <div style={s.sectionTitle}>Albums & Tracks</div>
                  <button style={s.btn} onClick={() => router.push(uploadPath)}>+ Add Music</button>
                </div>

                {/* Confirm delete */}
                {confirmDelete && (
                  <div style={s.confirmBox}>
                    <div style={{ marginBottom: '10px' }}>⚠️ Delete <strong>"{confirmDelete.name}"</strong>? This cannot be undone.</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={s.btnSmDanger} onClick={handleDelete}>Yes, delete</button>
                      <button style={s.btnSmSecondary} onClick={() => setConfirmDelete(null)}>Cancel</button>
                    </div>
                  </div>
                )}

                {albums.length === 0 ? (
                  <div style={s.emptyState}>
                    No albums yet.
                    <div style={{ marginTop: '12px' }}>
                      <button style={s.btn} onClick={() => router.push(uploadPath)}>Upload your first track →</button>
                    </div>
                  </div>
                ) : (
                  albums.map(album => (
                    <div key={album.id} style={s.albumCard}>
                      {/* Album header */}
                      <div style={s.albumHeader}>
                        {album.cover_url
                          ? <img src={album.cover_url} alt={album.title} style={s.albumCover} />
                          : <div style={{ ...s.albumCover, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎵</div>
                        }
                        <div style={{ flex: 1 }}>
                          {editingAlbumId === album.id ? (
                            <div style={s.editCard}>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '8px' }}>Editing album</div>
                              <label style={s.label}>Title</label>
                              <input style={s.input} value={editAlbum.title ?? album.title} onChange={e => setEditAlbum(p => ({ ...p, title: e.target.value }))} />
                              <label style={s.label}>Description</label>
                              <textarea style={s.textarea} value={editAlbum.description ?? album.description ?? ''} onChange={e => setEditAlbum(p => ({ ...p, description: e.target.value }))} />
                              <div style={s.fieldRow}>
                                <div>
                                  <label style={s.label}>Price ($)</label>
                                  <input style={s.input} type="number" step="0.01" value={editAlbum.price ?? album.price ?? ''} onChange={e => setEditAlbum(p => ({ ...p, price: e.target.value as any }))} />
                                </div>
                                <div>
                                  <label style={s.label}>Status</label>
                                  <select style={s.select} value={editAlbum.status ?? album.status ?? 'draft'} onChange={e => setEditAlbum(p => ({ ...p, status: e.target.value }))}>
                                    <option value="draft">Draft</option>
                                    <option value="private">Private</option>
                                    <option value="published">Published</option>
                                  </select>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                <button style={s.btnSm} onClick={() => handleSaveAlbum(album.id)}>Save</button>
                                <button style={s.btnSmSecondary} onClick={() => { setEditingAlbumId(null); setEditAlbum({}) }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={s.albumTitle}>{album.title}</div>
                              <div style={s.albumMeta}>
                                {album.album_type} · {album.tracks?.length || 0} tracks · {album.price ? `$${album.price}` : 'no price'}
                                &nbsp;&nbsp;
                                <span style={s.statusBadge(album.status || 'draft')} title="Click to cycle status" onClick={() => toggleAlbumStatus(album)}>
                                  {album.status || 'draft'}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Album actions */}
                      {editingAlbumId !== album.id && (
                        <div style={s.albumActions}>
                          <button style={s.btnSmSecondary} onClick={() => { setEditingAlbumId(album.id); setEditAlbum({}) }}>Edit album</button>
                          <button style={s.btnSm} onClick={() => toggleAlbumStatus(album)}>{statusNext(album.status || 'draft')}</button>
                          <button style={s.btnSmSecondary} onClick={() => router.push(uploadPath)}>+ Add track</button>
                          <button style={s.btnSmDanger} onClick={() => setConfirmDelete({ type: 'album', id: album.id, name: album.title })}>Delete album</button>
                        </div>
                      )}

                      {/* Track list */}
                      {album.tracks && album.tracks.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          {album.tracks.map(track => (
                            <div key={track.id}>
                              {editingTrackId === track.id ? (
                                <div style={{ ...s.editCard, marginTop: '4px' }}>
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '8px' }}>Editing: {track.title}</div>
                                  <div style={s.fieldRow}>
                                    <div>
                                      <label style={s.label}>Title</label>
                                      <input style={s.input} value={editTrack.title ?? track.title} onChange={e => setEditTrack(p => ({ ...p, title: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label style={s.label}>Track #</label>
                                      <input style={s.input} type="number" value={editTrack.track_number ?? track.track_number ?? ''} onChange={e => setEditTrack(p => ({ ...p, track_number: e.target.value as any }))} />
                                    </div>
                                  </div>
                                  <div style={s.fieldRow}>
                                    <div>
                                      <label style={s.label}>Status</label>
                                      <select style={s.select} value={editTrack.status ?? track.status ?? 'draft'} onChange={e => setEditTrack(p => ({ ...p, status: e.target.value }))}>
                                        <option value="draft">Draft</option>
                                        <option value="private">Private</option>
                                        <option value="published">Published</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label style={s.label}>Price ($)</label>
                                      <input style={s.input} type="number" step="0.01" value={editTrack.price ?? track.price ?? ''} onChange={e => setEditTrack(p => ({ ...p, price: e.target.value as any }))} />
                                    </div>
                                  </div>
                                  <label style={s.label}>Lyrics / Description</label>
                                  <textarea style={s.textarea} value={editTrack.text_content ?? track.text_content ?? ''} onChange={e => setEditTrack(p => ({ ...p, text_content: e.target.value }))} />
                                  <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' as const }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                      <input type="checkbox" checked={!!(editTrack.cover_welcome ?? track.cover_welcome)} onChange={e => setEditTrack(p => ({ ...p, cover_welcome: e.target.checked }))} />
                                      🎤 Covers welcome
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                      <input type="checkbox" checked={!!(editTrack.music_video_welcome ?? track.music_video_welcome)} onChange={e => setEditTrack(p => ({ ...p, music_video_welcome: e.target.checked }))} />
                                      🎬 Videos welcome
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                      <input type="checkbox" checked={!!(editTrack.explicit ?? track.explicit)} onChange={e => setEditTrack(p => ({ ...p, explicit: e.target.checked }))} />
                                      🅴 Explicit
                                    </label>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <button style={s.btnSm} onClick={() => handleSaveTrack(track.id)}>Save</button>
                                    <button style={s.btnSmSecondary} onClick={() => { setEditingTrackId(null); setEditTrack({}) }}>Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <div style={s.trackRow}>
                                  <div style={s.trackLeft}>
                                    {/* Play button */}
                                    <button
                                      style={s.playBtn(currentTrack?.id === track.id && isPlaying)}
                                      onClick={() => track.cloudinary_url && playTrack(track)}
                                      title={track.cloudinary_url ? 'Play' : 'No audio file'}
                                    >
                                      {currentTrack?.id === track.id && isPlaying ? '⏸' : '▶'}
                                    </button>
                                    {/* Thumbnail */}
                                    {track.track_image_url
                                      ? <img src={track.track_image_url} alt={track.title} style={s.trackThumb} />
                                      : <div style={{ ...s.trackThumb, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🎵</div>
                                    }
                                    <div style={{ minWidth: 0 }}>
                                      <div style={s.trackTitle}>{track.track_number ? `${track.track_number}. ` : ''}{track.title}</div>
                                      <div style={s.trackMeta}>
                                        {track.track_type} · {track.duration || '—'} · {originEmoji(track.content_origin)}
                                        {track.cover_welcome && ' · 🎤'}
                                        {track.music_video_welcome && ' · 🎬'}
                                        {track.explicit && ' · 🅴'}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={s.trackActions}>
                                    {/* Status badge — click to cycle */}
                                    <span style={s.statusBadge(track.status || 'draft')} title="Click to cycle status" onClick={() => toggleTrackStatus(track)}>
                                      {track.status || 'draft'}
                                    </span>
                                    {/* Private link copy */}
                                    <button style={s.btnSmSecondary} onClick={() => copyPrivateLink(track.id)} title="Copy private preview link">
                                      {copiedId === track.id ? '✓ Copied' : '🔗'}
                                    </button>
                                    <button style={s.btnSmSecondary} onClick={() => { setEditingTrackId(track.id); setEditTrack({}) }}>Edit</button>
                                    <button style={s.btnSmDanger} onClick={() => setConfirmDelete({ type: 'track', id: track.id, name: track.title, albumId: album.id })}>×</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── BOOKS ── */}
            {contentTab === 'books' && (
              <div style={s.comingSoon}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📚</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>Books coming soon</div>
                <div>Upload books, audiobooks, and written works — PDF, audio, or both.</div>
              </div>
            )}

            {/* ── FILMS ── */}
            {contentTab === 'films' && (
              <div style={s.comingSoon}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎬</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>Films coming soon</div>
                <div>Upload films, short films, documentaries, and trailers.</div>
              </div>
            )}

            {/* ── STORIES ── */}
            {contentTab === 'stories' && (
              <div style={s.comingSoon}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📖</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>Stories coming soon</div>
                <div>Upload audio stories, narrated fiction, and written stories.</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
