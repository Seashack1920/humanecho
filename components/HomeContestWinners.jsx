'use client'

/**
 * HomeContestWinners — lean homepage teaser for contest winners.
 *
 * Shows the three 1st-place FILMMAKERS (one per song) from featured,
 * winners-published contest(s), as small celebratory cards (photo + name +
 * video title), each linking to that filmmaker's identity card (/member/[id]).
 * A "See all the winning videos in Cinema →" link sends people to the full
 * showcase. Keeps the homepage lean — celebrates the people, points to Cinema
 * for the videos.
 *
 * Renders nothing if there are no published winners.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function HomeContestWinners() {
  const router = useRouter()
  const [winners, setWinners] = useState([])  // [{ id, filmmaker_name, title, photo, memberId }]
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let off = false
    ;(async () => {
      try {
        // featured contests that have published winners
        const { data: contests } = await supabase
          .from('contests')
          .select('id')
          .eq('featured', true)
          .eq('winners_published', true)
        const contestIds = (contests || []).map(c => c.id)
        if (contestIds.length === 0) { if (!off) setLoading(false); return }

        // 1st-place videos across those contests
        const { data: vids } = await supabase
          .from('videos')
          .select('id, title, filmmaker_name, submitted_by, track_id, placement, contest_id')
          .in('contest_id', contestIds)
          .eq('placement', 1)
        const firsts = vids || []
        if (firsts.length === 0) { if (!off) setLoading(false); return }

        // pull submitter photos (avatar_url) for the cards
        const memberIds = [...new Set(firsts.map(v => v.submitted_by).filter(Boolean))]
        let photoById = {}
        if (memberIds.length) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, avatar_url, full_name')
            .in('id', memberIds)
          photoById = Object.fromEntries((profs || []).map(p => [p.id, p]))
        }

        const mapped = firsts.map(v => ({
          id: v.id,
          filmmaker_name: v.filmmaker_name || photoById[v.submitted_by]?.full_name || 'Filmmaker',
          title: v.title || '',
          photo: photoById[v.submitted_by]?.avatar_url || null,
          memberId: v.submitted_by || null,
        }))
        if (!off) setWinners(mapped)
      } catch {
        if (!off) setWinners([])
      }
      if (!off) setLoading(false)
    })()
    return () => { off = true }
  }, [])

  if (loading || winners.length === 0) return null

  const initial = (n) => (n || '?').trim().charAt(0).toUpperCase()

  return (
    <section style={{ paddingBottom: '80px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '6px' }}>🏆 Contest</div>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          ReFrame Music Video Contest
        </h2>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 600, color: 'var(--accent-gold)', marginBottom: '10px' }}>
          First Place Filmmakers
        </div>
        <button onClick={() => router.push('/cinema')} style={{ fontSize: '13px', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          See all the winning videos in Cinema →
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
        {winners.map(w => {
          const clickable = !!w.memberId
          return (
            <div
              key={w.id}
              onClick={() => clickable && router.push(`/member/${w.memberId}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '18px',
                borderRadius: '16px', border: '1px solid var(--border)',
                background: 'linear-gradient(135deg, rgba(196,162,101,0.08), rgba(224,122,95,0.05))',
                cursor: clickable ? 'pointer' : 'default', transition: 'border-color 0.2s, transform 0.2s',
              }}
              onMouseEnter={e => { if (clickable) { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {w.photo ? (
                <img src={w.photo} alt={w.filmmaker_name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 600, flexShrink: 0 }}>
                  {initial(w.filmmaker_name)}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>1st place</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w.filmmaker_name}
                </div>
                {w.title && <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
