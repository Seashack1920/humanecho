'use client'

/**
 * MusicVideoContest — self-contained music-video contest panel.
 *
 * Embed anywhere (e.g. the Cinema page) and pass a contestId:
 *   <MusicVideoContest contestId="abc-123" />
 *
 * Collapsed: a featured invitation. Expanded: the contest description,
 * its 3 songs (each spills open to its submitted videos), and a
 * submission area gated to signed-in PAID MEMBERS.
 *
 * Submissions are written to the `videos` table tagged with
 * contest_id + track_id + submitted_by. Video playback here is a simple
 * inline <video> for now; the polished isolated player comes later.
 *
 * This is the MUSIC-VIDEO contest type specifically. Story/song contests
 * will be separate sibling components sharing the same `contests` table.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { usePlayer } from '@/context/PlayerContext'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = 'humanecho_upload'

async function uploadVideo(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', UPLOAD_PRESET)
  form.append('folder', 'contest/videos')
  form.append('resource_type', 'video')
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, { method: 'POST', body: form })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.secure_url
}

export default function MusicVideoContest({ contestId }) {
  const { signedIn, isMember, isAdmin, profile, user } = useCurrentUser()
  const player = (() => { try { return usePlayer() } catch { return null } })()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [contest, setContest] = useState(null)
  const [songs, setSongs] = useState([])          // [{ track_id, title, artistName }]
  const [videos, setVideos] = useState([])        // submissions for this contest
  const [expandedSong, setExpandedSong] = useState(null)
  const [nowPlaying, setNowPlaying] = useState(null)  // a video id playing inline
  const [showLyrics, setShowLyrics] = useState(null)  // a song track_id whose lyrics are shown
  const [showRules, setShowRules] = useState(false)

  const load = useCallback(async () => {
    if (!contestId) { setLoading(false); return }
    setLoading(true)
    // contest
    const { data: c } = await supabase.from('contests').select('*').eq('id', contestId).maybeSingle()
    setContest(c || null)

    // songs (contest_songs → track details, incl. fields needed to play)
    const { data: cs } = await supabase.from('contest_songs').select('track_id, position').eq('contest_id', contestId).order('position')
    const trackIds = (cs || []).map(r => r.track_id)
    let trackById = {}
    if (trackIds.length) {
      const { data: tr } = await supabase.from('tracks')
        .select('id, title, duration, track_type, cloudinary_url, track_image_url, artist_id, text_content')
        .in('id', trackIds)
      trackById = Object.fromEntries((tr || []).map(t => [t.id, t]))
    }
    setSongs((cs || []).map(r => ({ ...(trackById[r.track_id] || { id: r.track_id, title: '(untitled)' }), track_id: r.track_id })))

    // submissions
    const { data: vids } = await supabase.from('videos')
      .select('id, title, filmmaker_name, cloudinary_url, thumbnail_url, track_id, placement, content_origin, created_at')
      .eq('contest_id', contestId)
      .order('created_at', { ascending: false })
    setVideos(vids || [])
    setLoading(false)
  }, [contestId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading contest…</div>
    )
  }
  if (!contest) return null

  const isOpen = contest.status === 'open'

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
        {/* gold→coral signature hairline */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-secondary))', zIndex: 2 }} />

        {/* Invitation header — the whole bar toggles */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', padding: 'clamp(24px, 4vw, 40px) clamp(24px, 4vw, 44px)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '10px' }}>
              {isOpen ? 'Now accepting entries' : 'Music video contest'}
            </div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, margin: 0, letterSpacing: '-0.02em' }}>
              {contest.title}
            </h2>
          </div>
          <span aria-hidden style={{ flexShrink: 0, width: '44px', height: '44px', borderRadius: '50%', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'var(--text-primary)', transition: 'transform 0.3s ease', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
        </button>

        {/* Expanding body */}
        <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.4s ease' }}>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 clamp(24px, 4vw, 44px) clamp(28px, 4vw, 40px)' }}>

              {contest.description && (
                <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '680px', marginBottom: '28px', whiteSpace: 'pre-wrap' }}>
                  {contest.description}
                </p>
              )}

              {/* Rules & guidelines toggle */}
              <div style={{ marginBottom: '28px' }}>
                <button
                  onClick={() => setShowRules(r => !r)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '50px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  📋 Rules &amp; guidelines
                  <span style={{ fontSize: '11px', transition: 'transform 0.3s ease', transform: showRules ? 'rotate(180deg)' : 'none' }}>▾</span>
                </button>
                {showRules && (
                  <div style={{ marginTop: '14px', padding: '24px 26px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', maxWidth: '720px' }}>
                    {[
                      ['Who can enter', 'The contest is open to Human Echo members. You’ll need an active membership to submit a video.'],
                      ['How it works', 'Choose one of the three featured songs and create an original music video for it. You can play each song, read its lyrics, and download the audio right here in the contest panel. Submit your finished video through the entry form.'],
                      ['Your video', 'Videos should be your own original work, created for this contest. Standard video formats are accepted (MP4 or MOV). Video length should be close to the song’s length — though you’re welcome to edit or extend the song if it suits your vision. Content should be suitable for a general audience; anything hateful, explicit, or unlawful won’t be accepted.'],
                      ['Using the song', 'Human Echo owns and retains all rights to the contest songs. By entering, you’re granted permission to use your chosen song for the purpose of creating and sharing your contest music video. This permission is specific to your contest entry.'],
                      ['Honesty about how it was made', 'Every entry declares whether it was made without generative AI (🧑 100% human) or with AI as a tool (🧑🤖 Human + AI). This transparency is part of who we are — please label your work honestly.'],
                      ['Judging', 'A panel of three judges will review the entries and select the winners. Their decision is final. Winners are chosen for creativity, craft, and how well the video brings the song to life.'],
                      ['Prizes & what winning means', 'Winning videos are featured on Human Echo, and each song’s first-place video becomes that song’s official music video on the platform. Winners are celebrated across the site and may be shared on our social media.'],
                      ['The rights you grant us', 'By entering, you keep full ownership of your video. You grant Human Echo permission to display, stream, feature, and promote your video on the platform and on social media, indefinitely. (Winning videos may be featured as official music videos as described above.)'],
                      ['A small ask', 'You’re free to share your video anywhere you like — in fact, please do! When you do, we’d be grateful if you’d credit Human Echo Music and link to HumanEchoMusic.com. It helps more people discover the music and the makers.'],
                    ].map(([heading, body], i) => (
                      <div key={i} style={{ marginBottom: i === 8 ? 0 : '16px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{heading}</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* The 3 song panels */}
              <div style={{ display: 'grid', gap: '12px', marginBottom: '32px' }}>
                {songs.map(song => {
                  const subs = videos.filter(v => v.track_id === song.track_id)
                  const isSongOpen = expandedSong === song.track_id
                  return (
                    <div key={song.track_id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                      <button
                        onClick={() => setExpandedSong(isSongOpen ? null : song.track_id)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          {song.cloudinary_url && player?.playTrack && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (player.currentTrack?.id === song.id) player.togglePlay()
                                else player.playTrack(song)
                              }}
                              title="Play song"
                              style={{ flexShrink: 0, width: '34px', height: '34px', borderRadius: '50%', background: (player.currentTrack?.id === song.id && player.isPlaying) ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: (player.currentTrack?.id === song.id && player.isPlaying) ? 'white' : 'var(--accent-primary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', cursor: 'pointer' }}
                            >
                              {(player.currentTrack?.id === song.id && player.isPlaying) ? '⏸' : '▶'}
                            </span>
                          )}
                          <span style={{ fontSize: '18px' }}>♪</span>
                          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{song.title}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{subs.length} video{subs.length !== 1 ? 's' : ''}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', transition: 'transform 0.3s ease', transform: isSongOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                        </div>
                      </button>

                      {/* spilled submission list */}
                      <div style={{ display: 'grid', gridTemplateRows: isSongOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.35s ease' }}>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ padding: '0 20px 18px' }}>
                            {/* Tools for filmmakers: download audio + lyrics */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                              {song.cloudinary_url && (
                                <a
                                  href={song.cloudinary_url}
                                  download
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 14px', borderRadius: '50px', background: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
                                  title="Download the song audio to edit your video"
                                >
                                  ⬇ Download song (free)
                                </a>
                              )}
                              {song.text_content && (
                                <button
                                  onClick={() => setShowLyrics(showLyrics === song.track_id ? null : song.track_id)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 14px', borderRadius: '50px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                                >
                                  {showLyrics === song.track_id ? 'Hide lyrics' : 'Show lyrics'}
                                  <span style={{ fontSize: '11px', transition: 'transform 0.3s ease', transform: showLyrics === song.track_id ? 'rotate(180deg)' : 'none' }}>▾</span>
                                </button>
                              )}
                            </div>
                            {song.text_content && showLyrics === song.track_id && (
                              <div style={{ marginBottom: '14px' }}>
                                <div style={{ padding: '16px 18px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', maxHeight: '320px', overflowY: 'auto' }}>
                                  <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '10px' }}>Lyrics</div>
                                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{song.text_content}</div>
                                </div>
                              </div>
                            )}
                            {subs.length === 0 ? (
                              <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px 0' }}>No entries yet — be the first.</div>
                            ) : (
                              <div style={{ display: 'grid', gap: '10px' }}>
                                {subs.map(v => (
                                  <div key={v.id} style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {v.title || '(untitled)'}
                                          {v.placement && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 700 }}>#{v.placement}</span>}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                          {v.filmmaker_name || 'Unknown filmmaker'}
                                          {v.content_origin === 'human+ai' ? ' · 🧑🤖' : v.content_origin === '100% human' ? ' · 🧑' : ''}
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

              {/* Submission area */}
              <SubmissionArea
                contest={contest}
                isOpen={isOpen}
                songs={songs}
                signedIn={signedIn}
                isMember={isMember}
                isAdmin={isAdmin}
                user={user}
                profile={profile}
                onSubmitted={load}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── The gated submission form ──
function SubmissionArea({ contest, isOpen, songs, signedIn, isMember, isAdmin, user, profile, onSubmitted }) {
  const [trackId, setTrackId] = useState('')
  const [title, setTitle] = useState('')
  const [filmmaker, setFilmmaker] = useState('')
  const [origin, setOrigin] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)

  // Prefill filmmaker name from profile
  useEffect(() => { if (profile?.full_name && !filmmaker) setFilmmaker(profile.full_name) }, [profile])

  const gateBox = (text, cta, href) => (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
      <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: cta ? '16px' : 0, lineHeight: 1.6 }}>{text}</div>
      {cta && <a href={href} style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '50px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}>{cta}</a>}
    </div>
  )

  if (!isOpen) return gateBox('This contest isn’t accepting entries right now. Check back soon.')
  if (!signedIn) return gateBox('Sign in to enter the contest.', 'Sign in', '/login')
  if (!isMember && !isAdmin) return gateBox('Entering the contest is a member privilege. Become a member to submit your music video.', 'Become a member', '/subscribe')

  const handleSubmit = async () => {
    if (!trackId) return setMessage({ type: 'error', text: 'Pick which song your video is for.' })
    if (!origin) return setMessage({ type: 'error', text: 'Let us know how your video was made.' })
    if (!file) return setMessage({ type: 'error', text: 'Choose your video file.' })
    if (!title) return setMessage({ type: 'error', text: 'Give your video a title.' })
    if (file.size > 2048 * 1024 * 1024) return setMessage({ type: 'error', text: 'Video must be under 2GB.' })
    setUploading(true); setMessage({ type: 'info', text: 'Uploading your video — this can take a while…' })
    try {
      const url = await uploadVideo(file)
      // Assign the next stable per-contest entry number
      const { count } = await supabase
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .eq('contest_id', contest.id)
      const entryNumber = (count || 0) + 1

      const { error } = await supabase.from('videos').insert({
        title,
        filmmaker_name: filmmaker || null,
        cloudinary_url: url,
        contest_id: contest.id,
        track_id: trackId,
        submitted_by: user.id,
        video_type: 'music_video',
        content_origin: origin,
        status: 'published',
        entry_number: entryNumber,
      })
      if (error) throw error
      setMessage({ type: 'success', text: '✓ Your entry is in! Thank you for taking part.' })
      setTitle(''); setFile(null); setTrackId(''); setOrigin('')
      setTimeout(() => { onSubmitted && onSubmitted() }, 900)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
    setUploading(false)
  }

  const inp = { width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
      <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 18px' }}>
        Enter your music video
      </h3>

      {message && (
        <div style={{ padding: '12px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
          background: message.type === 'success' ? 'rgba(43,122,143,0.1)' : message.type === 'error' ? 'rgba(220,60,60,0.1)' : 'rgba(196,162,101,0.12)',
          border: `1px solid ${message.type === 'success' ? 'var(--accent-primary)' : message.type === 'error' ? '#dc3c3c' : 'var(--accent-gold)'}`,
          color: message.type === 'success' ? 'var(--accent-primary)' : message.type === 'error' ? '#dc3c3c' : 'var(--accent-gold)' }}>
          {message.text}
        </div>
      )}

      <div style={{ marginBottom: '14px' }}>
        <label style={lbl}>Which song is your video for?</label>
        <select style={inp} value={trackId} onChange={e => setTrackId(e.target.value)}>
          <option value="">— choose a song —</option>
          {songs.map(s => <option key={s.track_id} value={s.track_id}>{s.title}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={lbl}>Video title</label>
        <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="Your video’s title" />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={lbl}>Filmmaker name</label>
        <input style={inp} value={filmmaker} onChange={e => setFilmmaker(e.target.value)} placeholder="Who made this?" />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={lbl}>How was your video made?</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { value: '100% human', icon: '🧑', label: '100% human', tip: 'Made without generative AI.' },
            { value: 'human+ai', icon: '🧑🤖', label: 'Human + AI', tip: 'A human-authored work that used AI as a tool.' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setOrigin(opt.value)}
              title={opt.tip}
              style={{
                flex: 1, minWidth: '140px', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                border: origin === opt.value ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                background: origin === opt.value ? 'rgba(43,122,143,0.08)' : 'var(--bg-secondary)',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{opt.icon} {opt.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{opt.tip}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={lbl}>Your video file <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— MP4 or MOV, up to 2GB</span></label>
        <input type="file" accept="video/*" onChange={e => setFile(e.target.files?.[0] || null)} style={{ ...inp, padding: '10px 14px', border: '1px dashed var(--border)' }} />
        {file && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '6px' }}>✓ {file.name}</div>}
      </div>

      <button
        onClick={handleSubmit}
        disabled={uploading}
        style={{ padding: '13px 30px', borderRadius: '50px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: 600, border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1, boxShadow: '0 8px 28px rgba(43,122,143,0.35)' }}
      >
        {uploading ? 'Submitting…' : 'Submit my entry'}
      </button>
    </div>
  )
}
