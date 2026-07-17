'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/context/PlayerContext'
import LikeButton from '@/components/LikeButton'
import HeroMedia from '@/components/HeroMedia'

// ─── Types ───────────────────────────────────────────────────────────────────

type Artist = {
  id: string
  name: string
  photo_url: string | null
  bio: string | null
  creator_label: string | null
  is_featured: boolean
  hero_video_url?: string | null
}

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
  mood_tags: string[] | null
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

type Genre = { id: string; name: string; track_count: number }

type EscapeCoach = {
  id: string
  name: string
  category: string
  tagline: string | null
  avatar_url: string | null
}

const COACH_EMOJIS: Record<string, string> = {
  gym: '💪', victory: '🏆', romance: '❤️', workplace: '💼',
  sleep: '🌙', spiritual: '✨', party: '🎉', road: '🚗',
  'mental-health': '🧠', housekeeping: '🏠',
}

// ─── Featured Artist Hero ─────────────────────────────────────────────────────

function FeaturedHero({ artists, onPlayArtist }: {
  artists: Artist[]
  onPlayArtist: (artist: Artist) => void
}) {
  const router = useRouter()
  const [current, setCurrent]     = useState(0)
  const [paused, setPaused]       = useState(false)
  const [soundOn, setSoundOn]     = useState(false)
  const [animating, setAnimating] = useState(false)
  const [isMobile, setIsMobile]   = useState(false)
  const intervalRef               = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const goTo = useCallback((index: number) => {
    setAnimating(true)
    setTimeout(() => { setCurrent(index); setAnimating(false) }, 300)
  }, [])

  const next = useCallback(() => goTo((current + 1) % artists.length), [current, artists.length, goTo])
  const prev = useCallback(() => goTo((current - 1 + artists.length) % artists.length), [current, artists.length, goTo])

  useEffect(() => {
    // Don't auto-advance while hovering or while the viewer is listening with sound on.
    if (paused || soundOn || artists.length <= 1) return
    intervalRef.current = setInterval(next, 6000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [paused, soundOn, next, artists.length])

  if (!artists.length) return null
  const artist = artists[current]

  return (
    <div style={{ position: 'relative', overflow: 'hidden', height: '620px', marginTop: '-70px' }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <HeroMedia
        imageUrl={artist.photo_url}
        videoUrl={artist.hero_video_url}
        position="center center"
        allowUnmute={!!artist.hero_video_url}
        onSoundChange={setSoundOn}
        style={{ filter: 'brightness(0.9)', transition: 'opacity 0.3s', opacity: animating ? 0 : 1 }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 100%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(to top, var(--bg-primary), transparent)' }} />

      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', textAlign: isMobile ? 'center' : 'left', padding: isMobile ? '70px 22px 64px' : '80px 64px 60px', gap: isMobile ? '20px' : '48px', opacity: animating ? 0 : 1, transition: 'opacity 0.3s' }}>
        {artist.photo_url && (
          <div style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => router.push(`/artist/${artist.id}`)}>
            <img src={artist.photo_url} alt={artist.name} style={{ width: isMobile ? '116px' : '180px', height: isMobile ? '116px' : '180px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, maxWidth: '100%' }}>
          {artist.creator_label && (
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '10px', fontWeight: '600' }}>
              {artist.creator_label} · Featured
            </div>
          )}
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: '700', color: 'white', lineHeight: '1.05', marginBottom: '14px', cursor: 'pointer' }} onClick={() => router.push(`/artist/${artist.id}`)}>
            {artist.name}
          </h2>
          {artist.bio && (
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.65)', lineHeight: '1.6', maxWidth: '480px', marginBottom: '28px', marginLeft: isMobile ? 'auto' : undefined, marginRight: isMobile ? 'auto' : undefined }}>
              {artist.bio.slice(0, 140)}{artist.bio.length > 140 ? '…' : ''}
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
            <button onClick={() => router.push(`/artist/${artist.id}`)} style={{ padding: '12px 28px', borderRadius: '50px', background: 'white', color: '#0a0a0b', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>View Artist</button>
            <button onClick={() => onPlayArtist(artist)} style={{ padding: '12px 28px', borderRadius: '20px', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '14px', fontWeight: '500', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>▶ Play</button>
          </div>
        </div>
      </div>

      {artists.length > 1 && (
        <>
          <button onClick={prev} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 20, width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: '18px', cursor: 'pointer', display: isMobile ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>‹</button>
          <button onClick={next} style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 20, width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: '18px', cursor: 'pointer', display: isMobile ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>›</button>
          <div style={{ position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 20 }}>
            {artists.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{ width: i === current ? '24px' : '8px', height: '8px', borderRadius: '4px', background: i === current ? 'white' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

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
              <div style={{ width: '3px', height: '12px', background: isCurrent ? 'var(--accent-primary)' : 'white', borderRadius: '2px' }} />
              <div style={{ width: '3px', height: '12px', background: isCurrent ? 'var(--accent-primary)' : 'white', borderRadius: '2px' }} />
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.3', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{album.title}</div>
        <LikeButton contentType="album" contentId={album.id} size="sm" />
      </div>
      {album.artist && (
        <div onClick={e => { e.stopPropagation(); router.push(`/artist/${album.artist!.id}`) }} style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-block' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          {album.artist.name}{album.release_date ? ` · ${new Date(album.release_date).getFullYear()}` : ''}
        </div>
      )}
    </div>
  )
}

// ─── Coach Card ───────────────────────────────────────────────────────────────

function CoachCard({ coach }: { coach: EscapeCoach }) {
  const [hovered, setHovered] = useState(false)
  const emoji = COACH_EMOJIS[coach.category] || '🎵'

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? 'var(--bg-card)' : 'var(--bg-secondary)', border: `1px solid ${hovered ? 'var(--accent-primary)' : 'var(--border)'}`, borderRadius: '16px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s', transform: hovered ? 'translateY(-3px)' : 'translateY(0)' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: coach.avatar_url ? 'none' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', overflow: 'hidden' }}>
        {coach.avatar_url ? <img src={coach.avatar_url} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : emoji}
      </div>
      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>{coach.name}</div>
      {coach.tagline && <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '14px' }}>{coach.tagline}</div>}
      <div style={{ fontSize: '12px', color: hovered ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: '500', transition: 'color 0.2s' }}>Explore playlist →</div>
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, count, id }: { title: string; subtitle?: string; count?: number; id?: string }) {
  return (
    <div id={id} style={{ marginBottom: '24px', scrollMarginTop: '100px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)' }}>{title}</h2>
        {count !== undefined && <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-muted)' }}>{count}</span>}
      </div>
      {subtitle && <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>{subtitle}</p>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MusicPage() {
  const router = useRouter()
  const { playTrack, togglePlay, currentTrack, isPlaying } = usePlayer()

  const [featuredArtists, setFeaturedArtists] = useState<Artist[]>([])
  const [newArrivals, setNewArrivals]         = useState<Track[]>([])
  const [hotAlbums, setHotAlbums]             = useState<Album[]>([])
  const [coolTracks, setCoolTracks]           = useState<Track[]>([])
  const [coaches, setCoaches]                 = useState<EscapeCoach[]>([])
  const [genres, setGenres]                   = useState<Genre[]>([])
  const [loading, setLoading]                 = useState(true)

  // Section refs for nav pill scrolling
  const albumsRef  = useRef<HTMLElement | null>(null)
  const tracksRef  = useRef<HTMLElement | null>(null)
  const browseRef  = useRef<HTMLElement | null>(null)
  const escapesRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const load = async () => {
      const [
        { data: artistsData },
        { data: tracksData },
        { data: albumsData },
        { data: coachesData },
        { data: genresData },
      ] = await Promise.all([
        supabase.from('artists').select('id, name, photo_url, bio, creator_label, is_featured, hero_video_url').eq('is_featured', true).order('featured_order'),
        supabase.from('tracks').select('id, title, duration, cloudinary_url, track_image_url, track_type, content_origin, album_id, artist_id, mood_tags, is_featured, featured_order').eq('status', 'published').order('created_at', { ascending: false }),
        supabase.from('albums').select('id, title, cover_url, release_date, album_type, artist_id, is_featured').eq('status', 'published').order('release_date', { ascending: false }),
        supabase.from('escape_coaches').select('id, name, category, tagline, avatar_url').eq('is_active', true).order('display_order'),
        supabase.from('genres').select('id, name').eq('content_type', 'music').order('name'),
      ])

      // Fetch artist map
      const allArtistIds = [...new Set([
        ...(tracksData || []).map((t: any) => t.artist_id),
        ...(albumsData || []).map((a: any) => a.artist_id),
      ].filter(Boolean))]

      const { data: artistsMapData } = allArtistIds.length > 0
        ? await supabase.from('artists').select('id, name, photo_url').in('id', allArtistIds)
        : { data: [] }

      const artistMap = Object.fromEntries((artistsMapData || []).map((a: any) => [a.id, a]))

      const normTracks = (tracksData || []).map((t: any) => ({ ...t, artist: artistMap[t.artist_id] || null }))
      const normAlbums = (albumsData || []).map((a: any) => ({ ...a, artist: artistMap[a.artist_id] || null }))

      // Fetch genre track counts
      const { data: genreCountData } = await supabase
        .from('content_genres')
        .select('genre_id')
        .eq('content_type', 'track')

      const genreCounts: Record<string, number> = {}
      ;(genreCountData || []).forEach((row: any) => {
        genreCounts[row.genre_id] = (genreCounts[row.genre_id] || 0) + 1
      })

      const genresWithCounts = (genresData || [])
        .map((g: any) => ({ ...g, track_count: genreCounts[g.id] || 0 }))
        .filter((g: any) => g.track_count > 0)
        .sort((a: any, b: any) => b.track_count - a.track_count)

      // Deduplicate — one per artist
      const dedupeByArtist = (items: any[]) => {
        const seen = new Set<string>()
        return items.filter(item => {
          if (seen.has(item.artist_id)) return false
          seen.add(item.artist_id)
          return true
        })
      }

      // New Arrivals — curate-or-auto: admin-featured tracks (in their order) take
      // priority; if none are featured, fall back to newest-per-artist.
      const featuredArrivals = normTracks
        .filter((t: any) => t.is_featured)
        .sort((a: any, b: any) => (a.featured_order ?? 999) - (b.featured_order ?? 999))
      const newArrivalsDeduped = featuredArrivals.length > 0
        ? featuredArrivals.slice(0, 12)
        : dedupeByArtist(normTracks).slice(0, 6)

      // Hot Albums — curate-or-auto: featured albums take priority, else newest per artist
      const featuredAlbums = normAlbums.filter((a: any) => a.is_featured)
      const hotAlbumsDeduped = featuredAlbums.length > 0
        ? featuredAlbums.slice(0, 12)
        : dedupeByArtist(normAlbums).slice(0, 6)

      // Cool Tracks — standalone singles; featured singles take priority, else newest per artist
      const singles = normTracks.filter((t: any) => !t.album_id)
      const featuredSingles = singles
        .filter((t: any) => t.is_featured)
        .sort((a: any, b: any) => (a.featured_order ?? 999) - (b.featured_order ?? 999))
      const coolTracksDeduped = featuredSingles.length > 0
        ? featuredSingles.slice(0, 12)
        : dedupeByArtist(singles).slice(0, 6)

      setFeaturedArtists(artistsData || [])
      setNewArrivals(newArrivalsDeduped)
      setHotAlbums(hotAlbumsDeduped)
      setCoolTracks(coolTracksDeduped)
      setCoaches(coachesData || [])
      setGenres(genresWithCounts)
      setLoading(false)
    }
    load()
  }, [])

  const handlePlayArtist = async (artist: Artist) => {
    const { data } = await supabase.from('tracks').select('*').eq('artist_id', artist.id).eq('status', 'published').order('created_at', { ascending: false }).limit(1).single()
    if (data) playTrack(data as any)
  }

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const navPills = [
    { id: 'hot-albums',   label: '💿 Albums' },
    { id: 'cool-tracks',  label: '🎵 Singles' },
    { id: 'browse',       label: '🔍 Browse' },
    { id: 'escapes',      label: '✨ Personal Escapes' },
  ]

  const pillStyle = (active = false) => ({
    padding: '7px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: '500' as const,
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── FEATURED HERO ── */}
      {featuredArtists.length > 0
        ? <FeaturedHero artists={featuredArtists} onPlayArtist={handlePlayArtist} />
        : (
          <div style={{ background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)', padding: '100px 48px 48px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '10px', fontWeight: '600' }}>Human Echo</div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.05', marginBottom: '12px' }}>Music</h1>
              <p style={{ fontSize: '16px', color: 'var(--text-muted)', maxWidth: '480px' }}>Albums, singles and instrumentals from Human Echo artists.</p>
            </div>
          </div>
        )
      }

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 48px 120px' }}>

        {/* ── STICKY NAV PILLS ── */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginBottom: '56px', position: 'sticky', top: '70px', zIndex: 30, background: 'var(--bg-primary)', paddingTop: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)', marginLeft: '-48px', marginRight: '-48px', paddingLeft: '48px', paddingRight: '48px' }}>
          {navPills.map(pill => (
            <button key={pill.id} onClick={() => scrollToSection(pill.id)} style={pillStyle()}>
              {pill.label}
            </button>
          ))}
        </div>

        {/* ── NEW ARRIVALS ── */}
        {newArrivals.length > 0 && (
          <section style={{ marginBottom: '72px' }}>
            <SectionHeader title="New Arrivals" subtitle="Fresh from Human Echo artists — one track per artist" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
              {newArrivals.map(track => (
              <TrackCard key={track.id} track={track} isCurrent={currentTrack?.id === track.id} isPlaying={isPlaying} onPlay={() => currentTrack?.id === track.id ? togglePlay() : playTrack(track as any)} />
              ))}
            </div>
          </section>
        )}

        {/* ── HOT ALBUMS ── */}
        {hotAlbums.length > 0 && (
          <section id="hot-albums" style={{ marginBottom: '72px', scrollMarginTop: '130px' }}>
            <SectionHeader title="Hot Albums" subtitle="Latest releases — one album per artist" count={hotAlbums.length} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '24px' }}>
              {hotAlbums.map(album => <AlbumCard key={album.id} album={album} />)}
            </div>
          </section>
        )}

        {/* ── COOL TRACKS ── */}
        {coolTracks.length > 0 && (
          <section id="cool-tracks" style={{ marginBottom: '72px', scrollMarginTop: '130px' }}>
            <SectionHeader title="Cool Tracks" subtitle="Standalone singles — one per artist" count={coolTracks.length} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
              {coolTracks.map(track => (
               <TrackCard key={track.id} track={track} isCurrent={currentTrack?.id === track.id} isPlaying={isPlaying} onPlay={() => currentTrack?.id === track.id ? togglePlay() : playTrack(track as any)} />
              ))}
            </div>
          </section>
        )}

        {/* ── BROWSE BY GENRE ── */}
        {genres.length > 0 && (
          <section id="browse" style={{ marginBottom: '72px', scrollMarginTop: '130px' }}>
            <SectionHeader title="Browse" subtitle="Explore by genre — only genres with tracks" />
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
              {genres.map(genre => (
                <button key={genre.id}
                  onClick={() => router.push(`/music/genre/${genre.id}`)}
                  style={{ padding: '10px 20px', borderRadius: '50px', fontSize: '14px', fontWeight: '500', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.background = 'rgba(43,122,143,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-secondary)' }}
                >
                  {genre.name}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '1px 6px', borderRadius: '10px' }}>{genre.track_count}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── PERSONAL ESCAPES ── */}
        <section id="escapes" style={{ marginBottom: '72px', scrollMarginTop: '130px' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '24px', padding: '48px', border: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '10px', fontWeight: '600' }}>Lifestyle Playlists</div>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>Personal Escapes</h2>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '560px', margin: '0 auto', lineHeight: '1.7' }}>
                Don't just listen to songs — build a playlist unique to your way of escaping. Each coach curates a journey blending music, affirmations, and meditations for your lifestyle.
              </p>
            </div>

            {coaches.length > 0 ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                  {coaches.map(coach => <CoachCard key={coach.id} coach={coach} />)}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Want to build your own escape? Subscribe to unlock the playlist builder.</div>
                  <button style={{ padding: '12px 32px', borderRadius: '50px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                    Build Your Escape — Coming Soon
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' as const, marginBottom: '32px' }}>
                  {['💪 Gym', '🏆 Victory', '❤️ Romance', '💼 Workplace', '🌙 Sleep', '✨ Spiritual'].map(label => (
  <div key={label} style={{ padding: '8px 16px', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
    <span style={{ lineHeight: 1 }}>{label.split(' ')[0]}</span>
    <span>{label.split(' ').slice(1).join(' ')}</span>
  </div>
))}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button style={{ padding: '12px 32px', borderRadius: '50px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                    Coming Soon
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Empty state */}
        {newArrivals.length === 0 && hotAlbums.length === 0 && coolTracks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎵</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No music yet</div>
            <div style={{ fontSize: '14px' }}>Check back soon.</div>
          </div>
        )}

      </div>
    </div>
  )
}
