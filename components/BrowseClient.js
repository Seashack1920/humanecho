'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePlayer } from '@/context/PlayerContext'

export default function BrowseClient({
  type, title, emoji, description,
  albums = [], tracks = [], videos = [], books = [], stories = []
}) {
  const { playTrack } = usePlayer()
  const [isMobile, setIsMobile] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const originBadge = (origin) => {
    const map = {
      '100% human': '🧑 Human',
      'human+ai': '🧑🤖 Human+AI',
      'ai generated': '🤖 AI',
    }
    return map[origin] || null
  }

  const isEmpty = albums.length === 0 && tracks.length === 0 &&
    videos.length === 0 && books.length === 0 && stories.length === 0

  return (
    <div>
      {/* Page hero */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        padding: isMobile ? '48px 20px 32px' : '64px 32px 40px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ fontSize: isMobile ? '40px' : '56px', marginBottom: '16px' }}>{emoji}</div>
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: isMobile ? '36px' : '56px',
            fontWeight: '700', color: 'var(--text-primary)',
            letterSpacing: '-1px', lineHeight: '1.0', marginBottom: '12px',
          }}>
            {title}
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '560px' }}>
            {description}
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '32px 20px' : '48px 32px' }}>

        {isEmpty ? (
          /* Empty state */
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            color: 'var(--text-muted)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{emoji}</div>
            <h2 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '24px', fontWeight: '600',
              color: 'var(--text-secondary)', marginBottom: '8px',
            }}>
              Coming soon
            </h2>
            <p style={{ fontSize: '15px' }}>
              {title} content is on its way. Check back soon.
            </p>
            <Link href="/" style={{
              display: 'inline-block', marginTop: '24px',
              padding: '10px 24px', borderRadius: '8px',
              background: 'var(--accent-primary)', color: 'white',
              fontSize: '14px', textDecoration: 'none',
            }}>
              ← Back to home
            </Link>
          </div>
        ) : (
          <>
            {/* Music — Albums grid */}
            {type === 'music' && albums.length > 0 && (
              <div style={{ marginBottom: '56px' }}>
                <h2 style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: isMobile ? '22px' : '28px',
                  fontWeight: '600', color: 'var(--text-primary)',
                  marginBottom: '24px', letterSpacing: '-0.5px',
                }}>
                  Albums
                </h2>
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
                          <img src={album.cover_url} alt={album.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🎵</div>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {album.title}
                      </div>
                      {album.artists?.name && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          {album.artists.name}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {album.content_origin && (
                          <span style={{
                            fontSize: '10px', color: 'var(--text-muted)',
                            background: 'var(--bg-secondary)', padding: '2px 6px',
                            borderRadius: '10px', border: '1px solid var(--border)',
                          }}>
                            {originBadge(album.content_origin)}
                          </span>
                        )}
                        {album.price && (
                          <span style={{ fontSize: '12px', color: 'var(--accent-secondary)' }}>
                            ${parseFloat(album.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Music — Latest tracks */}
            {type === 'music' && tracks.length > 0 && (
              <div>
                <h2 style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: isMobile ? '22px' : '28px',
                  fontWeight: '600', color: 'var(--text-primary)',
                  marginBottom: '24px', paddingBottom: '16px',
                  borderBottom: '1px solid var(--border)', letterSpacing: '-0.5px',
                }}>
                  Latest Tracks
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {tracks.map((track, index) => (
                    <div key={track.id} style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '32px 40px 1fr auto' : '40px 48px 1fr auto',
                      alignItems: 'center',
                      gap: isMobile ? '10px' : '16px',
                      padding: isMobile ? '10px 8px' : '12px 16px',
                      borderRadius: '10px', cursor: 'pointer',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => playTrack(track, tracks, index)}
                    >
                      <div style={{
                        width: isMobile ? '28px' : '32px',
                        height: isMobile ? '28px' : '32px',
                        borderRadius: '50%', background: 'var(--bg-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0,
                      }}>
                        ▶
                      </div>
                      <div style={{
                        width: isMobile ? '36px' : '44px',
                        height: isMobile ? '36px' : '44px',
                        borderRadius: '6px', overflow: 'hidden',
                        background: 'var(--bg-secondary)', flexShrink: 0,
                      }}>
                        {track.track_image_url ? (
                          <img src={track.track_image_url} alt={track.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🎵</div>
                        )}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: isMobile ? '13px' : '15px', color: 'var(--text-primary)' }}>
                            {track.title}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {track.duration || '—'}
                          </span>
                        </div>
                        {track.artists?.name && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {track.artists.name}
                          </div>
                        )}
                      </div>
                      {track.price && (
                        <span style={{ fontSize: '12px', color: 'var(--accent-secondary)', flexShrink: 0 }}>
                          ${parseFloat(track.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Films grid */}
            {type === 'films' && videos.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: isMobile ? '20px' : '28px',
              }}>
                {videos.map((video) => (
                  <div key={video.id} style={{
                    borderRadius: '12px', overflow: 'hidden',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ aspectRatio: '16/9', background: 'var(--bg-primary)', overflow: 'hidden' }}>
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt={video.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🎬</div>
                      )}
                    </div>
                    <div style={{ padding: '16px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {video.title}
                      </div>
                      {video.artists?.name && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          {video.artists.name}
                        </div>
                      )}
                      {video.description && (
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                          {video.description.substring(0, 100)}{video.description.length > 100 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Books grid */}
            {type === 'books' && books.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: isMobile ? '16px' : '24px',
              }}>
                {books.map((book) => (
                  <div key={book.id}>
                    <div style={{
                      borderRadius: '8px', overflow: 'hidden',
                      background: 'var(--bg-secondary)',
                      aspectRatio: '2/3', marginBottom: '10px',
                      boxShadow: 'var(--shadow)',
                    }}>
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>📖</div>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {book.title}
                    </div>
                    {book.artists?.name && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {book.author_name || book.artists.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Stories grid */}
            {type === 'stories' && stories.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {stories.map((story) => (
                  <div key={story.id} style={{
                    padding: '20px 24px', borderRadius: '12px',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  }}>
                    <div style={{
                      fontFamily: 'Playfair Display, serif',
                      fontSize: '20px', fontWeight: '600',
                      color: 'var(--text-primary)', marginBottom: '4px',
                    }}>
                      {story.title}
                    </div>
                    {story.artists?.name && (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        {story.author_name || story.artists.name}
                      </div>
                    )}
                    {story.content && (
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                        {story.content.substring(0, 200)}{story.content.length > 200 ? '...' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
