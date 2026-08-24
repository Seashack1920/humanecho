'use client'

/**
 * Brain Candy — homepage spotlight for whatever deserves attention right now:
 * an artist, a film, or the newest Escapes issue. Same collapsed-panel size as
 * "Are you an artist?". Opens to reveal a video OR an image with a quote, a few
 * sentences, and a call-to-action link. Admin-managed via homepage_features
 * (key='brain_candy'). Self-hides when inactive.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { playableVideoUrl } from '@/components/HeroMedia'

export default function BrainCandy({ data: injected = null, preview = false }) {
  const [fetched, setFetched] = useState(null)
  const [open, setOpen] = useState(preview)
  const router = useRouter()

  useEffect(() => {
    if (injected) return
    let off = false
    ;(async () => {
      try {
        const { data: row } = await supabase
          .from('homepage_features')
          .select('*').eq('key', 'brain_candy').eq('is_active', true).maybeSingle()
        if (!off && row) setFetched(row)
      } catch { /* self-hide */ }
    })()
    return () => { off = true }
  }, [injected])

  const data = injected || fetched
  if (!data) return null
  const hasMedia = !!(data.video_url || data.image_url)

  const goLink = () => {
    if (!data.link_url) return
    if (/^https?:\/\//i.test(data.link_url)) window.open(data.link_url, '_blank', 'noopener')
    else router.push(data.link_url)
  }

  return (
    <section style={{ paddingBottom: '80px' }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-secondary), var(--accent-gold))' }} />

        {/* Header bar — toggles open */}
        <button onClick={() => setOpen(o => !o)} aria-expanded={open}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', padding: 'clamp(28px, 4vw, 44px) clamp(24px, 4vw, 48px)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-secondary)', fontWeight: 600, marginBottom: '10px' }}>
              {data.eyebrow || 'Something worth your attention'}
            </div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, margin: 0, letterSpacing: '-0.02em' }}>
              {data.title || 'Brain Candy'}
            </h2>
            {data.subhead && (
              <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--text-muted)', margin: '8px 0 0', fontStyle: 'italic' }}>{data.subhead}</p>
            )}
          </div>
          <span aria-hidden style={{ flexShrink: 0, width: '44px', height: '44px', borderRadius: '50%', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'var(--text-primary)', transition: 'transform 0.3s ease', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
        </button>

        {/* Expanding content: video OR image+quote, body, CTA */}
        <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.4s ease' }}>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 clamp(24px, 4vw, 48px) clamp(28px, 4vw, 44px)' }}>
              {data.video_url ? (
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: '14px', overflow: 'hidden', background: '#000', marginBottom: '20px' }}>
                  {open && <video src={playableVideoUrl(data.video_url)} poster={data.thumbnail_url || undefined} controls playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />}
                </div>
              ) : data.image_url ? (
                <div style={{ position: 'relative', width: '100%', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
                  <img src={data.image_url} alt="" style={{ width: '100%', display: 'block' }} />
                  {data.quote && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 'clamp(20px, 4vw, 40px)', background: 'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.1) 60%, transparent)' }}>
                      <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(18px, 2.6vw, 26px)', fontStyle: 'italic', color: '#fff', lineHeight: 1.4, margin: 0, maxWidth: '760px' }}>“{data.quote}”</p>
                      {data.quote_attribution && <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', marginTop: '8px' }}>— {data.quote_attribution}</div>}
                    </div>
                  )}
                </div>
              ) : null}

              {data.body && (
                <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '680px', margin: hasMedia ? 0 : '4px 0 0' }}>{data.body}</p>
              )}

              {data.link_url && (
                <div style={{ marginTop: '28px' }}>
                  <button onClick={goLink} style={{ padding: '13px 28px', borderRadius: '50px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 8px 28px rgba(43,122,143,0.35)' }}>
                    {data.link_label || 'Take a look →'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
