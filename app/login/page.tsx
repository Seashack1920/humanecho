'use client'

import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode]         = useState('password')
  const [sent, setSent]         = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [checking, setChecking] = useState(true)

  // Decide where a signed-in user should land, based on role.
  const routeByRole = async (userId) => {
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('role, artist_id')
        .eq('id', userId)
        .maybeSingle()
      if (prof?.role === 'admin' || prof?.artist_id) {
        router.push('/dashboard')
      } else {
        router.push('/profile')
      }
    } catch {
      router.push('/profile')
    }
  }

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
          if (data?.session?.user) { clearTimeout(timeout); await routeByRole(data.session.user.id); return }
        }
      }
      const { data } = await supabase.auth.getSession()
      if (data?.session?.user) { clearTimeout(timeout); await routeByRole(data.session.user.id); return }
      clearTimeout(timeout)
      setChecking(false)
    }

    handleHashToken()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        clearTimeout(timeout)
        routeByRole(session.user.id)
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

  const handleForgotPassword = async () => {
    if (!email) return setError('Enter your email above first, then click “Forgot password?”')
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(error.message)
    else setResetSent(true)
    setLoading(false)
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Signing you in...</div>
      </div>
    )
  }

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '8px' }}>
            Human Echo
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Sign in
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', padding: '40px 36px' }}>

          {resetSent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '20px' }}>🔑</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Check your email
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '28px' }}>
                If an account exists for <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>, we’ve sent a link to reset your password.
              </div>
              <button onClick={() => { setResetSent(false) }} style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Back to sign in
              </button>
            </div>
          ) : sent ? (
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
                {['password', 'magic'].map(m => (
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
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* Password field with show/hide + forgot link */}
              {mode === 'password' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                      placeholder="••••••••"
                      style={{ ...inputStyle, paddingRight: '46px' }}
                      onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px 8px', color: 'var(--text-muted)' }}
                    >
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      style={{ fontSize: '12px', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
                    >
                      Forgot password?
                    </button>
                  </div>
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
          Human Echo
        </div>
      </div>
    </div>
  )
}
