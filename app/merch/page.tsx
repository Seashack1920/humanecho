'use client'

// Public merch page (allowlisted — shoppable before subscribing). A curated
// showcase: a handful of items modeled by our avatars, each clicking through to
// its product page on the hosted store (where size/color/checkout live), plus a
// button to the full catalog. Content set in Admin → Merch Shop (site_settings:
// merch_items, merch_store_url, merch_blurb). "Coming soon" until populated.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type MerchItem = { image: string; title: string; price: string; url: string }

export default function MerchPage() {
  const router = useRouter()
  const [items, setItems] = useState<MerchItem[]>([])
  const [storeUrl, setStoreUrl] = useState<string | null>(null)
  const [blurb, setBlurb] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('site_settings').select('key, value').in('key', ['merch_items', 'merch_store_url', 'merch_blurb'])
      .then(({ data }) => {
        const m = Object.fromEntries((data || []).map(r => [r.key, r.value]))
        try { setItems(m.merch_items ? JSON.parse(m.merch_items) : []) } catch { setItems([]) }
        setStoreUrl((m.merch_store_url || '').trim() || null)
        setBlurb((m.merch_blurb || '').trim())
        setLoading(false)
      })
  }, [])

  const hasItems = items.length > 0

  return (
    <div style={{ minHeight: '70vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '90px 24px 120px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: hasItems ? '48px' : '28px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--accent-gold)', marginBottom: '14px', fontWeight: '600' }}>Human Echo Shop</div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.05', letterSpacing: '-1px', marginBottom: '16px' }}>Wear the Echo.</h1>
          <p style={{ fontSize: '17px', color: 'var(--text-secondary)', lineHeight: '1.7', maxWidth: '540px', margin: '0 auto' }}>
            {blurb || 'Shirts, prints and more — made on demand, modeled by our artists. Open to everyone, members or not.'}
          </p>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', padding: '40px 0' }}>Loading</div>
        ) : hasItems ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '28px' }}>
              {items.map((it, i) => {
                const Card = (
                  <>
                    <div style={{ position: 'relative', aspectRatio: '4 / 5', borderRadius: '14px', overflow: 'hidden', background: 'var(--bg-secondary)', marginBottom: '12px' }}>
                      {it.image
                        ? <img src={it.image} alt={it.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🛍</div>}
                    </div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.3' }}>{it.title}</div>
                    {it.price && <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '3px' }}>{it.price}</div>}
                  </>
                )
                return it.url
                  ? <a key={i} href={it.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{Card}</a>
                  : <div key={i}>{Card}</div>
              })}
            </div>

            {storeUrl && (
              <div style={{ textAlign: 'center', marginTop: '56px' }}>
                <a href={storeUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', padding: '15px 38px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', fontSize: '16px', fontWeight: '600', textDecoration: 'none' }}>
                  Shop the full collection ↗
                </a>
              </div>
            )}
          </>
        ) : storeUrl ? (
          <div style={{ textAlign: 'center' }}>
            <a href={storeUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '16px 40px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', fontSize: '16px', fontWeight: '600', textDecoration: 'none' }}>
              Shop the collection ↗
            </a>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '18px' }}>Opens our secure shop in a new tab.</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '17px', color: 'var(--text-secondary)', lineHeight: '1.7', maxWidth: '520px', margin: '0 auto 28px' }}>
              Our merch is on the way — shirts, prints and more, made on demand. Join the list and we’ll let you know the moment it drops.
            </p>
            <button onClick={() => router.push('/welcome')}
              style={{ padding: '14px 32px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Keep me posted
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
