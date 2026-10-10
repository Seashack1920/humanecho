'use client'

// Public merch page (allowlisted — shoppable before subscribing). Option B:
// links out to the hosted Printful-connected storefront whose URL is set in
// Admin → Site Settings (site_settings.merch_store_url). Shows a graceful
// "coming soon" until that's configured. (Option A — a native Printful+Stripe
// shop — is the longer-term plan; see memory.)

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MerchPage() {
  const router = useRouter()
  const [url, setUrl]     = useState<string | null>(null)
  const [blurb, setBlurb] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('site_settings').select('key, value').in('key', ['merch_store_url', 'merch_blurb'])
      .then(({ data }) => {
        const map = Object.fromEntries((data || []).map(r => [r.key, r.value]))
        setUrl((map.merch_store_url || '').trim() || null)
        setBlurb((map.merch_blurb || '').trim())
        setLoading(false)
      })
  }, [])

  return (
    <div style={{ minHeight: '70vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '100px 24px 120px', textAlign: 'center' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--accent-gold)', marginBottom: '16px', fontWeight: '600' }}>
          Human Echo Shop
        </div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.05', letterSpacing: '-1px', marginBottom: '20px' }}>
          Wear the Echo.
        </h1>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '20px' }}>Loading</div>
        ) : url ? (
          <>
            <p style={{ fontSize: '17px', color: 'var(--text-secondary)', lineHeight: '1.7', maxWidth: '520px', margin: '0 auto 36px' }}>
              {blurb || 'Shirts, prints and more — made on demand, shipped to your door. Open to everyone, members or not.'}
            </p>
            <a href={url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '16px 40px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', fontSize: '16px', fontWeight: '600', textDecoration: 'none' }}>
              Shop the collection ↗
            </a>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '18px' }}>Opens our secure shop in a new tab.</div>
          </>
        ) : (
          <>
            <p style={{ fontSize: '17px', color: 'var(--text-secondary)', lineHeight: '1.7', maxWidth: '520px', margin: '0 auto 32px' }}>
              Our merch is on the way — shirts, prints and more, made on demand. Join the list and we’ll let you know the moment it drops.
            </p>
            <button onClick={() => router.push('/welcome')}
              style={{ padding: '14px 32px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Keep me posted
            </button>
          </>
        )}
      </div>
    </div>
  )
}
