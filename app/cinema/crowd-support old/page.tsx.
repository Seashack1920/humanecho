'use client'

import { useRouter } from 'next/navigation'
import { usePlayer } from '@/context/PlayerContext'
import { useEffect } from 'react'

export default function CinemaCrowdSupportPage() {
  const router = useRouter()
  const { stop: stopPlayer } = usePlayer()

  useEffect(() => { stopPlayer() }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '80px 40px', maxWidth: '560px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎬</div>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '16px', fontWeight: '600' }}>Coming Soon</div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', lineHeight: '1.15' }}>
          Crowd Support for Independent Film
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '40px' }}>
          We're building a way for you to directly support independent filmmakers — from early development through to release. Be part of the story from day one.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/cinema')}
            style={{ padding: '12px 28px', borderRadius: '50px', background: 'var(--accent-primary)', color: 'white', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
            ← Back to Cinema
          </button>
          <button onClick={() => router.push('/cinema/films')}
            style={{ padding: '12px 28px', borderRadius: '50px', background: 'none', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500', border: '1px solid var(--border)', cursor: 'pointer' }}>
            Browse Films
          </button>
        </div>
      </div>
    </div>
  )
}
