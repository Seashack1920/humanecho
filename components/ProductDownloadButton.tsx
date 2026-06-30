'use client'

import { useState, CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

// Requests a fresh signed download URL for a product the user owns, then opens
// it. The URL is minted server-side after an ownership check and expires fast.
export default function ProductDownloadButton({
  productId, style,
}: {
  productId: string
  style?: CSSProperties
}) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const download = async () => {
    setLoading(true); setErr(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login?redirect=/library'; return }

      const res = await fetch('/api/product-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Download unavailable')
      window.location.href = data.url
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <button onClick={download} disabled={loading} style={{ ...baseStyle, ...style, opacity: loading ? 0.6 : 1 }}>
        {loading ? 'Preparing…' : '⬇ Download'}
      </button>
      {err && <span style={{ fontSize: '12px', color: '#dc3c3c' }}>{err}</span>}
    </span>
  )
}

const baseStyle: CSSProperties = {
  padding: '8px 16px',
  borderRadius: '999px',
  border: 'none',
  background: 'var(--accent-primary)',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  flexShrink: 0,
}
