'use client'

import { usePlayer } from '@/context/PlayerContext'
import { useState, useEffect, useRef } from 'react'

export default function FloatingPlayer() {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    isExpanded,
    setIsExpanded,
    togglePlay,
    seek,
    changeVolume,
    formatTime,
    pause, 
  } = usePlayer()

  const [showVideo, setShowVideo] = useState(false)
  const videoRef = useRef(null)
  // Reset video view when track changes
  useEffect(() => {
    setShowVideo(false)

  }, [currentTrack?.id])

  if (!currentTrack) return null

  const progressPercent = duration ? (progress / duration) * 100 : 0
  const hasVideo = !!currentTrack.music_video_url

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
        width: isExpanded ? '340px' : '280px',
        background: 'var(--player-bg)',
        border: '1px solid var(--player-border)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-player)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Expanded view */}
      {isExpanded && (
        <div style={{ padding: '20px 20px 0' }}>

          {showVideo ? (
            <>
              {/* Video player — adapts to any aspect ratio */}
              <div style={{
                width: '100%',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '12px',
                background: '#000',
              }}>
                <video
  ref={videoRef}
  src={currentTrack.music_video_url}
  controls
  autoPlay
  style={{
    width: '100%',
    display: 'block',
    maxHeight: '400px',
    objectFit: 'contain',
  }}
/>
              </div>

              {/* Back to audio button */}
              <button
                onClick={() => {
  if (videoRef.current) {
    videoRef.current.pause()
    videoRef.current.currentTime = 0
  }
  setShowVideo(false)
}}
              >
                ← Back to audio
              </button>
            </>
          ) : (
            <>
              {/* Album art */}
              <div style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '12px',
                background: 'var(--bg-secondary)',
              }}>
                {currentTrack.track_image_url ? (
                  <img
                    src={currentTrack.track_image_url}
                    alt={currentTrack.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '48px',
                  }}>
                    🎵
                  </div>
                )}
              </div>

              {/* Video button — only if track has a music video */}
              {hasVideo && (
                <button
                  onClick={() => {
  pause()
  setShowVideo(true)
}}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '12px', color: 'var(--accent-primary)',
                    background: 'none', border: '1px solid var(--accent-primary)',
                    borderRadius: '6px', cursor: 'pointer',
                    padding: '5px 12px', marginBottom: '16px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.color = 'white' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--accent-primary)' }}
                >
                  🎬 Watch Video
                </button>
              )}
            </>
          )}

          {/* Track info */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '18px', fontWeight: '600',
              color: 'var(--text-primary)', marginBottom: '4px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {currentTrack.title}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {currentTrack.artist_name || 'R&B Beach Band'}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '8px' }}>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={progress}
              onChange={(e) => seek(parseFloat(e.target.value))}
              style={{
                width: '100%', height: '3px',
                accentColor: 'var(--accent-primary)', cursor: 'pointer',
              }}
            />
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px',
            }}>
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume */}
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: '8px', marginBottom: '16px',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🔈</span>
            <input
              type="range"
              min={0} max={1} step={0.01}
              value={volume}
              onChange={(e) => changeVolume(parseFloat(e.target.value))}
              style={{
                flex: 1, height: '3px',
                accentColor: 'var(--accent-gold)', cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🔊</span>
          </div>
        </div>
      )}

      {/* Mini bar — always visible */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: '12px', padding: '12px 16px',
      }}>
        {/* Thumbnail */}
        <div style={{
          width: '40px', height: '40px',
          borderRadius: '8px', overflow: 'hidden',
          flexShrink: 0, background: 'var(--bg-secondary)',
        }}>
          {currentTrack.track_image_url ? (
            <img
              src={currentTrack.track_image_url}
              alt={currentTrack.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '18px',
            }}>🎵</div>
          )}
        </div>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px', fontWeight: '500',
            color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {currentTrack.title}
          </div>
          {!isExpanded && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {formatTime(progress)} / {formatTime(duration)}
            </div>
          )}
        </div>

        {/* Play/pause */}
        <button
          onClick={() => {
  if (showVideo && videoRef.current) {
    videoRef.current.pause()
    videoRef.current.currentTime = 0
    setShowVideo(false)
  }
  togglePlay()
}}
          style={{
            width: '36px', height: '36px',
            borderRadius: '50%', background: 'var(--accent-primary)',
            color: 'white', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', flexShrink: 0,
            transition: 'transform 0.1s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            width: '28px', height: '28px',
            borderRadius: '50%', background: 'var(--bg-secondary)',
            color: 'var(--text-muted)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', flexShrink: 0,
          }}
        >
          {isExpanded ? '↓' : '↑'}
        </button>
      </div>

      {/* Progress bar mini */}
      {!isExpanded && (
        <div style={{
          height: '2px', background: 'var(--border)',
          borderRadius: '0 0 16px 16px',
        }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'var(--accent-primary)',
            borderRadius: '0 0 16px 16px',
            transition: 'width 0.1s linear',
          }} />
        </div>
      )}
    </div>
  )
}