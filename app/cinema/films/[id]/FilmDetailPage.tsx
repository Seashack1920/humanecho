'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/context/PlayerContext'

type Film = {
  id: string
  title: string
  logline: string | null
  description: string | null
  film_type: string
  genre: string[] | null
  runtime_minutes: number | null
  director: string | null
  rating: string | null
  language: string | null
  release_year: number | null
  video_url: string | null
  trailer_url: string | null
  poster_url: string | null
  filmmaker_message_url: string | null
  artist_id: string | null
  content_origin: string | null
  price: number | null
  status: string
}

type Artist = {
  id: string
  name: string
  photo_url: string | null
  stripe_onboarded: boolean | null
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

function VideoPlayer({ url, title }: { url: string; title: string }) {
  const embedUrl = getEmbedUrl(url)
  if (embedUrl) {
    return (
      <div style={{ borderRadius: '16px', overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
        <iframe src={embedUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen title={title} />
      </div>
    )
  }
  return (
    <div style={{ borderRadius: '16px', overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
      <video src={url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  )
}

export default function FilmDetailPage({ id }: { id: string }) {
  const router  = useRouter()
  const { stop: stopPlayer } = usePlayer()

  const [film, setFilm]       = useState<Film | null>(null)
  const [artist, setArtist]   = useState<Artist | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeVideo, setActiveVideo] = useState<'main' | 'trailer'>('main')
  const [tipAmount, setTipAmount] = useState(5)
  const [tipping, setTipping] = useState(false)
  const [tipped, setTipped]   = useState(false)
  const [tipError, setTipError] = useState<string | null>(null)

  useEffect(() => {
    stopPlayer()
    const load = async () => {
      const { data: filmData } = await supabase
        .from('films')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .single()

      if (!filmData) { setNotFound(true); setLoading(false); return }
      setFilm(filmData)

      if (filmData.artist_id) {
        const { data: artistData } = await supabase
          .from('artists')
          .select('id, name, photo_url, stripe_onboarded')
          .eq('id', filmData.artist_id)
          .single()
        if (artistData) setArtist(artistData)
      }

      setLoading(false)
    }
    load()
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tip') === 'thanks') {
      setTipped(true)
    }
  }, [id])

  const handleTip = async () => {
    if (!film || !artist) return
    setTipping(true); setTipError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch('/api/stripe/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId: artist.id, itemType: 'film', itemId: film.id, amount: tipAmount,
          userId: user?.id, email: user?.email, returnUrl: window.location.href,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start tip')
      window.location.href = data.url
    } catch (e) {
      setTipError((e as Error).message)
      setTipping(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Loading</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Film not found</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>This film may not be available yet.</div>
        <button onClick={() => router.push('/cinema/films')} style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
          ← Browse Films
        </button>
      </div>
    </div>
  )

  if (!film) return null

  const mainVideoUrl = activeVideo === 'trailer' && film.trailer_url ? film.trailer_url : film.video_url

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── POSTER HERO ── */}
      <div style={{ position: 'relative', height: '50vh', overflow: 'hidden', background: '#0a0a0b', marginTop: '-70px' }}>
        {film.poster_url && (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${film.poster_url})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: 'blur(3px) brightness(0.3)', transform: 'scale(1.05)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%)' }} />

        {/* Back button */}
        <button onClick={() => router.push('/cinema/films')}
          style={{ position: 'absolute', top: '90px', left: '48px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50px', padding: '8px 18px', color: 'white', fontSize: '13px', cursor: 'pointer', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          ← Films
        </button>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 48px 120px' }}>

        {/* ── FILM INFO CARD ── */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', marginTop: '-80px', position: 'relative', zIndex: 10, marginBottom: '48px' }}>
          {/* Poster */}
          {film.poster_url && (
            <div style={{ flexShrink: 0 }}>
              <img src={film.poster_url} alt={film.title} style={{ width: '160px', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '12px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)', border: '1px solid var(--border)' }} />
            </div>
          )}

          {/* Info */}
          <div style={{ flex: 1, paddingTop: film.poster_url ? '80px' : '0' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '10px', fontWeight: '600' }}>
              {FILM_TYPE_LABELS[film.film_type] || film.film_type}
            </div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.1', marginBottom: '12px' }}>
              {film.title}
            </h1>

            {/* Meta row */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
              {film.director && <span>Dir. {film.director}</span>}
              {film.runtime_minutes && <span>· {formatRuntime(film.runtime_minutes)}</span>}
              {film.release_year && <span>· {film.release_year}</span>}
              {film.rating && <span style={{ padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '11px' }}>{film.rating}</span>}
              {film.language && film.language !== 'English' && <span>· {film.language}</span>}
            </div>

            {/* Genre tags */}
            {film.genre && film.genre.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {film.genre.map(g => (
                  <span key={g} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{g}</span>
                ))}
              </div>
            )}

            {film.logline && (
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.65', marginBottom: '16px', fontStyle: 'italic' }}>
                {film.logline}
              </p>
            )}

            {film.description && (
              <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: '1.7' }}>
                {film.description}
              </p>
            )}
          </div>
        </div>

        {/* ── VIDEO PLAYER ── */}
        {(film.video_url || film.trailer_url) && (
          <section style={{ marginBottom: '64px' }}>
            {/* Tab toggle if both exist */}
            {film.video_url && film.trailer_url && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {[
                  { key: 'main', label: '▶ Watch Film' },
                  { key: 'trailer', label: '🎬 Trailer' },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setActiveVideo(tab.key as 'main' | 'trailer')}
                    style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: activeVideo === tab.key ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: activeVideo === tab.key ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            {mainVideoUrl && <VideoPlayer url={mainVideoUrl} title={film.title} />}
          </section>
        )}

        {/* ── FILMMAKER MESSAGE ── */}
        {film.filmmaker_message_url && (
          <section style={{ marginBottom: '64px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px' }}>
              A Message from the Filmmaker
            </h2>
            <VideoPlayer url={film.filmmaker_message_url} title={`${film.title} — Filmmaker Message`} />
          </section>
        )}

        {/* ── TIP THE ARTIST ── */}
        {artist?.stripe_onboarded && (
          <section style={{ marginBottom: '64px' }}>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '20px', padding: '32px', border: '1px solid var(--border)', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '200px' }}>
                {artist.photo_url ? (
                  <img src={artist.photo_url} alt={artist.name} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>🎬</div>
                )}
                <div>
                  <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '4px', fontWeight: '600' }}>Support the filmmaker</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>{artist.name}</div>
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
                  {tipError && <div style={{ width: '100%', fontSize: '13px', color: '#dc3c3c', marginTop: '8px' }}>{tipError}</div>}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── FOOTER NAV ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '32px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={() => router.push('/cinema/films')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'underline', padding: 0 }}>
            ← Back to Films
          </button>
          <button onClick={() => router.push('/cinema')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'underline', padding: 0 }}>
            Cinema Home
          </button>
        </div>

      </div>
    </div>
  )
}
