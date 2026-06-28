'use client'

/**
 * StoryContestWinners — reader-facing winners showcase for a story contest.
 * Sibling to the music-video ContestWinners. Shows ONLY when the contest's
 * winners_published is true (the stories page decides which to render).
 *
 * Shows the placed stories (1st / 2nd / 3rd) with placement badge, title,
 * author name + pic (linking to /member/[id]). Clicking a winner expands the
 * full story text inline to read. Replaces the entry panel once published.
 *
 *   <StoryContestWinners contestId="abc-123" />
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const TYPE_LABEL = {
  flash_fiction: 'Flash Fiction',
  short_story: 'Short Story',
  memoir: 'Memoir',
}

const placeBadge = (p) => p === 1 ? '🥇 First Place' : p === 2 ? '🥈 Second Place' : p === 3 ? '🥉 Third Place' : ''

export default function StoryContestWinners({ contestId }) {
  const [loading, setLoading] = useState(true)
  const [contest, setContest] = useState(null)
  const [winners, setWinners] = useState([])   // placed story_submissions + author info
  const [openId, setOpenId] = useState(null)    // which winning story is expanded

  const load = useCallback(async () => {
    if (!contestId) { setLoading(false); return }
    setLoading(true)
    const { data: c } = await supabase.from('contests').select('*').eq('id', contestId).maybeSingle()
    setContest(c || null)

    // placed entries (1,2,3), in placement order
    const { data: subs } = await supabase
      .from('story_submissions')
      .select('id, title, body, word_count, content_origin, placement, submitted_by')
      .eq('contest_id', contestId)
      .gte('placement', 1)
      .lte('placement', 3)
      .order('placement', { ascending: true })
    const placed = subs || []

    // author info (name + pic) for winners
    const ids = [...new Set(placed.map(x => x.submitted_by).filter(Boolean))]
    let byId = {}
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids)
      byId = Object.fromEntries((profs || []).map(p => [p.id, p]))
    }
    setWinners(placed.map(s => ({ ...s, author: byId[s.submitted_by] || null })))
    setLoading(false)
  }, [contestId])

  useEffect(() => { load() }, [load])

  if (loading) return null
  if (!contest || !contest.winners_published) return null
  if (winners.length === 0) return null

  const typeLabel = TYPE_LABEL[contest.type] || 'Story'
  const initial = (n) => (n || '?').trim().charAt(0).toUpperCase()

  return (
    <section style={{ marginBottom: '40px' }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-secondary))' }} />

        <div style={{ padding: 'clamp(24px, 4vw, 40px) clamp(24px, 4vw, 44px)' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '8px' }}>
            🏆 {typeLabel} Contest · Winners
          </div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            {contest.title}
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: '0 0 28px' }}>
            Congratulations to our winners. Tap a story to read it.
          </p>

          <div style={{ display: 'grid', gap: '14px' }}>
            {winners.map(w => {
              const isOpen = openId === w.id
              return (
                <div key={w.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : w.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    {/* author photo */}
                    {w.author?.avatar_url ? (
                      <img src={w.author.avatar_url} alt={w.author?.full_name || ''} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 600, flexShrink: 0 }}>
                        {initial(w.author?.full_name)}
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '12px', color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '2px' }}>{placeBadge(w.placement)}</div>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '19px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {w.author?.full_name ? (
                          <a href={`/member/${w.submitted_by}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>{w.author.full_name}</a>
                        ) : 'Anonymous'}
                        <span> · {w.word_count} words · {w.content_origin === '100% human' ? '🧑' : '🧑🤖'}</span>
                      </div>
                    </div>
                    <span aria-hidden style={{ flexShrink: 0, fontSize: '14px', color: 'var(--text-muted)', transition: 'transform 0.3s ease', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 24px 28px' }}>
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', fontSize: '16px', lineHeight: 1.8, color: 'var(--text-primary)', fontFamily: 'Georgia, serif', whiteSpace: 'pre-wrap', maxWidth: '680px' }}>
                        {w.body}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
