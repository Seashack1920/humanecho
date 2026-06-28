'use client'

/**
 * JoinBlock — the homepage conversion block (SIGNED-OUT / visitor state).
 *
 * Left  = become a FOLLOWER (free): "Join the party!" → /login (free signup)
 * Right = become a MEMBER (paid):  "Explore Member Benefits" toggles the
 *         MemberBenefits panel open below this block.
 *
 * Later, when login/session work is done, the homepage can show a different
 * (member welcome) block in place of this one for signed-in members.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MemberBenefits from './MemberBenefits'

export default function JoinBlock() {
  const router = useRouter()
  const [benefitsOpen, setBenefitsOpen] = useState(false)

  return (
    <section style={{ paddingBottom: '80px' }}>
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '24px',
          padding: 'clamp(40px, 6vw, 64px) clamp(28px, 5vw, 48px)',
          border: '1px solid var(--border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(43,122,143,0.08) 0%, transparent 70%)' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 'clamp(32px, 5vw, 64px)', alignItems: 'center', flexWrap: 'wrap' }}>

          {/* ── LEFT: Follower (free) ── */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-secondary)', fontWeight: 600, marginBottom: '12px' }}>
              Free to join
            </div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', lineHeight: 1.15 }}>
              Join the party!
            </div>
            <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '28px', lineHeight: 1.6 }}>
              It’s free, and we’ll send you a free Swag Bag.
            </div>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '14px 32px',
                borderRadius: '50px',
                background: 'var(--accent-primary)',
                color: 'white',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(43,122,143,0.4)',
              }}
            >
              Join Human Echo — it’s free
            </button>
          </div>

          {/* divider */}
          <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch', minHeight: '120px' }} className="join-divider" />

          {/* ── RIGHT: Member (paid) ── */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '12px' }}>
              Go deeper
            </div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', lineHeight: 1.2 }}>
              Or dive deep into the whole experience
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
              Enjoy the benefits of membership in our community.
            </div>
            <button
              onClick={() => setBenefitsOpen(o => !o)}
              aria-expanded={benefitsOpen}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '13px 28px',
                borderRadius: '50px',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '15px',
                fontWeight: 600,
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              Explore Member Benefits
              <span style={{ display: 'inline-block', transition: 'transform 0.3s ease', transform: benefitsOpen ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: '12px' }}>▾</span>
            </button>
          </div>
        </div>
      </div>

      {/* The expanding benefits panel, below the block */}
      <MemberBenefits open={benefitsOpen} />

      <style>{`
        @media (max-width: 720px) {
          .join-divider { display: none !important; }
        }
      `}</style>
    </section>
  )
}
