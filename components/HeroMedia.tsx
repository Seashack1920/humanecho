'use client'

import { CSSProperties } from 'react'

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
        src={videoUrl}
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
