'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/context/PlayerContext'
import LikeButton from '@/components/LikeButton'
// ─── Types ───────────────────────────────────────────────────────────────────

type Genre = { id: string; name: string }

type Track = {
  id: string
  title: string
  duration: string | null
  cloudinary_url: string | null
  track_image_url: string | null
  track_type: string
  content_origin: string | null
  album_id: string | null
  artist_id: string
  artist: { id: string; name: string; photo_url: string | null } | null
}

type Album = {
  id: string
  title: string
  cover_url: string | null
  release_date: string | null
  album_type: string | null
  artist_id: string
  artist: { id: string; name: string; photo_url: string | null } | null
}

type Artist = {
  id: string
  name: string
  photo_url: string | null
  creator_label: string | null
}

const TRACK_TYPE_LABELS: Record<string, string> = {
  song: 'Songs', instrumental: 'Instrumentals', audio_story: 'Audio Stories',
}

const PAGE_SIZE = 24

// ─── Track Card ───────────────────────────────────────────────────────────────

function TrackCard({ track, isCurrent, isPlaying, onPlay }: {
  track: Track; isCurrent: boolean; isPlaying: boolean; onPlay: () => void
}) {
  const router = useRouter()
  const [hovered, setHovered] = useState(false)

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ cursor: 'pointer' }}>
      <div onClick={onPlay} style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px', background: 'var(--bg-secondary)', transition: 'transform 0.2s', transform: hovered ? 'translateY(-4px)' : 'translateY(0)', boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.15)', border: isCurrent ? '2px solid var(--accent-primary)' : '2px solid transparent' }}>
        {track.track_image_url ? <img src={track.track_image_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🎵</div>}
        <div style={{ position: 'absolute', bottom: '8px', left: '8px', opacity: hovered || isCurrent ? 1 : 0, transition: 'opacity 0.2s' }}>
          {isCurrent && isPlaying ? (
            <div style={{ background: 'rgba(0,0,0,0.7)', borderRadius: '6px', padding: '5px 7px', display: 'flex', gap: '3px', alignItems: 'center' }}>
              <div style={{ width: '3px', height: '12px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
              <div style={{ width: '3px', height: '12px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
            </div>
          ) : (
            <div style={{ background: 'rgba(0,0,0,0.7)', borderRadius: '6px', padding: '5px 8px 5px 10px', display: 'flex', alignItems: 'center' }}>
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L11 7L1 13V1Z" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
        {track.duration && <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: 'white' }}>{track.duration}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '14px', fontWeight: '600', color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)', lineHeight: '1.3', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{track.title}</div>
        <LikeButton contentType="track" contentId={track.id} size="sm" />
      </div>
      {track.artist && (
        <div onClick={e => { e.stopPropagation(); router.push(`/artist/${track.artist!.id}`) }} style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-block' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          {track.artist.name}
        </div>
      )}
    </div>
  )
}

// ─── Album Card ───────────────────────────────────────────────────────────────

function AlbumCard({ album }: { album: Album }) {
  const router = useRouter()
  const [hovered, setHovered] = useState(false)

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={() => router.push(`/album/${album.id}`)} style={{ cursor: 'pointer' }}>
      <div style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px', background: 'var(--bg-secondary)', transition: 'transform 0.2s', transform: hovered ? 'translateY(-4px)' : 'translateY(0)', boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.15)' }}>
        {album.cover_url ? <img src={album.cover_url} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>💿</div>}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hovered ? 1 : 0, transition: 'opacity 0.2s' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#0a0a0b' }}>▶</div>
        </div>
      </div>
      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.3', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.title}</div>
      {album.artist && (
        <div onClick={e => { e.stopPropagation(); router.push(`/artist/${album.artist!.id}`) }} style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-block' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          {album.artist.name}{album.release_date ? ` · ${new Date(album.release_date).getFullYear()}` : ''}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MusicGenrePage({ id }: { id: string }) {
  const router = useRouter()
  const { playTrack, togglePlay, currentTrack, isPlaying } = usePlayer()

  const [genre, setGenre]           = useState<Genre | null>(null)
  const [allTracks, setAllTracks]   = useState<Track[]>([])
  const [albums, setAlbums]         = useState<Album[]>([])
  const [artists, setArtists]       = useState<Artist[]>([])
  const [loading, setLoading]       = useState(true)
  const [notFound, setNotFound]     = useState(false)

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortOrder, setSortOrder]   = useState<string>('newest')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    const load = async () => {
      // Load genre
      const { data: genreData } = await supabase.from('genres').select('id, name').eq('id', id).single()
      if (!genreData) { setNotFound(true); setLoading(false); return }
      setGenre(genreData)

      // Get all track IDs in this genre
      const { data: trackGenres } = await supabase.from('content_genres').select('content_id').eq('genre_id', id).eq('content_type', 'track')
      const trackIds = (trackGenres || []).map((r: any) => r.content_id)

      // Get all album IDs in this genre
      const { data: albumGenres } = await supabase.from('content_genres').select('content_id').eq('genre_id', id).eq('content_type', 'album')
      const albumIds = (albumGenres || []).map((r: any) => r.content_id)

      const [tracksRes, albumsRes] = await Promise.all([
        trackIds.length > 0
          ? supabase.from('tracks').select('id, title, duration, cloudinary_url, track_image_url, track_type, content_origin, album_id, artist_id').in('id', trackIds).eq('status', 'published')
          : { data: [] },
        albumIds.length > 0
          ? supabase.from('albums').select('id, title, cover_url, release_date, album_type, artist_id').in('id', albumIds).eq('status', 'published')
          : { data: [] },
      ])

      const tracksData = tracksRes.data || []
      const albumsData = albumsRes.data || []

      // Fetch artist data
      const allArtistIds = [...new Set([
        ...tracksData.map((t: any) => t.artist_id),
        ...albumsData.map((a: any) => a.artist_id),
      ].filter(Boolean))]

      const { data: artistsData } = allArtistIds.length > 0
        ? await supabase.from('artists').select('id, name, photo_url, creator_label').in('id', allArtistIds)
        : { data: [] }

      const artistMap = Object.fromEntries((artistsData || []).map((a: any) => [a.id, a]))

      const normTracks = tracksData.map((t: any) => ({ ...t, artist: artistMap[t.artist_id] || null }))

      // Albums — one per artist
      const seenArtists = new Set<string>()
      const normAlbums = albumsData
        .map((a: any) => ({ ...a, artist: artistMap[a.artist_id] || null }))
        .filter((a: any) => {
          if (seenArtists.has(a.artist_id)) return false
          seenArtists.add(a.artist_id)
          return true
        })

      // Unique artists from tracks
      const uniqueArtists = Array.from(
        new Map((artistsData || []).map((a: any) => [a.id, a])).values()
      ) as Artist[]

      setAllTracks(normTracks)
      setAlbums(normAlbums)
      setArtists(uniqueArtists)
      setLoading(false)
    }
    load()
  }, [id])

  // Filter and sort tracks
  const filteredTracks = allTracks
    .filter(t => typeFilter === 'all' || t.track_type === typeFilter)
    .sort((a, b) => {
      if (sortOrder === 'az') return a.title.localeCompare(b.title)
      if (sortOrder === 'za') return b.title.localeCompare(a.title)
      return 0 // newest = default DB order
    })

  const visibleTracks = filteredTracks.slice(0, visibleCount)
  const hasMore = visibleCount < filteredTracks.length
  const availableTypes = ['all', ...Array.from(new Set(allTracks.map(t => t.track_type).filter(Boolean)))]

  const pillStyle = (active: boolean) => ({
    padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '500' as const,
    border: 'none', cursor: 'pointer' as const,
    background: active ? 'var(--accent-primary)' : 'var(--bg-secondary)',
    color: active ? 'white' : 'var(--text-muted)',
    transition: 'all 0.2s',
  })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Loading</div>
    </div>
  )

  if (notFound || !genre) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎵</div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Genre not found</div>
        <button onClick={() => router.push('/music')} style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', marginTop: '16px' }}>← Music</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HERO ── */}
      <div style={{ background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)', padding: '100px 48px 48px', borderBottom: '1px solid var(--border)', marginTop: '-70px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <button onClick={() => router.push('/music')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>← Music</button>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '10px', fontWeight: '600' }}>Genre</div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.05', marginBottom: '12px' }}>{genre.name}</h1>
          <div style={{ fontSize: '15px', color: 'var(--text-muted)', display: 'flex', gap: '20px', flexWrap: 'wrap' as const }}>
            <span>{allTracks.length} track{allTracks.length !== 1 ? 's' : ''}</span>
            {albums.length > 0 && <span>{albums.length} album{albums.length !== 1 ? 's' : ''}</span>}
            {artists.length > 0 && <span>{artists.length} artist{artists.length !== 1 ? 's' : ''}</span>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 48px 120px' }}>

        {/* ── ARTISTS ── */}
        {artists.length > 0 && (
          <section style={{ marginBottom: '64px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>Artists</h2>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' as const }}>
              {artists.map(artist => (
                <div key={artist.id} onClick={() => router.push(`/artist/${artist.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: '50px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'rgba(43,122,143,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-secondary)' }}
                >
                  {artist.photo_url
                    ? <img src={artist.photo_url} alt={artist.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🎤</div>
                  }
                  <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap' as const }}>{artist.name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── ALBUMS ── */}
        {albums.length > 0 && (
          <section style={{ marginBottom: '64px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              Albums <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>{albums.length}</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '24px' }}>
              {albums.map(album => <AlbumCard key={album.id} album={album} />)}
            </div>
          </section>
        )}

        {/* ── TRACKS ── */}
        {allTracks.length > 0 && (
          <section style={{ marginBottom: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' as const, gap: '12px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Tracks <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>{filteredTracks.length}</span>
              </h2>
              {/* Sort */}
              <select value={sortOrder} onChange={e => { setSortOrder(e.target.value); setVisibleCount(PAGE_SIZE) }}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                <option value="newest">Newest first</option>
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
              </select>
            </div>

            {/* Type filter pills */}
            {availableTypes.length > 2 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginBottom: '24px' }}>
                {availableTypes.map(type => (
                  <button key={type} style={pillStyle(typeFilter === type)} onClick={() => { setTypeFilter(type); setVisibleCount(PAGE_SIZE) }}>
                    {type === 'all' ? `All (${allTracks.length})` : `${TRACK_TYPE_LABELS[type] || type} (${allTracks.filter(t => t.track_type === type).length})`}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
              {visibleTracks.map(track => (
                <TrackCard key={track.id} track={track} isCurrent={currentTrack?.id === track.id} isPlaying={isPlaying} onPlay={() => currentTrack?.id === track.id ? togglePlay() : playTrack(track as any)} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '32px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Showing {visibleTracks.length} of {filteredTracks.length} tracks
                </div>
                <button onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                  style={{ padding: '12px 32px', borderRadius: '50px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                >
                  Load more tracks
                </button>
              </div>
            )}

            {filteredTracks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎵</div>
                <div>No {TRACK_TYPE_LABELS[typeFilter] || 'tracks'} in this genre yet.</div>
                <button onClick={() => setTypeFilter('all')} style={{ marginTop: '12px', padding: '8px 20px', borderRadius: '20px', border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)' }}>Show all types</button>
              </div>
            )}
          </section>
        )}

        {/* Empty state */}
        {allTracks.length === 0 && albums.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎵</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No music in this genre yet</div>
            <button onClick={() => router.push('/music')} style={{ marginTop: '12px', padding: '10px 24px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px' }}>← Browse all music</button>
          </div>
        )}

      </div>
    </div>
  )
}
