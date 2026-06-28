'use client'

/**
 * StoryContest — self-contained story-contest panel (flash fiction / short
 * story / memoir). Sibling to MusicVideoContest. Embed with a contestId:
 *   <StoryContest contestId="abc-123" />
 *
 * Collapsed: an invitation. Expanded: the contest description, the ten
 * Human Echo writing prompts (optional), and a gated text-submission form
 * (title + editable body + .txt/.md/.docx import + live word count +
 * human/AI designation + a Rules & guidelines toggle with publication rights).
 *
 * Submissions → story_submissions table (contest_id, submitted_by, title,
 * body, word_count, content_origin). Gated to paid members (+ admin operator).
 *
 * The word limit comes from the contest's `word_limit` field. The contest's
 * `type` (flash_fiction / short_story / memoir) just labels it.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/useCurrentUser'

const TYPE_LABEL = {
  flash_fiction: 'Flash Fiction',
  short_story: 'Short Story',
  memoir: 'Memoir',
}

const PROMPTS = [
  ['Roots and Wings', 'A story of rootedness in family, community, or place — and the pull (or necessity) of exploration, adventure, or departure. Show how the two forces shape a human life.'],
  ['Love’s Many Rooms', 'Love in any of its flavors: romantic, familial, platonic, unrequited, enduring, or transformative. Reveal what love costs, builds, or reveals about being human.'],
  ['The Quiet Sacrifice', 'A moment of self-sacrifice — small or profound — for another person, a community, an ideal, or the greater good. Illuminate the spirit that chooses to give.'],
  ['The Maker’s Hand', 'The making of art, craft, or beauty: the act of creation, the struggle of the artist or artisan, and how art echoes or reshapes human experience.'],
  ['Earth and Sky', 'Humans in deep relationship with nature — its beauty, indifference, fury, or solace. Explore awe, stewardship, loss, or renewal in the living world.'],
  ['The Broken Thread Mended', 'A tale of fracture and repair: regret, forgiveness, redemption, or quiet reconciliation within a family, friendship, or community.'],
  ['Memory’s Kaleidoscope', 'How memory, legacy, or inherited stories shape identity. Show fragments of the past refracting into the present, forming new patterns of understanding.'],
  ['Ordinary Fire', 'Everyday heroism or moral clarity in ordinary lives — resilience, courage, integrity, or quiet defiance amid hardship, routine, or moral ambiguity.'],
  ['The Shared Table', 'Connection across difference: strangers becoming kin, community forged in crisis, or the simple, profound act of breaking bread together.'],
  ['The Slow Forging', 'A moment or season of inner transformation — coming of age, awakening, loss of innocence, or the slow forging of wisdom through lived experience.'],
]

function countWords(text) {
  const t = (text || '').trim()
  if (!t) return 0
  return t.split(/\s+/).length
}

export default function StoryContest({ contestId }) {
  const { signedIn, isMember, isAdmin } = useCurrentUser()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [contest, setContest] = useState(null)
  const [showPrompts, setShowPrompts] = useState(false)
  const [showRules, setShowRules] = useState(false)

  const load = useCallback(async () => {
    if (!contestId) { setLoading(false); return }
    setLoading(true)
    const { data: c } = await supabase.from('contests').select('*').eq('id', contestId).maybeSingle()
    setContest(c || null)
    setLoading(false)
  }, [contestId])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading contest…</div>
  if (!contest) return null

  const isOpen = contest.status === 'open'
  const typeLabel = TYPE_LABEL[contest.type] || 'Story'
  const wordLimit = contest.word_limit || null

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-secondary))', zIndex: 2 }} />

        {/* Invitation header */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', padding: 'clamp(24px, 4vw, 40px) clamp(24px, 4vw, 44px)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '10px' }}>
              {isOpen ? `Now accepting entries · ${typeLabel}` : `${typeLabel} contest`}
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
                <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '680px', marginBottom: '24px', whiteSpace: 'pre-wrap' }}>
                  {contest.description}
                </p>
              )}

              {wordLimit && (
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  <strong>Length:</strong> up to {wordLimit.toLocaleString()} words.
                </div>
              )}

              {/* Writing prompts toggle */}
              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={() => setShowPrompts(p => !p)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '50px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  ✍️ Writing prompts
                  <span style={{ fontSize: '11px', transition: 'transform 0.3s ease', transform: showPrompts ? 'rotate(180deg)' : 'none' }}>▾</span>
                </button>
                {showPrompts && (
                  <div style={{ marginTop: '14px', padding: '24px 26px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', maxWidth: '720px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 0, marginBottom: '18px', lineHeight: 1.6 }}>
                      These prompts reflect the Human Echo ethos. They’re here to spark something — using or following them isn’t required.
                    </p>
                    <div style={{ display: 'grid', gap: '14px' }}>
                      {PROMPTS.map(([title, body], i) => (
                        <div key={i}>
                          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{i + 1}. {title}</div>
                          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.55, marginTop: '2px' }}>{body}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rules & guidelines toggle */}
              <div style={{ marginBottom: '28px' }}>
                <button
                  onClick={() => setShowRules(r => !r)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '50px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  📋 Rules &amp; guidelines
                  <span style={{ fontSize: '11px', transition: 'transform 0.3s ease', transform: showRules ? 'rotate(180deg)' : 'none' }}>▾</span>
                </button>
                {showRules && <StoryRules typeLabel={typeLabel} wordLimit={wordLimit} />}
              </div>

              {/* Submission area */}
              <StorySubmission
                contest={contest}
                isOpen={isOpen}
                wordLimit={wordLimit}
                signedIn={signedIn}
                isMember={isMember}
                isAdmin={isAdmin}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Rules text (hardcoded, includes the print/ebook publication rights) ──
function StoryRules({ typeLabel, wordLimit }) {
  const sections = [
    ['Who can enter', 'The contest is open to Human Echo members. You’ll need an active membership to submit.'],
    ['Your story', `Submit one original ${typeLabel.toLowerCase()}${wordLimit ? ` of up to ${wordLimit.toLocaleString()} words` : ''}. Your work should be your own. You’re welcome to draw on one of our writing prompts, but you don’t have to.`],
    ['Previously unpublished', 'Submissions should be previously unpublished, with one exception: it’s fine if your piece has appeared on your own website, blog, or personal forum. Work published elsewhere (other outlets, anthologies, magazines) isn’t eligible.'],
    ['Honesty about how it was made', 'Every entry declares whether it was written without generative AI (🧑 100% human) or with AI as a tool (🧑🤖 Human + AI). This transparency is part of who we are — please label your work honestly.'],
    ['Judging', 'A panel of judges will read the entries and select the winners. Their decision is final. Winners are chosen for craft, originality, and how fully the story comes alive.'],
    ['Prizes & what winning means', 'The top three stories are featured on the Human Echo homepage and Story page, where anyone can read them.'],
    ['Publication — print & ebook', 'For each contest, Human Echo publishes a print and ebook anthology (available on Amazon/Kindle). The anthology features the winning stories and may also include other submitted stories. By entering, you grant Human Echo permission to publish, print, distribute, and market your submission as part of this contest anthology, in print and digital form. You keep ownership of your story; this is a publication license for the anthology.'],
    ['The rights you grant us', 'By entering, you keep full ownership of your work. You grant Human Echo permission to feature your story on the platform and to include it in the contest’s print and ebook anthology and its promotion, as described above.'],
  ]
  return (
    <div style={{ marginTop: '14px', padding: '24px 26px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', maxWidth: '720px' }}>
      {sections.map(([heading, body], i) => (
        <div key={i} style={{ marginBottom: i === sections.length - 1 ? 0 : '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{heading}</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{body}</div>
        </div>
      ))}
    </div>
  )
}

// ── The gated submission form ──
function StorySubmission({ contest, isOpen, wordLimit, signedIn, isMember, isAdmin }) {
  const { user, profile } = useCurrentUser()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [origin, setOrigin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState(null)
  const [done, setDone] = useState(false)

  const words = countWords(body)
  const overLimit = wordLimit && words > wordLimit

  const gateBox = (text, cta, href) => (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
      <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: cta ? '16px' : 0, lineHeight: 1.6 }}>{text}</div>
      {cta && <a href={href} style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '50px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}>{cta}</a>}
    </div>
  )

  if (!isOpen) return gateBox('This contest isn’t accepting entries right now. Check back soon.')
  if (!signedIn) return gateBox('Sign in to enter the contest.', 'Sign in', '/login')
  if (!isMember && !isAdmin) return gateBox('Entering the contest is a member privilege. Become a member to submit your story.', 'Become a member', '/subscribe')

  const handleImport = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setImporting(true); setMessage(null)
    try {
      const name = file.name.toLowerCase()
      if (name.endsWith('.txt') || name.endsWith('.md')) {
        const text = await file.text()
        setBody(text)
        setMessage({ type: 'info', text: 'Imported — review it below before submitting.' })
      } else if (name.endsWith('.docx')) {
        const mammoth = await import('mammoth/mammoth.browser')
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        setBody(result.value || '')
        setMessage({ type: 'info', text: 'Imported from Word — review it below before submitting.' })
      } else {
        setMessage({ type: 'error', text: 'Please use a .txt, .md, or .docx file. (For PDFs, open and paste the text.)' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not read that file. Try pasting the text instead.' })
    }
    setImporting(false)
  }

  const handleSubmit = async () => {
    if (!title.trim()) return setMessage({ type: 'error', text: 'Give your story a title.' })
    if (!body.trim()) return setMessage({ type: 'error', text: 'Your story is empty.' })
    if (!origin) return setMessage({ type: 'error', text: 'Let us know how your story was written.' })
    if (overLimit) return setMessage({ type: 'error', text: `Your story is ${words.toLocaleString()} words — the limit is ${wordLimit.toLocaleString()}.` })
    setSubmitting(true); setMessage(null)
    try {
      // Assign the next stable per-contest entry number
      const { count } = await supabase
        .from('story_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('contest_id', contest.id)
      const entryNumber = (count || 0) + 1

      const { error } = await supabase.from('story_submissions').insert({
        contest_id: contest.id,
        submitted_by: user.id,
        title: title.trim(),
        body: body,
        word_count: words,
        content_origin: origin,
        entry_number: entryNumber,
      })
      if (error) throw error
      setDone(true)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
    setSubmitting(false)
  }

  if (done) {
    return gateBox('✓ Your story is in! Thank you for sharing your work. Watch for the winners’ announcement.')
  }

  const inp = { width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
      <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 18px' }}>
        Enter your story
      </h3>

      {message && (
        <div style={{ padding: '12px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
          background: message.type === 'error' ? 'rgba(220,60,60,0.1)' : 'rgba(196,162,101,0.12)',
          border: `1px solid ${message.type === 'error' ? '#dc3c3c' : 'var(--accent-gold)'}`,
          color: message.type === 'error' ? '#dc3c3c' : 'var(--accent-gold)' }}>
          {message.text}
        </div>
      )}

      <div style={{ marginBottom: '14px' }}>
        <label style={lbl}>Story title</label>
        <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="The title of your story" />
      </div>

      <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <label style={{ ...lbl, marginBottom: 0 }}>Your story</label>
        <label style={{ fontSize: '12px', color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline' }}>
          {importing ? 'Importing…' : 'Import from a file (.txt, .md, .docx)'}
          <input type="file" accept=".txt,.md,.docx" onChange={handleImport} style={{ display: 'none' }} disabled={importing} />
        </label>
      </div>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Write or paste your story here…"
        style={{ ...inp, minHeight: '280px', resize: 'vertical', lineHeight: 1.7, fontSize: '15px', fontFamily: 'Georgia, serif' }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', marginBottom: '16px' }}>
        <span style={{ fontSize: '12px', color: overLimit ? '#dc3c3c' : 'var(--text-muted)', fontWeight: overLimit ? 600 : 400 }}>
          {words.toLocaleString()}{wordLimit ? ` / ${wordLimit.toLocaleString()}` : ''} words{overLimit ? ' — over the limit' : ''}
        </span>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={lbl}>How was your story written?</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { value: '100% human', icon: '🧑', label: '100% human', tip: 'Written without generative AI.' },
            { value: 'human+ai', icon: '🧑🤖', label: 'Human + AI', tip: 'A human-authored work that used AI as a tool.' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setOrigin(opt.value)}
              title={opt.tip}
              style={{
                flex: 1, minWidth: '160px', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
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

      <button
        onClick={handleSubmit}
        disabled={submitting || overLimit}
        style={{ padding: '13px 30px', borderRadius: '50px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: 600, border: 'none', cursor: (submitting || overLimit) ? 'not-allowed' : 'pointer', opacity: (submitting || overLimit) ? 0.6 : 1, boxShadow: '0 8px 28px rgba(43,122,143,0.35)' }}
      >
        {submitting ? 'Submitting…' : 'Submit my story'}
      </button>
    </div>
  )
}
