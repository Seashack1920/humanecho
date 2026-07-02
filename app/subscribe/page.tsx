'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const MONTHLY_PRICE_ID     = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || ''
const ANNUAL_PRICE_ID      = process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID || ''
const CREATORPLUS_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_CREATORPLUS_PRICE_ID || ''
const REVISIONIST_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_REVISIONIST_PRICE_ID || ''
const CREATORPLUS_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_CREATORPLUS_ANNUAL_PRICE_ID || ''
const REVISIONIST_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_REVISIONIST_ANNUAL_PRICE_ID || ''

type TierKey = 'base' | 'creator_plus' | 'revisionist'
type Tier = { key: TierKey; name: string; price: string; per: string; priceId: string; blurb: string; features: string[]; highlight?: boolean; annual?: { price: string; priceId: string } }

const TIERS: Tier[] = [
  {
    key: 'base', name: 'Member', price: '$5.99', per: '/mo', priceId: MONTHLY_PRICE_ID,
    blurb: 'Your full Human Echo experience.',
    features: ['Unlimited music, playlists & Escapes', 'Downloads, early access, contests', 'Writing Room with 5 critiques / month'],
    annual: { price: '$49.99/yr', priceId: ANNUAL_PRICE_ID },
  },
  {
    key: 'creator_plus', name: 'Creator+', price: '$9.99', per: '/mo', priceId: CREATORPLUS_PRICE_ID, highlight: true,
    blurb: 'For writers who want to go deeper.',
    features: ['Everything in Member', 'Unlimited critiques + much higher word limits', 'Deeper, more actionable analysis', 'Notepad Reader (ElevenLabs voices)'],
    annual: { price: '$99.99/yr', priceId: CREATORPLUS_ANNUAL_PRICE_ID },
  },
  {
    key: 'revisionist', name: 'The Revisionist', price: '$24.99', per: '/mo', priceId: REVISIONIST_PRICE_ID,
    blurb: 'The full editorial suite.',
    features: ['Everything in Creator+', 'Comprehensive developmental analysis', 'Genre positioning & marketability', 'Query letter, synopsis & comp titles', 'Screen / TV adaptation assessment'],
    annual: { price: '$249.99/yr', priceId: REVISIONIST_ANNUAL_PRICE_ID },
  },
]

export default function SubscribePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      if (user) { const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single(); setProfile(data) }
    })
  }, [])

  const currentTier: TierKey | 'none' = profile
    ? (profile.revisionist_addon ? 'revisionist' : profile.membership_tier === 'creator_plus' ? 'creator_plus' : profile.is_subscriber ? 'base' : 'none')
    : 'none'

  const checkout = async (priceId: string, planLabel: string, key: string) => {
    if (!user) { router.push('/login?redirect=/subscribe'); return }
    if (!priceId) { setError('This plan isn’t configured yet. Please check back soon.'); return }
    setLoading(key); setError('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user.id, email: user.email, plan: planLabel }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (e) { setError((e as Error).message); setLoading(null) }
  }

  const openPortal = async () => {
    setLoading('portal'); setError('')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (e) { setError((e as Error).message); setLoading(null) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '72px 24px 120px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '12px', fontWeight: 600 }}>Human Echo Membership</div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '14px' }}>Choose your plan</h1>
          <p style={{ fontSize: '17px', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
            Every plan includes the full platform. Step up for unlimited, deeper critiques and the complete editorial suite.
          </p>
        </div>

        {error && <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(220,60,60,0.1)', border: '1px solid rgba(220,60,60,0.3)', color: '#dc3c3c', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'stretch' }}>
          {TIERS.map(t => {
            const isCurrent = currentTier === t.key
            const subscribed = currentTier !== 'none'
            return (
              <div key={t.key} style={{
                flex: '1 1 280px', maxWidth: '320px', display: 'flex', flexDirection: 'column',
                padding: '28px', borderRadius: '18px',
                border: `2px solid ${t.highlight ? 'var(--accent-primary)' : 'var(--border)'}`,
                background: t.highlight ? 'color-mix(in srgb, var(--accent-primary) 6%, var(--bg-secondary))' : 'var(--bg-secondary)',
                position: 'relative',
              }}>
                {t.highlight && <div style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-primary)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</div>
                <div style={{ margin: '6px 0 2px' }}><span style={{ fontFamily: 'Playfair Display, serif', fontSize: '38px', fontWeight: 700, color: 'var(--text-primary)' }}>{t.price}</span><span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{t.per}</span></div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '18px' }}>{t.blurb}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  {t.features.map(f => (
                    <li key={f} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <span style={{ color: 'var(--accent-primary)', flexShrink: 0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button disabled style={{ ...btn, background: 'transparent', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', cursor: 'default' }}>✓ Your current plan</button>
                ) : subscribed ? (
                  <button onClick={openPortal} disabled={loading === 'portal'} style={{ ...btn, background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>{loading === 'portal' ? 'Opening…' : 'Change plan'}</button>
                ) : (
                  <button onClick={() => checkout(t.priceId, t.key, t.key)} disabled={loading === t.key} style={btn}>{loading === t.key ? 'Redirecting…' : (user ? 'Subscribe' : 'Create account to subscribe')}</button>
                )}

                {t.annual && t.annual.priceId && !subscribed && (
                  <button onClick={() => checkout(t.annual!.priceId, 'annual', `${t.key}-annual`)} disabled={loading === `${t.key}-annual`} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: '10px' }}>
                    {loading === `${t.key}-annual` ? 'Redirecting…' : `or save with annual — ${t.annual.price}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Secure payment via Stripe · Cancel anytime · Change or cancel from the billing portal
        </div>
      </div>
    </div>
  )
}

const btn: React.CSSProperties = { width: '100%', padding: '13px', borderRadius: '12px', background: 'var(--accent-primary)', color: '#fff', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer' }
