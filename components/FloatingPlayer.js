'use client'

import { usePlayer } from '@/context/PlayerContext'

export default function FloatingPlayer() {
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
  } = usePlayer()

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
      {/* Expanded view */}
      {isExpanded && (
        <div style={{ padding: '20px 20px 0' }}>
          {/* Album art */}
          <div style={{
            width: '100%', aspectRatio: '1', borderRadius: '12px',
            overflow: 'hidden', marginBottom: '16px', background: 'var(--bg-secondary)',
          }}>
            {currentTrack.track_image_url ? (
              <img src={currentTrack.track_image_url} alt={currentTrack.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🎵</div>
            )}
          </div>

          {/* Track info */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '600',
              color: 'var(--text-primary)', marginBottom: '4px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {currentTrack.title}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {currentTrack.artist_name || ''}
            </div>
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

            <button onClick={togglePlay} style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'var(--accent-primary)', color: 'white',
              border: 'none', cursor: 'pointer', fontSize: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'transform 0.1s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            <button onClick={playNext} disabled={!hasNext} style={btnStyle(!hasNext)}>⏭</button>
          </div>

          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🔈</span>
            <input type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => changeVolume(parseFloat(e.target.value))}
              style={{ flex: 1, height: '3px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🔊</span>
          </div>
        </div>
      )}

      {/* Mini bar — always visible */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px' }}>
        {/* Thumbnail */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '8px',
          overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)',
        }}>
          {currentTrack.track_image_url ? (
            <img src={currentTrack.track_image_url} alt={currentTrack.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎵</div>
          )}
        </div>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)',
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

        {/* Mini controls */}
        {!isExpanded && (
          <>
            <button onClick={playPrev} disabled={!hasPrev} style={btnStyle(!hasPrev)}>⏮</button>
          </>
        )}

        {/* Play/pause */}
        <button onClick={togglePlay} style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'var(--accent-primary)', color: 'white',
          border: 'none', cursor: 'pointer', fontSize: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'transform 0.1s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {!isExpanded && (
          <button onClick={playNext} disabled={!hasNext} style={btnStyle(!hasNext)}>⏭</button>
        )}

        {/* Expand/collapse */}
        <button onClick={() => setIsExpanded(!isExpanded)} style={{
          width: '28px', height: '28px', borderRadius: '50%',
          background: 'var(--bg-secondary)', color: 'var(--text-muted)',
          border: 'none', cursor: 'pointer', fontSize: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {isExpanded ? '↓' : '↑'}
        </button>
      </div>

      {/* Progress bar mini */}
      {!isExpanded && (
        <div style={{ height: '2px', background: 'var(--border)', borderRadius: '0 0 16px 16px' }}>
          <div style={{
            height: '100%', width: `${progressPercent}%`,
            background: 'var(--accent-primary)', borderRadius: '0 0 16px 16px',
            transition: 'width 0.1s linear',
          }} />
        </div>
      )}
    </div>
  )
}
