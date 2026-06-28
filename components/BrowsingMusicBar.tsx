'use client'

import { useEffect, useRef, useState } from 'react'
import { useBrowsingMusic } from '@/context/BrowsingMusicContext'

type BgTrack = {
  id: string
  title: string
  cloudinary_url: string
  mood: string | null
  loop_enabled: boolean
  description: string | null
}

export default function BrowsingMusicBar({ tracks }: { tracks: BgTrack[] }) {
  const { currentTrack, isPlaying, play, stop, volume, setVolume, mute, unmute, isMuted } = useBrowsingMusic()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (track: BgTrack) => {
    play(track)
    setOpen(false)
  }

  const handleMuteToggle = () => isMuted ? unmute() : mute()

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Main button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', borderRadius: '20px',
          border: '1px solid var(--border)',
          background: isPlaying ? 'rgba(43,122,143,0.1)' : 'none',
          cursor: 'pointer', fontSize: '13px',
          color: isPlaying ? 'var(--accent-primary)' : 'var(--text-muted)',
          transition: 'all 0.2s ease',
        }}
      >
        {isPlaying ? (
          <>
            <EqIcon />
            <span>{currentTrack?.title}</span>
            {currentTrack?.mood && (
              <span style={{ fontSize: '11px', opacity: 0.7 }}>· {currentTrack.mood}</span>
            )}
          </>
        ) : (
          <>
            <span style={{ fontSize: '15px' }}>♪</span>
            <span>Browsing Music</span>
          </>
        )}
      </button>

      {/* Mute/volume — only when playing */}
      {isPlaying && (
        <button
          onClick={handleMuteToggle}
          title={isMuted ? 'Unmute' : 'Mute'}
          style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '5px 10px',
            cursor: 'pointer', fontSize: '13px',
            color: 'var(--text-muted)',
          }}
        >
          {isMuted ? '🔇' : '🔉'}
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: '14px', padding: '8px', minWidth: '240px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)', zIndex: 100,
        }}>
          {/* Stop option */}
          <button
            onClick={() => { stop(true); setOpen(false) }}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '8px',
              border: !isPlaying ? '1px solid var(--accent-primary)' : '1px solid transparent',
              background: !isPlaying ? 'rgba(43,122,143,0.1)' : 'none',
              cursor: 'pointer', fontSize: '13px', textAlign: 'left',
              color: !isPlaying ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}
          >
            No music
          </button>

          {tracks.map(t => (
            <button
              key={t.id}
              onClick={() => handleSelect(t)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: currentTrack?.id === t.id ? '1px solid var(--accent-primary)' : '1px solid transparent',
                background: currentTrack?.id === t.id ? 'rgba(43,122,143,0.1)' : 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {currentTrack?.id === t.id && isPlaying && <EqIcon />}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: currentTrack?.id === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                    {t.title}
                  </div>
                  {t.mood && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{t.mood}</div>
                  )}
                </div>
              </div>
            </button>
          ))}

          {/* Volume slider */}
          {isPlaying && (
            <div style={{ padding: '10px 12px 4px', borderTop: '1px solid var(--border)', marginTop: '6px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Volume</div>
              <input
                type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                onChange={e => { setVolume(parseFloat(e.target.value)); if (isMuted) unmute() }}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Tiny animated equaliser icon
function EqIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'inline-block', flexShrink: 0 }}>
      <rect x="0" y="4" width="2.5" height="10" rx="1" fill="var(--accent-primary)">
        <animate attributeName="height" values="10;4;10" dur="1.1s" repeatCount="indefinite" />
        <animate attributeName="y" values="4;7;4" dur="1.1s" repeatCount="indefinite" />
      </rect>
      <rect x="4" y="1" width="2.5" height="13" rx="1" fill="var(--accent-primary)">
        <animate attributeName="height" values="13;5;13" dur="0.8s" repeatCount="indefinite" />
        <animate attributeName="y" values="1;5;1" dur="0.8s" repeatCount="indefinite" />
      </rect>
      <rect x="8" y="3" width="2.5" height="11" rx="1" fill="var(--accent-primary)">
        <animate attributeName="height" values="11;6;11" dur="1.3s" repeatCount="indefinite" />
        <animate attributeName="y" values="3;6;3" dur="1.3s" repeatCount="indefinite" />
      </rect>
      <rect x="12" y="5" width="2.5" height="9" rx="1" fill="var(--accent-primary)">
        <animate attributeName="height" values="9;3;9" dur="0.9s" repeatCount="indefinite" />
        <animate attributeName="y" values="5;8;5" dur="0.9s" repeatCount="indefinite" />
      </rect>
    </svg>
  )
}