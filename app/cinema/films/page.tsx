'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/context/PlayerContext'
import LikeButton from '@/components/LikeButton'
type Film = {
  id: string
  title: string
  logline: string | null
  film_type: string
  genre: string[] | null
  runtime_minutes: number | null
  director: string | null
  poster_url: string | null
  status: string
  release_year: number | null
  rating: string | null
}

const FILM_TYPES = [
  { value: 'all',              label: 'All' },
  { value: 'feature',          label: 'Feature Films' },
  { value: 'documentary',      label: 'Documentaries' },
  { value: 'short',            label: 'Shorts' },
  { value: 'live_performance', label: 'Live' },
  { value: 'music_video',      label: 'Music Videos' },
  { value: 'experimental',     label: 'Experimental' },
]

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

export default function CinemaFilmsPage() {
  const router = useRouter()
  const { stop: stopPlayer } = usePlayer()

  const [films, setFilms]               = useState<Film[]>([])
  const [loading, setLoading]           = useState(true)
  const [activeType, setActiveType]     = useState('all')
  const [hoveredId, setHoveredId]       = useState<string | null>(null)

  useEffect(() => {
    stopPlayer()
    const load = async () => {
      const { data } = await supabase
        .from('films')
        .select('id, title, logline, film_type, genre, runtime_minutes, director, poster_url, status, release_year, rating')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      setFilms(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = activeType === 'all' ? films : films.filter(f => f.film_type === activeType)

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Loading</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 48px 120px' }}>

        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <button onClick={() => router.push('/cinema')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', padding: 0 }}>← Cinema</button>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Film Library</h1>
          <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{films.length} film{films.length !== 1 ? 's' : ''}</div>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '40px', flexWrap: 'wrap' }}>
          {FILM_TYPES.map(type => (
            <button key={type.value} onClick={() => setActiveType(type.value)}
              style={{ padding: '8px 18px', borderRadius: '50px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: activeType === type.value ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: activeType === type.value ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
              {type.label}
              {type.value !== 'all' && films.filter(f => f.film_type === type.value).length > 0 && (
                <span style={{ marginLeft: '6px', fontSize: '11px', opacity: 0.7 }}>
                  {films.filter(f => f.film_type === type.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎬</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No films here yet</div>
            <div style={{ fontSize: '14px' }}>Check back soon.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px' }}>
            {filtered.map(film => (
              <div key={film.id}
                onClick={() => router.push(`/cinema/films/${film.id}`)}
                onMouseEnter={() => setHoveredId(film.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ position: 'relative', aspectRatio: '2/3', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', transition: 'transform 0.2s', transform: hoveredId === film.id ? 'translateY(-4px)' : 'translateY(0)' }}>
                  {film.poster_url ? (
                    <img src={film.poster_url} alt={film.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🎬</div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hoveredId === film.id ? 1 : 0, transition: 'opacity 0.2s' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#0a0a0b' }}>▶</div>
                  </div>
                  <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 7px', fontSize: '10px', color: 'white', fontWeight: '600', backdropFilter: 'blur(4px)' }}>
                    {FILM_TYPE_LABELS[film.film_type] || film.film_type}
                  </div>
                  {film.rating && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 7px', fontSize: '10px', color: 'white', backdropFilter: 'blur(4px)' }}>
                      {film.rating}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px', lineHeight: '1.3', flex: 1 }}>{film.title}</div>
                  <LikeButton contentType="film" contentId={film.id} size="sm" />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  {film.director ? `Dir. ${film.director}` : ''}
                  {film.runtime_minutes ? ` · ${formatRuntime(film.runtime_minutes)}` : ''}
                </div>
                {film.logline && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>
                    {film.logline}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
