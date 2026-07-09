'use client'

import { CSSProperties } from 'react'

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
 * background video (with the still image as poster/fallback); otherwise shows
 * the still image. Always absolute inset-0 to sit behind the hero content.
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
}: {
  imageUrl?: string | null
  videoUrl?: string | null
  style?: CSSProperties
  position?: string
}) {
  const base: CSSProperties = { position: 'absolute', inset: 0, ...style }

  if (videoUrl) {
    return (
      <video
        src={playableVideoUrl(videoUrl)}
        autoPlay
        loop
        muted
        playsInline
        poster={imageUrl || undefined}
        style={{ ...base, width: '100%', height: '100%', objectFit: 'cover', objectPosition: position }}
      />
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
