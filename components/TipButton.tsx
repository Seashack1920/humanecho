'use client'

import { useState, CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

const PRESETS = [3, 5, 10, 20]

export default function TipButton({
  artistId, artistName, itemType, itemId, style, label,
}: {
  artistId: string
  artistName?: string
  itemType?: string
  itemId?: string
  style?: CSSProperties
  label?: string
}) {
  const [open, setOpen]       = useState(false)
  const [amount, setAmount]   = useState(5)
  const [custom, setCustom]   = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  const effectiveAmount = custom ? Number(custom) : amount

  const send = async () => {
    if (!effectiveAmount || effectiveAmount < 1) { setErr('Minimum tip is $1.'); return }
    setLoading(true); setErr(null)
    const { data: { user } } = await supabase.auth.getUser() // tipping allowed signed-out
    try {
      const res = await fetch('/api/stripe/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId, itemType, itemId, amount: effectiveAmount, message,
          userId: user?.id, email: user?.email, returnUrl: window.location.href,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start tip')
      window.location.href = data.url
    } catch (e) {
      setErr((e as Error).message)
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ ...baseStyle, ...style }}>
        {label || '♥ Tip the artist'}
      </button>

      {open && (
        <div onClick={() => !loading && setOpen(false)} style={overlay}>
          <div onClick={e => e.stopPropagation()} style={modal}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Tip {artistName || 'the artist'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Artists need friends. 100% of your tip goes to the artist.
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {PRESETS.map(a => {
                const active = !custom && amount === a
                return (
                  <button key={a} onClick={() => { setAmount(a); setCustom('') }}
                    style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '14px', cursor: 'pointer', border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border)'}`, background: active ? 'var(--accent-primary)' : 'transparent', color: active ? '#fff' : 'var(--text-secondary)' }}>
                    ${a}
                  </button>
                )
              })}
              <input type="number" min="1" placeholder="Custom" value={custom}
                onChange={e => setCustom(e.target.value)}
                style={{ width: '92px', padding: '8px 12px', borderRadius: '20px', border: `1px solid ${custom ? 'var(--accent-primary)' : 'var(--border)'}`, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }} />
            </div>

            <textarea placeholder="Add a note (optional)" value={message} maxLength={200}
              onChange={e => setMessage(e.target.value)}
              style={{ width: '100%', minHeight: '60px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', marginBottom: '12px', resize: 'vertical', boxSizing: 'border-box' }} />

            {err && <div style={{ fontSize: '13px', color: '#dc3c3c', marginBottom: '10px' }}>{err}</div>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} disabled={loading}
                style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
              <button onClick={send} disabled={loading}
                style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Starting…' : `Tip $${effectiveAmount || 0}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const baseStyle: CSSProperties = {
  padding: '8px 16px', borderRadius: '999px',
  border: '1px solid var(--accent-secondary)', background: 'transparent',
  color: 'var(--accent-secondary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
}
const overlay: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
}
const modal: CSSProperties = {
  background: 'var(--bg-card)', borderRadius: '16px', padding: '24px',
  maxWidth: '420px', width: '100%', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
}
