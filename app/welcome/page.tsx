'use client'

// The "front porch" — a simple, cinematic first impression for newcomers.
// Primary goal: capture an email. Secondary: a small taste of the artists,
// NOT the full catalog. Built standalone at /welcome; wiring it in as the true
// entry (and gating the catalog) is a separate, later decision.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type FeaturedArtist = { id: string; name: string; photo_url: string | null; creator_label: string | null }

export default function WelcomePage() {
  const router = useRouter()
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading]     = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]         = useState('')
  const [artists, setArtists]     = useState<FeaturedArtist[]>([])

  useEffect(() => {
    supabase.from('artists')
      .select('id, name, photo_url, creator_label')
      .eq('is_featured', true)
      .not('photo_url', 'is', null)
      .order('featured_order')
      .limit(5)
      .then(({ data }) => setArtists(data || []))
  }, [])

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) { setError('Please enter a valid email'); return }
    setLoading(true); setError('')
    try {
      const { error: dbError } = await supabase.from('email_captures').insert({
        email: email.trim().toLowerCase(),
        name: name.trim() || null,
        source: 'porch',
      })
      if (dbError && !dbError.message.includes('duplicate')) throw dbError
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HERO ── */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '120px 24px 72px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '14px', fontWeight: '500' }}>
          A new music platform
        </div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(40px, 8vw, 84px)', fontWeight: '700', lineHeight: '1', letterSpacing: '-0.02em', marginBottom: '18px' }}>
          Human Echo
        </h1>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(17px, 2.6vw, 24px)', color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', marginBottom: '16px' }}>
          New Music for a New Era
        </div>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', maxWidth: '460px', marginBottom: '40px' }}>
          Human-written songs, brought to life. Join the list to hear new artists and
          releases first — the full catalog opens to members.
        </p>

        {/* Email capture */}
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {submitted ? (
            <div style={{ padding: '32px', borderRadius: '16px', background: 'rgba(43,122,143,0.15)', border: '1px solid rgba(43,122,143,0.4)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', marginBottom: '8px' }}>You're in.</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                We'll keep you posted on new artists, releases, and when the doors open wider.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name (optional)"
                style={{ width: '100%', padding: '13px 15px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: 'white', fontSize: '15px', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
              <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} type="email" placeholder="Your email address *"
                style={{ width: '100%', padding: '13px 15px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: 'white', fontSize: '15px', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
              {error && <div style={{ fontSize: '13px', color: '#ff8a8a', textAlign: 'left' }}>{error}</div>}
              <button onClick={handleSubmit} disabled={loading}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '600', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, letterSpacing: '0.02em', fontFamily: 'DM Sans, sans-serif' }}>
                {loading ? 'Joining…' : 'Keep me posted'}
              </button>
            </div>
          )}
        </div>

        <a href="/login" style={{ marginTop: '28px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.25)', paddingBottom: '2px' }}>
          Already a member? Sign in
        </a>
      </div>

      {/* ── A FEW ARTISTS ── */}
      {artists.length > 0 && (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 100px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: '28px', fontWeight: '500' }}>
            A few of the voices
          </div>
          <div style={{ display: 'flex', gap: '28px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {artists.map(a => (
              <button key={a.id} onClick={() => router.push(`/artist/${a.id}`)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '120px', fontFamily: 'DM Sans, sans-serif' }}>
                <img src={a.photo_url || ''} alt={a.name} style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)' }} />
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'white', lineHeight: '1.2' }}>{a.name}</div>
                {a.creator_label && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{a.creator_label}</div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
