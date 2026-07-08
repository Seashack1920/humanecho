'use client'

/**
 * HomeContestPromo — plays the promo video for the featured contest on the
 * homepage. Admins attach/replace/remove a video per contest in
 * /admin/contests (contests.promo_video_url). Renders nothing if no featured
 * contest has a video, so the section self-hides.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function HomeContestPromo() {
  const router = useRouter()
  const [contest, setContest] = useState(null)

  useEffect(() => {
    let off = false
    ;(async () => {
      try {
        const { data } = await supabase
          .from('contests')
          .select('id, title, type, promo_video_url')
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

  const isVideo = contest.type === 'music_video'
  const dest = isVideo ? '/cinema' : '/stories'

  return (
    <section style={{ paddingBottom: '80px' }}>
      <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '8px' }}>🏆 Contest</div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>{contest.title}</h2>
      <div style={{ borderRadius: '18px', overflow: 'hidden', border: '1px solid var(--border)', background: '#000' }}>
        <video src={contest.promo_video_url} controls playsInline preload="metadata"
          style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', objectPosition: 'top center', display: 'block', background: '#000' }} />
      </div>
      <button onClick={() => router.push(dest)}
        style={{ marginTop: '14px', fontSize: '14px', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
        {isVideo ? 'Enter the contest in Cinema →' : 'Read & enter in Stories →'}
      </button>
    </section>
  )
}
