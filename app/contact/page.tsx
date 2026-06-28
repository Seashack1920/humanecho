'use client'

import { useState } from 'react'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async () => {
    if (!name || !email || !message) {
      setStatus('error')
      setErrorMsg('Please fill in all fields.')
      return
    }
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || 'Something went wrong.')
        return
      }
      setStatus('sent')
      setName(''); setEmail(''); setMessage('')
    } catch {
      setStatus('error')
      setErrorMsg('Could not reach the server. Please try again.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 40px)' }}>

        {/* ── Declaration of purpose ── */}
        <div style={{ marginBottom: '56px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '16px' }}>
            How we roll
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 24px' }}>
            A little home for human creativity.
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2.2vw, 19px)', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
            Human Echo explores artistic opportunity in the age of AI while preserving and
            celebrating human artistic expression — whether or not the artist uses AI as a tool.
            We keep our little home tidy and curate what’s here, so the best work rises to the top.
            If this is your vibe too, we hope you’ll join us.
          </p>
        </div>

        {/* ── Contact form ── */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(28px, 4vw, 44px)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-secondary))' }} />

          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            Say hello
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 28px' }}>
            Questions, ideas, or just want to introduce yourself? We read every message.
          </p>

          {status === 'sent' ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>✦</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Message sent
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                Thanks for reaching out — we’ll be in touch.
              </p>
              <button
                onClick={() => setStatus('idle')}
                style={{ marginTop: '24px', padding: '10px 24px', borderRadius: '50px', background: 'transparent', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                Send another
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Maker"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Your email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us what’s on your mind…"
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '120px' }}
                />
              </div>

              {status === 'error' && (
                <div style={{ fontSize: '13px', color: 'var(--accent-secondary)', fontWeight: 500 }}>
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={status === 'sending'}
                style={{
                  marginTop: '8px',
                  padding: '14px 28px',
                  borderRadius: '50px',
                  background: 'var(--accent-primary)',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: status === 'sending' ? 'default' : 'pointer',
                  opacity: status === 'sending' ? 0.7 : 1,
                  boxShadow: '0 8px 28px rgba(43,122,143,0.35)',
                  alignSelf: 'flex-start',
                }}
              >
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: '7px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: '15px',
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
}
