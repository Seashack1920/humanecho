'use client'

/**
 * ContestWinners — the published-winners showcase for a contest.
 *
 * Shows when a contest's winners_published = true. Supersedes the entry
 * panel (one contest tells one story: "enter now" OR "here are the winners").
 *
 * Structure: 3 song groups (by song title). Click a song title → spills open
 * to the list of winners for that song (filmmaker name, video title beneath,
 * placement #). Click a winner → the video plays inline (same cinematic
 * inline <video> as the submission view).
 *
 * Embed with a contestId, same as MusicVideoContest:
 *   <ContestWinners contestId="abc-123" />
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const PLACE_LABEL = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' }

export default function ContestWinners({ contestId }) {
  const [loading, setLoading] = useState(true)
  const [contest, setContest] = useState(null)
  const [songs, setSongs] = useState([])      // [{ track_id, title }]
  const [videos, setVideos] = useState([])    // placed submissions
  const [openSong, setOpenSong] = useState(null)
  const [nowPlaying, setNowPlaying] = useState(null)

  const load = useCallback(async () => {
    if (!contestId) { setLoading(false); return }
    setLoading(true)
    const { data: c } = await supabase.from('contests').select('*').eq('id', contestId).maybeSingle()
    setContest(c || null)

    const { data: cs } = await supabase.from('contest_songs').select('track_id, position').eq('contest_id', contestId).order('position')
    const trackIds = (cs || []).map(r => r.track_id)
    let titleById = {}
    if (trackIds.length) {
      const { data: tr } = await supabase.from('tracks').select('id, title').in('id', trackIds)
      titleById = Object.fromEntries((tr || []).map(t => [t.id, t.title]))
    }
    setSongs((cs || []).map(r => ({ track_id: r.track_id, title: titleById[r.track_id] || '(untitled)' })))

    // only PLACED videos (the winners), ordered by placement
    const { data: vids } = await supabase.from('videos')
      .select('id, title, filmmaker_name, cloudinary_url, track_id, placement, content_origin')
      .eq('contest_id', contestId)
      .not('placement', 'is', null)
      .order('placement', { ascending: true })
    setVideos(vids || [])
    setLoading(false)
  }, [contestId])

  useEffect(() => { load() }, [load])

  if (loading || !contest || !contest.winners_published) return null

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-secondary))', zIndex: 2 }} />

        <div style={{ padding: 'clamp(24px, 4vw, 40px) clamp(24px, 4vw, 44px)' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '10px' }}>
            🏆 Contest winners
          </div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, margin: '0 0 24px', letterSpacing: '-0.02em' }}>
            {contest.title}
          </h2>

          <div style={{ display: 'grid', gap: '12px' }}>
            {songs.map(song => {
              const winners = videos.filter(v => v.track_id === song.track_id)
              const isOpen = openSong === song.track_id
              return (
                <div key={song.track_id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenSong(isOpen ? null : song.track_id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <span style={{ fontSize: '18px' }}>♪</span>
                      <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{song.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{winners.length} winner{winners.length !== 1 ? 's' : ''}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', transition: 'transform 0.3s ease', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                    </div>
                  </button>

                  <div style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.35s ease' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '0 20px 18px' }}>
                        {winners.length === 0 ? (
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px 0' }}>No winners for this song.</div>
                        ) : (
                          <div style={{ display: 'grid', gap: '10px' }}>
                            {winners.map(v => (
                              <div key={v.id} style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                                  <div style={{ minWidth: 0, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <span style={{ flexShrink: 0, fontSize: '13px', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '1px' }}>
                                      {PLACE_LABEL[v.placement] || `#${v.placement}`}
                                    </span>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {v.filmmaker_name || 'Unknown filmmaker'}
                                      </div>
                                      {v.title && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '1px' }}>{v.title}{v.content_origin === 'human+ai' ? ' · 🧑🤖' : v.content_origin === '100% human' ? ' · 🧑' : ''}</div>}
                                      {!v.title && v.content_origin && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '1px' }}>{v.content_origin === 'human+ai' ? '🧑🤖' : '🧑'}</div>}
                                    </div>
                                  </div>
                                  {v.cloudinary_url && (
                                    <button
                                      onClick={() => setNowPlaying(nowPlaying === v.id ? null : v.id)}
                                      style={{ flexShrink: 0, padding: '7px 16px', borderRadius: '50px', background: nowPlaying === v.id ? 'var(--bg-secondary)' : 'var(--accent-primary)', color: nowPlaying === v.id ? 'var(--text-primary)' : 'white', fontSize: '13px', fontWeight: 600, border: nowPlaying === v.id ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                                    >
                                      {nowPlaying === v.id ? 'Close' : 'Watch'}
                                    </button>
                                  )}
                                </div>
                                {nowPlaying === v.id && v.cloudinary_url && (
                                  <div style={{ marginTop: '10px' }}>
                                    <video src={v.cloudinary_url} controls autoPlay style={{ width: '100%', borderRadius: '10px', background: '#000', maxHeight: '420px' }} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
