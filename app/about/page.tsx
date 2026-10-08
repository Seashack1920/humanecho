'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DEFAULT_ABOUT, mergeAbout, type AboutContent } from '@/lib/aboutContent'

export default function AboutPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [content, setContent] = useState<AboutContent>(DEFAULT_ABOUT)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key', 'about_content').maybeSingle()
      .then(({ data }) => {
        if (!data?.value) return
        try { setContent(mergeAbout(JSON.parse(data.value))) } catch { /* keep defaults */ }
      })
  }, [])

  const s = {
    hero: {
      padding: isMobile ? '80px 24px 60px' : '110px 32px 80px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      textAlign: 'center' as const,
    },
    eyebrow: {
      fontSize: '11px', fontWeight: '500' as const, letterSpacing: '2px',
      textTransform: 'uppercase' as const, color: 'var(--accent-gold)', marginBottom: '20px',
    },
    heroTitle: {
      fontFamily: 'Playfair Display, serif', fontSize: isMobile ? '40px' : '68px',
      fontWeight: '700' as const, color: 'var(--text-primary)', lineHeight: '1.05',
      letterSpacing: '-2px', maxWidth: '820px', margin: '0 auto 24px',
    },
    heroSub: {
      fontSize: isMobile ? '17px' : '20px', color: 'var(--text-secondary)',
      lineHeight: '1.7', maxWidth: '640px', margin: '0 auto',
    },
    page: { maxWidth: '760px', margin: '0 auto', padding: isMobile ? '48px 24px' : '80px 32px' },
    section: { marginBottom: isMobile ? '56px' : '76px' },
    sectionLabel: {
      fontSize: '11px', fontWeight: '500' as const, letterSpacing: '2px',
      textTransform: 'uppercase' as const, color: 'var(--accent-gold)', marginBottom: '16px',
    },
    sectionTitle: {
      fontFamily: 'Playfair Display, serif', fontSize: isMobile ? '28px' : '38px',
      fontWeight: '700' as const, color: 'var(--text-primary)', lineHeight: '1.15',
      letterSpacing: '-1px', marginBottom: '20px',
    },
    body: { fontSize: '17px', color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '18px' },
    divider: { height: '1px', background: 'var(--border)', margin: isMobile ? '48px 0' : '68px 0' },
    cta: {
      padding: isMobile ? '40px 24px' : '56px 48px', borderRadius: '20px',
      background: 'var(--bg-secondary)', border: '1px solid var(--border)', textAlign: 'center' as const,
    },
    ctaTitle: {
      fontFamily: 'Playfair Display, serif', fontSize: isMobile ? '28px' : '36px',
      fontWeight: '700' as const, color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '-0.5px',
    },
    ctaBody: {
      fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.7',
      maxWidth: '480px', margin: '0 auto 32px',
    },
    btnRow: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' as const },
    btn: {
      padding: '14px 32px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white',
      fontSize: '15px', fontWeight: '500' as const, textDecoration: 'none', display: 'inline-block',
    },
    btnOutline: {
      padding: '14px 32px', borderRadius: '8px', background: 'none', color: 'var(--text-primary)',
      fontSize: '15px', fontWeight: '500' as const, textDecoration: 'none', display: 'inline-block',
      border: '1px solid var(--border)',
    },
  }

  const paras = (body: string) => body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)

  return (
    <div>
      <div style={s.hero}>
        <div style={s.eyebrow}>{content.hero.eyebrow}</div>
        <h1 style={s.heroTitle}>{content.hero.title}</h1>
        <p style={s.heroSub}>{content.hero.subhead}</p>
      </div>

      <div style={s.page}>
        {content.sections.map((sec, i) => (
          <div key={i}>
            <div style={s.section}>
              {sec.label && <div style={s.sectionLabel}>{sec.label}</div>}
              {sec.title && <h2 style={s.sectionTitle}>{sec.title}</h2>}
              {paras(sec.body).map((p, j) => <p key={j} style={s.body}>{p}</p>)}
            </div>
            {i < content.sections.length - 1 && <div style={s.divider} />}
          </div>
        ))}

        <div style={s.divider} />

        <div style={s.cta}>
          <h2 style={s.ctaTitle}>{content.cta.title}</h2>
          <p style={s.ctaBody}>{content.cta.body}</p>
          <div style={s.btnRow}>
            <Link href="/subscribe" style={s.btn}>Join Human Echo</Link>
            <Link href="/welcome" style={s.btnOutline}>Hear a few</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
