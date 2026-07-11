'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/context/PlayerContext'
import LikeButton from '@/components/LikeButton'

// ─── Types ───────────────────────────────────────────────────────────────────

type Artist = {
  id: string
  name: string
  bio: string | null
  photo_url: string | null
  artist_message_url: string | null
  artist_profile_video_url: string | null
  hero_video_url: string | null
  content_origin: string | null
  creator_label: string | null
  creator_type: string[] | null
  deleted_at: string | null
  departure_at: string | null
}

type Track = {
  id: string
  title: string
  duration: string | null
  cloudinary_url: string | null
  track_image_url: string | null
  content_origin: string | null
  track_type: string | null
  album_id: string | null
}

type Album = {
  id: string
  title: string
  cover_url: string | null
  release_date: string | null
  description: string | null
  album_type: string | null
}

type Story = {
  id: string
  title: string
  logline: string | null
  cover_image_url: string | null
  read_time_minutes: number | null
  story_type: string
}

type Film = {
  id: string
  title: string
  logline: string | null
  poster_url: string | null
  film_type: string
  runtime_minutes: number | null
  release_year: number | null
}

const ORIGIN_EMOJI: Record<string, string> = {
  '100% human': '🧑',
  'human+ai': '🧑🤖',
  'ai generated': '🤖',
}

const FILM_TYPE_LABELS: Record<string, string> = {
  feature: 'Feature', documentary: 'Documentary', short: 'Short',
  live_performance: 'Live', music_video: 'Music Video', experimental: 'Experimental',
}

function formatRuntime(mins: number | null) {
  if (!mins) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ─── Artist Message Video ─────────────────────────────────────────────────────

function ArtistMessageVideo({ url, name }: { url: string; name: string }) {
  const videoRef              = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted]     = useState(true)
  const [ended, setEnded]     = useState(false)

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (playing) { v.pause(); setPlaying(false) }
    else { v.play(); setPlaying(true); setEnded(false) }
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '320px', borderRadius: '16px', overflow: 'hidden', background: '#000', flexShrink: 0 }}>
      <video
        ref={videoRef}
        src={url}
        muted={muted}
        playsInline
        autoPlay
        style={{ width: '100%', display: 'block', objectFit: 'contain', cursor: 'pointer' }}
        onClick={() => {
          const v = videoRef.current; if (!v) return
          // First tap turns on sound; after that, tap toggles play/pause.
          if (muted) { v.muted = false; setMuted(false); if (v.paused) { v.play(); setPlaying(true); setEnded(false) } }
          else { toggle() }
        }}
        onEnded={() => { setPlaying(false); setEnded(true) }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {/* "Tap for sound" hint while muted */}
      {muted && !ended && (
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(0,0,0,0.62)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', fontSize: '12px', fontWeight: 600, pointerEvents: 'none', backdropFilter: 'blur(4px)' }}>
          🔊 Tap for sound
        </div>
      )}
      {/* Controls overlay */}
      <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '8px' }}>
        <button onClick={() => { if (videoRef.current) { videoRef.current.muted = !muted; setMuted(!muted) } }}
          aria-label={muted ? 'Unmute' : 'Mute'}
          style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', color: 'white', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
      {ended && (
        <div onClick={toggle} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#0a0a0b' }}>↺</div>
        </div>
      )}
    </div>
  )
}

// ─── Track Row ────────────────────────────────────────────────────────────────

