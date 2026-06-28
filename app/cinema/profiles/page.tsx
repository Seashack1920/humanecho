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
  is_featured: boolean
  status: string
}

export default function CinemaProfilesPage() {
  const router = useRouter()
  const { stop: stopPlayer } = usePlayer()

  const [profiles, setProfiles]   = useState<CinemaProfile[]>([])
  const [loading, setLoading]     = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    stopPlayer()
    const load = async () => {
      const { data } = await supabase
        .from('cinema_profiles')
        .select('*')
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('name')
      setProfiles(data || [])
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
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 48px 120px' }}>

        {/* Header */}
        <div style={{ marginBottom: '56px' }}>
          <button onClick={() => router.push('/cinema')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', padding: 0 }}>← Cinema</button>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Profiles</h1>
          <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Directors, actors, producers and crew</div>
        </div>

        {profiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎭</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>Profiles coming soon</div>
            <div style={{ fontSize: '14px' }}>Filmmaker profiles will appear here.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
            {profiles.map(profile => (
              <div key={profile.id}
                onClick={() => router.push(`/cinema/profiles/${profile.id}`)}
                onMouseEnter={() => setHoveredId(profile.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: 'pointer', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-secondary)', border: hoveredId === profile.id ? '1px solid var(--accent-primary)' : '1px solid var(--border)', transition: 'border-color 0.2s, transform 0.2s', transform: hoveredId === profile.id ? 'translateY(-3px)' : 'translateY(0)' }}
              >
                {/* Photo */}
                <div style={{ position: 'relative', aspectRatio: '1', background: 'var(--bg-card)' }}>
                  {profile.photo_url ? (
                    <img src={profile.photo_url} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '56px' }}>🎭</div>
                  )}
                  {profile.is_featured && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', color: 'var(--accent-primary)', fontWeight: '600', backdropFilter: 'blur(4px)' }}>Featured</div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '20px' }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{profile.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--accent-primary)', marginBottom: '10px', fontWeight: '500' }}>{profile.role}</div>
                  {profile.bio && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>
                      {profile.bio}
                    </div>
                  )}
                  {profile.film_ids?.length > 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>
                      {profile.film_ids.length} film{profile.film_ids.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
