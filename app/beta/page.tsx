'use client'

import { useState } from 'react'

export default function BetaLoginPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!password) { setError('Enter the beta password.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/beta-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not sign in.'); setLoading(false); return }
      window.location.href = '/'  // unlocked — enter the full site
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#0a0a0b', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(43,122,143,0.15) 0%, transparent 60%)' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', fontWeight: 500 }}>Private Beta</div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(30px, 6vw, 48px)', fontWeight: 700, color: 'white', lineHeight: 1, marginBottom: '8px' }}>Human Echo</div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginBottom: '36px' }}>Beta Tester Access</div>

        <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '32px', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'left' }}>
          <label style={lbl}>Signing in as</label>
          <input value="Official Beta Tester" readOnly style={{ ...input, opacity: 0.7, cursor: 'default' }} />

          <label style={{ ...lbl, marginTop: '16px' }}>Beta password</label>
          <input
            type="password" value={password} autoFocus
            onChange={e => { setPassword(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Enter the password you were given"
            style={input}
          />

          {error && <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(220,60,60,0.2)', border: '1px solid rgba(220,60,60,0.4)', color: '#ff8080', fontSize: '13px' }}>{error}</div>}

          <button onClick={submit} disabled={loading}
            style={{ width: '100%', marginTop: '20px', padding: '13px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Entering…' : 'Enter the site →'}
          </button>
        </div>

        <a href="/holding" style={{ display: 'inline-block', marginTop: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>← Back</a>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px', letterSpacing: '0.04em' }
const input: React.CSSProperties = { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
