'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Doc = { id: string; title: string; content: string; format: string; word_count: number; updated_at: string }
type Status = { tier: string; unlimited?: boolean; used?: number; remaining?: number; limit?: number }

const FORMATS = [
  { value: 'prose', label: 'Prose / Story' },
  { value: 'lyrics', label: 'Song Lyrics' },
  { value: 'screenplay', label: 'Screenplay' },
  { value: 'stage_play', label: 'Stage Play' },
]
const TONES = [
  { value: 'kind', label: 'Be kind' },
  { value: 'balanced', label: 'Be balanced' },
  { value: 'brutal', label: 'Be brutal' },
]

const wc = (s: string) => (s || '').split(/\s+/).filter(Boolean).length

// Minimal Markdown renderer (headings / bullets / paragraphs) — no dependency.
function Feedback({ text }: { text: string }) {
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  let para: string[] = []
  const flush = (k: number) => {
    if (para.length) { out.push(<p key={`p${k}`} style={{ margin: '0 0 12px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{para.join(' ')}</p>); para = [] }
  }
  lines.forEach((raw, i) => {
    const l = raw.trim()
    if (l.startsWith('## ')) { flush(i); out.push(<h3 key={i} style={{ fontFamily: 'Playfair Display, serif', fontSize: '19px', fontWeight: 700, color: 'var(--text-primary)', margin: '22px 0 10px' }}>{l.slice(3)}</h3>) }
    else if (l.startsWith('### ')) { flush(i); out.push(<h4 key={i} style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '16px 0 8px' }}>{l.slice(4)}</h4>) }
    else if (l.startsWith('- ') || l.startsWith('* ')) { flush(i); out.push(<li key={i} style={{ margin: '0 0 6px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{l.slice(2)}</li>) }
    else if (!l) flush(i)
    else para.push(raw.replace(/\*\*(.+?)\*\*/g, '$1'))
  })
  flush(9999)
  return <div>{out}</div>
}

export default function WritingRoomPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [signedOut, setSignedOut] = useState(false)
  const [membersOnly, setMembersOnly] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)

  const [docs, setDocs] = useState<Doc[]>([])
  const [active, setActive] = useState<Doc | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [format, setFormat] = useState('prose')
  const [savedAt, setSavedAt] = useState<string>('')

  const [tone, setTone] = useState('balanced')
  const [genre, setGenre] = useState('')
  const [critiquing, setCritiquing] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [gate, setGate] = useState<null | 'upgrade' | 'over'>(null)

  const saveTimer = useRef<any>(null)

  const refreshStatus = useCallback(async () => {
    const { data } = await supabase.rpc('critique_status')
    if (data) setStatus(data as Status)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSignedOut(true); setLoading(false); return }
      const { data: st } = await supabase.rpc('critique_status')
      const s = st as Status
      setStatus(s)
      if (!s || s.tier === 'none') { setMembersOnly(true); setLoading(false); return }
      // Mark the Writing Room as added to their Studio.
      supabase.from('profiles').update({ writing_room_enabled: true }).eq('id', user.id).then(() => {})
      const { data: rows } = await supabase
        .from('notepad_documents').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
      const list = (rows as Doc[]) || []
      setDocs(list)
      if (list.length) openDoc(list[0])
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openDoc = (d: Doc) => {
    setActive(d); setTitle(d.title); setContent(d.content); setFormat(d.format)
    setFeedback(''); setErr(null); setGate(null); setSavedAt('')
  }

  const persist = useCallback(async (patch: Partial<Doc>) => {
    if (!active) return
    const body = { ...patch, word_count: wc(patch.content ?? content), updated_at: new Date().toISOString() }
    const { data } = await supabase.from('notepad_documents').update(body).eq('id', active.id).select().maybeSingle()
    if (data) {
      setDocs(prev => prev.map(d => d.id === active.id ? (data as Doc) : d).sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
      setSavedAt('Saved')
    }
  }, [active, content])

  // Debounced autosave on edits.
  useEffect(() => {
    if (!active) return
    setSavedAt('Saving…')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persist({ title, content, format }), 1200)
    return () => clearTimeout(saveTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, format])

  const newDoc = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('notepad_documents')
      .insert({ user_id: user.id, title: 'Untitled', content: '', format: 'prose' }).select().maybeSingle()
    if (data) { setDocs(prev => [data as Doc, ...prev]); openDoc(data as Doc) }
  }

  const delDoc = async (d: Doc) => {
    if (!confirm(`Delete "${d.title}"?`)) return
    await supabase.from('notepad_documents').delete().eq('id', d.id)
    const rest = docs.filter(x => x.id !== d.id)
    setDocs(rest)
    if (active?.id === d.id) { rest.length ? openDoc(rest[0]) : setActive(null) }
  }

  const getCritique = async () => {
    if (!active) return
    setCritiquing(true); setErr(null); setGate(null); setFeedback('')
    await persist({ title, content, format }) // ensure latest saved
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSignedOut(true); setCritiquing(false); return }
    try {
      const res = await fetch('/api/writing-room/critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ documentId: active.id, tone, genre, docType: format }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.upgrade) setGate('upgrade')
        else if (data.overLimit) setGate('over')
        setErr(data.error || 'Could not generate a critique.')
      } else {
        setFeedback(data.feedback)
      }
      refreshStatus()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setCritiquing(false)
    }
  }

  // ── Gate screens ──
  if (loading) return <Shell><p style={muted}>Loading your Writing Room…</p></Shell>
  if (signedOut) return <Shell><Center icon="🔒" text="Sign in to open your Writing Room."><button style={btn} onClick={() => router.push('/login?redirect=/writing-room')}>Sign in</button></Center></Shell>
  if (membersOnly) return (
    <Shell><Center icon="✍️" text="The Writing Room & Writing Coach are a members feature.">
      <button style={btn} onClick={() => router.push('/subscribe')}>Become a member</button>
    </Center></Shell>
  )

  const remainingLabel = status?.unlimited
    ? 'Unlimited critiques'
    : `${status?.remaining ?? 0} of ${status?.limit ?? 5} free critiques left this month`

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>The Writing Room</h1>
        <span style={{ ...muted, fontSize: '13px' }}>{remainingLabel}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '20px' }}>
        {/* Documents */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {docs.map(d => (
            <button key={d.id} onClick={() => openDoc(d)}
              style={{ ...chip, ...(active?.id === d.id ? chipActive : {}) }}>
              {d.title || 'Untitled'}
            </button>
          ))}
          <button onClick={newDoc} style={{ ...chip, borderStyle: 'dashed' }}>+ New</button>
        </div>

        {active ? (
          <>
            {/* Notepad editor */}
            <div style={panel}>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title"
                style={{ ...input, fontSize: '18px', fontWeight: 700, border: 'none', padding: '4px 0', marginBottom: '8px', background: 'transparent' }} />
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                <select value={format} onChange={e => setFormat(e.target.value)} style={{ ...input, width: 'auto', marginBottom: 0 }}>
                  {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <span style={{ ...muted, fontSize: '12px' }}>{wc(content).toLocaleString()} words · {savedAt}</span>
                <button onClick={() => delDoc(active)} style={{ ...linkBtn, marginLeft: 'auto', color: '#dc3c3c' }}>Delete</button>
              </div>
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="Write or paste your work here…"
                style={{ ...input, minHeight: '340px', resize: 'vertical', lineHeight: 1.7, fontFamily: format === 'prose' ? 'inherit' : 'ui-monospace, monospace' }} />
            </div>

            {/* Writing Coach */}
            <div style={panel}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>Writing Coach</h2>
              <p style={{ ...muted, fontSize: '13px', margin: '0 0 16px' }}>Honest developmental feedback — your coach analyzes and guides, and never rewrites your work.</p>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
                <div>
                  <label style={lbl}>Tone</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {TONES.map(t => (
                      <button key={t.value} onClick={() => setTone(t.value)}
                        style={{ ...chip, ...(tone === t.value ? chipActive : {}) }}>{t.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={lbl}>Genre / focus (optional)</label>
                  <input value={genre} onChange={e => setGenre(e.target.value)} placeholder="e.g. literary fiction, folk ballad, thriller" style={input} />
                </div>
              </div>

              <button onClick={getCritique} disabled={critiquing} style={{ ...btn, opacity: critiquing ? 0.6 : 1 }}>
                {critiquing ? 'Reading your work…' : 'Get critique'}
              </button>

              {err && (
                <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>{err}</p>
                  {gate === 'upgrade' && (
                    <button onClick={() => router.push('/subscribe')} style={{ ...btn, marginTop: '12px' }}>Upgrade to Creator+ — unlimited critiques</button>
                  )}
                </div>
              )}

              {feedback && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                  <Feedback text={feedback} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={panel}><Center icon="📝" text="Create your first document to start writing."><button style={btn} onClick={newDoc}>New document</button></Center></div>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '40px 20px 120px' }}>{children}</div>
    </div>
  )
}
function Center({ icon, text, children }: { icon: string; text: string; children?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 0' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{icon}</div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{text}</p>
      {children}
    </div>
  )
}

const muted: React.CSSProperties = { color: 'var(--text-muted)' }
const panel: React.CSSProperties = { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px' }
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', marginBottom: '4px', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }
const btn: React.CSSProperties = { padding: '11px 22px', borderRadius: '999px', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: 0 }
const chip: React.CSSProperties = { padding: '7px 14px', borderRadius: '999px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }
const chipActive: React.CSSProperties = { background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-primary) 40%, transparent)', color: 'var(--accent-primary)' }
