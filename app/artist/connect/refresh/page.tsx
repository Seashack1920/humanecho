'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ConnectRefresh() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const artistId = searchParams.get('artist')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const restart = async () => {
    if (!artistId) { setError('Missing artist reference. Please return to your dashboard and try again.'); return }
    setBusy(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId, userId: user?.id, email: user?.email }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Could not restart Stripe onboarding.')
        setBusy(false)
      }
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '460px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 32px' }}>
        <div style={{ fontSize: '44px', marginBottom: '16px' }}>↻</div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
          Let&rsquo;s pick that back up
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
          Your Stripe setup link expired before you finished. No problem &mdash; click below to continue
          where you left off.
        </p>
        {error && (
          <div style={{ fontSize: '13px', color: '#dc3c3c', background: 'rgba(220,60,60,0.1)', border: '1px solid rgba(220,60,60,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={restart}
            disabled={busy}
            style={{ padding: '11px 24px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '14px', fontWeight: '600', border: 'none', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}
          >
            {busy ? 'Opening Stripe…' : 'Continue setup'}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ padding: '11px 24px', borderRadius: '8px', background: 'none', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
