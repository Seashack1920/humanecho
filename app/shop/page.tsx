'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ShopPage() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const categories = [
    { icon: '📖', title: 'Ebooks', desc: 'Novels, novellas, and serialized fiction — instant download.' },
    { icon: '🎧', title: 'Audiobooks', desc: 'Narrated editions of our stories and books.' },
    { icon: '🎼', title: 'Sheet Music & Stems', desc: 'Scores, chord charts, and track stems for creators.' },
    { icon: '🖼', title: 'Art & Prints', desc: 'Cover art and original illustrations as digital downloads.' },
  ]

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
    badge: {
      display: 'inline-block', marginTop: '28px',
      padding: '8px 18px', borderRadius: '999px',
      border: '1px solid var(--border)', background: 'var(--bg-primary)',
      fontSize: '12px', fontWeight: 600, letterSpacing: '1px',
      textTransform: 'uppercase', color: 'var(--accent-gold)',
    },
    page: { maxWidth: '1000px', margin: '0 auto', padding: isMobile ? '56px 24px' : '88px 32px' },
    sectionLabel: {
      fontSize: '11px', fontWeight: 500, letterSpacing: '2px',
      textTransform: 'uppercase', color: 'var(--accent-gold)',
      marginBottom: '14px', textAlign: 'center',
    },
    sectionTitle: {
      fontFamily: 'Playfair Display, serif',
      fontSize: isMobile ? '28px' : '38px', fontWeight: 700,
      color: 'var(--text-primary)', letterSpacing: '-1px',
      marginBottom: '48px', textAlign: 'center',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '20px',
    },
    card: {
      background: 'var(--bg-secondary)', borderRadius: '16px',
      padding: '32px', border: '1px solid var(--border)',
    },
    cardIcon: { fontSize: '32px', marginBottom: '16px' },
    cardTitle: {
      fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)',
      marginBottom: '8px',
    },
    cardDesc: { fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6' },
    cta: {
      textAlign: 'center', marginTop: isMobile ? '56px' : '72px',
      paddingTop: '48px', borderTop: '1px solid var(--border)',
    },
    ctaText: {
      fontSize: isMobile ? '16px' : '18px', color: 'var(--text-secondary)',
      lineHeight: '1.7', maxWidth: '520px', margin: '0 auto 28px',
    },
    btn: {
      display: 'inline-block', padding: '14px 32px', borderRadius: '999px',
      background: 'var(--accent-primary)', color: '#fff',
      fontSize: '15px', fontWeight: 600, textDecoration: 'none',
    },
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <section style={s.hero}>
        <div style={s.eyebrow}>Human Echo</div>
        <h1 style={s.title}>Shop</h1>
        <p style={s.sub}>
          Digital products from our artists and authors — ebooks first, with more
          to come. Buy once, download anywhere, support the creators directly.
        </p>
        <div style={s.badge}>Opening Soon</div>
      </section>

      <div style={s.page}>
        <div style={s.sectionLabel}>What&apos;s Coming</div>
        <h2 style={s.sectionTitle}>A storefront for digital work</h2>

        <div style={s.grid}>
          {categories.map(c => (
            <div key={c.title} style={s.card}>
              <div style={s.cardIcon}>{c.icon}</div>
              <div style={s.cardTitle}>{c.title}</div>
              <div style={s.cardDesc}>{c.desc}</div>
            </div>
          ))}
        </div>

        <div style={s.cta}>
          <p style={s.ctaText}>
            The shop is being built now. In the meantime, explore the music,
            films, and stories already live on Human Echo.
          </p>
          <Link href="/" style={s.btn}>Back to Home</Link>
        </div>
      </div>
    </main>
  )
}
