'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/context/PlayerContext'
import LikeButton from '@/components/LikeButton'
import MusicVideoContest from '@/components/MusicVideoContest'
import ContestWinners from '@/components/ContestWinners'
import CinemaModules from '@/components/CinemaModules'
import HeroMedia from '@/components/HeroMedia'
type Film = {
  id: string
  title: string
  logline: string | null
  film_type: string
  genre: string[] | null
  runtime_minutes: number | null
  director: string | null
  poster_url: string | null
  trailer_url: string | null
  video_url: string | null
  hero_video_url: string | null
  status: string
  is_featured: boolean
  release_year: number | null
}

type CinemaProfile = {
  id: string
  name: string
  role: string
  photo_url: string | null
  bio: string | null
  is_featured: boolean
}

const FILM_TYPE_LABELS: Record<string, string> = {
  feature: 'Feature Film',
  documentary: 'Documentary',
  short: 'Short',
  live_performance: 'Live Performance',
  music_video: 'Music Video',
  experimental: 'Experimental',
}

function formatRuntime(mins: number | null) {
  if (!mins) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function CinemaPage() {
  const router = useRouter()
  const { stop: stopPlayer } = usePlayer()

  const [featuredFilm, setFeaturedFilm]       = useState<Film | null>(null)
  const [recentFilms, setRecentFilms]         = useState<Film[]>([])
  const [featuredProfiles, setFeaturedProfiles] = useState<CinemaProfile[]>([])
  const [featuredContests, setFeaturedContests] = useState<{ id: string; winners_published: boolean }[]>([])
  const [loading, setLoading]                 = useState(true)
  const [hoveredId, setHoveredId]             = useState<string | null>(null)

  useEffect(() => {
    stopPlayer()
    const load = async () => {
      const [{ data: filmsData }, { data: profilesData }, { data: contestsData }] = await Promise.all([
        supabase.from('films').select('id, title, logline, film_type, genre, runtime_minutes, director, poster_url, trailer_url, video_url, hero_video_url, status, is_featured, release_year')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(12),
        supabase.from('cinema_profiles').select('id, name, role, photo_url, bio, is_featured')
          .eq('status', 'published')
          .eq('is_featured', true)
          .limit(4),
        supabase.from('contests').select('id, winners_published')
          .eq('featured', true)
          .eq('type', 'music_video')
          .order('created_at', { ascending: false }),
      ])

      const films = filmsData || []
      const featured = films.find(f => f.is_featured) || films[0] || null
      setFeaturedFilm(featured)
      setRecentFilms(featured ? films.filter(f => f.id !== featured.id).slice(0, 6) : films.slice(1, 7))
      setFeaturedProfiles(profilesData || [])
      setFeaturedContests(contestsData || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Loading</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HERO / FEATURED FILM ── */}
      {featuredFilm ? (
        <section style={{
          position: 'relative', minHeight: '85vh',
          display: 'flex', alignItems: 'flex-end',
          overflow: 'hidden', background: '#0a0a0b',
          marginTop: '-70px', paddingTop: '70px',
          cursor: 'pointer',
        }} onClick={() => router.push(`/cinema/films/${featuredFilm.id}`)}>
          {(featuredFilm.poster_url || featuredFilm.hero_video_url) ? (
            <HeroMedia
              imageUrl={featuredFilm.poster_url}
              videoUrl={featuredFilm.hero_video_url}
              style={{ filter: 'brightness(0.45)' }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0d1f2d 0%, #0a0a0b 100%)' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.1) 100%)' }} />

          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 48px 80px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '16px', fontWeight: '600' }}>
              {featuredFilm.is_featured ? 'Featured' : 'Now Showing'} · {FILM_TYPE_LABELS[featuredFilm.film_type] || featuredFilm.film_type}
            </div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 7vw, 80px)', fontWeight: '700', color: 'white', lineHeight: '1.05', marginBottom: '16px', letterSpacing: '-0.02em', maxWidth: '800px' }}>
              {featuredFilm.title}
            </h1>
            {featuredFilm.logline && (
              <div style={{ fontSize: 'clamp(15px, 2vw, 20px)', color: 'rgba(255,255,255,0.6)', maxWidth: '560px', lineHeight: '1.6', marginBottom: '12px' }}>
                {featuredFilm.logline}
              </div>
            )}
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '32px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {featuredFilm.director && <span>Dir. {featuredFilm.director}</span>}
              {featuredFilm.runtime_minutes && <span>{formatRuntime(featuredFilm.runtime_minutes)}</span>}
              {featuredFilm.release_year && <span>{featuredFilm.release_year}</span>}
              {featuredFilm.genre && featuredFilm.genre.length > 0 && <span>{featuredFilm.genre.slice(0, 2).join(', ')}</span>}
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={e => { e.stopPropagation(); router.push(`/cinema/films/${featuredFilm.id}`) }}
                style={{ padding: '14px 32px', borderRadius: '50px', background: 'white', color: '#0a0a0b', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                ▶ Watch Now
              </button>
              {featuredFilm.trailer_url && (
                <button
                  onClick={e => { e.stopPropagation(); router.push(`/cinema/films/${featuredFilm.id}?trailer=1`) }}
                  style={{ padding: '14px 28px', borderRadius: '50px', background: 'rgba(255,255,255,0.12)', color: 'white', fontSize: '15px', fontWeight: '500', border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                >
                  Trailer →
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0b', marginTop: '-70px', paddingTop: '70px' }}>
          <div style={{ textAlign: 'center', padding: '80px 40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎬</div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '40px', fontWeight: '700', color: 'white', marginBottom: '12px' }}>Cinema</h1>
            <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', maxWidth: '400px', lineHeight: '1.6' }}>
              Films, documentaries and more — coming soon.
            </div>
          </div>
        </section>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 48px 120px' }}>

        {/* ── NAV PILLS ── */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '48px', flexWrap: 'wrap' }}>
          {[
            { label: 'All Films', href: '/cinema/films' },
            { label: 'Profiles', href: '/cinema/profiles' },
            { label: 'Crowd Support', href: '/cinema/crowd-support' },
          ].map(link => (
            <button key={link.label} onClick={() => router.push(link.href)}
              style={{ padding: '10px 22px', borderRadius: '50px', fontSize: '14px', fontWeight: '500', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* ── CINEMA CONTENT MODULES ── featured-film module up top + collection below */}
        <CinemaModules featuredFilmId={featuredFilm?.id} />

        {/* ── FEATURED CONTEST(S) ── winners showcase once published, else entry panel */}
        {featuredContests.map(c => (
          c.winners_published
            ? <ContestWinners key={c.id} contestId={c.id} />
            : <MusicVideoContest key={c.id} contestId={c.id} />
        ))}

        {/* ── RECENT FILMS ── */}
        {recentFilms.length > 0 && (
          <section style={{ marginBottom: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '28px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>In the Library</h2>
              <button onClick={() => router.push('/cinema/films')} style={{ fontSize: '13px', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
              {recentFilms.map(film => (
                <div key={film.id}
                  onClick={() => router.push(`/cinema/films/${film.id}`)}
                  onMouseEnter={() => setHoveredId(film.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ position: 'relative', aspectRatio: '2/3', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', transition: 'transform 0.2s', transform: hoveredId === film.id ? 'translateY(-4px)' : 'translateY(0)' }}>
                    {film.poster_url ? (
                      <img src={film.poster_url} alt={film.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🎬</div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hoveredId === film.id ? 1 : 0, transition: 'opacity 0.2s' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#0a0a0b' }}>▶</div>
                    </div>
                    <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 7px', fontSize: '10px', color: 'white', fontWeight: '600', backdropFilter: 'blur(4px)' }}>
                      {FILM_TYPE_LABELS[film.film_type] || film.film_type}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '3px', lineHeight: '1.3' }}>{film.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {film.director ? `Dir. ${film.director}` : ''}
                    {film.runtime_minutes ? ` · ${formatRuntime(film.runtime_minutes)}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── FEATURED PROFILES ── */}
        {featuredProfiles.length > 0 && (
          <section style={{ marginBottom: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '28px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>Profiles</h2>
              <button onClick={() => router.push('/cinema/profiles')} style={{ fontSize: '13px', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
              {featuredProfiles.map(profile => (
                <div key={profile.id}
                  onClick={() => router.push(`/cinema/profiles/${profile.id}`)}
                  onMouseEnter={() => setHoveredId(`p-${profile.id}`)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ cursor: 'pointer', textAlign: 'center', padding: '24px 16px', borderRadius: '16px', background: 'var(--bg-secondary)', border: hoveredId === `p-${profile.id}` ? '1px solid var(--accent-primary)' : '1px solid var(--border)', transition: 'border-color 0.2s' }}
                >
                  {profile.photo_url ? (
                    <img src={profile.photo_url} alt={profile.name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px', border: '2px solid var(--border)' }} />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 12px', border: '2px solid var(--border)' }}>🎭</div>
                  )}
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{profile.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{profile.role}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── CROWD SUPPORT CTA ── */}
        <section>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '20px', padding: '48px', border: '1px solid var(--border)', display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '12px', fontWeight: '600' }}>Crowd Support</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', lineHeight: '1.2' }}>
                Help independent filmmakers get made
              </div>
              <div style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '24px' }}>
                Support films in production and be part of the story from day one.
              </div>
              <button onClick={() => router.push('/cinema/crowd-support')}
                style={{ padding: '12px 28px', borderRadius: '50px', background: 'var(--accent-primary)', color: 'white', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
                Learn more →
              </button>
            </div>
            <div style={{ fontSize: '80px', opacity: 0.15 }}>🎬</div>
          </div>
        </section>

      </div>
    </div>
  )
}
