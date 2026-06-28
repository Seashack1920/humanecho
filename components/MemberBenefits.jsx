'use client'

/**
 * MemberBenefits — the panel that expands below the homepage conversion block
 * when a visitor clicks "Explore Member Benefits."
 *
 * Self-contained. Pass `open` and it animates in/out (grid-rows technique,
 * same as ArtistInvite). The "Become a member" button routes to /subscribe.
 *
 * The square video is a PLACEHOLDER for now — drop a Cloudinary URL into
 * VIDEO_URL later and it renders automatically.
 */

import { useRouter } from 'next/navigation'

// When you have it, paste a Cloudinary video URL here (square / 1:1 works best):
const VIDEO_URL = null

const BENEFITS = [
  {
    icon: '♪',
    title: 'Share your work',
    body: 'Upload songs, albums, books, stories, and films. Let us be your echo in the universe.',
  },
  {
    icon: '◇',
    title: 'Get paid for it',
    body: 'Sell your work or receive tips. We take just 15% on sales — your 85% goes straight to you, and we take nothing from tips.',
  },
  {
    icon: '▶',
    title: 'Enter the music video contest',
    body: 'Make a video for one of our songs. Winners are featured across the site — and become the song’s official video.',
  },
  {
    icon: '✦',
    title: 'Get the Human Echo Gazette',
    body: 'Right in your inbox: the freshest tracks, hot artists, films and stories, contest updates, and more.',
  },
  {
    icon: '❋',
    title: 'Your very own Wonder Bundle',
    body: 'A gift, just for members. You won’t know what delights are inside until you open it.',
  },
  {
    icon: '✧',
    title: 'Enjoy our gratitude',
    body: 'When you take part, the Human Echo community learns your name. We recognize the people who show up for the arts.',
  },
]

export default function MemberBenefits({ open }) {
  const router = useRouter()

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.45s ease',
      }}
      aria-hidden={!open}
    >
      <div style={{ overflow: 'hidden' }}>
        <div
          style={{
            marginTop: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* gold-to-coral hairline signature, consistent with other panels */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-secondary))', zIndex: 2 }} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.1fr)',
              gap: 'clamp(24px, 4vw, 48px)',
              padding: 'clamp(28px, 4vw, 48px)',
              alignItems: 'center',
            }}
            className="member-benefits-grid"
          >
            {/* ── LEFT: square video ── */}
            <div style={{ width: '100%' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-primary))',
                  border: '1px solid var(--border)',
                }}
              >
                {VIDEO_URL ? (
                  <video
                    src={VIDEO_URL}
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      ▶
                    </div>
                    <span style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Video coming soon
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: pitch + benefits + CTA ── */}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '10px' }}>
                Membership
              </div>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.15, margin: '0 0 20px', letterSpacing: '-0.02em' }}>
                Everything the community has to offer.
              </h3>

              <div style={{ display: 'grid', gap: '2px' }}>
                {BENEFITS.map((b, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start',
                      padding: '14px 0',
                      borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        color: 'var(--accent-gold)',
                        marginTop: '1px',
                      }}
                    >
                      {b.icon}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {b.title}
                      </div>
                      <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                        {b.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.push('/subscribe')}
                style={{
                  marginTop: '28px',
                  padding: '14px 32px',
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
            </div>
          </div>
        </div>
      </div>

      {/* stack the grid on narrow screens */}
      <style>{`
        @media (max-width: 720px) {
          .member-benefits-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
