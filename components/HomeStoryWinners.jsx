'use client'

/**
 * HomeStoryWinners — lean homepage teaser for STORY contest winners.
 * Sibling to HomeContestWinners (music video). Shows the placed writers
 * (1st/2nd/3rd) from featured, winners-published story contests as cards
 * (photo + placement + name + story title), each linking to that writer's
 * identity card (/member/[id]). A "Read the winning stories on the Story
 * page →" link sends readers to /stories.
 *
 * Renders nothing if there are no published story winners.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const placeLabel = (p) => p === 1 ? '1st place' : p === 2 ? '2nd place' : p === 3 ? '3rd place' : ''

export default function HomeStoryWinners() {
  const router = useRouter()
  const [winners, setWinners] = useState([])  // { id, name, title, placement, photo, memberId }
  const [contestTitle, setContestTitle] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let off = false
    ;(async () => {
      try {
        // featured story-type contests with published winners
        const { data: contests } = await supabase
          .from('contests')
          .select('id, title')
          .eq('featured', true)
          .eq('winners_published', true)
          .in('type', ['flash_fiction', 'short_story', 'memoir'])
        const list = contests || []
        if (list.length === 0) { if (!off) setLoading(false); return }
        const contestIds = list.map(c => c.id)
        if (!off && list[0]?.title) setContestTitle(list[0].title)

        // placed entries across those contests
        const { data: subs } = await supabase
          .from('story_submissions')
          .select('id, title, placement, submitted_by, contest_id')
          .in('contest_id', contestIds)
          .gte('placement', 1)
          .lte('placement', 3)
          .order('placement', { ascending: true })
        const placed = subs || []
        if (placed.length === 0) { if (!off) setLoading(false); return }

        // writer photos/names
        const memberIds = [...new Set(placed.map(s => s.submitted_by).filter(Boolean))]
        let byId = {}
        if (memberIds.length) {
          const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', memberIds)
          byId = Object.fromEntries((profs || []).map(p => [p.id, p]))
        }

        const mapped = placed.map(s => ({
          id: s.id,
          name: byId[s.submitted_by]?.full_name || 'Writer',
          title: s.title || '',
          placement: s.placement,
          photo: byId[s.submitted_by]?.avatar_url || null,
          memberId: s.submitted_by || null,
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
          {contestTitle || 'Story Contest'}
        </h2>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 600, color: 'var(--accent-gold)', marginBottom: '10px' }}>
          Winning Writers
        </div>
        <button onClick={() => router.push('/stories')} style={{ fontSize: '13px', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Read the winning stories on the Story page →
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
                <img src={w.photo} alt={w.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 600, flexShrink: 0 }}>
                  {initial(w.name)}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{placeLabel(w.placement)}</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w.name}
                </div>
                {w.title && <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>“{w.title}”</div>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
