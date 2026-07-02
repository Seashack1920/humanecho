'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/useCurrentUser'

type Contest = { id: string; title: string; type: string; status: string }
type Judgment = {
  id: string; submission_id: string; scores: Record<string, number>; overall: number
  recommendation: string; strengths: string[]; weaknesses: string[]; flags: string[]; rationale: string; created_at: string
}
type Sub = { id: string; title: string; body: string; word_count: number; submitted_by: string; status: string; created_at: string; entry_number: number }

const CRIT_LABELS: Record<string, string> = {
  originality: 'Originality', craft_quality: 'Craft', thematic_depth: 'Theme',
  moral_clarity: 'Moral clarity', authenticity: 'Authenticity', emotional_resonance: 'Resonance',
}
const REC_COLOR: Record<string, string> = {
  'Strong Accept': '#2e9e5b', 'Accept': '#2e9e5b', 'Hold for Review': '#c08a2d', 'Reject': '#dc3c3c',
}
const STATUS_LABEL: Record<string, { t: string; c: string }> = {
  pending:      { t: 'Not judged', c: 'var(--text-muted)' },
  ai_filtered:  { t: 'AI: filtered out', c: 'var(--text-muted)' },
  human_review: { t: 'Needs human review', c: 'var(--accent-primary)' },
  accepted:     { t: '✓ Accepted', c: '#2e9e5b' },
  rejected:     { t: 'Rejected', c: '#dc3c3c' },
}

