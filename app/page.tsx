'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { usePlayer } from '@/context/PlayerContext'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Track    = { id: string; title: string; duration: string | null; cloudinary_url: string | null; track_image_url: string | null; content_origin: string | null; track_type: string | null; artist_id: string | null }
type Album    = { id: string; title: string; cover_url: string | null; artist_id: string | null }
type Artist   = { id: string; name: string; photo_url: string | null; bio: string | null; content_origin: string | null }
type Executive = { id: string; name: string; title: string; photo_url: string | null; intro_video_url: string | null; featured_message: string | null; department: string | null }
type Genre    = { id: string; name: string }

const originEmoji = (o?: string | null) => o === '100% human' ? '🧑' : o === 'human+ai' ? '🧑🤖' : o === 'ai generated' ? '🤖' : ''

export default function HomePage() {
  const router = useRouter()
  const { playTrack, currentTrack, isPlaying } = usePlayer()

  const [heroTrack, setHeroTrack]       = useState<Track | null>(null)
  const [heroAlbum, setHeroAlbum]       = useState<Album | null>(null)
  const [heroArtist, setHeroArtist]     = useState<Artist | null>(null)
  const [executive, setExecutive]       = useState<Executive | null>(null)
  const [newArrivals, setNewArrivals]   = useState<(Track & { artist_name?: string; album_title?: string })[]>([])
  const [artists, setArtists]           = useState<Artist[]>([])
  const [genres, setGenres]             = useState<Genre[]>([])
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [playCount, setPlayCount]       = useState(0)
  const [showGate, setShowGate]         = useState(false)
  const [loading, setLoading]           = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const MAX_FREE_PLAYS = 3

  useEffect(() => {
    const load = async () => {
      // Hero content
      const [{ data: featuredTrack }, { data: featuredAlbum }, { data: featuredArtist }, { data: exec }] = await Promise.all([
        supabase.from('tracks').select('id, title, duration, cloudinary_url, track_image_url, content_origin, track_type, artist_id').eq('is_featured', true).single(),
        supabase.from('albums').select('id, title, cover_url, artist_id').eq('is_featured', true).single(),
        supabase.from('artists').select('id, name, photo_url, bio, content_origin').eq('is_featured', true).single(),
        supabase.from('executives').select('id, name, title, photo_url, intro_video_url, featured_message, department').eq('is_featured', true).single(),
      ])

      if (featuredTrack) setHeroTrack(featuredTrack)
      if (featuredAlbum) setHeroAlbum(featuredAlbum)
      if (featuredArtist) setHeroArtist(featuredArtist)
      if (exec) setExecutive(exec)

      // New arrivals — 8 most recent published tracks
      const { data: arrivals } = await supabase
        .from('tracks')
        .select('id, title, duration, cloudinary_url, track_image_url, content_origin, track_type, artist_id, album_id')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(8)

      if (arrivals) {
        // Enrich with artist names
        const enriched = await Promise.all(arrivals.map(async t => {
          const { data: artist } = await supabase.from('artists').select('name').eq('id', t.artist_id).single()
          return { ...t, artist_name: artist?.name || '' }
        }))
        setNewArrivals(enriched)
      }

      // Published artists
      const { data: publishedArtists } = await supabase
        .from('artists')
        .select('id, name, photo_url, bio, content_origin')
        .is('deleted_at', null)
        .order('name')
      if (publishedArtists) setArtists(publishedArtists)

      // Genres
      const { data: genreData } = await supabase
        .from('genres')
        .select('id, name')
        .eq('content_type', 'music')
        .order('name')
      if (genreData) setGenres(genreData)

      setLoading(false)
    }
    load()

    // Load play count from localStorage
    const stored = parseInt(localStorage.getItem('he_play_count') || '0')
    setPlayCount(stored)
  }, [])

  const handlePlay = (track: Track) => {
    const count = parseInt(localStorage.getItem('he_play_count') || '0')
    if (count >= MAX_FREE_PLAYS) {
      setShowGate(true)
      return
    }
    const newCount = count + 1
    localStorage.setItem('he_play_count', String(newCount))
    setPlayCount(newCount)
    playTrack(track)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#666', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        minHeight: '92vh',
        display: 'flex',
        alignItems: 'flex-end',
        overflow: 'hidden',
        background: '#0a0a0b',
      }}>
        {/* Background — album cover or gradient */}
        {heroAlbum?.cover_url ? (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${heroAlbum.cover_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(2px) brightness(0.35)',
            transform: 'scale(1.05)',
          }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0d1f2d 0%, #0a0a0b 60%, #1a0d0d 100%)' }} />
        )}

        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,11,0.98) 0%, rgba(10,10,11,0.4) 50%, rgba(10,10,11,0.1) 100%)' }} />

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 40px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '48px' }}>

            {/* Album art */}
            {heroAlbum?.cover_url && (
              <div style={{ flexShrink: 0 }}>
                <img
                  src={heroAlbum.cover_url}
                  alt={heroAlbum.title}
                  style={{ width: '220px', height: '220px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}
                />
              </div>
            )}

            {/* Text + controls */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '12px', fontWeight: '600' }}>
                Featured Release
              </div>
              <h1 style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 'clamp(36px, 6vw, 72px)',
                fontWeight: '700',
                color: 'white',
                lineHeight: '1.05',
                marginBottom: '8px',
                letterSpacing: '-0.02em',
              }}>
                {heroAlbum?.title || 'Human Echo'}
              </h1>
              <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px', fontWeight: '400' }}>
                {heroArtist?.name}
              </div>
              {heroTrack && (
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '32px' }}>
                  Now playing: {heroTrack.title} · {heroTrack.duration}
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                {heroTrack && (
                  <button
                    onClick={() => handlePlay(heroTrack)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '14px 28px', borderRadius: '50px',
                      background: currentTrack?.id === heroTrack.id && isPlaying ? 'rgba(255,255,255,0.15)' : 'white',
                      color: currentTrack?.id === heroTrack.id && isPlaying ? 'white' : '#0a0a0b',
                      fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{currentTrack?.id === heroTrack.id && isPlaying ? '⏸' : '▶'}</span>
                    {currentTrack?.id === heroTrack.id && isPlaying ? 'Playing' : 'Play'}
                  </button>
                )}
                {heroAlbum && (
                  <button
                    onClick={() => router.push(`/album/${heroAlbum.id}`)}
                    style={{
                      padding: '14px 28px', borderRadius: '50px',
                      background: 'rgba(255,255,255,0.1)', color: 'white',
                      fontSize: '15px', fontWeight: '500',
                      border: '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer', backdropFilter: 'blur(10px)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  >
                    View Album →
                  </button>
                )}
              </div>
            </div>

            {/* Artist photo */}
            {heroArtist?.photo_url && (
              <div style={{ flexShrink: 0, display: 'none' }} className="hero-artist-photo">
                <img
                  src={heroArtist.photo_url}
                  alt={heroArtist.name}
                  style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.2)', boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── PLAY GATE ─────────────────────────────────────────────────────── */}
      {showGate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(10,10,11,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: '20px', padding: '48px 40px',
            maxWidth: '420px', width: '90%', textAlign: 'center',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎵</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
              You've been listening a lot
            </div>
            <div style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '32px' }}>
              We love that. Create a free account to keep listening — and we'll throw in a free track as a thank you.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => router.push('/login')}
                style={{ padding: '14px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
              >
                Join Human Echo — it's free →
              </button>
              <button
                onClick={() => setShowGate(false)}
                style={{ padding: '12px', borderRadius: '10px', background: 'none', color: 'var(--text-muted)', fontSize: '14px', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>

        {/* ── EXECUTIVE SPOTLIGHT ───────────────────────────────────────────── */}
        {executive && (
          <section style={{ padding: '80px 0 60px' }}>
            <div style={{
              display: 'flex', gap: '40px', alignItems: 'center',
              background: 'var(--bg-secondary)', borderRadius: '20px',
              padding: '40px', border: '1px solid var(--border)',
              overflow: 'hidden', position: 'relative',
            }}>
              {/* Decorative accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))' }} />

              {executive.intro_video_url ? (
                <video
                  src={executive.intro_video_url}
                  style={{ width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '3px solid var(--accent-primary)' }}
                  autoPlay muted loop playsInline
                />
              ) : executive.photo_url ? (
                <img src={executive.photo_url} alt={executive.name} style={{ width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '3px solid var(--accent-primary)' }} />
              ) : (
                <div style={{ width: '140px', height: '140px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', flexShrink: 0 }}>🤖</div>
              )}

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '8px', fontWeight: '600' }}>
                  A message from {executive.department || 'the team'}
                </div>
                {executive.featured_message && (
                  <blockquote style={{
                    fontFamily: 'Playfair Display, serif',
                    fontSize: 'clamp(16px, 2.5vw, 22px)',
                    fontWeight: '400',
                    color: 'var(--text-primary)',
                    lineHeight: '1.5',
                    marginBottom: '20px',
                    fontStyle: 'italic',
                  }}>
                    "{executive.featured_message}"
                  </blockquote>
                )}
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{executive.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{executive.title} · Human Echo</div>
              </div>
            </div>
          </section>
        )}

        {/* ── NEW ARRIVALS ──────────────────────────────────────────────────── */}
        {newArrivals.length > 0 && (
          <section style={{ paddingBottom: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '32px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)' }}>
                New Arrivals
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Latest from our artists</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
              {newArrivals.map(track => (
                <div
                  key={track.id}
                  style={{ cursor: 'pointer', group: 'true' } as any}
                  onClick={() => handlePlay(track)}
                >
                  <div style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', background: 'var(--bg-secondary)' }}>
                    {track.track_image_url
                      ? <img src={track.track_image_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🎵</div>
                    }
                    {/* Play overlay */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: currentTrack?.id === track.id && isPlaying ? 1 : 0,
                      transition: 'opacity 0.2s ease',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = currentTrack?.id === track.id && isPlaying ? '1' : '0')}
                    >
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', color: '#0a0a0b',
                      }}>
                        {currentTrack?.id === track.id && isPlaying ? '⏸' : '▶'}
                      </div>
                    </div>
                    {/* Origin badge */}
                    {track.content_origin && (
                      <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: 'white', backdropFilter: 'blur(4px)' }}>
                        {originEmoji(track.content_origin)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{track.artist_name} · {track.duration || '—'}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── ARTIST ROSTER ─────────────────────────────────────────────────── */}
        {artists.length > 0 && (
          <section style={{ paddingBottom: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '32px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Our Artists
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{artists.length} artist{artists.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '24px' }}>
              {artists.map(artist => (
                <div
                  key={artist.id}
                  onClick={() => router.push(`/artist/${artist.id}`)}
                  style={{ cursor: 'pointer', textAlign: 'center' }}
                >
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    {artist.photo_url
                      ? <img src={artist.photo_url} alt={artist.name} style={{ width: '100%', aspectRatio: '1', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', transition: 'border-color 0.2s' }} />
                      : <div style={{ width: '100%', aspectRatio: '1', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', border: '2px solid var(--border)' }}>🎤</div>
                    }
                    {artist.content_origin && (
                      <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'var(--bg-primary)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', border: '1px solid var(--border)' }}>
                        {originEmoji(artist.content_origin)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{artist.name}</div>
                </div>
              ))}
            </div>
          </section>
        )}
 {/* ── BROWSE BY GENRE ───────────────────────────────────────────────── */}
        {genres.length > 0 && (
          <section style={{ paddingBottom: '80px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '24px' }}>
              Browse by Genre
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button
                onClick={() => setSelectedGenre(null)}
                style={{ padding: '8px 20px', borderRadius: '24px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: selectedGenre === null ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: selectedGenre === null ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}
              >
                All
              </button>
              {genres.map(genre => (
                <button
                  key={genre.id}
                  onClick={() => setSelectedGenre(genre.id === selectedGenre ? null : genre.id)}
                  style={{ padding: '8px 20px', borderRadius: '24px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: selectedGenre === genre.id ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: selectedGenre === genre.id ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── JOIN HUMAN ECHO ───────────────────────────────────────────────── */}
        <section style={{ paddingBottom: '100px' }}>
          <div style={{
            textAlign: 'center',
            padding: '80px 40px',
            background: 'var(--bg-secondary)',
            borderRadius: '24px',
            border: '1px solid var(--border)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(43,122,143,0.08) 0%, transparent 70%)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', lineHeight: '1.2' }}>
                Music made by humans.<br />Shared with the world.
              </div>
              <div style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '40px', maxWidth: '480px', margin: '0 auto 40px', lineHeight: '1.6' }}>
                Join Human Echo and get a free track on us. Discover artists who pour real soul into every note.
              </div>
              <button
                onClick={() => router.push('/login')}
                style={{
                  padding: '16px 40px', borderRadius: '50px',
                  background: 'var(--accent-primary)', color: 'white',
                  fontSize: '16px', fontWeight: '600', border: 'none', cursor: 'pointer',
                  boxShadow: '0 8px 32px rgba(43,122,143,0.4)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(43,122,143,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(43,122,143,0.4)' }}
              >
                Join Human Echo — it's free →
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
