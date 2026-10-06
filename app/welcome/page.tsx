'use client'

// The "front porch" — a simple, cinematic first impression for newcomers.
// Primary goal: capture an email. Secondary: a small taste — a few hand-picked
// songs (set in Admin → Site Settings → Front porch songs), NOT the full catalog.
// Built standalone at /welcome; wiring it in as the true entry (and gating the
// catalog) is a separate, later decision.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useDefaultTrackImage } from '@/lib/siteSettings'

type PorchSong = { id: string; title: string; track_image_url: string | null; artist_id: string | null; artist_name?: string }

export default function WelcomePage() {
  const router = useRouter()
  const defaultImg = useDefaultTrackImage()
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading]     = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]         = useState('')
  const [songs, setSongs]         = useState<PorchSong[]>([])

  useEffect(() => {
    const load = async () => {
      const sel = 'id, title, track_image_url, artist_id'

      // 1) Admin's hand-picked porch songs (ordered), from site_settings.
      const { data: pp } = await supabase.from('site_settings').select('value').eq('key', 'porch_picks').maybeSingle()
      let ids: string[] = []
      try { ids = pp?.value ? JSON.parse(pp.value) : [] } catch { ids = [] }

      let rows: PorchSong[] = []
      if (ids.length) {
        const { data } = await supabase.from('tracks').select(sel).in('id', ids).eq('status', 'published')
        const byId = Object.fromEntries((data || []).map(t => [t.id, t as PorchSong]))
        rows = ids.map(id => byId[id]).filter(Boolean) as PorchSong[]  // preserve admin's order
      }
      // 2) Fallback so the porch is never empty: featured tracks, then most recent.
      if (!rows.length) {
        const { data: feat } = await supabase.from('tracks').select(sel).eq('status', 'published').eq('is_featured', true).limit(5)
        rows = (feat || []) as PorchSong[]
      }
      if (!rows.length) {
        const { data: recent } = await supabase.from('tracks').select(sel).eq('status', 'published').order('created_at', { ascending: false }).limit(5)
        rows = (recent || []) as PorchSong[]
      }

      const aids = [...new Set(rows.map(r => r.artist_id).filter(Boolean))] as string[]
      let names: Record<string, string> = {}
      if (aids.length) {
        const { data: arts } = await supabase.from('artists').select('id, name').in('id', aids)
        names = Object.fromEntries((arts || []).map(a => [a.id, a.name]))
      }
      setSongs(rows.map(r => ({ ...r, artist_name: r.artist_id ? names[r.artist_id] : undefined })))
    }
    load()
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
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '120px 24px 64px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
        <a href="/beta" style={{ marginTop: '14px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '2px' }}>
          Official Beta Tester? Enter here →
        </a>
      </div>

      {/* ── A FEW SONGS ── a taste, not the catalog */}
      {songs.length > 0 && (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 100px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: '28px', fontWeight: '500' }}>
            A few songs to start
          </div>
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {songs.map(song => (
              <button key={song.id} onClick={() => router.push(`/song/${song.id}`)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '150px', fontFamily: 'DM Sans, sans-serif' }}>
                <div style={{ position: 'relative', width: '150px', height: '150px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                  <img src={song.track_image_url || defaultImg || ''} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', color: '#0a0a0b' }}>▶</div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'white', lineHeight: '1.25', textAlign: 'center' }}>{song.title}</div>
                {song.artist_name && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{song.artist_name}</div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
