'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const AUDIO_TRACKS = [
  'https://res.cloudinary.com/dw6eudaur/video/upload/v1780804172/harper-leigh/albums/singles/01-asphalt-zen/r5d8oljfvegzkq2d2ncm.wav',
  'https://res.cloudinary.com/dw6eudaur/video/upload/v1780804078/harper-leigh/albums/singles/00-golden-meadow/gkwmusjoird0iewld6ay.wav',
  'https://res.cloudinary.com/dw6eudaur/video/upload/v1780803948/harper-leigh/albums/singles/00-latenight-lullaby/v0gvc56dmiwgkwkxpsue.wav',
]

const BG_VIDEO = 'https://res.cloudinary.com/dw6eudaur/video/upload/v1780803982/harper-leigh/albums/singles/00-latenight-lullaby/q8mnlvmfd905alxgc8fw.mov'

export default function HoldingPage() {
  const [email, setEmail]       = useState('')
  const [name, setName]         = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [muted, setMuted]       = useState(true)
  const [trackIndex, setTrackIndex] = useState(0)
  const [audioReady, setAudioReady] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Set up audio rotation
  useEffect(() => {
    const audio = new Audio(AUDIO_TRACKS[0])
    audio.muted = true
    audio.volume = 0.4
    audio.play().catch(() => {})
    audioRef.current = audio
    setAudioReady(true)

    audio.onended = () => {
      setTrackIndex(prev => {
        const next = (prev + 1) % AUDIO_TRACKS.length
        audio.src = AUDIO_TRACKS[next]
        audio.play().catch(() => {})
        return next
      })
    }

    return () => { audio.pause(); audio.src = '' }
  }, [])

  // Sync mute state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted
      if (!muted) {
        // Fade in
        audioRef.current.volume = 0
        const fade = setInterval(() => {
          if (!audioRef.current) { clearInterval(fade); return }
          if (audioRef.current.volume < 0.38) {
            audioRef.current.volume = Math.min(0.4, audioRef.current.volume + 0.04)
          } else {
            clearInterval(fade)
          }
        }, 80)
      }
    }
  }, [muted])

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) { setError('Please enter a valid email'); return }
    setLoading(true); setError('')
    try {
      const { error: dbError } = await supabase.from('email_captures').insert({
        email: email.trim().toLowerCase(),
        name: name.trim() || null,
        source: 'holding_page',
      })
      if (dbError && !dbError.message.includes('duplicate')) throw dbError
      setSubmitted(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#0a0a0b', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── VIDEO BACKGROUND ── */}
      <video
        ref={videoRef}
        src={BG_VIDEO}
        autoPlay
        loop
        muted
        playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }}
      />

      {/* ── OVERLAYS ── */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.6) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)' }} />

      {/* ── CONTENT ── */}
      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>

        {/* Logo */}
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', fontWeight: '500' }}>
            Coming Soon
          </div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 7vw, 80px)', fontWeight: '700', color: 'white', lineHeight: '1', letterSpacing: '-0.02em' }}>
            Human Echo
          </div>
        </div>

        {/* Tagline */}
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(16px, 2.5vw, 24px)', color: 'rgba(255,255,255,0.65)', marginBottom: '56px', textAlign: 'center', fontStyle: 'italic', maxWidth: '500px', lineHeight: '1.4' }}>
          New Music for a New Era
        </div>

        {/* Email capture */}
        <div style={{ width: '100%', maxWidth: '440px' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '32px', borderRadius: '16px', background: 'rgba(43,122,143,0.15)', border: '1px solid rgba(43,122,143,0.4)', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'white', marginBottom: '8px' }}>You're in.</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                We'll let you know the moment Human Echo goes live. Something special is coming.
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '32px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', marginBottom: '20px', textAlign: 'center', lineHeight: '1.6' }}>
                Get early access — be first to hear what's coming.
              </div>

              {error && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(220,60,60,0.2)', border: '1px solid rgba(220,60,60,0.4)', color: '#ff8080', fontSize: '13px', marginBottom: '14px', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }}
                  onFocus={e => e.target.style.borderColor = 'rgba(43,122,143,0.8)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
                <input
                  type="email"
                  placeholder="Your email address *"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }}
                  onFocus={e => e.target.style.borderColor = 'rgba(43,122,143,0.8)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
                <button onClick={handleSubmit} disabled={loading}
                  style={{ width: '100%', padding: '13px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '600', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s', letterSpacing: '0.02em' }}>
                  {loading ? 'Saving...' : 'Get Early Access'}
                </button>
              </div>

              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '12px', textAlign: 'center' }}>
                No spam. Unsubscribe anytime.
              </div>
            </div>
          )}
        </div>

        {/* Nav hint */}
        <div style={{ marginTop: '40px', display: 'flex', gap: '24px', flexWrap: 'wrap' as const, justifyContent: 'center' }}>
          {['Music', 'Stories', 'Cinema', 'Escapes'].map(label => (
            <span key={label} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>{label}</span>
          ))}
        </div>

      </div>

      {/* ── AUDIO CONTROLS ── */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 20, display: 'flex', alignItems: 'center', gap: '10px' }}>
        {!muted && (
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>
            {['Asphalt Zen', 'Golden Meadow', 'Late Night Lullaby'][trackIndex]}
          </div>
        )}
        <button onClick={() => setMuted(m => !m)}
          style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
          title={muted ? 'Unmute ambient music' : 'Mute'}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* ── BOTTOM CREDIT ── */}
      <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 20, fontSize: '11px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>
        © {new Date().getFullYear()} Human Echo Music
      </div>

    </div>
  )
}
