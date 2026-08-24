'use client'

import { usePlayer } from '@/context/PlayerContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function FloatingPlayer() {
  const router = useRouter()
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    isExpanded,
    hasNext,
    hasPrev,
    setIsExpanded,
    togglePlay,
    playNext,
    playPrev,
    seek,
    changeVolume,
    formatTime,
    stop,
  } = usePlayer()

  // iOS/iPadOS make the media `volume` property read-only — a JS volume slider
  // does nothing there (Apple reserves volume for the hardware buttons). Detect
  // it so we can show guidance instead of a dead control.
  const [noVolumeControl, setNoVolumeControl] = useState(false)
  useEffect(() => {
    const ua = navigator.userAgent || ''
    const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)
    setNoVolumeControl(iOS)
  }, [])

  if (!currentTrack) return null
  
  const progressPercent = duration ? (progress / duration) * 100 : 0

  const btnStyle = (disabled = false) => ({
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'none',
    border: 'none',
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    color: disabled ? 'var(--border)' : 'var(--text-secondary)',
    flexShrink: 0,
    transition: 'color 0.2s ease',
  })

  const goToArtist = () => {
    if (currentTrack.artist_id) router.push(`/artist/${currentTrack.artist_id}`)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
        width: isExpanded ? '340px' : '300px',
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
      {/* ── EXPANDED VIEW ── */}
      {isExpanded && (
        <div style={{ padding: '20px 20px 0' }}>

          {/* Album art */}
          <div style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', background: 'var(--bg-secondary)' }}>
            {currentTrack.track_image_url
              ? <img src={currentTrack.track_image_url} alt={currentTrack.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🎵</div>
            }
          </div>

          {/* Track info */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentTrack.title}
            </div>
            {currentTrack.artist_name && (
              <div
                onClick={goToArtist}
                style={{ fontSize: '13px', color: 'var(--accent-primary)', cursor: currentTrack.artist_id ? 'pointer' : 'default', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: currentTrack.artist_id ? 'underline' : 'none' }}
                onMouseEnter={e => { if (currentTrack.artist_id) e.currentTarget.style.opacity = '0.8' }}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {currentTrack.artist_name}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '8px' }}>
            <input type="range" min={0} max={duration || 0} value={progress}
              onChange={(e) => seek(parseFloat(e.target.value))}
              style={{ width: '100%', height: '3px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
            <button onClick={playPrev} disabled={!hasPrev} style={btnStyle(!hasPrev)}>⏮</button>
            <button onClick={togglePlay} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform 0.1s ease' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={playNext} disabled={!hasNext} style={btnStyle(!hasNext)}>⏭</button>
          </div>

          {/* Volume — the slider is hidden on iOS, where JS can't set volume */}
          {noVolumeControl ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
              🔊 Use your device's volume buttons
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🔈</span>
              <input type="range" min={0} max={1} step={0.01} value={volume}
                onChange={(e) => changeVolume(parseFloat(e.target.value))}
                style={{ flex: 1, height: '3px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🔊</span>
            </div>
          )}

          {/* Collapse button */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', paddingBottom: '16px' }}>
            <button onClick={() => setIsExpanded(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
              ↓ Collapse
            </button>
            <button onClick={stop} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}
              onMouseEnter={e => e.currentTarget.style.color = '#dc3c3c'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
              × Close
            </button>
          </div>
        </div>
      )}

      {/* ── MINI BAR — only when collapsed ── */}
      {!isExpanded && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px' }}>

          {/* Thumbnail */}
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)' }}>
            {currentTrack.track_image_url
              ? <img src={currentTrack.track_image_url} alt={currentTrack.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎵</div>
            }
          </div>

          {/* Title + artist */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentTrack.title}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentTrack.artist_name ? (
                <span
                  onClick={goToArtist}
                  style={{ cursor: currentTrack.artist_id ? 'pointer' : 'default', textDecoration: currentTrack.artist_id ? 'underline' : 'none' }}
                  onMouseEnter={e => { if (currentTrack.artist_id) e.currentTarget.style.color = 'var(--accent-primary)' }}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  {currentTrack.artist_name}
                </span>
              ) : `${formatTime(progress)} / ${formatTime(duration)}`}
            </div>
          </div>

          {/* Controls */}
          <button onClick={playPrev} disabled={!hasPrev} style={btnStyle(!hasPrev)}>⏮</button>
          <button onClick={togglePlay} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform 0.1s ease' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={playNext} disabled={!hasNext} style={btnStyle(!hasNext)}>⏭</button>

          {/* Expand */}
          <button onClick={() => setIsExpanded(true)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
            ↑
          </button>
          <button onClick={stop} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Close player"
            onMouseEnter={e => e.currentTarget.style.color = '#dc3c3c'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
            ×
          </button>
        </div>
      )}

      {/* Progress bar — mini only */}
      {!isExpanded && (
        <div style={{ height: '4px', background: 'var(--border)', borderRadius: '0 0 16px 16px' }}>
          <div style={{ height: '100%', width: `${progressPercent}%`, background: 'var(--accent-primary)', borderRadius: '0 0 16px 16px', transition: 'width 0.1s linear' }} />
        </div>
      )}
    </div>
  )
}
