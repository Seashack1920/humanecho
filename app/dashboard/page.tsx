'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Profile = { id: string; role: string; full_name: string | null; artist_id: string | null }
type Artist  = { id: string; name: string; bio: string | null; photo_url: string | null }
type Track   = { id: string; title: string; duration: string | null; status: string | null; track_type: string | null; content_origin: string | null; track_number: number | null }
type Album   = { id: string; title: string; status: string | null; album_type: string | null; cover_url: string | null; tracks?: Track[] }

const s = {
  page:           { minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' },
  header:         { borderBottom: '1px solid var(--border)', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', background: 'var(--bg-secondary)' },
  logoText:       { fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' },
  headerRight:    { display: 'flex', alignItems: 'center', gap: '16px' },
  userName:       { fontSize: '13px', color: 'var(--text-muted)' },
  signOutBtn:     { padding: '7px 16px', borderRadius: '8px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' },
  main:           { maxWidth: '900px', margin: '0 auto', padding: '40px 24px' },
  greeting:       { fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' },
  subGreeting:    { fontSize: '14px', color: 'var(--text-muted)', marginBottom: '40px' },
  statsRow:       { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '40px' },
  statCard:       { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px 24px' },
  statNum:        { fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '4px' },
  statLabel:      { fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  section:        { marginBottom: '40px' },
  sectionHead:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  sectionTitle:   { fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' },
  btn:            { padding: '9px 20px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer' },
  btnSecondary:   { padding: '9px 20px', borderRadius: '8px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' },
  albumCard:      { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '12px' },
  albumHeader:    { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' },
  albumCover:     { width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' as const, background: 'var(--bg-card)', flexShrink: 0 as const },
  albumTitle:     { fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' },
  albumMeta:      { fontSize: '12px', color: 'var(--text-muted)' },
  trackRow:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border)' },
  trackTitle:     { fontSize: '14px', color: 'var(--text-primary)' },
  trackMeta:      { fontSize: '12px', color: 'var(--text-muted)' },
  statusBadge:    (status: string) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', background: status === 'published' ? 'rgba(43,122,143,0.12)' : status === 'private' ? 'rgba(150,100,200,0.12)' : 'rgba(150,150,150,0.12)', color: status === 'published' ? 'var(--accent-primary)' : status === 'private' ? '#9664c8' : 'var(--text-muted)' }),
  adminBanner:    { background: 'rgba(224,122,95,0.08)', border: '1px solid rgba(224,122,95,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: 'var(--accent-secondary)' },
  artistSelector: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', marginLeft: '12px' },
  emptyState:     { padding: '40px', textAlign: 'center' as const, color: 'var(--text-muted)', fontSize: '14px', background: 'var(--bg-secondary)', borderRadius: '14px', border: '1px solid var(--border)' },
}

const originEmoji = (o?: string | null) => o === '100% human' ? '🧑' : o === 'human+ai' ? '🧑🤖' : o === 'ai generated' ? '🤖' : ''

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile]             = useState<Profile | null>(null)
  const [artist, setArtist]               = useState<Artist | null>(null)
  const [allArtists, setAllArtists]       = useState<Artist[]>([])
  const [albums, setAlbums]               = useState<Album[]>([])
  const [loading, setLoading]             = useState(true)
  const [adminViewArtistId, setAdminViewArtistId] = useState<string>('')

  const totalTracks     = albums.reduce((sum, a) => sum + (a.tracks?.length || 0), 0)
  const publishedTracks = albums.reduce((sum, a) => sum + (a.tracks?.filter(t => t.status === 'published').length || 0), 0)
  const publishedAlbums = albums.filter(a => a.status === 'published').length

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
      .from('albums').select('id, title, status, album_type, cover_url')
      .eq('artist_id', artistId).order('title')

    if (albumsData) {
      const albumsWithTracks = await Promise.all(
        albumsData.map(async (album) => {
          const { data: tracks } = await supabase
            .from('tracks')
            .select('id, title, duration, status, track_type, content_origin, track_number')
            .eq('album_id', album.id).order('track_number')
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

  if (loading) {
    return (
      <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin'
  const greetingName = isAdmin ? 'Les' : (artist?.name || 'Artist')

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
          {isAdmin ? 'You have full admin access.' : 'Managing your Human Echo artist profile.'}
        </div>

        {/* Admin banner + artist selector */}
        {isAdmin && (
          <div style={s.adminBanner}>
            ⚙ Admin view — browse any artist's content.
            <select
              style={s.artistSelector}
              value={adminViewArtistId}
              onChange={e => handleAdminArtistChange(e.target.value)}
            >
              <option value="">— select an artist —</option>
              {allArtists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}

        {/* Stats */}
        {(artist || (isAdmin && adminViewArtistId)) && (
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
              <div style={s.statNum}>{publishedAlbums}</div>
              <div style={s.statLabel}>Live Albums</div>
            </div>
          </div>
        )}

        {/* Empty states */}
        {!artist && !isAdmin && (
          <div style={s.emptyState}>
            Your artist profile hasn't been linked yet. Contact the Human Echo team to get set up.
          </div>
        )}
        {!artist && isAdmin && !adminViewArtistId && (
          <div style={s.emptyState}>Select an artist above to view their content.</div>
        )}

        {/* Artist content */}
        {artist && (
          <>
            <div style={s.section}>
              <div style={s.sectionHead}>
                <div style={s.sectionTitle}>{artist.name}</div>
                <button style={s.btnSecondary} onClick={() => router.push('/admin/upload')}>
                  Upload Portal →
                </button>
              </div>
              {artist.photo_url && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <img src={artist.photo_url} alt={artist.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', maxWidth: '500px' }}>
                    {artist.bio}
                  </div>
                </div>
              )}
            </div>

            <div style={s.section}>
              <div style={s.sectionHead}>
                <div style={s.sectionTitle}>Albums & Tracks</div>
                <button style={s.btn} onClick={() => router.push('/admin/upload')}>+ Add Content</button>
              </div>

              {albums.length === 0 ? (
                <div style={s.emptyState}>No albums yet. Use the upload portal to add content.</div>
              ) : (
                albums.map(album => (
                  <div key={album.id} style={s.albumCard}>
                    <div style={s.albumHeader}>
                      {album.cover_url
                        ? <img src={album.cover_url} alt={album.title} style={s.albumCover} />
                        : <div style={{ ...s.albumCover, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎵</div>
                      }
                      <div style={{ flex: 1 }}>
                        <div style={s.albumTitle}>{album.title}</div>
                        <div style={s.albumMeta}>
                          {album.album_type} · {album.tracks?.length || 0} tracks
                          &nbsp;&nbsp;
                          <span style={s.statusBadge(album.status || 'draft')}>{album.status || 'draft'}</span>
                        </div>
                      </div>
                    </div>
                    {album.tracks && album.tracks.length > 0 && album.tracks.map(track => (
                      <div key={track.id} style={s.trackRow}>
                        <div>
                          <div style={s.trackTitle}>
                            {track.track_number ? `${track.track_number}. ` : ''}{track.title}
                          </div>
                          <div style={s.trackMeta}>
                            {track.track_type} · {track.duration || '—'} · {originEmoji(track.content_origin)}
                          </div>
                        </div>
                        <span style={s.statusBadge(track.status || 'draft')}>{track.status || 'draft'}</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
