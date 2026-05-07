'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AboutPage() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const s = {
    hero: {
      padding: isMobile ? '80px 24px 60px' : '100px 32px 80px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      textAlign: 'center' as const,
    },
    eyebrow: {
      fontSize: '11px', fontWeight: '500' as const, letterSpacing: '2px',
      textTransform: 'uppercase' as const, color: 'var(--accent-gold)',
      marginBottom: '20px',
    },
    heroTitle: {
      fontFamily: 'Playfair Display, serif',
      fontSize: isMobile ? '40px' : '72px',
      fontWeight: '700' as const, color: 'var(--text-primary)',
      lineHeight: '1.05', letterSpacing: '-2px',
      marginBottom: '24px', maxWidth: '800px', margin: '0 auto 24px',
    },
    heroSub: {
      fontSize: isMobile ? '17px' : '20px',
      color: 'var(--text-secondary)', lineHeight: '1.7',
      maxWidth: '600px', margin: '0 auto 40px',
    },
    page: {
      maxWidth: '800px', margin: '0 auto',
      padding: isMobile ? '48px 24px' : '80px 32px',
    },
    section: { marginBottom: isMobile ? '56px' : '80px' },
    sectionLabel: {
      fontSize: '11px', fontWeight: '500' as const, letterSpacing: '2px',
      textTransform: 'uppercase' as const, color: 'var(--accent-gold)',
      marginBottom: '16px',
    },
    sectionTitle: {
      fontFamily: 'Playfair Display, serif',
      fontSize: isMobile ? '28px' : '40px',
      fontWeight: '700' as const, color: 'var(--text-primary)',
      lineHeight: '1.15', letterSpacing: '-1px', marginBottom: '20px',
    },
    body: {
      fontSize: '17px', color: 'var(--text-secondary)',
      lineHeight: '1.8', marginBottom: '20px',
    },
    divider: {
      height: '1px', background: 'var(--border)', margin: isMobile ? '48px 0' : '72px 0',
    },
    pillGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: '16px', marginTop: '32px',
    },
    pill: {
      padding: '24px', borderRadius: '16px',
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    },
    pillTitle: {
      fontFamily: 'Playfair Display, serif',
      fontSize: '18px', fontWeight: '600' as const,
      color: 'var(--text-primary)', marginBottom: '8px',
    },
    pillBody: {
      fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6',
    },
    cta: {
      padding: isMobile ? '40px 24px' : '56px 48px',
      borderRadius: '20px', background: 'var(--bg-secondary)',
      border: '1px solid var(--border)', textAlign: 'center' as const,
    },
    ctaTitle: {
      fontFamily: 'Playfair Display, serif',
      fontSize: isMobile ? '28px' : '36px',
      fontWeight: '700' as const, color: 'var(--text-primary)',
      marginBottom: '16px', letterSpacing: '-0.5px',
    },
    ctaBody: {
      fontSize: '16px', color: 'var(--text-secondary)',
      lineHeight: '1.7', marginBottom: '32px', maxWidth: '480px', margin: '0 auto 32px',
    },
    btnRow: {
      display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' as const,
    },
    btn: {
      padding: '14px 32px', borderRadius: '8px',
      background: 'var(--accent-primary)', color: 'white',
      fontSize: '15px', fontWeight: '500' as const, textDecoration: 'none',
      display: 'inline-block',
    },
    btnOutline: {
      padding: '14px 32px', borderRadius: '8px',
      background: 'none', color: 'var(--text-primary)',
      fontSize: '15px', fontWeight: '500' as const, textDecoration: 'none',
      display: 'inline-block', border: '1px solid var(--border)',
    },
    badge: {
      display: 'inline-block', padding: '6px 14px', borderRadius: '20px',
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      fontSize: '13px', color: 'var(--text-muted)', marginRight: '8px', marginBottom: '8px',
    },
  }

  return (
    <div>
      {/* Hero */}
      <div style={s.hero}>
        <div style={s.eyebrow}>Our Story</div>
        <h1 style={s.heroTitle}>
          Where Human Creativity<br />Finds Its Echo
        </h1>
        <p style={s.heroSub}>
          Human Echo is a multimedia platform for independent artists — 
          a place where music, film, books, and stories live together, 
          and where the full spectrum of human and AI creativity is celebrated openly.
        </p>
        <div>
          <span style={s.badge}>🎵 Music</span>
          <span style={s.badge}>🎬 Films</span>
          <span style={s.badge}>📖 Books</span>
          <span style={s.badge}>✍️ Stories</span>
        </div>
      </div>

      <div style={s.page}>

        {/* What we believe */}
        <div style={s.section}>
          <div style={s.sectionLabel}>What We Believe</div>
          <h2 style={s.sectionTitle}>
            Creativity. Conviction. Integrity.
          </h2>
          <p style={s.body}>
            Human Echo was built on a simple conviction: great art comes from everywhere. 
            From the songwriter who writes alone at 3am. From the filmmaker who collaborates 
            with an AI to realize a vision they couldn't afford otherwise. From the novelist 
            who uses every tool available to tell a story that demands to be told.
          </p>
          <p style={s.body}>
            We don't ask where your creativity comes from. We ask that you're honest about it. 
            Every piece of content on Human Echo carries a clear label — 100% Human, Human + AI, 
            or AI Generated — not as a warning, but as a declaration. We think that kind of 
            transparency builds trust, and trust is what connects artists to the people who love their work.
          </p>
          <p style={s.body}>
            The name says it all. Human Echo — the human voice, amplified and echoed through 
            whatever technology serves the art.
          </p>
        </div>

        <div style={s.divider} />

        {/* What makes us different */}
        <div style={s.section}>
          <div style={s.sectionLabel}>What Makes Us Different</div>
          <h2 style={s.sectionTitle}>
            More than a streaming platform.
          </h2>
          <p style={s.body}>
            Most platforms are built for one thing — music, or video, or books. Human Echo 
            was built for artists who don't fit neatly into one category. The musician who 
            also writes fiction. The filmmaker who scores their own films. The poet whose 
            words work better read aloud.
          </p>
          <p style={s.body}>
            We also believe fans deserve more than a play button. Every artist on Human Echo 
            can leave a personal video message with their releases — the story behind the album, 
            why they wrote the song, what they were thinking when they made the film. It's the 
            kind of access that used to require a backstage pass.
          </p>

          <div style={s.pillGrid}>
            {[
              { icon: '🎵', title: 'All formats, one home', body: 'Music, film, books and stories from the same artist, in the same place.' },
              { icon: '🧑🤖', title: 'Transparent about AI', body: 'Every release is labeled. Fans know what they\'re listening to. Artists own their process.' },
              { icon: '▶', title: 'Personal artist messages', body: 'Video messages from artists with every release. A direct line between creator and listener.' },
              { icon: '🎤', title: 'Cover song discovery', body: 'Explore originals and covers together. Follow the thread of a song across artists and generations.' },
            ].map((item) => (
              <div key={item.title} style={s.pill}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>{item.icon}</div>
                <div style={s.pillTitle}>{item.title}</div>
                <div style={s.pillBody}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={s.divider} />

        {/* For artists */}
        <div style={s.section}>
          <div style={s.sectionLabel}>For Artists</div>
          <h2 style={s.sectionTitle}>
            Your work. Your terms. Your fans.
          </h2>
          <p style={s.body}>
            Human Echo is built for independent artists who want real ownership of their 
            relationship with their audience. You set your prices. You control when things 
            go live. You decide what's public, what's private, and what's shared with a 
            select few via a private link before the world sees it.
          </p>
          <p style={s.body}>
            When fans buy your work, the money goes to you — directly, transparently, 
            with no hidden fees eating into your income. And when you're ready to grow, 
            our built-in tools help you create social content, write press releases, 
            and reach new listeners without needing a team behind you.
          </p>
          <p style={s.body}>
            This is your platform. We're just building it.
          </p>
        </div>

        <div style={s.divider} />

        {/* For fans */}
        <div style={s.section}>
          <div style={s.sectionLabel}>For Fans</div>
          <h2 style={s.sectionTitle}>
            Closer to the artists you love.
          </h2>
          <p style={s.body}>
            Human Echo is where you find carefully curated music, films, books, and stories from independent 
            artists who are committed to doing quality work. Where you hear directly from the artists 
            themselves — not through a PR filter, but in their own words, on their own terms.
          </p>
          <p style={s.body}>
            When you buy something here, you're not streaming a fraction of a cent into 
            an algorithm. You're putting real money in the hands of the person who made 
            something you love. That matters. A lot.
          </p>
        </div>

        <div style={s.divider} />

        {/* CTA */}
        <div style={s.cta}>
          <h2 style={s.ctaTitle}>Ready to explore?</h2>
          <p style={s.ctaBody}>
            Discover music, films, books and stories from independent artists 
            who are doing things their own way.
          </p>
          <div style={s.btnRow}>
            <Link href="/music" style={s.btn}>Browse Music</Link>
            <Link href="/" style={s.btnOutline}>Back to Home</Link>
          </div>
        </div>

      </div>
    </div>
  )
}