export default function StoryJudgingPage() {
  const { loading: authLoading, isAdmin } = useCurrentUser()
  const [contests, setContests] = useState<Contest[]>([])
  const [contestId, setContestId] = useState('')
  const [subs, setSubs] = useState<Sub[]>([])
  const [authors, setAuthors] = useState<Record<string, string>>({})
  const [judgments, setJudgments] = useState<Record<string, Judgment>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)   // submissionId currently judging
  const [batch, setBatch] = useState<string | null>(null) // batch progress text
  const [open, setOpen] = useState<string | null>(null)   // expanded submission
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    supabase.from('contests').select('id, title, type, status').neq('type', 'music_video').order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data as Contest[]) || []
        setContests(list)
        if (list.length && !contestId) setContestId(list[0].id)
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const loadSubs = useCallback(async (cid: string) => {
    if (!cid) return
    const { data: rows } = await supabase.from('story_submissions')
      .select('id, title, body, word_count, submitted_by, status, created_at, entry_number')
      .eq('contest_id', cid).order('created_at', { ascending: true })
    const list = (rows as Sub[]) || []
    setSubs(list)
    const ids = list.map(s => s.id)
    const authorIds = [...new Set(list.map(s => s.submitted_by).filter(Boolean))]
    if (authorIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', authorIds)
      setAuthors(Object.fromEntries((profs || []).map((p: any) => [p.id, p.full_name || '—'])))
    }
    if (ids.length) {
      const { data: js } = await supabase.from('submission_judgments').select('*').in('submission_id', ids).order('created_at', { ascending: false })
      const latest: Record<string, Judgment> = {}
      for (const j of (js as Judgment[]) || []) if (!latest[j.submission_id]) latest[j.submission_id] = j
      setJudgments(latest)
    } else setJudgments({})
  }, [])

  useEffect(() => { if (contestId) loadSubs(contestId) }, [contestId, loadSubs])

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token

  const judge = async (id: string) => {
    setBusy(id); setErr(null)
    try {
      const res = await fetch('/api/admin/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ submissionId: id }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Judging failed.'); return }
      setJudgments(prev => ({ ...prev, [id]: data.judgment }))
      setSubs(prev => prev.map(s => s.id === id ? { ...s, status: data.status } : s))
      setOpen(id)
    } catch (e) { setErr((e as Error).message) } finally { setBusy(null) }
  }

  const judgeAllPending = async () => {
    const pending = subs.filter(s => s.status === 'pending')
    for (let i = 0; i < pending.length; i++) {
      setBatch(`Judging ${i + 1} of ${pending.length}…`)
      // eslint-disable-next-line no-await-in-loop
      await judge(pending[i].id)
    }
    setBatch(null)
  }

  const decide = async (id: string, decision: 'accepted' | 'rejected') => {
    setBusy(id)
    try {
      const res = await fetch('/api/admin/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ submissionId: id, action: 'decision', decision }),
      })
      if (res.ok) setSubs(prev => prev.map(s => s.id === id ? { ...s, status: decision } : s))
    } finally { setBusy(null) }
  }

  if (authLoading) return <Shell><p style={muted}>Loading…</p></Shell>
  if (!isAdmin) return <Shell><p style={muted}>Admins only.</p></Shell>

  const pendingCount = subs.filter(s => s.status === 'pending').length

  return (
    <Shell>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>Story Judging</h1>
      <p style={{ ...muted, fontSize: '14px', marginBottom: '20px' }}>
        AI first-pass triage for story contests. <strong>The AI never accepts or rejects</strong> — it scores and flags to help you focus. Every final call is yours.
      </p>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
        <select value={contestId} onChange={e => setContestId(e.target.value)} style={{ ...input, width: 'auto', marginBottom: 0 }}>
          {contests.map(c => <option key={c.id} value={c.id}>{c.title} ({c.type})</option>)}
        </select>
        {pendingCount > 0 && (
          <button onClick={judgeAllPending} disabled={!!batch} style={btn}>
            {batch || `Run AI first-pass on all ${pendingCount} pending`}
          </button>
        )}
      </div>

      {err && <div style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #dc3c3c', color: '#dc3c3c', fontSize: '14px', marginBottom: '16px' }}>{err}</div>}

      {loading ? <p style={muted}>Loading…</p> : subs.length === 0 ? (
        <p style={muted}>No submissions for this contest yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {subs.map(s => {
            const j = judgments[s.id]
            const st = STATUS_LABEL[s.status] || STATUS_LABEL.pending
            const expanded = open === s.id
            return (
              <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: '14px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.title || 'Untitled'} <span style={{ ...muted, fontWeight: 400, fontSize: '13px' }}>· {authors[s.submitted_by] || '—'} · {s.word_count || 0} words</span></div>
                    <div style={{ fontSize: '12px', color: st.c, fontWeight: 600, marginTop: '2px' }}>{st.t}{j && s.status !== 'accepted' && s.status !== 'rejected' ? ' — AI First-Pass, human review required' : ''}</div>
                  </div>
                  {j && <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{Number(j.overall).toFixed(1)}</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: REC_COLOR[j.recommendation] || 'var(--text-muted)' }}>{j.recommendation}</div>
                  </div>}
                  {j
                    ? <button onClick={() => setOpen(expanded ? null : s.id)} style={smallBtn}>{expanded ? 'Hide' : 'View'}</button>
                    : <button onClick={() => judge(s.id)} disabled={busy === s.id} style={btn}>{busy === s.id ? 'Reading…' : 'AI first-pass'}</button>}
                </div>

                {j && expanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: '8px', margin: '14px 0' }}>
                      {Object.entries(j.scores || {}).map(([k, v]) => (
                        <div key={k} style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', background: 'var(--bg-primary)' }}>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{v}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{CRIT_LABELS[k] || k}</div>
                        </div>
                      ))}
                    </div>
                    {j.rationale && <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 12px' }}>{j.rationale}</p>}
                    <ListBlock label="Strengths" items={j.strengths} color="#2e9e5b" />
                    <ListBlock label="Weaknesses" items={j.weaknesses} color="#c08a2d" />
                    <ListBlock label="Flags" items={j.flags} color="#dc3c3c" />

                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ ...muted, fontSize: '12px' }}>Your decision:</span>
                      <button onClick={() => decide(s.id, 'accepted')} disabled={busy === s.id} style={{ ...smallBtn, borderColor: '#2e9e5b', color: '#2e9e5b' }}>Accept</button>
                      <button onClick={() => decide(s.id, 'rejected')} disabled={busy === s.id} style={{ ...smallBtn, borderColor: '#dc3c3c', color: '#dc3c3c' }}>Reject</button>
                      <button onClick={() => judge(s.id)} disabled={busy === s.id} style={smallBtn}>Re-judge</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Shell>
  )
}

function ListBlock({ label, items, color }: { label: string; items?: string[]; color: string }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color, marginBottom: '4px' }}>{label}</div>
      <ul style={{ margin: 0, paddingLeft: '18px' }}>
        {items.map((it, i) => <li key={i} style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '3px' }}>{it}</li>)}
      </ul>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '40px 20px 120px' }}>{children}</div>
    </div>
  )
}

const muted: React.CSSProperties = { color: 'var(--text-muted)' }
const input: React.CSSProperties = { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' }
const btn: React.CSSProperties = { padding: '9px 18px', borderRadius: '999px', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }
const smallBtn: React.CSSProperties = { padding: '7px 14px', borderRadius: '999px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }
