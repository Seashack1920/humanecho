'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/context/PlayerContext'
import LikeButton from '@/components/LikeButton'
import BuyButton from '@/components/BuyButton'

type Album = {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  hero_image_url: string | null
  release_date: string | null
  album_type: string | null
  artist_id: string
  price: number | null
}

type Track = {
  id: string
  title: string
  track_number: number | null
  duration: string | null
  cloudinary_url: string | null
  track_image_url: string | null
  content_origin: string | null
  track_type: string | null
  text_content: string | null
  text_content_type: string | null
  price: number | null
}

type Artist = {
  id: string
  name: string
  photo_url: string | null
  creator_label: string | null
}

type NavSection = { key: string; label: string }

const ORIGIN_EMOJI: Record<string, string> = {
  '100% human': '🧑',
  'human+ai': '🧑🤖',
  'ai generated': '🤖',
}

function TrackRow({ track, index, isPlaying, isCurrent, onPlay, owned }: {
  track: Track
  index: number
  isPlaying: boolean
  isCurrent: boolean
  onPlay: () => void
  owned: boolean
}) {
  const [hovered, setHovered]   = useState(false)
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', background: isCurrent ? 'rgba(43,122,143,0.1)' : hovered ? 'var(--bg-secondary)' : 'transparent', border: isCurrent ? '1px solid rgba(43,122,143,0.2)' : '1px solid transparent', transition: 'background 0.2s' }}
      >
        {/* Track number / play button */}
        <div onClick={onPlay} style={{ width: '36px', textAlign: 'center', cursor: 'pointer', flexShrink: 0 }}>
          {hovered || isCurrent
            ? <span style={{ fontSize: '14px', color: 'var(--accent-primary)' }}>{isCurrent && isPlaying ? '⏸' : '▶'}</span>
            : <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{track.track_number || index + 1}</span>
          }
        </div>

        {/* Artwork */}
        <div onClick={onPlay} style={{ position: 'relative', width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)', cursor: 'pointer' }}>
          {track.track_image_url
            ? <img src={track.track_image_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎵</div>
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onPlay}>
          <div style={{ fontSize: '14px', fontWeight: isCurrent ? '600' : '500', color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {track.content_origin && <span>{ORIGIN_EMOJI[track.content_origin] || ''}</span>}
            {track.text_content && (
              <button onClick={e => { e.stopPropagation(); setExpanded(ex => !ex) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: expanded ? 'var(--accent-primary)' : 'var(--text-muted)', padding: '0', fontFamily: 'DM Sans, sans-serif' }}>
                {expanded ? 'Hide lyrics' : 'Lyrics'}
              </button>
            )}
          </div>
        </div>

        {/* Like + duration + buy */}
        <LikeButton contentType="track" contentId={track.id} size="md" />
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0, minWidth: '36px', textAlign: 'right' }}>{track.duration || '—'}</div>
        <BuyButton itemType="track" itemId={track.id} price={track.price} owned={owned} style={{ padding: '5px 12px', fontSize: '12px', flexShrink: 0 }} />
      </div>

      {/* Expanded lyrics/text */}
      {expanded && track.text_content && (
        <div style={{ margin: '4px 0 8px 60px', padding: '16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.8', whiteSpace: 'pre-wrap', fontFamily: track.text_content_type === 'lyrics' ? 'Playfair Display, serif' : 'DM Sans, sans-serif' }}>
          {track.text_content}
        </div>
      )}
    </div>
  )
}

export default function AlbumPage({ id }: { id: string }) {
  const router = useRouter()
  const { playTrack, togglePlay, currentTrack, isPlaying } = usePlayer()

  const [album, setAlbum]   = useState<Album | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [artist, setArtist] = useState<Artist | null>(null)
  const [artistAlbums, setArtistAlbums]   = useState<{ id: string }[]>([])
  const [artistStories, setArtistStories] = useState<{ id: string }[]>([])
  const [artistFilms, setArtistFilms]     = useState<{ id: string }[]>([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isOwner, setIsOwner]   = useState(false)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [albumOwned, setAlbumOwned]       = useState(false)
  const [ownedTrackIds, setOwnedTrackIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const load = async () => {
      const { data: albumData } = await supabase
        .from('albums')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .single()

      if (!albumData) { setNotFound(true); setLoading(false); return }
      setAlbum(albumData)

      const [
        { data: tracksData },
        { data: artistData },
        { data: artistTracksData },
        { data: storiesData },
        { data: filmsData },
        { data: albumsData },
      ] = await Promise.all([
        supabase.from('tracks').select('id, title, track_number, duration, cloudinary_url, track_image_url, content_origin, track_type, text_content, text_content_type, price')
          .eq('album_id', id).eq('status', 'published').order('track_number'),
        supabase.from('artists').select('id, name, photo_url, creator_label').eq('id', albumData.artist_id).single(),
        supabase.from('tracks').select('id').eq('artist_id', albumData.artist_id).eq('status', 'published').is('album_id', null),
        supabase.from('stories').select('id').eq('artist_id', albumData.artist_id).eq('status', 'published'),
        supabase.from('films').select('id').eq('artist_id', albumData.artist_id).eq('status', 'published'),
        supabase.from('albums').select('id').eq('artist_id', albumData.artist_id).eq('status', 'published'),
      ])

      setTracks(tracksData || [])
      if (artistData) setArtist(artistData)
      setArtistAlbums(albumsData || [])
      setArtistStories(storiesData || [])
      setArtistFilms(filmsData || [])
      setLoading(false)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role, artist_id').eq('id', user.id).single()
        if (profile?.role === 'admin') { setIsOwner(true); setIsAdmin(true) }
        else if (profile?.artist_id === albumData.artist_id) setIsOwner(true)

        // What does this buyer already own? (album purchase grants every track)
        const { data: purchases } = await supabase
          .from('purchases')
          .select('item_type, item_id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
        if (purchases) {
          setAlbumOwned(purchases.some(p => p.item_type === 'album' && p.item_id === id))
          setOwnedTrackIds(new Set(purchases.filter(p => p.item_type === 'track').map(p => p.item_id)))
        }
      }
    }
    load()
  }, [id])

  const navPills: NavSection[] = [
    { key: 'artist', label: artist?.name || 'Artist' },
    ...(artistAlbums.length > 0  ? [{ key: 'albums',  label: 'Albums' }]  : []),
    ...(artistStories.length > 0 ? [{ key: 'stories', label: 'Stories' }] : []),
    ...(artistFilms.length > 0   ? [{ key: 'films',   label: 'Films' }]   : []),
  ]

  const handleNavPill = (key: string) => {
    if (!artist) return
    if (key === 'artist') router.push(`/artist/${artist.id}`)
    else router.push(`/artist/${artist.id}#${key}`)
  }

  const totalDuration = tracks.reduce((acc, t) => {
    if (!t.duration) return acc
    const parts = t.duration.split(':').map(Number)
    return acc + (parts[0] * 60 + (parts[1] || 0))
  }, 0)
  const durationStr = totalDuration > 0
    ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`
    : null

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Loading</div>
    </div>
  )

  if (notFound || !album) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💿</div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Album not found</div>
        <button onClick={() => router.back()} style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', marginTop: '16px' }}>← Go back</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── ALBUM HERO ── */}
      <div style={{ position: 'relative', background: '#0a0a0b', marginTop: '-70px', paddingTop: '70px', minHeight: '360px', overflow: 'hidden' }}>
        {isOwner && (
          <a href={isAdmin ? '/admin/upload' : '/dashboard'} style={{ position: 'absolute', top: '90px', left: '24px', zIndex: 20, padding: '6px 14px', borderRadius: '20px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', fontSize: '12px', textDecoration: 'none', backdropFilter: 'blur(10px)', fontFamily: 'DM Sans, sans-serif' }}>
            {isAdmin ? '← Admin Portal' : '← Dashboard'}
          </a>
        )}
        {(album.hero_image_url || album.cover_url) && (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${album.hero_image_url || album.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: album.hero_image_url ? 'brightness(0.45)' : 'blur(40px) brightness(0.2)' }} />
        )}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '860px', margin: '0 auto', padding: '60px 48px 48px', display: 'flex', gap: '40px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {album.cover_url ? (
            <img src={album.cover_url} alt={album.title} style={{ width: '200px', height: '200px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '200px', height: '200px', borderRadius: '12px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px', flexShrink: 0 }}>💿</div>
          )}
          <div style={{ flex: 1, minWidth: '200px', paddingBottom: '8px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '8px', fontWeight: '600' }}>
              {album.album_type || 'Album'}
            </div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(24px, 5vw, 48px)', fontWeight: '700', color: 'white', lineHeight: '1.1', marginBottom: '12px' }}>
              {album.title}
            </h1>
            {artist && (
              <button onClick={() => router.push(`/artist/${artist.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '12px' }}>
                {artist.photo_url && <img src={artist.photo_url} alt={artist.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />}
                <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>{artist.name}</span>
              </button>
            )}
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              {album.release_date && <span>{new Date(album.release_date).getFullYear()}</span>}
              <span>{tracks.length} track{tracks.length !== 1 ? 's' : ''}</span>
              {durationStr && <span>{durationStr}</span>}
              <LikeButton contentType="album" contentId={album.id} size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* ── ARTIST NAV PILLS ── */}
      {navPills.length > 1 && (
        <div style={{ position: 'sticky', top: '70px', zIndex: 40, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)', padding: '0 48px' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', gap: '4px', padding: '12px 0' }}>
            {navPills.map(pill => (
              <button key={pill.key} onClick={() => handleNavPill(pill.key)}
                style={{ padding: '7px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--text-muted)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── TRACKLIST ── */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 48px 120px' }}>
        {album.description && (
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '32px', maxWidth: '600px' }}>{album.description}</p>
        )}

        {tracks.length > 0 && (
          <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => currentTrack?.id === tracks[0]?.id ? togglePlay() : playTrack(tracks[0] as any, tracks as any, 0)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 28px', borderRadius: '50px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '600' }}>
              ▶ Play Album
            </button>
            <BuyButton
              itemType="album"
              itemId={album.id}
              price={album.price}
              owned={albumOwned}
              label={`Buy album · $${Number(album.price).toFixed(2)}`}
              style={{ padding: '12px 28px', fontSize: '15px' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {tracks.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              isCurrent={currentTrack?.id === track.id}
              isPlaying={isPlaying}
              owned={albumOwned || ownedTrackIds.has(track.id)}
              onPlay={() => currentTrack?.id === track.id ? togglePlay() : playTrack(track as any, tracks as any, tracks.findIndex(t => t.id === track.id))}
            />
          ))}
        </div>

        {tracks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎵</div>
            <div>No tracks published yet.</div>
          </div>
        )}
      </div>
    </div>
  )
}
