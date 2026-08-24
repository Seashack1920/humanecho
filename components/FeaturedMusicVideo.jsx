'use client'

/**
 * Featured Music Video — homepage spotlight.
 *
 * Collapsed: eyebrow + title + subhead, with a thumbnail. Clicking the bar
 * reveals the video (silent-friendly inline player) and a few sentences of
 * text. Admin-managed via homepage_features (key='featured_music_video').
 * Self-hides when inactive or no video is set.
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { playableVideoUrl } from '@/components/HeroMedia'

export default function FeaturedMusicVideo() {
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let off = false
    ;(async () => {
      try {
        const { data: row } = await supabase
          .from('homepage_features')
          .select('*').eq('key', 'featured_music_video').eq('is_active', true).maybeSingle()
        if (!off && row?.video_url) setData(row)
      } catch { /* self-hide */ }
    })()
    return () => { off = true }
  }, [])

  if (!data) return null

  return (
    <section style={{ paddingBottom: '80px' }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))' }} />

        {/* Header bar — the whole bar toggles the video open */}
        <button onClick={() => setOpen(o => !o)} aria-expanded={open}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', padding: 'clamp(24px, 4vw, 40px) clamp(24px, 4vw, 48px)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '10px' }}>
              {data.eyebrow || 'Watch'}
            </div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, margin: 0, letterSpacing: '-0.02em' }}>
              {data.title || 'Featured Music Video'}
            </h2>
            {data.subhead && (
              <p style={{ fontSize: 'clamp(14px, 2vw, 17px)', color: 'var(--text-muted)', margin: '8px 0 0' }}>{data.subhead}</p>
            )}
          </div>

          {/* Thumbnail (collapsed only) */}
          {data.thumbnail_url && !open && (
            <div style={{ flexShrink: 0, position: 'relative', width: 'clamp(120px, 22vw, 200px)', aspectRatio: '16 / 9', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <img src={data.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
                <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '15px', paddingLeft: '3px' }}>▶</span>
              </div>
            </div>
          )}

          <span aria-hidden style={{ flexShrink: 0, width: '44px', height: '44px', borderRadius: '50%', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'var(--text-primary)', transition: 'transform 0.3s ease', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
        </button>

        {/* Expanding content: the video + a few sentences */}
        <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.4s ease' }}>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 clamp(24px, 4vw, 48px) clamp(28px, 4vw, 44px)' }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: '14px', overflow: 'hidden', background: '#000', marginBottom: data.body ? '20px' : 0 }}>
                {open && (
                  <video src={playableVideoUrl(data.video_url)} poster={data.thumbnail_url || undefined} controls playsInline preload="metadata"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
                )}
              </div>
              {data.body && (
                <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '680px', margin: 0 }}>{data.body}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
