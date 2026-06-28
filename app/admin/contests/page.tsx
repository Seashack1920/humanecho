'use client'

/**
 * Admin · Contests   (app/admin/contests/page.tsx)
 *
 * Create and manage music-video contests:
 *  - create a contest (title, description, submission window, status)
 *  - pick its 3 songs (from the tracks table)
 *  - view submissions per song
 *  - enter placements (1–4) on submissions  ← the "judging results" entry
 *
 * Protected by app/admin/layout.tsx (no per-page guard needed).
 * Contest videos live in the `videos` table, tagged with contest_id + track_id.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const s = {
  page:      { maxWidth: '900px', margin: '0 auto', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' },
  h1:        { fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' },
  subtitle:  { fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' },
  card:      { background: 'var(--bg-secondary)', borderRadius: '16px', padding: '28px', marginBottom: '24px', border: '1px solid var(--border)' },
  label:     { display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' },
  input:     { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  select:    { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  textarea:  { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', minHeight: '70px', resize: 'vertical' },
  row:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field:     { marginBottom: '16px' },
  btn:       { padding: '12px 28px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: 500, border: 'none', cursor: 'pointer' },
  btnSm:     { padding: '7px 16px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', border: 'none', cursor: 'pointer' },
  btnEdit:   { padding: '8px 16px', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnCancel: { padding: '8px 16px', borderRadius: '6px', background: 'none', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer' },
  btnDanger: { padding: '8px 16px', borderRadius: '6px', background: 'rgba(220,60,60,0.1)', color: '#dc3c3c', fontSize: '13px', border: '1px solid rgba(220,60,60,0.3)', cursor: 'pointer' },
  sectionTitle: { fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' },
  divider:   { height: '1px', background: 'var(--border)', margin: '20px 0' },
  manageRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: '8px' },
  badge:     (color) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 500, background: color === 'green' ? 'rgba(43,180,100,0.15)' : color === 'blue' ? 'rgba(43,122,143,0.15)' : color === 'gold' ? 'rgba(196,162,101,0.18)' : 'rgba(150,150,150,0.15)', color: color === 'green' ? '#2bb464' : color === 'blue' ? 'var(--accent-primary)' : color === 'gold' ? 'var(--accent-gold)' : 'var(--text-muted)' }),
  songPanel: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '12px' },
  subRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border)', gap: '12px' },
}

const STATUS_OPTS = [
  { value: 'draft',   label: 'Draft' },
  { value: 'open',    label: 'Open for submissions' },
  { value: 'judging', label: 'Judging' },
  { value: 'closed',  label: 'Closed' },
]

const statusColor = (st) => st === 'open' ? 'green' : st === 'judging' ? 'gold' : st === 'closed' ? 'gray' : 'blue'

// ── Contest create/edit form ──
function ContestForm({ contest, tracks, onSave, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState({
    title:       contest?.title || '',
    description: contest?.description || '',
    type:        contest?.type || 'music_video',
    word_limit:  contest?.word_limit || '',
    status:      contest?.status || 'draft',
    submission_opens_at:  contest?.submission_opens_at ? contest.submission_opens_at.slice(0, 16) : '',
    submission_closes_at: contest?.submission_closes_at ? contest.submission_closes_at.slice(0, 16) : '',
    featured: contest?.featured || false,
  })
  // the 3 chosen song track_ids (ordered)
  const [songIds, setSongIds] = useState(['', '', ''])

  // Load existing song picks when editing
  useEffect(() => {
    if (!contest?.id) return
    supabase.from('contest_songs').select('track_id, position').eq('contest_id', contest.id).order('position')
      .then(({ data }) => {
        if (data && data.length) {
          const ids = ['', '', '']
          data.forEach((cs, i) => { ids[cs.position ? cs.position - 1 : i] = cs.track_id })
          setSongIds(ids)
        }
      })
  }, [contest])

  const slugify = (t) => t.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleSave = async () => {
    if (!form.title) return setMessage({ type: 'error', text: 'Title is required' })
    const isMusicVideo = form.type === 'music_video'
    const chosen = songIds.filter(Boolean)
    if (isMusicVideo && new Set(chosen).size !== chosen.length) return setMessage({ type: 'error', text: 'Each song slot must be a different track.' })
    setLoading(true); setMessage(null)
    try {
      const payload = {
        title: form.title,
        slug: slugify(form.title),
        description: form.description || null,
        type: form.type,
        word_limit: form.word_limit ? parseInt(form.word_limit) : null,
        status: form.status,
        submission_opens_at:  form.submission_opens_at  ? new Date(form.submission_opens_at).toISOString()  : null,
        submission_closes_at: form.submission_closes_at ? new Date(form.submission_closes_at).toISOString() : null,
        featured: form.featured,
      }
      let contestId = contest?.id
      if (contestId) {
        const { error } = await supabase.from('contests').update(payload).eq('id', contestId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('contests').insert(payload).select('id').single()
        if (error) throw error
        contestId = data.id
      }

      // Songs only apply to music-video contests
      if (isMusicVideo) {
        await supabase.from('contest_songs').delete().eq('contest_id', contestId)
        const rows = songIds
          .map((track_id, i) => ({ contest_id: contestId, track_id, position: i + 1 }))
          .filter((r) => r.track_id)
        if (rows.length) {
          const { error: songErr } = await supabase.from('contest_songs').insert(rows)
          if (songErr) throw songErr
        }
      }

      setMessage({ type: 'success', text: `✓ "${form.title}" saved!` })
      setLoading(false)
      setTimeout(onSave, 900)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
      setLoading(false)
    }
  }

  return (
    <div style={{ ...s.card, border: '1px solid var(--accent-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-primary)' }}>{contest?.id ? `Editing: ${contest.title}` : 'New Contest'}</div>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: message.type === 'success' ? 'rgba(43,122,143,0.1)' : 'rgba(220,60,60,0.1)', border: `1px solid ${message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c'}`, color: message.type === 'success' ? 'var(--accent-primary)' : '#dc3c3c', fontSize: '14px' }}>
          {message.text}
        </div>
      )}

      <div style={s.field}>
        <label style={s.label}>Title *</label>
        <input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Summer Music Video Contest" />
      </div>

      <div style={s.field}>
        <label style={s.label}>Description <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— shown on the contest page</span></label>
        <textarea style={s.textarea} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What the contest is about, the theme, the prizes…" />
      </div>

      <div style={s.row}>
        <div>
          <label style={s.label}>Contest type</label>
          <select style={s.select} value={form.type} onChange={e => {
            const newType = e.target.value
            const defaults = { flash_fiction: '1000', short_story: '5000', memoir: '3000' }
            setForm(f => ({
              ...f,
              type: newType,
              // auto-fill a sensible default word limit for story types (only if empty),
              // clear it for music_video
              word_limit: newType === 'music_video' ? '' : (f.word_limit || defaults[newType] || ''),
            }))
          }}>
            <option value="music_video">Music Video</option>
            <option value="flash_fiction">Flash Fiction</option>
            <option value="short_story">Short Story</option>
            <option value="memoir">Memoir</option>
          </select>
        </div>
        <div>
          <label style={s.label}>Status</label>
          <select style={s.select} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {form.type !== 'music_video' && (
        <div style={s.row}>
          <div>
            <label style={s.label}>Word limit <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— type the max words per entry</span></label>
            <input type="number" style={s.input} value={form.word_limit} onChange={e => setForm(f => ({ ...f, word_limit: e.target.value }))} placeholder="e.g. 1000" />
          </div>
          <div />
        </div>
      )}

      <div style={s.row}>
        <div>
          <label style={s.label}>Submissions open</label>
          <input type="datetime-local" style={s.input} value={form.submission_opens_at} onChange={e => setForm(f => ({ ...f, submission_opens_at: e.target.value }))} />
        </div>
        <div>
          <label style={s.label}>Submissions close</label>
          <input type="datetime-local" style={s.input} value={form.submission_closes_at} onChange={e => setForm(f => ({ ...f, submission_closes_at: e.target.value }))} />
        </div>
      </div>

      <div style={s.divider} />
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '8px' }}>
        <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
        ⭐ Feature this contest on its page
      </label>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>When on, this contest appears in its featured spot (e.g. the Cinema page). Several contests can be featured at once.</div>

      {form.type === 'music_video' && (
        <>
          <div style={s.divider} />
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>The three songs</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>Pick three songs from your tracks. Contestants choose one to make a video for.</div>

          {[0, 1, 2].map(i => (
            <div key={i} style={s.field}>
              <label style={s.label}>Song {i + 1}</label>
              <select
                style={s.select}
                value={songIds[i]}
                onChange={e => setSongIds(prev => { const next = [...prev]; next[i] = e.target.value; return next })}
              >
                <option value="">— select a track —</option>
                {tracks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
          ))}
        </>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button style={s.btn} onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : contest?.id ? 'Update Contest' : 'Create Contest'}</button>
        <button style={s.btnCancel} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Submissions + placement entry for one contest ──
function ContestSubmissions({ contest }) {
  const [songs, setSongs] = useState([])         // [{track_id, title}]
  const [videos, setVideos] = useState([])       // submissions for this contest
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [flash, setFlash] = useState(null)
  const [published, setPublished] = useState(!!contest.winners_published)
  const [publishing, setPublishing] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    // the contest's 3 songs (join to track titles)
    const { data: cs } = await supabase.from('contest_songs').select('track_id, position').eq('contest_id', contest.id).order('position')
    const trackIds = (cs || []).map(c => c.track_id)
    let titleById = {}
    if (trackIds.length) {
      const { data: tr } = await supabase.from('tracks').select('id, title').in('id', trackIds)
      titleById = Object.fromEntries((tr || []).map(t => [t.id, t.title]))
    }
    setSongs((cs || []).map(c => ({ track_id: c.track_id, title: titleById[c.track_id] || '(untitled track)' })))

    // submissions for this contest
    const { data: vids } = await supabase.from('videos')
      .select('id, title, filmmaker_name, cloudinary_url, track_id, placement, submitted_by, entry_number, created_at')
      .eq('contest_id', contest.id)
      .order('created_at', { ascending: true })
    setVideos(vids || [])
    setLoading(false)
  }, [contest.id])

  useEffect(() => { load() }, [load])

  const setPlacement = async (videoId, value) => {
    setSavingId(videoId)
    const placement = value === '' ? null : parseInt(value)
    const { error } = await supabase.from('videos').update({ placement }).eq('id', videoId)
    if (!error) {
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, placement } : v))
      setFlash('Placement saved')
      setTimeout(() => setFlash(null), 1500)
    }
    setSavingId(null)
  }

  const placedCount = videos.filter(v => v.placement).length

  const publishWinners = async () => {
    setPublishing(true)
    try {
      // 1st-place videos become their song's official music video
      const firsts = videos.filter(v => v.placement === 1 && v.cloudinary_url)
      for (const v of firsts) {
        await supabase.from('tracks').update({ music_video_url: v.cloudinary_url }).eq('id', v.track_id)
      }
      // flip the winners_published flag
      await supabase.from('contests').update({ winners_published: true }).eq('id', contest.id)
      setPublished(true)
      setConfirmPublish(false)
      setFlash('Winners published — 1st-place videos are now official music videos')
      setTimeout(() => setFlash(null), 3000)
    } catch (err) {
      setFlash('Publish failed: ' + err.message)
    }
    setPublishing(false)
  }

  const unpublishWinners = async () => {
    setPublishing(true)
    await supabase.from('contests').update({ winners_published: false }).eq('id', contest.id)
    setPublished(false)
    setFlash('Winners unpublished (official music videos left in place)')
    setTimeout(() => setFlash(null), 3000)
    setPublishing(false)
  }

  if (loading) return <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px 0' }}>Loading submissions…</div>

  return (
    <div style={{ marginTop: '16px' }}>
      {flash && (
        <div style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(43,122,143,0.1)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', fontSize: '12px', marginBottom: '10px' }}>✓ {flash}</div>
      )}
      {songs.length === 0 && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No songs picked for this contest yet — edit the contest to choose three.</div>}

      {songs.map(song => {
        const subs = videos.filter(v => v.track_id === song.track_id)
        return (
          <div key={song.track_id} style={s.songPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{song.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{subs.length} submission{subs.length !== 1 ? 's' : ''}</div>
            </div>
            {subs.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>No videos submitted for this song yet.</div>}
            {subs.map(v => (
              <div key={v.id} style={s.subRow}>
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(43,122,143,0.1)', borderRadius: '6px', padding: '2px 8px', flexShrink: 0 }}>#{v.entry_number ?? '—'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.title || '(untitled video)'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {v.filmmaker_name || 'Unknown filmmaker'}
                      {v.cloudinary_url ? '' : ' · ⚠ no video file'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {v.cloudinary_url && (
                    <a href={v.cloudinary_url} target="_blank" rel="noreferrer" style={{ ...s.btnEdit, textDecoration: 'none' }}>Watch →</a>
                  )}
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Place</label>
                  <select
                    value={v.placement ?? ''}
                    onChange={e => setPlacement(v.id, e.target.value)}
                    disabled={savingId === v.id}
                    style={{ ...s.select, width: 'auto', padding: '6px 10px' }}
                  >
                    <option value="">—</option>
                    <option value="1">1st</option>
                    <option value="2">2nd</option>
                    <option value="3">3rd</option>
                    <option value="4">4th</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {/* ── Publish winners ── */}
      {songs.length > 0 && (
        <div style={{ marginTop: '20px', padding: '18px 20px', borderRadius: '12px', border: `1px solid ${published ? 'var(--accent-gold)' : 'var(--border)'}`, background: published ? 'rgba(196,162,101,0.08)' : 'var(--bg-card)' }}>
          {published ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-gold)' }}>🏆 Winners published</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>1st-place videos are set as official music videos. Winners show on Cinema (and the homepage once built).</div>
              </div>
              <button style={{ padding: '9px 20px', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--accent-secondary)', fontSize: '13px', fontWeight: 600, border: '1px solid var(--accent-secondary)', cursor: 'pointer', flexShrink: 0 }} onClick={unpublishWinners} disabled={publishing}>Unpublish winners</button>
            </div>
          ) : confirmPublish ? (
            <div>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '10px' }}>
                Publish winners? This announces the results, shows the top-4 per song on Cinema, and sets each <strong>1st-place</strong> video as its song’s official music video.
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={s.btnSm} onClick={publishWinners} disabled={publishing}>{publishing ? 'Publishing…' : 'Yes, publish winners'}</button>
                <button style={s.btnCancel} onClick={() => setConfirmPublish(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Ready to announce?</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {placedCount === 0 ? 'Enter placements above first.' : `${placedCount} placement${placedCount !== 1 ? 's' : ''} entered.`}
                </div>
              </div>
              <button style={s.btn} onClick={() => setConfirmPublish(true)} disabled={placedCount === 0}>Publish winners</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Story judging (blind): reads story_submissions, hides author during judging,
//    expand to read full text, assign 1/2/3, publish winners. ──
function StoryJudging({ contest }) {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)      // submission id whose text is open
  const [saving, setSaving] = useState(false)
  const [published, setPublished] = useState(!!contest.winners_published)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [authors, setAuthors] = useState({})          // id -> {full_name, email, avatar_url}
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('story_submissions')
      .select('id, title, body, word_count, content_origin, placement, submitted_by, entry_number, created_at')
      .eq('contest_id', contest.id)
      .order('created_at', { ascending: true })
    const rows = data || []
    setSubs(rows)
    // Load author info upfront (name + email + photo) so admin can identify/contact writers
    const ids = [...new Set(rows.map(x => x.submitted_by).filter(Boolean))]
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids)
      setAuthors(Object.fromEntries((profs || []).map(p => [p.id, p])))
    }
    setLoading(false)
  }, [contest.id])
  useEffect(() => { load() }, [load])

  const setPlacement = async (id, placement) => {
    setSaving(true); setMsg(null)
    // clear this placement from any other entry (placements are unique 1/2/3)
    const next = subs.map(x => {
      if (x.id === id) return { ...x, placement }
      if (placement && x.placement === placement) return { ...x, placement: null }
      return x
    })
    setSubs(next)
    try {
      if (placement) {
        const conflicting = subs.find(x => x.placement === placement && x.id !== id)
        if (conflicting) await supabase.from('story_submissions').update({ placement: null }).eq('id', conflicting.id)
      }
      await supabase.from('story_submissions').update({ placement }).eq('id', id)
    } catch (e) { setMsg('Could not save placement.') }
    setSaving(false)
  }

  const placedCount = subs.filter(x => x.placement >= 1 && x.placement <= 3).length

  const publishWinners = async () => {
    setSaving(true); setMsg(null)
    try {
      const { error } = await supabase.from('contests').update({ winners_published: true }).eq('id', contest.id)
      if (error) throw error
      setPublished(true); setConfirmPublish(false)
    } catch (e) { setMsg('Could not publish.') }
    setSaving(false)
  }
  const unpublishWinners = async () => {
    setSaving(true); setMsg(null)
    try {
      const { error } = await supabase.from('contests').update({ winners_published: false }).eq('id', contest.id)
      if (error) throw error
      setPublished(false)
    } catch (e) { setMsg('Could not unpublish.') }
    setSaving(false)
  }

  const placeBadge = (p) => p === 1 ? '🥇 1st' : p === 2 ? '🥈 2nd' : p === 3 ? '🥉 3rd' : null

  return (
    <div style={{ marginTop: '16px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Story entries ({subs.length})
        </div>
      </div>

      {msg && <div style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', background: 'rgba(220,60,60,0.1)', border: '1px solid #dc3c3c', color: '#dc3c3c' }}>{msg}</div>}

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading entries…</div>}
      {!loading && subs.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No story entries yet.</div>}

      {!loading && subs.map((sub, i) => {
        const author = authors[sub.submitted_by]
        return (
          <div key={sub.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(43,122,143,0.1)', borderRadius: '6px', padding: '2px 8px', flexShrink: 0 }}>#{sub.entry_number ?? '—'}</span>
                  {sub.placement && <span style={{ fontSize: '13px', fontWeight: 700 }}>{placeBadge(sub.placement)}</span>}
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{sub.title}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>· {sub.word_count} words · {sub.content_origin === '100% human' ? '🧑' : '🧑🤖'}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {author ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {author.avatar_url && <img src={author.avatar_url} alt="" style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} />}
                      <a href={`/member/${sub.submitted_by}`} target="_blank" rel="noreferrer" style={{ fontWeight: 500, color: 'var(--accent-primary)', textDecoration: 'none' }}>{author.full_name || 'Unknown'}</a>
                      {author.email && <span>· {author.email}</span>}
                    </span>
                  ) : 'Unknown author'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                <select value={sub.placement || ''} onChange={e => setPlacement(sub.id, e.target.value ? parseInt(e.target.value) : null)} disabled={saving} style={{ ...s.select, padding: '6px 10px', fontSize: '13px', width: 'auto' }}>
                  <option value="">— place —</option>
                  <option value="1">🥇 1st</option>
                  <option value="2">🥈 2nd</option>
                  <option value="3">🥉 3rd</option>
                </select>
                <button onClick={() => setExpanded(expanded === sub.id ? null : sub.id)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>
                  {expanded === sub.id ? 'Hide' : 'Read'}
                </button>
              </div>
            </div>
            {expanded === sub.id && (
              <div style={{ marginTop: '12px', padding: '16px 18px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)', maxHeight: '420px', overflowY: 'auto', fontSize: '15px', lineHeight: 1.7, color: 'var(--text-primary)', fontFamily: 'Georgia, serif', whiteSpace: 'pre-wrap' }}>
                {sub.body}
              </div>
            )}
          </div>
        )
      })}

      {!loading && subs.length > 0 && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          {published ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', color: 'var(--accent-gold)', fontWeight: 600 }}>🏆 Winners published</span>
              <button style={{ padding: '9px 20px', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--accent-secondary)', fontSize: '13px', fontWeight: 600, border: '1px solid var(--accent-secondary)', cursor: 'pointer' }} onClick={unpublishWinners} disabled={saving}>Unpublish winners</button>
            </div>
          ) : confirmPublish ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Publish {placedCount} winner{placedCount === 1 ? '' : 's'}?</span>
              <button style={s.btn} onClick={publishWinners} disabled={saving}>Yes, publish</button>
              <button style={s.btnCancel} onClick={() => setConfirmPublish(false)}>Cancel</button>
            </div>
          ) : (
            <button style={s.btn} onClick={() => setConfirmPublish(true)} disabled={placedCount === 0}>Publish winners</button>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminContests() {
  const [contests, setContests] = useState([])
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const loadAll = useCallback(async () => {
    const [{ data: contestsData }, { data: tracksData }] = await Promise.all([
      supabase.from('contests').select('*').order('created_at', { ascending: false }),
      supabase.from('tracks').select('id, title').order('title'),
    ])
    setContests(contestsData || [])
    setTracks(tracksData || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleSaved = () => { setShowNew(false); setEditingId(null); loadAll() }

  const handleDelete = async () => {
    if (!confirmDelete) return
    await supabase.from('contests').delete().eq('id', confirmDelete.id)
    setContests(prev => prev.filter(c => c.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  if (loading) return <div style={{ ...s.page, paddingTop: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Contests</h1>
      <p style={s.subtitle}>Create music-video contests, choose songs, and enter judging results.</p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        {!showNew && <button style={s.btnSm} onClick={() => { setShowNew(true); setEditingId(null) }}>+ New Contest</button>}
      </div>

      {showNew && <ContestForm tracks={tracks} onSave={handleSaved} onCancel={() => setShowNew(false)} />}

      {confirmDelete && (
        <div style={{ background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.3)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', fontSize: '14px', color: '#dc3c3c' }}>
          <div style={{ marginBottom: '12px' }}>⚠️ Delete <strong>"{confirmDelete.title}"</strong>? Submissions stay in the database but lose their contest link. This cannot be undone.</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={s.btnDanger} onClick={handleDelete}>Yes, delete</button>
            <button style={s.btnCancel} onClick={() => setConfirmDelete(null)}>Cancel</button>
          </div>
        </div>
      )}

      {contests.length === 0 && !showNew && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏆</div>
          <div style={{ marginBottom: '16px' }}>No contests yet.</div>
          <button style={s.btn} onClick={() => setShowNew(true)}>Create your first contest</button>
        </div>
      )}

      {contests.map(contest => (
        <div key={contest.id}>
          {editingId === contest.id ? (
            <ContestForm contest={contest} tracks={tracks} onSave={handleSaved} onCancel={() => setEditingId(null)} />
          ) : (
            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={s.sectionTitle}>{contest.title}</div>
                    <span style={s.badge(statusColor(contest.status))}>{contest.status}</span>
                    {contest.type && contest.type !== 'music_video' && <span style={s.badge('blue')}>{contest.type.replace('_', ' ')}</span>}
                    {contest.featured && <span style={s.badge('gold')}>⭐ featured</span>}
                  </div>
                  {contest.description && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>{contest.description.slice(0, 160)}{contest.description.length > 160 ? '…' : ''}</div>}
                  {(contest.submission_opens_at || contest.submission_closes_at) && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      {contest.submission_opens_at ? `Opens ${new Date(contest.submission_opens_at).toLocaleDateString()}` : ''}
                      {contest.submission_closes_at ? ` · Closes ${new Date(contest.submission_closes_at).toLocaleDateString()}` : ''}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button style={s.btnEdit} onClick={() => { setEditingId(contest.id); setShowNew(false) }}>Edit</button>
                  <button style={s.btnDanger} onClick={() => setConfirmDelete({ id: contest.id, title: contest.title })}>Delete</button>
                </div>
              </div>

              <div style={{ marginTop: '14px' }}>
                <button
                  style={{ ...s.btnEdit, background: expandedId === contest.id ? 'rgba(43,122,143,0.1)' : 'var(--bg-card)', color: expandedId === contest.id ? 'var(--accent-primary)' : 'var(--text-secondary)', border: expandedId === contest.id ? '1px solid var(--accent-primary)' : '1px solid var(--border)' }}
                  onClick={() => setExpandedId(expandedId === contest.id ? null : contest.id)}
                >
                  {expandedId === contest.id ? 'Hide submissions & judging' : 'Submissions & judging'}
                </button>
              </div>

              {expandedId === contest.id && (
                contest.type && contest.type !== 'music_video'
                  ? <StoryJudging contest={contest} />
                  : <ContestSubmissions contest={contest} />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
