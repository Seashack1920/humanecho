'use client'

import { useState, useEffect } from 'react'
import { usePlayer } from '@/context/PlayerContext'
import VideoModal from '@/components/VideoModal'
import Link from 'next/link'

export default function ArtistClient({ artist, albums, tracks }: { artist: any, albums: any[], tracks: any[] }) {
  const { playTrack, currentTrack, isPlaying } = usePlayer()
  const [isMobile, setIsMobile] = useState(false)
  const [modalVideo, setModalVideo] = useState(null)
  const [modalThumb, setModalThumb] = useState(null)
  const [modalLabel, setModalLabel] = useState(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const openModal = (videoUrl, thumbUrl, label) => {
    setModalVideo(videoUrl)
    setModalThumb(thumbUrl)
    setModalLabel(label || null)
  }

  const closeModal = () => {
    setModalVideo(null)
    setModalThumb(null)
    setModalLabel(null)
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
    <>
      {modalVideo && (
        <VideoModal
          videoUrl={modalVideo}
          thumbUrl={modalThumb}
          artistName={artist.name}
          label={modalLabel}
          onClose={closeModal}
        />
      )}

      {/* Immersive Hero — Option B */}
      <div style={{
        position: 'relative',
        height: isMobile ? '70vh' : '80vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
      }}>
        {/* Full bleed background photo */}
        {artist.photo_url && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${artist.photo_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }} />
        )}

        {/* Gradient overlay — dark at bottom for text legibility */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.92) 100%)',
        }} />

        {/* Hero content */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1100px',
          margin: '0 auto',
          padding: isMobile ? '0 20px 40px' : '0 32px 56px',
        }}>
          {/* Artist name */}
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: isMobile ? '48px' : 'clamp(56px, 8vw, 96px)',
            fontWeight: '700',
            color: 'white',
            lineHeight: '1.0',
            letterSpacing: '-2px',
            marginBottom: '16px',
            textShadow: '0 2px 20px rgba(0,0,0,0.4)',
          }}>
            {artist.name}
          </h1>

          {/* Meta row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '20px',
            flexWrap: 'wrap', marginBottom: '24px',
          }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
              {albums.length} {albums.length === 1 ? 'album' : 'albums'}
            </span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
              {tracks.length} tracks
            </span>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {tracks.length > 0 && (
              <button
                onClick={() => playTrack(tracks[0])}
                style={{
                  padding: '12px 28px', borderRadius: '8px',
                  background: 'var(--accent-primary)', color: 'white',
                  fontSize: '14px', fontWeight: '500', cursor: 'pointer',
                  border: 'none', display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <span>▶</span>
                <span>Play Latest</span>
              </button>
            )}

            {artist.artist_message_url && (
              <button
                onClick={() => openModal(artist.artist_message_url, artist.artist_message_thumb_url, 'Artist Message')}
                style={{
                  padding: '12px 24px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  color: 'white', fontSize: '14px', fontWeight: '500',
                  cursor: 'pointer', border: '1px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <span>▶</span>
                <span>Artist Message</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: isMobile ? '40px 20px' : '56px 32px',
      }}>

        {/* Bio */}
        {artist.bio && (
          <div style={{ marginBottom: '56px', maxWidth: '680px' }}>
            <h2 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: isMobile ? '22px' : '28px',
              fontWeight: '600', color: 'var(--text-primary)',
              marginBottom: '16px', letterSpacing: '-0.5px',
            }}>
              About
            </h2>
            <p style={{
              fontSize: '16px', color: 'var(--text-secondary)',
              lineHeight: '1.8',
            }}>
              {artist.bio}
            </p>
          </div>
        )}

        {/* Albums */}
        {albums.length > 0 && (
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
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {album.title}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {album.content_origin && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
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

        {/* Latest Tracks */}
        {tracks.length > 0 && (
          <div>
            <h2 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: isMobile ? '22px' : '28px',
              fontWeight: '600', color: 'var(--text-primary)',
              marginBottom: '24px', paddingBottom: '16px',
              borderBottom: '1px solid var(--border)',
              letterSpacing: '-0.5px',
            }}>
              Tracks
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {tracks.map((track, index) => {
                const isActive = currentTrack?.id === track.id
                const isCurrentlyPlaying = isActive && isPlaying

                return (
                  <div
                    key={track.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '32px 40px 1fr auto' : '40px 48px 1fr auto',
                      alignItems: 'center',
                      gap: isMobile ? '10px' : '16px',
                      padding: isMobile ? '10px 8px' : '12px 16px',
                      borderRadius: '10px',
                      background: isActive ? 'var(--bg-secondary)' : 'transparent',
                      transition: 'background 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    {/* Play button */}
                    <div
                      onClick={() => playTrack(track)}
                      style={{
                        width: isMobile ? '28px' : '32px',
                        height: isMobile ? '28px' : '32px',
                        borderRadius: '50%',
                        background: isActive ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px',
                        color: isActive ? 'white' : 'var(--text-muted)',
                        fontWeight: '500', transition: 'all 0.2s ease', flexShrink: 0, cursor: 'pointer',
                      }}
                    >
                      {isCurrentlyPlaying ? '⏸' : isActive ? '▶' : index + 1}
                    </div>

                    {/* Track image */}
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

                    {/* Title + duration */}
                    <div onClick={() => playTrack(track)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: isMobile ? '13px' : '15px',
                          fontWeight: isActive ? '500' : '400',
                          color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                          transition: 'color 0.2s ease',
                        }}>
                          {track.title}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {track.duration || '—'}
                        </span>
                      </div>
                      {track.album_id && (
                        <Link
                          href={`/album/${track.album_id}`}
                          onClick={e => e.stopPropagation()}
                          style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none' }}
                        >
                          {albums.find(a => a.id === track.album_id)?.title || 'View album'}
                        </Link>
                      )}
                    </div>

                    {/* Price */}
                    {track.price && (
                      <button style={{
                        fontSize: isMobile ? '11px' : '12px',
                        color: 'var(--accent-secondary)', background: 'none',
                        border: '1px solid var(--accent-secondary)', borderRadius: '4px',
                        padding: isMobile ? '3px 8px' : '4px 10px',
                        cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-secondary)'; e.currentTarget.style.color = 'white' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--accent-secondary)' }}
                      >
                        ${parseFloat(track.price || 0).toFixed(2)}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
