'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProductBuyButton from '@/components/ProductBuyButton'

type Product = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  price: number
  product_type: string
}

export default function ShopPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [owned, setOwned] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: prods } = await supabase
        .from('products')
        .select('id, title, description, image_url, price, product_type')
        .eq('status', 'published')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })
      setProducts((prods as Product[]) || [])

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: purchases } = await supabase
          .from('purchases')
          .select('item_id')
          .eq('user_id', user.id)
          .eq('item_type', 'product')
          .eq('status', 'completed')
        setOwned(new Set((purchases || []).map(p => p.item_id)))
      }
      setLoading(false)
    }
    load()
  }, [])

  const s: Record<string, React.CSSProperties> = {
    hero: {
      padding: isMobile ? '80px 24px 56px' : '110px 32px 72px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      textAlign: 'center',
    },
    eyebrow: {
      fontSize: '11px', fontWeight: 500, letterSpacing: '2px',
      textTransform: 'uppercase', color: 'var(--accent-gold)', marginBottom: '20px',
    },
    title: {
      fontFamily: 'Playfair Display, serif',
      fontSize: isMobile ? '44px' : '76px',
      fontWeight: 700, color: 'var(--text-primary)',
      lineHeight: '1.05', letterSpacing: '-2px', margin: '0 auto 22px',
    },
    sub: {
      fontSize: isMobile ? '17px' : '20px',
      color: 'var(--text-secondary)', lineHeight: '1.7',
      maxWidth: '600px', margin: '0 auto',
    },
    page: { maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '48px 20px' : '72px 32px' },
    grid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '24px',
    },
    card: {
      background: 'var(--bg-secondary)', borderRadius: '16px',
      border: '1px solid var(--border)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    },
    cardImg: {
      width: '100%', aspectRatio: '3 / 4', objectFit: 'cover',
      background: 'var(--bg-card)', display: 'block',
    },
    cardImgPlaceholder: {
      width: '100%', aspectRatio: '3 / 4', background: 'var(--bg-card)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px',
    },
    cardBody: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
    cardType: {
      fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px',
      textTransform: 'uppercase', color: 'var(--accent-gold)',
    },
    cardTitle: {
      fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700,
      color: 'var(--text-primary)', lineHeight: '1.2',
    },
    cardDesc: { fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', flex: 1 },
    cardFoot: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginTop: '12px', gap: '12px',
    },
    price: { fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' },
    // empty state
    emptyWrap: { textAlign: 'center', maxWidth: '760px', margin: '0 auto' },
    badge: {
      display: 'inline-block', marginBottom: '40px',
      padding: '8px 18px', borderRadius: '999px',
      border: '1px solid var(--border)', background: 'var(--bg-secondary)',
      fontSize: '12px', fontWeight: 600, letterSpacing: '1px',
      textTransform: 'uppercase', color: 'var(--accent-gold)',
    },
    catGrid: {
      display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px',
      textAlign: 'left',
    },
    catCard: { background: 'var(--bg-secondary)', borderRadius: '16px', padding: '28px', border: '1px solid var(--border)' },
    btn: {
      display: 'inline-block', padding: '14px 32px', borderRadius: '999px',
      background: 'var(--accent-primary)', color: '#fff',
      fontSize: '15px', fontWeight: 600, textDecoration: 'none', marginTop: '40px',
    },
  }

  const categories = [
    { icon: '📖', title: 'Ebooks', desc: 'Novels, novellas, and serialized fiction — instant download.' },
    { icon: '🎧', title: 'Audiobooks', desc: 'Narrated editions of our stories and books.' },
    { icon: '🎼', title: 'Sheet Music & Stems', desc: 'Scores, chord charts, and track stems for creators.' },
    { icon: '🖼', title: 'Art & Prints', desc: 'Cover art and original illustrations as digital downloads.' },
  ]

  const hasProducts = products.length > 0

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <section style={s.hero}>
        <div style={s.eyebrow}>Human Echo</div>
        <h1 style={s.title}>Shop</h1>
        <p style={s.sub}>
          Digital products from our artists and authors — ebooks first, with more
          to come. Buy once, download anywhere, support the creators directly.
        </p>
      </section>

      <div style={s.page}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px', padding: '40px 0' }}>Loading…</div>
        ) : hasProducts ? (
          <div style={s.grid}>
            {products.map(prod => (
              <div key={prod.id} style={s.card}>
                {prod.image_url
                  ? <img src={prod.image_url} alt={prod.title} style={s.cardImg} />
                  : <div style={s.cardImgPlaceholder}>📖</div>}
                <div style={s.cardBody}>
                  <div style={s.cardType}>{prod.product_type || 'ebook'}</div>
                  <div style={s.cardTitle}>{prod.title}</div>
                  {prod.description && <div style={s.cardDesc}>{prod.description}</div>}
                  <div style={s.cardFoot}>
                    <ProductBuyButton productId={prod.id} price={prod.price} owned={owned.has(prod.id)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={s.emptyWrap}>
            <div style={s.badge}>Opening Soon</div>
            <div style={s.catGrid}>
              {categories.map(c => (
                <div key={c.title} style={s.catCard}>
                  <div style={{ fontSize: '32px', marginBottom: '14px' }}>{c.icon}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>{c.title}</div>
                  <div style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{c.desc}</div>
                </div>
              ))}
            </div>
            <Link href="/" style={s.btn}>Back to Home</Link>
          </div>
        )}
      </div>
    </main>
  )
}
