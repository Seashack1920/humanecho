'use client'

import { usePlayer } from '@/context/PlayerContext'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import VideoModal from '@/components/VideoModal'

export default function HomepageClient({ albums, artists, tracks }) {
  const { playTrack, currentTrack, isPlaying } = usePlayer()
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [modalVideo, setModalVideo] = useState(null)
const [modalThumb, setModalThumb] = useState(null)
const [modalArtist, setModalArtist] = useState(null)

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768)
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const featuredAlbum = albums[0] || null

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!email) return
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      await supabase
        .from('email_subscribers')
        .insert({
          email: email,
          source: 'homepage',
          status: 'active',
          subscribed_at: new Date().toISOString(),
        })
      setSubscribed(true)
      setEmail('')
    } catch (error) {
      console.error('Subscribe error:', error)
      setSubscribed(true)
      setEmail('')
    }
  }

  const originBadge = (origin) => {
    const map = {
      '100% human': '🧑 100% Human',
      'human+ai': '🧑🤖 Human + AI',
      'ai generated': '🤖 AI Generated',
    }
    return map[origin] || null
  }

  return (
    <div>
{modalVideo && (
  <VideoModal
    videoUrl={modalVideo}
    thumbUrl={modalThumb}
    artistName={modalArtist}
    onClose={() => { setModalVideo(null); setModalThumb(null); setModalArtist(null) }}
  />
)}
      {/* Hero */}
      {featuredAlbum && (
        <div style={{
          position: 'relative',
          minHeight: isMobile ? '80vh' : '75vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          background: 'var(--bg-primary)',
        }}>
          {featuredAlbum.cover_url && (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${featuredAlbum.cover_url})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              filter: 'blur(60px) saturate(0.6)',
              opacity: 0.25, transform: 'scale(1.1)',
            }} />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: isMobile
              ? 'linear-gradient(to bottom, transparent 30%, var(--bg-primary) 70%)'
              : 'linear-gradient(to right, var(--bg-primary) 40%, transparent 100%)',
          }} />

          <div style={{
            position: 'relative',
            maxWidth: '1100px',
            margin: '0 auto',
            padding: isMobile ? '80px 24px 40px' : '60px 32px',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 300px' : '1fr 400px',
            gap: isMobile ? '32px' : '64px',
            alignItems: 'center',
            width: '100%',
          }}>

            {/* Album cover — top on mobile */}
            {isMobile && (
              <div style={{
                borderRadius: '16px', overflow: 'hidden',
                boxShadow: 'var(--shadow-player)',
                aspectRatio: '1', maxWidth: '260px', margin: '0 auto', width: '100%',
              }}>
                {featuredAlbum.cover_url ? (
                  <img src={featuredAlbum.cover_url} alt={featuredAlbum.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px' }}>🎵</div>
                )}
              </div>
            )}

            {/* Text */}
            <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
              <div style={{
                fontSize: '11px', fontWeight: '500', letterSpacing: '2px',
                textTransform: 'uppercase', color: 'var(--accent-gold)', marginBottom: '16px',
              }}>
                Featured Release
              </div>

              <h1 style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: isMobile ? '48px' : 'clamp(48px, 8vw, 96px)',
                fontWeight: '700', color: 'var(--text-primary)',
                lineHeight: '1.0', letterSpacing: '-2px', marginBottom: '24px',
              }}>
                {featuredAlbum.title}
              </h1>

              {featuredAlbum.description && (
                <p style={{
                  fontSize: isMobile ? '16px' : '18px',
                  color: 'var(--text-secondary)', lineHeight: '1.7',
                  marginBottom: '24px',
                  maxWidth: isMobile ? '100%' : '480px',
                }}>
                  {featuredAlbum.description}
                </p>
              )}

              {featuredAlbum.content_origin && (
                <div style={{
                  display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  fontSize: '11px', color: 'var(--text-muted)',
                  letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '28px',
                }}>
                  {originBadge(featuredAlbum.content_origin)}
                </div>
              )}

              <div style={{
                display: 'flex', gap: '16px', flexWrap: 'wrap',
                justifyContent: isMobile ? 'center' : 'flex-start',
              }}>
                <Link href={`/album/${featuredAlbum.id}`} style={{
                  padding: isMobile ? '14px 28px' : '16px 36px',
                  borderRadius: '8px', background: 'var(--accent-primary)',
                  color: 'white', fontSize: '15px', fontWeight: '500',
                  display: 'inline-block', textDecoration: 'none',
                }}>
                  Listen Now
                </Link>
                {featuredAlbum.price && (
                  <button style={{
                    padding: isMobile ? '14px 28px' : '16px 36px',
                    borderRadius: '8px', background: 'none',
                    color: 'var(--text-primary)', fontSize: '15px', fontWeight: '500',
                    border: '1px solid var(--border)', cursor: 'pointer',
                  }}>
                    Buy — ${parseFloat(featuredAlbum.price).toFixed(2)}
                  </button>
                  
                )}
                {featuredAlbum.artist_message_url && (
  <button
    onClick={() => {
      setModalVideo(featuredAlbum.artist_message_url)
      setModalThumb(featuredAlbum.artist_message_thumb_url)
      setModalArtist(artists[0]?.name)
    }}
    style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      fontSize: '13px', color: 'var(--accent-gold)',
      background: 'none', border: '1px solid var(--accent-gold)',
      borderRadius: '8px', cursor: 'pointer',
      padding: '14px 20px', transition: 'all 0.2s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-gold)'; e.currentTarget.style.color = 'white' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--accent-gold)' }}
  >
    <span>▶</span>
    <span>Artist message</span>
  </button>
)}

              </div>
            </div>

            {/* Album cover — right on desktop */}
            {!isMobile && (
              <div style={{
                borderRadius: '20px', overflow: 'hidden',
                boxShadow: 'var(--shadow-player)', aspectRatio: '1',
              }}>
                {featuredAlbum.cover_url ? (
                  <img src={featuredAlbum.cover_url} alt={featuredAlbum.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px' }}>🎵</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '32px 20px 32px' : '48px 32px 32px' }}>

        {/* Browse categories */}
        <h2 style={{
          fontFamily: 'Playfair Display, serif', fontSize: isMobile ? '28px' : '36px',
          fontWeight: '700', color: 'var(--text-primary)',
          marginBottom: '24px', letterSpacing: '-0.5px',
        }}>
          Explore
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '40px',
        }}>
          {[
            { label: 'Music', emoji: '🎵', href: '/music', desc: 'Albums & singles' },
            { label: 'Films', emoji: '🎬', href: '/films', desc: 'Features & shorts' },
            { label: 'Books', emoji: '📖', href: '/books', desc: 'Reads & audiobooks' },
            { label: 'Stories', emoji: '✍️', href: '/stories', desc: 'Fiction & essays' },
          ].map((cat) => (
            <Link key={cat.label} href={cat.href} style={{
              padding: isMobile ? '20px 16px' : '28px 24px',
              borderRadius: '16px', background: 'var(--bg-secondary)',
              border: '1px solid var(--border)', display: 'block', textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: isMobile ? '24px' : '32px', marginBottom: '10px' }}>{cat.emoji}</div>
              <div style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: isMobile ? '16px' : '20px',
                fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px',
              }}>
                {cat.label}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cat.desc}</div>
            </Link>
          ))}
        </div>

        {/* Albums grid */}
        {albums.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
              <h2 style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: isMobile ? '22px' : '28px',
                fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px',
              }}>
                Latest Releases
              </h2>
              <Link href="/music" style={{ fontSize: '13px', color: 'var(--accent-primary)', textDecoration: 'none' }}>
                View all →
              </Link>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: isMobile ? '16px' : '24px',
            }}>
              {albums.map((album) => (
                <Link key={album.id} href={`/album/${album.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                  <div style={{
                    borderRadius: '12px', overflow: 'hidden',
                    background: 'var(--bg-secondary)', aspectRatio: '1',
                    marginBottom: '10px', boxShadow: 'var(--shadow)',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {album.cover_url ? (
                      <img src={album.cover_url} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🎵</div>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {album.title}
                  </div>
                  {album.price && (
                    <div style={{ fontSize: '12px', color: 'var(--accent-secondary)' }}>
                      ${parseFloat(album.price).toFixed(2)}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Artists */}
        {artists.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: isMobile ? '22px' : '28px',
              fontWeight: '700', color: 'var(--text-primary)',
              letterSpacing: '-0.5px', marginBottom: '24px',
            }}>
              Artists
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: isMobile ? '16px' : '24px',
            }}>
              {artists.map((artist) => (
                <Link key={artist.id} href={`/artist/${artist.id}`} style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}>
                  <div style={{
                    width: isMobile ? '72px' : '100px',
                    height: isMobile ? '72px' : '100px',
                    borderRadius: '50%', overflow: 'hidden',
                    margin: '0 auto 10px',
                    background: 'var(--bg-secondary)', border: '2px solid var(--border)',
                    transition: 'border-color 0.2s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    {artist.photo_url ? (
                      <img src={artist.photo_url} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🎤</div>
                    )}
                  </div>
                  <div style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {artist.name}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Email signup */}
        <div style={{
          padding: isMobile ? '32px 24px' : '48px',
          borderRadius: '20px', background: 'var(--bg-secondary)',
          border: '1px solid var(--border)', textAlign: 'center', marginBottom: '40px',
        }}>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: isMobile ? '24px' : '32px',
            fontWeight: '700', color: 'var(--text-primary)',
            marginBottom: '12px', letterSpacing: '-0.5px',
          }}>
            Stay in the loop
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            New releases, artist messages, and stories — straight to your inbox.
          </p>

          {subscribed ? (
            <div style={{ fontSize: '15px', color: 'var(--accent-primary)' }}>
              ✓ You're on the list. Welcome to Human Echo.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} style={{
              display: 'flex', gap: '12px',
              justifyContent: 'center', flexWrap: 'wrap',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
            }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-gold)' }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
                style={{
                  padding: '12px 20px', borderRadius: '8px',
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-primary)', fontSize: '15px',
                  width: isMobile ? '100%' : '280px',
                  outline: 'none', boxShadow: 'none',
                }}
              />
              <button type="submit" style={{
                padding: '12px 28px', borderRadius: '8px',
                background: 'var(--accent-primary)', color: 'white',
                fontSize: '15px', fontWeight: '500', cursor: 'pointer',
                border: 'none', width: isMobile ? '100%' : 'auto',
              }}>
                Subscribe
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}