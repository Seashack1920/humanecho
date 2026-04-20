'use client'

import { useState, useEffect } from 'react'
import { usePlayer } from '@/context/PlayerContext'
import VideoModal from '@/components/VideoModal'
import Link from 'next/link'

export default function AlbumClient({ album, artist, tracks }) {
  const { playTrack, currentTrack, isPlaying } = usePlayer()
  const [expandedTrack, setExpandedTrack] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const [modalVideo, setModalVideo] = useState(null)
  const [modalThumb, setModalThumb] = useState(null)
  const [modalArtist, setModalArtist] = useState(null)
  const [modalLabel, setModalLabel] = useState(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const toggleLyrics = (trackId) => {
    setExpandedTrack(expandedTrack === trackId ? null : trackId)
  }

  const openModal = (videoUrl, thumbUrl, artistName, label) => {
    setModalVideo(videoUrl)
    setModalThumb(thumbUrl)
    setModalArtist(artistName)
    setModalLabel(label || null)
  }

  const closeModal = () => {
    setModalVideo(null)
    setModalThumb(null)
    setModalArtist(null)
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
      {/* Video Modal */}
      {modalVideo && (
        <VideoModal
          videoUrl={modalVideo}
          thumbUrl={modalThumb}
          artistName={modalArtist}
          label={modalLabel}
          onClose={closeModal}
        />
      )}

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '24px 20px' : '40px 32px' }}>

        {/* Album Hero */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '340px 1fr',
          gap: isMobile ? '28px' : '48px',
          marginBottom: isMobile ? '40px' : '60px',
          alignItems: 'start',
        }}>

          {/* Cover art */}
          <div style={{
            position: 'relative', borderRadius: '16px', overflow: 'hidden',
            boxShadow: 'var(--shadow)', aspectRatio: '1',
            background: 'var(--bg-secondary)',
            maxWidth: isMobile ? '260px' : '100%',
            margin: isMobile ? '0 auto' : '0',
            width: '100%',
          }}>
            {album.cover_url ? (
              <img src={album.cover_url} alt={album.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px' }}>🎵</div>
            )}
          </div>

          {/* Album info */}
          <div style={{ paddingTop: isMobile ? '0' : '8px', textAlign: isMobile ? 'center' : 'left' }}>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <div style={{
                display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)',
                letterSpacing: '1px', textTransform: 'uppercase',
              }}>
                {album.album_type || 'Album'}
              </div>
              {album.content_origin && (
                <div style={{
                  display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)',
                  letterSpacing: '1px', textTransform: 'uppercase',
                }}>
                  {originBadge(album.content_origin)}
                </div>
              )}
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: isMobile ? '36px' : '48px',
              fontWeight: '700', color: 'var(--text-primary)',
              lineHeight: '1.1', marginBottom: '16px', letterSpacing: '-1px',
            }}>
              {album.title}
            </h1>

            {/* Artist */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px',
              justifyContent: isMobile ? 'center' : 'flex-start',
            }}>
              {artist?.photo_url && (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={artist.photo_url} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
             <Link 
  href={`/artist/${artist?.id}`}
  style={{ 
    fontSize: '18px', 
    color: 'var(--text-secondary)', 
    fontWeight: '400',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  }}
  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'}
  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
>
  {artist?.name || 'Unknown Artist'}
</Link>
            </div>

            {/* Meta */}
            <div style={{
              display: 'flex', gap: '24px', marginBottom: '24px',
              fontSize: '13px', color: 'var(--text-muted)',
              justifyContent: isMobile ? 'center' : 'flex-start',
            }}>
              <span>{tracks.length} tracks</span>
              {album.release_date && <span>{new Date(album.release_date).getFullYear()}</span>}
              {album.price && <span style={{ color: 'var(--accent-secondary)' }}>${parseFloat(album.price).toFixed(2)}</span>}
            </div>

            {/* Description */}
            {album.description && (
              <p style={{
                fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.7',
                marginBottom: '28px', maxWidth: isMobile ? '100%' : '480px',
              }}>
                {album.description}
              </p>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              {album.price && (
                <button
                  style={{
                    padding: '14px 32px', borderRadius: '8px', background: 'var(--accent-primary)',
                    color: 'white', fontSize: '15px', fontWeight: '500', cursor: 'pointer',
                    border: 'none', transition: 'opacity 0.2s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Buy Album — ${parseFloat(album.price).toFixed(2)}
                </button>
              )}

              {album.artist_message_url && (
                <button
                  onClick={() => openModal(album.artist_message_url, album.artist_message_thumb_url, artist?.name, 'Artist Message')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '13px', color: 'var(--accent-gold)',
                    background: 'none', border: '1px solid var(--accent-gold)',
                    borderRadius: '8px', cursor: 'pointer',
                    padding: '8px 16px', transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-gold)'; e.currentTarget.style.color = 'white' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--accent-gold)' }}
                >
                  <span>▶</span>
                  <span>Artist Message</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tracklist */}
        <div>
          <h2 style={{
            fontFamily: 'Playfair Display, serif', fontSize: isMobile ? '20px' : '24px',
            fontWeight: '600', color: 'var(--text-primary)',
            marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)',
          }}>
            Tracklist
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {tracks.map((track, index) => {
              const isActive = currentTrack?.id === track.id
              const isCurrentlyPlaying = isActive && isPlaying
              const isExpanded = expandedTrack === track.id

              return (
                <div key={track.id}>
                  <div
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
                        fontSize: isActive ? '11px' : '12px',
                        color: isActive ? 'white' : 'var(--text-muted)',
                        fontWeight: '500', transition: 'all 0.2s ease', flexShrink: 0, cursor: 'pointer',
                      }}
                    >
                      {isCurrentlyPlaying ? '⏸' : isActive ? '▶' : track.track_number || index + 1}
                    </div>

                    {/* Track image */}
                    <div style={{
                      width: isMobile ? '36px' : '44px',
                      height: isMobile ? '36px' : '44px',
                      borderRadius: '6px', overflow: 'hidden',
                      background: 'var(--bg-secondary)', flexShrink: 0,
                    }}>
                      {track.track_image_url ? (
                        <img src={track.track_image_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🎵</div>
                      )}
                    </div>

                    {/* Title + duration + links */}
                    <div>
                      <div onClick={() => playTrack(track)} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: isMobile ? '13px' : '15px',
                          fontWeight: isActive ? '500' : '400',
                          color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                          transition: 'color 0.2s ease',
                        }}>
                          {track.title}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {track.duration || '—'}
                        </span>
                      </div>

                      {/* Sub-links: Lyrics, Artist Message, Music Video */}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                        {track.text_content && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleLyrics(track.id) }}
                            style={{
                              fontSize: '11px',
                              color: isExpanded ? 'var(--accent-primary)' : 'var(--accent-gold)',
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: '0', lineHeight: '1.2',
                            }}
                          >
                            {isExpanded ? 'Hide lyrics' : 'Lyrics'}
                          </button>
                        )}

                        {track.artist_message_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openModal(track.artist_message_url, track.artist_message_thumb_url, artist?.name, 'Artist Message')
                            }}
                            style={{
                              fontSize: '11px', color: 'var(--accent-gold)',
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: '0', lineHeight: '1.2',
                            }}
                          >
                            ▶ Artist Message
                          </button>
                        )}

                        {track.music_video_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openModal(track.music_video_url, track.music_video_thumb_url, track.title, 'Music Video')
                            }}
                            style={{
                              fontSize: '11px', color: 'var(--accent-primary)',
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: '0', lineHeight: '1.2',
                            }}
                          >
                            ▶ Music Video
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Buy button */}
                    {track.price && (
                      <button
                        style={{
                          fontSize: isMobile ? '11px' : '12px',
                          color: 'var(--accent-secondary)', background: 'none',
                          border: '1px solid var(--accent-secondary)', borderRadius: '4px',
                          padding: isMobile ? '3px 8px' : '4px 10px',
                          cursor: 'pointer', whiteSpace: 'nowrap',
                          flexShrink: 0, transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-secondary)'; e.currentTarget.style.color = 'white' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--accent-secondary)' }}
                      >
                        ${parseFloat(track.price || 0).toFixed(2)}
                      </button>
                    )}
                  </div>

                  {/* Expanded lyrics */}
                  {isExpanded && track.text_content && (
                    <div style={{
                      padding: isMobile ? '16px' : '16px 16px 16px 120px',
                      borderRadius: '0 0 10px 10px',
                      background: 'var(--bg-secondary)',
                      marginTop: '-2px', marginBottom: '2px',
                    }}>
                      <pre style={{
                        fontFamily: 'DM Sans, sans-serif', fontSize: '14px', lineHeight: '1.8',
                        color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {track.text_content}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
