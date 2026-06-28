'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || ''
const ANNUAL_PRICE_ID  = process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID  || ''

const BENEFITS = [
  { icon: '🎵', text: 'Unlimited listening — no track limits' },
  { icon: '🎛️', text: 'Build your own playlists and Escapes' },
  { icon: '🔔', text: 'Early access to new releases' },
  { icon: '⬇️', text: 'Download tracks and albums' },
  { icon: '🎤', text: 'Upload cover songs and music videos' },
  { icon: '🏆', text: 'Echo Advocates rewards program' },
  { icon: '✨', text: 'Access to subscriber-only content' },
]

export default function SubscribePage() {
  const router  = useRouter()
  const [plan, setPlan]       = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState(false)
  const [user, setUser]       = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [error, setError]     = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
    }
    load()
  }, [])

  const handleSubscribe = async () => {
    if (!user) { router.push('/login?redirect=/subscribe'); return }
    if (profile?.is_subscriber) { router.push('/account'); return }

    setLoading(true); setError('')
    try {
      const priceId = plan === 'annual' ? ANNUAL_PRICE_ID : MONTHLY_PRICE_ID
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          email:  user.email,
          plan,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (err) {
      setError((err as Error).message)
    }
    setLoading(false)
  }

  const savings = Math.round(((5.99 * 12 - 49.99) / (5.99 * 12)) * 100)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '80px 24px 120px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '12px', fontWeight: '600' }}>
            Human Echo Subscription
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.1', marginBottom: '16px' }}>
            Your full Human Echo experience
          </h1>
          <p style={{ fontSize: '17px', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto', lineHeight: '1.7' }}>
            Unlimited listening, playlist building, early access, and more — all for less than a coffee a month.
          </p>
        </div>

        {/* Already subscribed */}
        {profile?.is_subscriber && (
          <div style={{ background: 'rgba(43,122,143,0.1)', border: '1px solid var(--accent-primary)', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>✓</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>You're already subscribed!</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>Manage your subscription from your account page.</div>
            <button onClick={() => router.push('/account')} style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
              Go to Account
            </button>
          </div>
        )}

        {/* Plan selector */}
        {!profile?.is_subscriber && (
          <>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', justifyContent: 'center' }}>
              {/* Monthly */}
              <div onClick={() => setPlan('monthly')}
                style={{ flex: 1, maxWidth: '280px', padding: '24px', borderRadius: '16px', border: `2px solid ${plan === 'monthly' ? 'var(--accent-primary)' : 'var(--border)'}`, background: plan === 'monthly' ? 'rgba(43,122,143,0.06)' : 'var(--bg-secondary)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>Monthly</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '36px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>$5.99</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>per month</div>
              </div>

              {/* Annual */}
              <div onClick={() => setPlan('annual')}
                style={{ flex: 1, maxWidth: '280px', padding: '24px', borderRadius: '16px', border: `2px solid ${plan === 'annual' ? 'var(--accent-primary)' : 'var(--border)'}`, background: plan === 'annual' ? 'rgba(43,122,143,0.06)' : 'var(--bg-secondary)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center', position: 'relative' as const }}>
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-secondary)', color: 'white', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap' as const }}>
                  SAVE {savings}%
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>Annual</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '36px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>$49.99</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>per year · ~$4.17/mo</div>
              </div>
            </div>

            {/* Benefits */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '28px', marginBottom: '32px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Everything included</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {BENEFITS.map(b => (
                  <div key={b.text} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{b.icon}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(220,60,60,0.1)', border: '1px solid rgba(220,60,60,0.3)', color: '#dc3c3c', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button onClick={handleSubscribe} disabled={loading}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--accent-primary)', color: 'white', fontSize: '16px', fontWeight: '700', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s', letterSpacing: '0.02em' }}>
              {loading ? 'Redirecting to Stripe...' : user ? `Subscribe ${plan === 'annual' ? 'Annually — $49.99/yr' : 'Monthly — $5.99/mo'}` : 'Create account to subscribe →'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Secure payment via Stripe · Cancel anytime · No hidden fees
            </div>
          </>
        )}
      </div>
    </div>
  )
}
