'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/context/PlayerContext'

type CinemaProfile = {
  id: string
  name: string
  role: string
  bio: string | null
  photo_url: string | null
  website_url: string | null
  imdb_url: string | null
  film_ids: string[]
  artist_id: string | null
  is_featured: boolean
  status: string
}

type Film = {
  id: string
  title: string
  logline: string | null
  film_type: string
  poster_url: string | null
  release_year: number | null
  runtime_minutes: number | null
}

type Artist = {
  id: string
  name: string
  photo_url: string | null
}

type ProfileBlock = {
  id: string
  block_type: string
  position: number
  content: Record<string, any>
  settings: Record<string, any>
}

const FILM_TYPE_LABELS: Record<string, string> = {
  feature: 'Feature Film', documentary: 'Documentary', short: 'Short',
  live_performance: 'Live Performance', music_video: 'Music Video', experimental: 'Experimental',
}

function formatRuntime(mins: number | null) {
  if (!mins) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function getEmbedUrl(url: string): string | null {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const id = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  if (url.includes('vimeo.com')) {
    const id = url.match(/vimeo\.com\/(\d+)/)?.[1]
    return id ? `https://player.vimeo.com/video/${id}` : null
  }
  return null
}

// ─── Block Renderer ───────────────────────────────────────────────────────────

function BlockRenderer({ block }: { block: ProfileBlock }) {
  const { content: c, settings: set } = block
  const narrowStyle = { maxWidth: '680px', margin: '0 auto' }

  switch (block.block_type) {
    case 'text':
      return (
        <div style={set.width !== 'full' ? narrowStyle : {}}>
          <div style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '18px', lineHeight: '1.85', color: 'var(--text-secondary)', letterSpacing: '0.01em' }}
            dangerouslySetInnerHTML={{ __html: c.html || '' }} />
        </div>
      )
    case 'image':
      return (
        <div style={narrowStyle}>
          {c.cloudinary_url && <img src={c.cloudinary_url} alt={c.caption || ''} style={{ maxWidth: '100%', borderRadius: '10px', display: 'block', margin: '0 auto' }} />}
          {c.caption && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'center', fontStyle: 'italic' }}>{c.caption}</div>}
        </div>
      )
    case 'pull_quote':
      return (
        <div style={{ ...narrowStyle, borderLeft: '4px solid var(--accent-primary)', paddingLeft: '28px' }}>
          <blockquote style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: '600', color: 'var(--accent-primary)', lineHeight: '1.4', margin: 0, fontStyle: 'italic' }}>
            "{c.quote}"
          </blockquote>
          {c.attribution && <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '12px' }}>{c.attribution}</div>}
        </div>
      )
    case 'video': {
      const url = c.cloudinary_url || c.embed_url || ''
      if (!url) return null
      const embedUrl = getEmbedUrl(url)
      return (
        <div style={narrowStyle}>
          <div style={{ borderRadius: '12px', overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
            {embedUrl
              ? <iframe src={embedUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
              : <video src={url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            }
          </div>
          {c.caption && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'center', fontStyle: 'italic' }}>{c.caption}</div>}
        </div>
      )
    }
    case 'divider':
      if (set.style === 'space') return <div style={{ height: '32px' }} />
      if (set.style === 'ornament') return <div style={{ textAlign: 'center', color: 'var(--accent-primary)', fontSize: '16px', letterSpacing: '0.3em' }}>✦ ✦ ✦</div>
      return <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />
    default:
      return null
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CinemaProfileDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const { stop: stopPlayer } = usePlayer()

  const [profile, setProfile]         = useState<CinemaProfile | null>(null)
  const [films, setFilms]             = useState<Film[]>([])
  const [artist, setArtist]           = useState<Artist | null>(null)
  const [blocks, setBlocks]           = useState<ProfileBlock[]>([])
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [showFullProfile, setShowFullProfile] = useState(false)
  const [hoveredFilm, setHoveredFilm] = useState<string | null>(null)
  const [tipAmount, setTipAmount]     = useState(5)
  const [tipping, setTipping]         = useState(false)
  const [tipped, setTipped]           = useState(false)

  useEffect(() => {
    stopPlayer()
    const load = async () => {
      const { data: profileData } = await supabase
        .from('cinema_profiles')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .single()

      if (!profileData) { setNotFound(true); setLoading(false); return }
      setProfile(profileData)

      const promises: Promise<any>[] = []

      if (profileData.film_ids?.length > 0) {
        promises.push(
          supabase.from('films').select('id, title, logline, film_type, poster_url, release_year, runtime_minutes')
            .in('id', profileData.film_ids).eq('status', 'published')
            .then(({ data }) => setFilms(data || []))
        )
      }

      if (profileData.artist_id) {
        promises.push(
          supabase.from('artists').select('id, name, photo_url').eq('id', profileData.artist_id).single()
            .then(({ data }) => { if (data) setArtist(data) })
        )
      }

      promises.push(
        supabase.from('cinema_profile_blocks').select('*').eq('profile_id', profileData.id).order('position')
          .then(({ data }) => setBlocks(data || []))
      )

      await Promise.all(promises)
      setLoading(false)
    }
    load()
  }, [id])

  const handleTip = async () => {
    // TODO: wire to Stripe
    setTipping(true)
    await new Promise(r => setTimeout(r, 1000))
    setTipping(false)
    setTipped(true)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Loading</div>
    </div>
  )

  if (notFound || !profile) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎭</div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Profile not found</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>This profile may not be available yet.</div>
        <button onClick={() => router.push('/cinema/profiles')} style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
          ← All Profiles
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HERO ── */}
      <div style={{ position: 'relative', height: '40vh', overflow: 'hidden', background: '#0a0a0b', marginTop: '-70px' }}>
        {profile.photo_url && (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${profile.photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: 'blur(4px) brightness(0.25)', transform: 'scale(1.05)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%)' }} />
        <button onClick={() => router.push('/cinema/profiles')}
          style={{ position: 'absolute', top: '90px', left: '48px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50px', padding: '8px 18px', color: 'white', fontSize: '13px', cursor: 'pointer', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          ← Profiles
        </button>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 48px 120px' }}>

        {/* ── PROFILE HEADER ── */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-end', marginTop: '-60px', position: 'relative', zIndex: 10, marginBottom: '40px' }}>
          {profile.photo_url ? (
            <img src={profile.photo_url} alt={profile.name} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-primary)', flexShrink: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} />
          ) : (
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '3px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', flexShrink: 0 }}>🎭</div>
          )}
          <div style={{ paddingBottom: '8px' }}>
            {profile.is_featured && (
              <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '8px', fontWeight: '600' }}>Featured</div>
            )}
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.1', marginBottom: '8px' }}>
              {profile.name}
            </h1>
            <div style={{ fontSize: '16px', color: 'var(--accent-primary)', fontWeight: '500' }}>{profile.role}</div>
          </div>
        </div>

        {/* ── BIO ── */}
        {profile.bio && (
          <section style={{ marginBottom: '32px' }}>
            <p style={{ fontSize: '17px', color: 'var(--text-secondary)', lineHeight: '1.8', maxWidth: '680px' }}>
              {profile.bio}
            </p>
          </section>
        )}

        {/* ── LINKS ── */}
        {(profile.website_url || profile.imdb_url) && (
          <section style={{ marginBottom: '40px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {profile.website_url && (
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer"
                style={{ padding: '10px 20px', borderRadius: '50px', fontSize: '13px', fontWeight: '500', border: '1px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none', background: 'var(--bg-secondary)', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >🌐 Website</a>
            )}
            {profile.imdb_url && (
              <a href={profile.imdb_url} target="_blank" rel="noopener noreferrer"
                style={{ padding: '10px 20px', borderRadius: '50px', fontSize: '13px', fontWeight: '500', border: '1px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none', background: 'var(--bg-secondary)', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >🎬 IMDb</a>
            )}
          </section>
        )}

        {/* ── FILMS ── */}
        {films.length > 0 && (
          <section style={{ marginBottom: '56px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>Films</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '18px' }}>
              {films.map(film => (
                <div key={film.id}
                  onClick={() => router.push(`/cinema/films/${film.id}`)}
                  onMouseEnter={() => setHoveredFilm(film.id)}
                  onMouseLeave={() => setHoveredFilm(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ position: 'relative', aspectRatio: '2/3', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', transition: 'transform 0.2s', transform: hoveredFilm === film.id ? 'translateY(-4px)' : 'translateY(0)' }}>
                    {film.poster_url
                      ? <img src={film.poster_url} alt={film.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🎬</div>
                    }
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hoveredFilm === film.id ? 1 : 0, transition: 'opacity 0.2s' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#0a0a0b' }}>▶</div>
                    </div>
                    <div style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 5px', fontSize: '9px', color: 'white', fontWeight: '600' }}>
                      {FILM_TYPE_LABELS[film.film_type] || film.film_type}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.3', marginBottom: '2px' }}>{film.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {film.release_year || ''}{film.runtime_minutes ? ` · ${formatRuntime(film.runtime_minutes)}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── IN-DEPTH PROFILE (expandable) ── */}
        {blocks.length > 0 && (
          <section style={{ marginBottom: '56px' }}>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
              {!showFullProfile ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    There's more to this story
                  </div>
                  <button onClick={() => setShowFullProfile(true)}
                    style={{ padding: '12px 32px', borderRadius: '50px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  >
                    Read the full profile ↓
                  </button>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '40px' }}>
                    In Depth
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                    {blocks.map(block => (
                      <BlockRenderer key={block.id} block={block} />
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <button onClick={() => setShowFullProfile(false)}
                      style={{ padding: '10px 24px', borderRadius: '50px', background: 'none', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                      ↑ Collapse
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── TIP ── */}
        {artist && (
          <section style={{ marginBottom: '56px' }}>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '20px', padding: '28px', border: '1px solid var(--border)', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '200px' }}>
                {artist.photo_url
                  ? <img src={artist.photo_url} alt={artist.name} style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }} />
                  : <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🎭</div>
                }
                <div>
                  <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '4px', fontWeight: '600' }}>Support {profile.name}</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)' }}>{artist.name}</div>
                </div>
              </div>
              {tipped ? (
                <div style={{ fontSize: '15px', color: 'var(--accent-primary)', fontWeight: '500' }}>✓ Thank you for your support!</div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {[3, 5, 10, 20].map(amt => (
                    <button key={amt} onClick={() => setTipAmount(amt)}
                      style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: `1px solid ${tipAmount === amt ? 'var(--accent-primary)' : 'var(--border)'}`, cursor: 'pointer', background: tipAmount === amt ? 'var(--accent-primary)' : 'none', color: tipAmount === amt ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                      ${amt}
                    </button>
                  ))}
                  <button onClick={handleTip} disabled={tipping}
                    style={{ padding: '10px 24px', borderRadius: '20px', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer', background: 'var(--accent-primary)', color: 'white' }}>
                    {tipping ? 'Processing...' : `Tip $${tipAmount}`}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── FOOTER NAV ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '32px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={() => router.push('/cinema/profiles')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'underline', padding: 0 }}>
            ← All Profiles
          </button>
          <button onClick={() => router.push('/cinema')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'underline', padding: 0 }}>
            Cinema Home
          </button>
        </div>

      </div>
    </div>
  )
}
