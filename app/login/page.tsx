'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode]         = useState<'password' | 'magic'>('password')
  const [sent, setSent]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

useEffect(() => {
  const timeout = setTimeout(() => setChecking(false), 2000)

  const handleHashToken = async () => {
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        const { data } = await supabase.auth.setSession({ access_token, refresh_token })
        if (data?.session) { clearTimeout(timeout); router.push('/dashboard'); return }
      }
    }
    const { data } = await supabase.auth.getSession()
    if (data?.session) { clearTimeout(timeout); router.push('/dashboard'); return }
    clearTimeout(timeout)
    setChecking(false)
  }

  handleHashToken()

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
      clearTimeout(timeout)
      router.push('/dashboard')
    }
  })

  return () => { subscription.unsubscribe(); clearTimeout(timeout) }
}, [])

  const handlePasswordLogin = async () => {
    if (!email || !password) return setError('Please enter your email and password.')
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleMagicLink = async () => {
    if (!email) return setError('Please enter your email address.')
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Signing you in...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '8px' }}>
            Human Echo
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            Artist Portal
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', padding: '40px 36px' }}>

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '20px' }}>✉️</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Check your email
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '28px' }}>
                We sent a magic link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. Click it to sign in.
              </div>
              <button onClick={() => { setSent(false); setEmail('') }} style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '24px' }}>
                Sign in
              </div>

              {/* Mode toggle */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--bg-card)', borderRadius: '10px', padding: '4px' }}>
                {(['password', 'magic'] as const).map(m => (
                  <button key={m} onClick={() => { setMode(m); setError(null) }} style={{ flex: 1, padding: '8px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', background: mode === m ? 'var(--bg-secondary)' : 'transparent', color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                    {m === 'password' ? 'Password' : 'Magic link'}
                  </button>
                ))}
              </div>

              {error && (
                <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.2)', color: '#dc3c3c', fontSize: '13px', marginBottom: '20px' }}>
                  {error}
                </div>
              )}

              {/* Email field */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && mode === 'password' && handlePasswordLogin()}
                  placeholder="you@example.com"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* Password field */}
              {mode === 'password' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              )}

              <button
                onClick={mode === 'password' ? handlePasswordLogin : handleMagicLink}
                disabled={loading}
                style={{ width: '100%', padding: '13px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '500', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Please wait...' : mode === 'password' ? 'Sign in →' : 'Send magic link →'}
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Human Echo Artist Portal — invite only
        </div>
      </div>
    </div>
  )
}
