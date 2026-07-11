'use client'

import { CSSProperties, useState } from 'react'

/**
 * Normalize a Cloudinary video URL to a browser-friendly delivery. Source files
 * like .mov/.mkv/.avi don't play in Chrome/Firefox; asking Cloudinary for an
 * mp4 (with q_auto) transcodes on the fly. Non-Cloudinary URLs pass through.
 */
export function playableVideoUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  if (url.includes('/video/upload/') && !url.includes('/upload/f_')) {
    return url
      .replace('/video/upload/', '/video/upload/f_mp4,q_auto/')
      .replace(/\.(mov|mkv|avi|m4v|wmv|flv)$/i, '.mp4')
  }
  return url
}

/**
 * Full-bleed hero background media. If videoUrl is set, plays a silent looping
 * background video; otherwise shows the still image. Always absolute inset-0 to
 * sit behind the hero content.
 *
 * When a video is set we do NOT use the still image as a poster — a poster
 * flashes the photo and then jumps to the first video frame. Instead the video
 * fades in from a dark background once it can render, so there's no photo flash.
 *
 * Pass filter / transform / opacity / transition via `style`. Use `position`
 * for focal point (maps to background-position for image, object-position for
 * video) — defaults to 'center'.
 */
export default function HeroMedia({
  imageUrl,
  videoUrl,
  style,
  position = 'center',
  allowUnmute = false,
  onSoundChange,
}: {
  imageUrl?: string | null
  videoUrl?: string | null
  style?: CSSProperties
  position?: string
  /** Show a 🔇/🔊 button so viewers can hear the video's audio (still starts muted). */
  allowUnmute?: boolean
  /** Called with true when the viewer turns sound on, false when they mute again. */
  onSoundChange?: (soundOn: boolean) => void
}) {
  const [ready, setReady] = useState(false)
  const [muted, setMuted] = useState(true)
  const base: CSSProperties = { position: 'absolute', inset: 0, ...style }

  if (videoUrl) {
    return (
      <>
        <video
          src={playableVideoUrl(videoUrl)}
          autoPlay
          loop
          muted={muted}
          playsInline
          onLoadedData={() => setReady(true)}
          onPlaying={() => setReady(true)}
          style={{
            ...base,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: position,
            background: '#0a0a0b',
            opacity: ready ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}
        />
        {allowUnmute && (
          <button
            onClick={(e) => { e.stopPropagation(); const next = !muted; setMuted(next); onSoundChange?.(!next) }}
            aria-label={muted ? 'Unmute' : 'Mute'}
            style={{
              position: 'absolute', bottom: '18px', right: '18px', zIndex: 15,
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: muted ? '8px 14px' : '8px', height: '36px',
              borderRadius: '999px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.25)', color: 'white', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {muted ? <>🔇 <span>Tap for sound</span></> : '🔊'}
          </button>
        )}
      </>
    )
  }

  if (imageUrl) {
    return (
      <div
        style={{ ...base, backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: position }}
      />
    )
  }

  return null
}
