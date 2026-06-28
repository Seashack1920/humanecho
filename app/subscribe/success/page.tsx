'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SubscribeSuccessPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const check = async () => {
      // Wait a moment for webhook to process
      await new Promise(r => setTimeout(r, 2000))
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
      setLoading(false)
    }
    check()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '480px', width: '90%', textAlign: 'center', padding: '48px 32px', background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px solid var(--border)' }}>
        {loading ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Setting up your account...</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Just a moment while we confirm your subscription.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎵</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>Welcome to Human Echo!</div>
            <div style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '32px' }}>
              Your subscription is active. Unlimited listening, playlist building, and everything Human Echo has to offer — it's all yours.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
              <button onClick={() => router.push('/music')} style={{ padding: '14px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
                Start Listening →
              </button>
              <button onClick={() => router.push('/account')} style={{ padding: '12px', borderRadius: '10px', background: 'none', color: 'var(--text-muted)', fontSize: '14px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                View My Account
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
