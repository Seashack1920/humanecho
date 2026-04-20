'use client'

import { usePlayer } from '@/context/PlayerContext'
import { useState } from 'react'

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
  } = usePlayer()

  if (!currentTrack) return null

  const progressPercent = duration ? (progress / duration) * 100 : 0

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
          {/* Album art large */}
          <div style={{
            width: '100%',
            aspectRatio: '1',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '16px',
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
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
              }}>
                🎵
              </div>
            )}
          </div>

          {/* Track info */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {currentTrack.title}
            </div>
            <div style={{
              fontSize: '13px',
              color: 'var(--text-muted)',
            }}>
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
                width: '100%',
                height: '3px',
                accentColor: 'var(--accent-primary)',
                cursor: 'pointer',
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}>
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🔈</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => changeVolume(parseFloat(e.target.value))}
              style={{
                flex: 1,
                height: '3px',
                accentColor: 'var(--accent-gold)',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🔊</span>
          </div>
        </div>
      )}

      {/* Mini bar — always visible */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
      }}>
        {/* Thumbnail */}
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          overflow: 'hidden',
          flexShrink: 0,
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
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}>🎵</div>
          )}
        </div>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '500',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {currentTrack.title}
          </div>
          {!isExpanded && (
            <div style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginTop: '2px',
            }}>
              {formatTime(progress)} / {formatTime(duration)}
            </div>
          )}
        </div>

        {/* Play/pause */}
        <button
          onClick={togglePlay}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--accent-primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            flexShrink: 0,
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
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            flexShrink: 0,
          }}
        >
          {isExpanded ? '↓' : '↑'}
        </button>
      </div>

      {/* Progress bar mini */}
      {!isExpanded && (
        <div style={{
          height: '2px',
          background: 'var(--border)',
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