'use client'

import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [ready, setReady]             = useState(false)   // recovery session established?
  const [done, setDone]               = useState(false)

  // When the user arrives from the reset email, Supabase puts a recovery
  // token in the URL. We establish that session so updateUser can work.
  useEffect(() => {
    const timeout = setTimeout(() => setReady(true), 2500)

    const establish = async () => {
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
        }
      }
      clearTimeout(timeout)
      setReady(true)
    }
    establish()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  const handleUpdate = async () => {
    if (!password || !confirm) return setError('Please enter and confirm your new password.')
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('Those passwords don’t match.')
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
    // Brief pause so they see the success, then send them in
    setTimeout(() => router.push('/profile'), 1600)
  }

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '8px' }}>
            Human Echo
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Reset password
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', padding: '40px 36px' }}>

          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '20px' }}>✓</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Password updated
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                Taking you to your page…
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Choose a new password
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
                Enter a new password for your account below.
              </div>

              {error && (
                <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.2)', color: '#dc3c3c', fontSize: '13px', marginBottom: '20px' }}>
                  {error}
                </div>
              )}

              {/* New password */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  New password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
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
              </div>

              {/* Confirm password */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Confirm new password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUpdate()}
                  placeholder="Type it again"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <button
                onClick={handleUpdate}
                disabled={loading || !ready}
                style={{ width: '100%', padding: '13px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '500', border: 'none', cursor: (loading || !ready) ? 'not-allowed' : 'pointer', opacity: (loading || !ready) ? 0.7 : 1 }}
              >
                {loading ? 'Saving...' : !ready ? 'Preparing...' : 'Update password →'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <a href="/login" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'underline' }}>
                  Back to sign in
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
