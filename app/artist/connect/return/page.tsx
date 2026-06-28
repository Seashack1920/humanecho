'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ConnectReturn() {
  const router = useRouter()
  const [seconds, setSeconds] = useState(4)

  useEffect(() => {
    const tick = setInterval(() => setSeconds(s => (s > 0 ? s - 1 : 0)), 1000)
    const go = setTimeout(() => router.push('/dashboard'), 4000)
    return () => { clearInterval(tick); clearTimeout(go) }
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '460px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 32px' }}>
        <div style={{ fontSize: '44px', marginBottom: '16px' }}>✓</div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
          You&rsquo;re all set
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
          Thanks for connecting your bank with Stripe. Once Stripe finishes verifying your details,
          your payouts will be active and you&rsquo;ll receive 85% of every sale automatically.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ padding: '11px 24px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
        >
          Back to dashboard
        </button>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>
          Redirecting in {seconds}s&hellip;
        </div>
      </div>
    </div>
  )
}