function TrackRow({ track, isPlaying, isCurrent, onPlay }: {
  track: Track
  isPlaying: boolean
  isCurrent: boolean
  onPlay: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPlay}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', background: isCurrent ? 'rgba(43,122,143,0.1)' : hovered ? 'var(--bg-secondary)' : 'transparent', transition: 'background 0.2s', border: isCurrent ? '1px solid rgba(43,122,143,0.2)' : '1px solid transparent' }}
    >
      {/* Artwork / play indicator */}
      <div style={{ position: 'relative', width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)' }}>
        {track.track_image_url
          ? <img src={track.track_image_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎵</div>
        }
        {(hovered || isCurrent) && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '14px', color: 'white' }}>{isCurrent && isPlaying ? '⏸' : '▶'}</span>
          </div>
        )}
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: isCurrent ? '600' : '500', color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {track.content_origin && <span>{ORIGIN_EMOJI[track.content_origin] || ''}</span>}
        </div>
      </div>
      <LikeButton contentType="track" contentId={track.id} size="sm" />
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>{track.duration || '—'}</div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ArtistPage({ id }: { id: string }) {
  const router = useRouter()
  const { playTrack, currentTrack, isPlaying } = usePlayer()

  const [artist, setArtist]   = useState<Artist | null>(null)
  const [tracks, setTracks]   = useState<Track[]>([])
  const [albums, setAlbums]   = useState<Album[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [films, setFilms]     = useState<Film[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('tracks')
  const [hoveredAlbum, setHoveredAlbum] = useState<string | null>(null)
  const [hoveredStory, setHoveredStory] = useState<string | null>(null)
  const [hoveredFilm, setHoveredFilm]   = useState<string | null>(null)
  const [isOwner, setIsOwner]   = useState(false)
  const [isAdmin, setIsAdmin]   = useState(false)

  // Section refs for scroll
  const tracksRef  = useRef<HTMLDivElement>(null)
  const albumsRef  = useRef<HTMLDivElement>(null)
  const storiesRef = useRef<HTMLDivElement>(null)
  const filmsRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: artistData } = await supabase
        .from('artists')
        .select('id, name, bio, photo_url, artist_message_url, artist_profile_video_url, hero_video_url, content_origin, creator_label, creator_type, deleted_at, departure_at')
        .eq('id', id)
        .single()

      if (!artistData) { setNotFound(true); setLoading(false); return }
      setArtist(artistData)
const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role, artist_id').eq('id', user.id).single()
        
if (profile?.role === 'admin') { setIsOwner(true); setIsAdmin(true) }
else if (profile?.artist_id === id) setIsOwner(true)
      }

      // Fetch all content in parallel
      const [
        { data: tracksData },
        { data: albumsData },
        { data: storiesData },
        { data: filmsData },
      ] = await Promise.all([
        supabase.from('tracks').select('id, title, duration, cloudinary_url, track_image_url, content_origin, track_type, album_id')
          .eq('artist_id', id).eq('status', 'published').is('album_id', null).order('created_at', { ascending: false }),
        supabase.from('albums').select('id, title, cover_url, release_date, description, album_type')
          .eq('artist_id', id).eq('status', 'published').order('release_date', { ascending: false }),
        supabase.from('stories').select('id, title, logline, cover_image_url, read_time_minutes, story_type')
          .eq('artist_id', id).eq('status', 'published').order('created_at', { ascending: false }),
        supabase.from('films').select('id, title, logline, poster_url, film_type, runtime_minutes, release_year')
          .eq('artist_id', id).eq('status', 'published').order('created_at', { ascending: false }),
      ])

      setTracks(tracksData || [])
      setAlbums(albumsData || [])
      setStories(storiesData || [])
      setFilms(filmsData || [])

      // Set initial active section
      if (tracksData && tracksData.length > 0) setActiveSection('tracks')
      else if (albumsData && albumsData.length > 0) setActiveSection('albums')
      else if (storiesData && storiesData.length > 0) setActiveSection('stories')
      else if (filmsData && filmsData.length > 0) setActiveSection('films')

      setLoading(false)
    }
    load()
  }, [id])

  const scrollTo = (section: string) => {
    setActiveSection(section)
    const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {
      tracks: tracksRef, albums: albumsRef, stories: storiesRef, films: filmsRef,
    }
    refs[section]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const navPills = [
    tracks.length > 0  && { key: 'tracks',  label: 'Tracks' },
    albums.length > 0  && { key: 'albums',  label: 'Albums' },
    stories.length > 0 && { key: 'stories', label: 'Stories' },
    films.length > 0   && { key: 'films',   label: 'Films' },
  ].filter(Boolean) as { key: string; label: string }[]

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Loading</div>
    </div>
  )

  if (notFound || !artist) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎤</div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>
          {artist?.departure_at ? 'This artist has left Human Echo' : 'Artist not found'}
        </div>
        <button onClick={() => router.push('/music')} style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', marginTop: '16px' }}>
          ← Browse Music
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HERO ── */}
      <div style={{ position: 'relative', background: '#0a0a0b', marginTop: '-70px', paddingTop: '70px', minHeight: '420px', maxHeight: '560px', overflow: 'hidden' }}>

        {/* Still image background — centered, darkened */}
        {artist.photo_url && (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${artist.photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.45)' }} />
        )}

        {/* Gradient overlays */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px', background: 'linear-gradient(to top, var(--bg-primary), transparent)' }} />
{/* Dashboard back link — only for owner/admin */}
        {isOwner && (
  <a href={isAdmin ? '/admin/upload' : '/dashboard'} style={{ position: 'absolute', top: '90px', left: '24px', zIndex: 20, padding: '6px 14px', borderRadius: '20px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', fontSize: '12px', textDecoration: 'none', backdropFilter: 'blur(10px)', fontFamily: 'DM Sans, sans-serif' }}>
    {isAdmin ? '← Admin Portal' : '← Dashboard'}
  </a>
)}

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '60px 48px 56px', display: 'flex', gap: '48px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Photo */}
          <div style={{ flexShrink: 0 }}>
            {artist.photo_url ? (
              <img src={artist.photo_url} alt={artist.name} style={{ width: '160px', height: '160px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }} />
            ) : (
              <div style={{ width: '160px', height: '160px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px', border: '3px solid rgba(255,255,255,0.1)' }}>🎤</div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            {artist.creator_label && (
              <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '10px', fontWeight: '600' }}>
                {artist.creator_label}
                {artist.content_origin && ` · ${ORIGIN_EMOJI[artist.content_origin] || ''}`}
              </div>
            )}
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(32px, 6vw, 64px)', fontWeight: '700', color: 'white', lineHeight: '1.05', marginBottom: '16px' }}>
              {artist.name}
            </h1>
            {artist.bio && (
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.65)', lineHeight: '1.7', maxWidth: '560px', marginBottom: '24px' }}>
                {artist.bio}
              </p>
            )}

            {/* Share buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: '𝕏', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(`Check out ${artist.name} on Human Echo`)}` },
                { label: 'f', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}` },
                { label: '💬', href: `https://wa.me/?text=${encodeURIComponent(`${artist.name} on Human Echo — ${typeof window !== 'undefined' ? window.location.href : ''}`)}` },
              ].map(item => (
                <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', fontSize: '13px', textDecoration: 'none', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.05)' }}>
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* Artist message video */}
          {(artist.artist_profile_video_url || artist.artist_message_url) && (
            <ArtistMessageVideo url={artist.artist_profile_video_url || artist.artist_message_url!} name={artist.name} />
          )}
        </div>
      </div>

      {/* ── STICKY NAV PILLS ── */}
      {navPills.length > 0 && (
        <div style={{ position: 'sticky', top: '70px', zIndex: 40, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)', padding: '0 48px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '4px', padding: '12px 0' }}>
            {navPills.map(pill => (
              <button key={pill.key} onClick={() => scrollTo(pill.key)}
                style={{ padding: '7px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: activeSection === pill.key ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: activeSection === pill.key ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 48px 120px' }}>

        {/* ── TRACKS ── */}
        {tracks.length > 0 && (
          <section ref={tracksRef} style={{ marginBottom: '72px', scrollMarginTop: '130px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              Tracks <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>{tracks.length}</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {tracks.map(track => (
                <TrackRow
                  key={track.id}
                  track={track}
                  isCurrent={currentTrack?.id === track.id}
                  isPlaying={isPlaying}
                  onPlay={() => playTrack(track as any)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── ALBUMS ── */}
        {albums.length > 0 && (
          <section ref={albumsRef} style={{ marginBottom: '72px', scrollMarginTop: '130px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              Albums <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>{albums.length}</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
              {albums.map(album => (
                <div key={album.id}
                  onClick={() => router.push(`/album/${album.id}`)}
                  onMouseEnter={() => setHoveredAlbum(album.id)}
                  onMouseLeave={() => setHoveredAlbum(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px', background: 'var(--bg-secondary)', transition: 'transform 0.2s', transform: hoveredAlbum === album.id ? 'translateY(-4px)' : 'translateY(0)' }}>
                    {album.cover_url
                      ? <img src={album.cover_url} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>💿</div>
                    }
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hoveredAlbum === album.id ? 1 : 0, transition: 'opacity 0.2s' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#0a0a0b' }}>▶</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.3', marginBottom: '2px' }}>{album.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {album.album_type || 'Album'}
                    {album.release_date ? ` · ${new Date(album.release_date).getFullYear()}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── STORIES ── */}
        {stories.length > 0 && (
          <section ref={storiesRef} style={{ marginBottom: '72px', scrollMarginTop: '130px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              Stories <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>{stories.length}</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stories.map(story => (
                <div key={story.id}
                  onClick={() => router.push(`/stories/${story.id}`)}
                  onMouseEnter={() => setHoveredStory(story.id)}
                  onMouseLeave={() => setHoveredStory(null)}
                  style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', background: hoveredStory === story.id ? 'var(--bg-secondary)' : 'transparent', border: '1px solid', borderColor: hoveredStory === story.id ? 'var(--accent-primary)' : 'var(--border)', transition: 'all 0.2s' }}
                >
                  {story.cover_image_url ? (
                    <img src={story.cover_image_url} alt={story.title} style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>📖</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{story.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {story.story_type?.replace('_', ' ')}
                      {story.read_time_minutes ? ` · ${story.read_time_minutes} min read` : ''}
                    </div>
                    {story.logline && (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{story.logline}</div>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--accent-primary)', flexShrink: 0 }}>Read →</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── FILMS ── */}
        {films.length > 0 && (
          <section ref={filmsRef} style={{ marginBottom: '72px', scrollMarginTop: '130px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              Films <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>{films.length}</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
              {films.map(film => (
                <div key={film.id}
                  onClick={() => router.push(`/cinema/films/${film.id}`)}
                  onMouseEnter={() => setHoveredFilm(film.id)}
                  onMouseLeave={() => setHoveredFilm(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ position: 'relative', aspectRatio: '2/3', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px', background: 'var(--bg-secondary)', transition: 'transform 0.2s', transform: hoveredFilm === film.id ? 'translateY(-4px)' : 'translateY(0)', border: '1px solid var(--border)' }}>
                    {film.poster_url
                      ? <img src={film.poster_url} alt={film.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🎬</div>
                    }
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hoveredFilm === film.id ? 1 : 0, transition: 'opacity 0.2s' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#0a0a0b' }}>▶</div>
                    </div>
                    <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: 'white', fontWeight: '600' }}>
                      {FILM_TYPE_LABELS[film.film_type] || film.film_type}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.3', marginBottom: '2px' }}>{film.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {film.release_year || ''}
                    {film.runtime_minutes ? ` · ${formatRuntime(film.runtime_minutes)}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {tracks.length === 0 && albums.length === 0 && stories.length === 0 && films.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎵</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No published content yet</div>
            <div style={{ fontSize: '14px' }}>Check back soon.</div>
          </div>
        )}

      </div>
    </div>
  )
}
