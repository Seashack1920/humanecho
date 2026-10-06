'use client'

import { CSSProperties } from 'react'
import { playableVideoUrl } from '@/components/HeroMedia'

// Extract an 11-char YouTube id from the common URL shapes (watch, youtu.be,
// embed, shorts). Returns null for anything that isn't YouTube.
export function youTubeId(url?: string | null): string | null {
  if (!url) return null
  const res = [
    /(?:youtube\.com\/watch\?[^#]*\bv=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  ]
  for (const re of res) { const m = url.match(re); if (m) return m[1] }
  return null
}

export function isYouTube(url?: string | null): boolean { return !!youTubeId(url) }

// A poster thumbnail for a YouTube URL, or null if not YouTube.
export function youTubeThumb(url?: string | null): string | null {
  const id = youTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

/**
 * A 16:9 video player that works for both sources:
 *  - YouTube URL  → privacy-friendly iframe embed
 *  - anything else → native <video> (Cloudinary / DB-hosted), normalized via
 *    playableVideoUrl so .mov/.mkv etc. are served as playable mp4.
 */
export default function VideoEmbed({ url, poster, title }: { url: string; poster?: string | null; title?: string }) {
  const yt = youTubeId(url)
  const frame: CSSProperties = { width: '100%', aspectRatio: '16 / 9', borderRadius: '12px', overflow: 'hidden', background: '#0a0a0b', border: 'none', display: 'block' }

  if (yt) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0`}
        title={title || 'Video'}
        style={frame}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    )
  }

  return (
    <video src={playableVideoUrl(url)} poster={poster || undefined} controls playsInline preload="metadata"
      style={{ ...frame, objectFit: 'contain' }} />
  )
}
