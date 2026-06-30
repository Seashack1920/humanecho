'use client'

import { useState, CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

export default function BuyButton({
  itemType, itemId, price, label, style, owned = false,
}: {
  itemType: 'track' | 'album'
  itemId: string
  price: number | null | undefined
  label?: string
  style?: CSSProperties
  owned?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const p = Number(price)
  if (!p || p <= 0) return null // not for sale → no button

  if (owned) {
    return (
      <a href="/library" title="View in your library" style={{ ...baseStyle, ...style, background: 'transparent', color: 'var(--accent-primary)', opacity: 0.9, textDecoration: 'none', display: 'inline-block' }}>
        ✓ Owned
      </a>
    )
  }

  const buy = async () => {
    setLoading(true); setErr(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Send to login, then back to this page to complete the purchase.
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      return
    }
    try {
      const res = await fetch('/api/stripe/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType, itemId, userId: user.id, email: user.email, returnUrl: window.location.href,
        }),
      })
      const data = await res.json()
      if (data.alreadyOwned) { window.location.href = '/library'; return }
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout')
      window.location.href = data.url
    } catch (e) {
      setErr((e as Error).message)
      setLoading(false)
    }
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
      <button onClick={buy} disabled={loading} style={{ ...baseStyle, ...style, opacity: loading ? 0.6 : 1 }}>
        {loading ? 'Starting…' : (label || `$${p.toFixed(2)}`)}
      </button>
      {err && <span style={{ fontSize: '12px', color: '#dc3c3c' }}>{err}</span>}
    </span>
  )
}

const baseStyle: CSSProperties = {
  padding: '8px 16px',
  borderRadius: '999px',
  border: '1px solid var(--accent-primary)',
  background: 'var(--accent-primary)',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
}
