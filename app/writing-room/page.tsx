'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Status = { tier: string; unlimited?: boolean; used?: number; remaining?: number; limit?: number }
type Critique = { id: string; title: string; feedback: string; tone: string; genre: string; format: string; created_at: string }

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
const VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel — warm' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni — steady' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella — soft' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh — deep' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli — expressive' },
]

const INTRO = `This is your private space for critiques by Human Echo's augmented AI-powered critique engine. Only ten critiques will be stored in your Writing Room, so be sure to download those you want to save. None of your work will be ingested by our critique engine or stored in our database. Your ideas and creative products are safe here. Please note, our critique engine is not designed to write for you: it is only for feedback and to suggest next steps to improve your work. Remember, any AI is limited in how complete or accurate its responses can be.`

// ── HTML helpers (sanitize pasted content; strip links/media, keep formatting) ─
const esc = (s: string) => s.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))
const textToHtml = (t: string) => esc(t).replace(/\r\n|\r|\n/g, '<br>')

const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'SPAN'])
const DROP = new Set(['IMG', 'VIDEO', 'AUDIO', 'IFRAME', 'SCRIPT', 'STYLE', 'SVG', 'FIGURE', 'SOURCE', 'OBJECT', 'EMBED'])
function sanitizeHtml(html: string): string {
  const body = new DOMParser().parseFromString(html, 'text/html').body
  const walk = (node: Node): string => {
    let out = ''
    node.childNodes.forEach(child => {
      if (child.nodeType === 3) { out += esc(child.textContent || '') ; return }
      if (child.nodeType !== 1) return
      const el = child as HTMLElement
      const tag = el.tagName
      const inner = walk(el)
      if (DROP.has(tag)) return
      if (tag === 'A') { out += inner; return }            // unwrap links to plain text
      if (!ALLOWED.has(tag)) { out += inner; return }
      if (tag === 'BR') out += '<br>'
      else if (tag === 'B' || tag === 'STRONG') out += `<strong>${inner}</strong>`
      else if (tag === 'I' || tag === 'EM') out += `<em>${inner}</em>`
      else if (tag === 'U') out += `<u>${inner}</u>`
      else if (tag === 'LI') out += `• ${inner}<br>`
      else if (['P', 'DIV', 'H1', 'H2', 'H3'].includes(tag)) out += `${inner}<br>`
      else out += inner                                    // UL/OL/SPAN → pass through
    })
    return out
  }
  return walk(body).replace(/(<br>\s*){3,}/g, '<br><br>')
}
function htmlToPlain(html: string): string {
  if (!html) return ''
  const t = html.replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*>/gi, '\n').replace(/<[^>]+>/g, '')
  const ta = document.createElement('textarea'); ta.innerHTML = t; return ta.value
}
// Markdown (the coach's output) → HTML, for both on-screen display and PDF.
function mdToHtml(md: string): string {
  const lines = (md || '').split('\n'); let html = ''; let para: string[] = []; let inList = false
  const bold = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, (_m, x) => `<strong>${x}</strong>`)
  const flushP = () => { if (para.length) { html += `<p>${bold(para.join(' '))}</p>`; para = [] } }
  const closeList = () => { if (inList) { html += '</ul>'; inList = false } }
  for (const raw of lines) {
    const l = raw.trim()
    if (l.startsWith('## ')) { flushP(); closeList(); html += `<h3>${esc(l.slice(3))}</h3>` }
    else if (l.startsWith('### ')) { flushP(); closeList(); html += `<h4>${esc(l.slice(4))}</h4>` }
    else if (l.startsWith('- ') || l.startsWith('* ')) { flushP(); if (!inList) { html += '<ul>'; inList = true } html += `<li>${bold(l.slice(2))}</li>` }
    else if (!l) { flushP(); closeList() }
    else para.push(raw)
  }
  flushP(); closeList(); return html
}
// Open a print window → user "Save as PDF".
function printDoc(title: string, bodyHtml: string) {
  const w = window.open('', '_blank', 'width=820,height=920')
  if (!w) { alert('Please allow pop-ups to download.'); return }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font-family:Georgia,'Times New Roman',serif;max-width:640px;margin:44px auto;padding:0 24px;color:#1a1a1a;line-height:1.7}
    h1{font-size:26px;margin:0 0 4px} h3{font-size:18px;margin:22px 0 8px} h4{font-size:15px;margin:16px 0 6px}
    .meta{color:#888;font-size:12px;margin-bottom:26px} p{margin:0 0 12px} ul{margin:0 0 12px 18px} li{margin:0 0 6px}
  </style></head><body>${bodyHtml}</body></html>`)
  w.document.close(); w.focus()
  setTimeout(() => { try { w.print() } catch {} }, 350)
}

const K = (uid: string, name: string) => `hewr:${name}:${uid}`

// ── Rich-text editor (contentEditable): toolbar + formatting-preserving paste ──
function RichText({ initialHtml, onChange, placeholder, minHeight, mono }: {
  initialHtml: string
  onChange: (html: string, text: string) => void
  placeholder?: string
  minHeight: number
  mono?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [empty, setEmpty] = useState(!htmlToPlain(initialHtml).trim())

  useEffect(() => {
    if (ref.current) { ref.current.innerHTML = initialHtml || ''; setEmpty(!ref.current.innerText.trim()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emit = () => {
    const el = ref.current; if (!el) return
    setEmpty(!el.innerText.trim())
    onChange(el.innerHTML, el.innerText)
  }
  const cmd = (c: string) => { document.execCommand(c); ref.current?.focus(); emit() }
  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const html = e.clipboardData.getData('text/html')
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertHTML', false, html ? sanitizeHtml(html) : textToHtml(text))
    emit()
  }
  const pd = (e: React.MouseEvent) => e.preventDefault() // keep selection when clicking toolbar

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: '4px', padding: '6px 8px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <button onMouseDown={pd} onClick={() => cmd('bold')} style={tbtn} title="Bold"><b>B</b></button>
        <button onMouseDown={pd} onClick={() => cmd('italic')} style={tbtn} title="Italic"><i>I</i></button>
        <button onMouseDown={pd} onClick={() => cmd('underline')} style={tbtn} title="Underline"><u>U</u></button>
        <button onMouseDown={pd} onClick={() => cmd('insertUnorderedList')} style={tbtn} title="Bullet list">• List</button>
      </div>
      <div style={{ position: 'relative' }}>
        <div ref={ref} contentEditable suppressContentEditableWarning onInput={emit} onPaste={onPaste}
          style={{ minHeight: `${minHeight}px`, padding: '12px 14px', outline: 'none', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-primary)', fontSize: '15px', fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit' }} />
        {empty && placeholder && (
          <div style={{ position: 'absolute', top: '12px', left: '14px', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: '15px' }}>{placeholder}</div>
        )}
      </div>
    </div>
  )
}

function Feedback({ text }: { text: string }) {
  return <div style={{ color: 'var(--text-secondary)' }} dangerouslySetInnerHTML={{ __html: mdToHtml(text) }} />
}

export default function WritingRoomPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [signedOut, setSignedOut] = useState(false)
  const [membersOnly, setMembersOnly] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)
  const [uid, setUid] = useState('')
  const [ready, setReady] = useState(false)

  const [notepadHtml, setNotepadHtml] = useState('')
  const [inputHtml, setInputHtml] = useState('')
  const [inputText, setInputText] = useState('')
  const [format, setFormat] = useState('prose')
  const [critiques, setCritiques] = useState<Critique[]>([])
  const [notepadKey, setNotepadKey] = useState(0) // bump to force-remount the editor on clear
  const [inputKey, setInputKey] = useState(0)
  const [voiceId, setVoiceId] = useState(VOICES[0].id)
  const [reading, setReading] = useState(false)
  const [readErr, setReadErr] = useState<string | null>(null)
  const [audioReady, setAudioReady] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const [title, setTitle] = useState('')
  const [tone, setTone] = useState('balanced')
  const [genre, setGenre] = useState('')
  const [critiquing, setCritiquing] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [gate, setGate] = useState<null | 'upgrade' | 'over'>(null)

  const refreshStatus = useCallback(async () => {
    const { data } = await supabase.rpc('critique_status'); if (data) setStatus(data as Status)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSignedOut(true); setLoading(false); return }
      const { data: st } = await supabase.rpc('critique_status')
      const s = st as Status; setStatus(s)
      if (!s || s.tier === 'none') { setMembersOnly(true); setLoading(false); return }
      supabase.from('profiles').update({ writing_room_enabled: true }).eq('id', user.id).then(() => {})
      // Everything below lives ONLY in this browser (localStorage) — never our DB.
      setUid(user.id)
      setNotepadHtml(localStorage.getItem(K(user.id, 'notepad')) || '')
      const ih = localStorage.getItem(K(user.id, 'input')) || ''
      setInputHtml(ih); setInputText(htmlToPlain(ih))
      setFormat(localStorage.getItem(K(user.id, 'format')) || 'prose')
      try { setCritiques(JSON.parse(localStorage.getItem(K(user.id, 'critiques')) || '[]')) } catch {}
      setReady(true); setLoading(false)
    }
    load()
  }, [])

  const saveNotepad = (html: string) => { setNotepadHtml(html); localStorage.setItem(K(uid, 'notepad'), html) }
  const saveInput = (html: string, text: string) => { setInputHtml(html); setInputText(text); localStorage.setItem(K(uid, 'input'), html) }
  const saveFormat = (f: string) => { setFormat(f); localStorage.setItem(K(uid, 'format'), f) }
  const saveCritiques = (list: Critique[]) => { setCritiques(list); localStorage.setItem(K(uid, 'critiques'), JSON.stringify(list)) }
  const clearNotepad = () => { if (confirm('Clear the notepad? This can’t be undone — download it first if you want to keep it.')) { saveNotepad(''); setNotepadKey(k => k + 1) } }
  const clearInput = () => { if (confirm('Clear the Critique Input? This can’t be undone.')) { saveInput('', ''); setInputKey(k => k + 1) } }

  const readNotepad = async () => {
    const text = htmlToPlain(notepadHtml)
    if (!text.trim()) { setReadErr('Write some notes first.'); return }
    setReading(true); setReadErr(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/writing-room/read', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ text, voice_id: voiceId }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setReadErr(d.error || 'Reader failed.'); return }
      const url = URL.createObjectURL(await res.blob())
      setAudioReady(true)
      if (audioRef.current) { audioRef.current.src = url; audioRef.current.play().catch(() => {}) }
    } catch (e) { setReadErr((e as Error).message) } finally { setReading(false) }
  }

  const runCritique = async () => {
    if (!inputText.trim()) { setErr('Add some writing to the Critique Input first.'); setGate(null); return }
    setCritiquing(true); setErr(null); setGate(null); setCurrentId(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSignedOut(true); setCritiquing(false); return }
    try {
      const res = await fetch('/api/writing-room/critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ text: inputText, tone, genre, docType: format }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.upgrade) setGate('upgrade'); else if (data.overLimit) setGate('over')
        setErr(data.error || 'Could not generate a critique.')
      } else {
        const entry: Critique = {
          id: crypto.randomUUID(), title: title.trim() || 'Untitled critique',
          feedback: data.feedback, tone, genre, format, created_at: new Date().toISOString(),
        }
        saveCritiques([entry, ...critiques].slice(0, 10))
        setCurrentId(entry.id); setTitle('')
      }
      refreshStatus()
    } catch (e) { setErr((e as Error).message) } finally { setCritiquing(false) }
  }

  const downloadCritique = (c: Critique) => {
    const when = new Date(c.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    printDoc(c.title, `<h1>${esc(c.title)}</h1><div class="meta">Human Echo Writing Coach · ${when} · ${esc(c.tone)}${c.genre ? ' · ' + esc(c.genre) : ''}</div>${mdToHtml(c.feedback)}`)
  }
  const downloadNotepad = () => printDoc('Notepad', `<h1>Notepad</h1><div class="meta">Human Echo Writing Room</div>${notepadHtml || '<p><em>(empty)</em></p>'}`)
  const deleteCritique = (id: string) => { if (confirm('Delete this critique? Download it first if you want to keep it.')) { const next = critiques.filter(c => c.id !== id); saveCritiques(next); if (currentId === id) setCurrentId(null) } }

  if (loading) return <Shell><p style={muted}>Loading your Writing Room…</p></Shell>
  if (signedOut) return <Shell><Center icon="🔒" text="Sign in to open your Writing Room."><button style={btn} onClick={() => router.push('/login?redirect=/writing-room')}>Sign in</button></Center></Shell>
  if (membersOnly) return <Shell><Center icon="✍️" text="The Writing Room & Writing Coach are a members feature."><button style={btn} onClick={() => router.push('/subscribe')}>Become a member</button></Center></Shell>

  const current = critiques.find(c => c.id === currentId) || null
  const remainingLabel = status?.unlimited ? 'Unlimited critiques' : `${status?.remaining ?? 0} of ${status?.limit ?? 5} free critiques left this month`
  const readerAllowed = status?.tier === 'creator_plus' || status?.tier === 'revisionist'

  return (
    <Shell>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>The Writing Room</h1>

      {/* Intro / disclaimer */}
      <div style={{ padding: '16px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7, marginBottom: '28px' }}>
        {INTRO}
      </div>

      {!ready ? <p style={muted}>Preparing…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>

          {/* Notepad */}
          <section>
            <h2 style={secTitle}>Notepad</h2>
            <p style={secDesc}>For new notes: thoughts, ideas, inspirations. (Not for the Writing Coach.)</p>
            <RichText key={notepadKey} initialHtml={notepadHtml} onChange={(h) => saveNotepad(h)} minHeight={140}
              placeholder="Jot down anything — this stays in your browser and is never sent to the coach." />
            {notepadHtml && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '18px' }}>
                <button onClick={downloadNotepad} style={linkBtn}>⬇ Download notepad (PDF)</button>
                <button onClick={clearNotepad} style={{ ...linkBtn, color: '#dc3c3c' }}>Clear notepad</button>
              </div>
            )}
            {/* Reader — Creator+ / Revisionist */}
            {readerAllowed ? (
              <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>🔊 Reader</span>
                  <select value={voiceId} onChange={e => setVoiceId(e.target.value)} style={{ ...input, width: 'auto', marginBottom: 0 }}>
                    {VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <button onClick={readNotepad} disabled={reading} style={{ ...btn, padding: '8px 16px' }}>{reading ? 'Generating…' : '▶ Read aloud'}</button>
                </div>
                <audio ref={audioRef} controls style={{ width: '100%', marginTop: '10px', display: audioReady ? 'block' : 'none' }} />
                {readErr && <div style={{ color: '#dc3c3c', fontSize: '13px', marginTop: '8px' }}>{readErr}</div>}
              </div>
            ) : (
              <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
                🔒 The Notepad Reader (voice narration) is a <a href="/subscribe" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Creator+</a> feature.
              </div>
            )}
          </section>

          {/* Critique Input */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={secTitle}>Critique Input</h2>
              <select value={format} onChange={e => saveFormat(e.target.value)} style={{ ...input, width: 'auto', marginBottom: 0 }}>
                {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <p style={secDesc}>Write or paste the piece you want critiqued. Pasted line breaks and formatting are preserved.</p>
            <RichText key={inputKey} initialHtml={inputHtml} onChange={saveInput} minHeight={280} mono={format !== 'prose'}
              placeholder="Write or paste your work here…" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ ...muted, fontSize: '12px' }}>{inputText.split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
              {inputText.trim() && <button onClick={clearInput} style={{ ...linkBtn, color: '#dc3c3c', fontSize: '12px' }}>Clear</button>}
            </div>
          </section>

          {/* Writing Coach */}
          <section style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <h2 style={{ ...secTitle, margin: 0 }}>Writing Coach</h2>
              <span style={{ ...muted, fontSize: '13px' }}>{remainingLabel}</span>
            </div>
            <p style={{ ...secDesc, marginTop: '4px' }}>Honest developmental feedback — the coach analyzes and guides, and never rewrites your work.</p>

            <label style={lbl}>Critique title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 1 — draft 2" style={input} />

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', margin: '10px 0 16px' }}>
              <div>
                <label style={lbl}>Tone</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {TONES.map(t => <button key={t.value} onClick={() => setTone(t.value)} style={{ ...chip, ...(tone === t.value ? chipActive : {}) }}>{t.label}</button>)}
                </div>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={lbl}>Genre / focus (optional)</label>
                <input value={genre} onChange={e => setGenre(e.target.value)} placeholder="e.g. literary fiction, folk ballad, thriller" style={input} />
              </div>
            </div>

            <button onClick={runCritique} disabled={critiquing} style={{ ...btn, opacity: critiquing ? 0.6 : 1 }}>
              {critiquing ? 'Reading your work…' : 'Get critique'}
            </button>

            {err && (
              <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>{err}</p>
                {gate === 'upgrade' && <button onClick={() => router.push('/subscribe')} style={{ ...btn, marginTop: '12px' }}>Upgrade to Creator+ — unlimited critiques</button>}
              </div>
            )}

            {current && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{current.title}</h3>
                  <button onClick={() => downloadCritique(current)} style={{ ...btn, padding: '8px 16px', fontSize: '13px' }}>⬇ Download PDF</button>
                </div>
                <Feedback text={current.feedback} />
              </div>
            )}
          </section>

          {/* Saved critiques */}
          <section>
            <h2 style={secTitle}>Your Critiques <span style={{ ...muted, fontSize: '13px', fontWeight: 400 }}>({critiques.length}/10 saved)</span></h2>
            {critiques.length === 0 ? (
              <p style={{ ...muted, fontSize: '14px' }}>Critiques you run will be saved here (up to 10). Download any you want to keep permanently.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {critiques.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: `1px solid ${currentId === c.id ? 'var(--accent-primary)' : 'var(--border)'}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                      <div style={{ ...muted, fontSize: '12px' }}>{new Date(c.created_at).toLocaleDateString()} · {c.tone}{c.genre ? ' · ' + c.genre : ''}</div>
                    </div>
                    <button onClick={() => { setCurrentId(c.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={smallBtn}>View</button>
                    <button onClick={() => downloadCritique(c)} style={smallBtn}>⬇ PDF</button>
                    <button onClick={() => deleteCritique(c.id)} style={{ ...smallBtn, color: '#dc3c3c', borderColor: '#dc3c3c' }}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
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
const secTitle: React.CSSProperties = { fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }
const secDesc: React.CSSProperties = { color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 10px', lineHeight: 1.5 }
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', marginBottom: '4px', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }
const btn: React.CSSProperties = { padding: '11px 22px', borderRadius: '999px', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }
const smallBtn: React.CSSProperties = { padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--accent-primary)', padding: 0 }
const tbtn: React.CSSProperties = { minWidth: '30px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }
const chip: React.CSSProperties = { padding: '7px 14px', borderRadius: '999px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }
const chipActive: React.CSSProperties = { background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-primary) 40%, transparent)', color: 'var(--accent-primary)' }
