'use client'

/**
 * HomeContestPromo — a contest announcement box on the homepage.
 *
 * Shows the featured contest's announcement video (e.g. an executive announcing
 * the contest) in a card styled like the executive spotlight, with the contest
 * title, a short blurb, and a CTA into Cinema/Stories. Admins attach/replace/
 * remove the video per contest in /admin/contests (contests.promo_video_url).
 * Renders nothing if no featured contest has a video — self-hides.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function HomeContestPromo() {
  const router = useRouter()
  const [contest, setContest] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    let off = false
    ;(async () => {
      try {
        const { data } = await supabase
          .from('contests')
          .select('id, title, description, type, promo_video_url')
          .eq('featured', true)
          .not('promo_video_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
        if (!off && data && data[0]?.promo_video_url) setContest(data[0])
      } catch { /* self-hide on error */ }
    })()
    return () => { off = true }
  }, [])

  if (!contest) return null

  const isVideoContest = contest.type === 'music_video'
  const dest = isVideoContest ? '/cinema' : '/stories'
  const cta = isVideoContest ? 'Enter the contest in Cinema →' : 'Read & enter in Stories →'

  return (
    <section style={{ padding: '20px 0 60px' }}>
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '20px' : '36px',
        alignItems: 'center', textAlign: isMobile ? 'center' : 'left',
        background: 'var(--bg-secondary)', borderRadius: '20px', padding: isMobile ? '28px 22px' : '36px',
        border: '1px solid var(--border)', overflow: 'hidden', position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-secondary))' }} />

        {/* Announcement video — portrait, anchored to the top */}
        <div style={{ flexShrink: 0, width: isMobile ? '180px' : '200px' }}>
          <video src={contest.promo_video_url} controls playsInline muted autoPlay preload="metadata"
            style={{ width: '100%', aspectRatio: '9 / 16', objectFit: 'cover', objectPosition: 'top center', borderRadius: '14px', border: '2px solid var(--accent-gold)', display: 'block', background: '#000' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '8px' }}>🏆 New Contest</div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: isMobile ? '26px' : '32px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px', lineHeight: 1.15 }}>{contest.title}</h2>
          {contest.description && (
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 18px', maxWidth: '540px' }}>
              {contest.description.length > 240 ? contest.description.slice(0, 240).trim() + '…' : contest.description}
            </p>
          )}
          <button onClick={() => router.push(dest)}
            style={{ padding: '11px 22px', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
            {cta}
          </button>
        </div>
      </div>
    </section>
  )
}
