'use client'

/**
 * "Are you an artist?" — homepage invitation panel.
 * A warm, collapsed invite that expands to reveal how to get involved.
 * Drop into the homepage (e.g. just before or after the Platform Hub section).
 *
 * Self-contained: no backend, no props required. Uses site CSS vars + fonts.
 *
 * Usage in app/page.tsx:
 *   import ArtistInvite from '@/components/ArtistInvite'
 *   ...then place <ArtistInvite /> inside the centered content container.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STEPS = [
  {
    icon: '✦',
    title: 'Become a member',
    body: 'Membership unlocks everything: upload your own work, build playlists you can share, and join a community that actually listens.',
  },
  {
    icon: '♪',
    title: 'Share your work',
    body: 'Songs, albums, books, stories, films — bring what you make. Let us be your echo in the universe.',
  },
  {
    icon: '◇',
    title: 'Get paid for it',
    body: 'Connect a payment account to sell your work or receive tips from people moved by it. We take only a small cut of 15%, and your 85% goes directly to you via Stripe.',
  },
  {
    icon: '▶',
    title: 'Enter the music video contest',
    body: 'Make a music video for one of our songs. Winners are featured across the site — and become the song’s official video.',
  },
  {
    icon: '✧',
    title: 'Enjoy our gratitude',
    body: 'When you get involved, the Human Echo community learns your name. We recognize the people who show up for the arts.',
  },
]

export default function ArtistInvite() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <section style={{ paddingBottom: '80px' }}>
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* warm accent hairline at top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-secondary))' }} />

        {/* The invitation header — always visible, the whole bar is the toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            padding: 'clamp(28px, 4vw, 44px) clamp(24px, 4vw, 48px)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '10px' }}>
              A place for makers
            </div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, margin: 0, letterSpacing: '-0.02em' }}>
              Are you an artist?
            </h2>
            <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--text-muted)', margin: '8px 0 0', fontStyle: 'italic' }}>
              If so, read this.
            </p>
          </div>

          <span
            aria-hidden
            style={{
              flexShrink: 0,
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: 'var(--text-primary)',
              transition: 'transform 0.3s ease, background 0.2s ease',
              transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
            }}
          >
            +
          </span>
        </button>

        {/* The expanding content */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: open ? '1fr' : '0fr',
            transition: 'grid-template-rows 0.4s ease',
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 clamp(24px, 4vw, 48px) clamp(28px, 4vw, 44px)' }}>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '640px', marginBottom: '32px' }}>
                Human Echo is built by and for people who make things — music, words, film, and everything human creativity touches. Here’s how to step in.
              </p>

              <div style={{ display: 'grid', gap: '4px' }}>
                {STEPS.map((step, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '18px',
                      alignItems: 'flex-start',
                      padding: '18px 0',
                      borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '15px',
                        color: 'var(--accent-gold)',
                        marginTop: '2px',
                      }}
                    >
                      {step.icon}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                        {step.title}
                      </h3>
                      <p style={{ fontSize: '14.5px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                        {step.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => router.push('/subscribe')}
                  style={{
                    padding: '13px 28px',
                    borderRadius: '50px',
                    background: 'var(--accent-primary)',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 8px 28px rgba(43,122,143,0.35)',
                  }}
                >
                  Become a member
                </button>
                <button
                  onClick={() => router.push('/contact')}
                  style={{
                    padding: '13px 28px',
                    borderRadius: '50px',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '15px',
                    fontWeight: 500,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  How we roll
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
