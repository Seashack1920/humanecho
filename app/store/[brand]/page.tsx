'use client'

/**
 * Standalone storefront at /store/<slug>. Its own look (from lib/storefronts),
 * no Human Echo chrome. Lists that store's published products; buying uses guest
 * checkout (no account) and delivers the file by token. Runs on Human Echo's
 * Stripe + database + file storage under the hood.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getStorefront } from '@/lib/storefronts'

type Product = { id: string; title: string; description: string | null; price: number | null; image_url: string | null; product_type: string | null }

export default function StorefrontPage() {
  const params = useParams()
  const slug = String(params.brand || '')
  const store = getStorefront(slug)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!store) { setLoading(false); return }
    ;(async () => {
      const { data } = await supabase
        .from('products')
        .select('id, title, description, price, image_url, product_type')
        .eq('storefront', slug).eq('status', 'published')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
      setProducts((data as Product[]) || [])
      setLoading(false)
    })()
  }, [slug, store])

  const buy = async (p: Product) => {
    setBusyId(p.id); setErr(null)
    try {
      const res = await fetch('/api/store/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: p.id, storefront: slug }),
      })
      const d = await res.json()
      if (!res.ok || !d.url) throw new Error(d.error || 'Could not start checkout.')
      window.location.href = d.url
    } catch (e) { setErr((e as Error).message); setBusyId(null) }
  }

  if (!store) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#666' }}>Store not found.</div>
  }

  const money = (n: number | null) => n != null ? `$${Number(n).toFixed(2)}` : ''

  return (
    <div style={{ minHeight: '100vh', marginTop: '-70px', background: store.bg, color: store.ink, fontFamily: 'Georgia, "Times New Roman", serif' }}>
      {/* Own header */}
      <header style={{ textAlign: 'center', padding: '64px 24px 36px', borderBottom: `1px solid ${store.accent}22` }}>
        <div style={{ fontSize: 'clamp(30px, 6vw, 48px)', fontWeight: 700, letterSpacing: '-0.01em' }}>{store.name}</div>
        <div style={{ fontSize: 'clamp(15px, 2.4vw, 19px)', color: store.accent, marginTop: '8px', fontStyle: 'italic' }}>{store.tagline}</div>
        <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: `${store.ink}99`, maxWidth: '520px', margin: '16px auto 0', lineHeight: 1.6 }}>{store.blurb}</p>
      </header>

      <main style={{ maxWidth: '1040px', margin: '0 auto', padding: '40px 24px 96px' }}>
        {err && <div style={{ background: '#fdece9', color: '#b3391f', padding: '10px 14px', borderRadius: '10px', marginBottom: '20px', fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>{err}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', color: `${store.ink}88`, padding: '60px 0' }}>Loading…</div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', color: `${store.ink}88`, padding: '60px 0', fontFamily: 'system-ui, sans-serif' }}>No books available yet — check back soon.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '28px' }}>
            {products.map(p => (
              <div key={p.id} style={{ background: store.card, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 6px 22px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ aspectRatio: '3 / 4', background: `${store.accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '40px' }}>📚</span>}
                </div>
                <div style={{ padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.25 }}>{p.title}</div>
                  {p.description && <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: `${store.ink}aa`, lineHeight: 1.5, margin: '8px 0 0' }}>{String(p.description).slice(0, 140)}{String(p.description).length > 140 ? '…' : ''}</p>}
                  <div style={{ flex: 1 }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', gap: '10px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 700 }}>{money(p.price)}</span>
                    <button onClick={() => buy(p)} disabled={busyId === p.id}
                      style={{ fontFamily: 'system-ui, sans-serif', padding: '10px 18px', borderRadius: '999px', border: 'none', background: store.accent, color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: busyId === p.id ? 0.6 : 1 }}>
                      {busyId === p.id ? '…' : 'Buy'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '28px 24px 48px', fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: `${store.ink}77`, borderTop: `1px solid ${store.accent}22` }}>
        {store.name} · secure checkout by Stripe · instant digital download
      </footer>
    </div>
  )
}
