'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getStorefront } from '@/lib/storefronts'

export default function StoreSuccessPage() {
  const params = useParams()
  const slug = String(params.brand || '')
  const store = getStorefront(slug)
  const sessionId = useSearchParams().get('session_id') || ''

  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [data, setData] = useState<{ token: string; title: string; email: string | null } | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!sessionId) { setState('error'); setMsg('Missing order reference.'); return }
    ;(async () => {
      try {
        const res = await fetch('/api/store/order', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error || 'Could not confirm your order.')
        setData(d); setState('ok')
      } catch (e) { setMsg((e as Error).message); setState('error') }
    })()
  }, [sessionId])

  const accent = store?.accent || '#e8743b'
  const ink = store?.ink || '#2a2320'
  const bg = store?.bg || '#fffaf2'

  return (
    <div style={{ minHeight: '100vh', marginTop: '-70px', background: bg, color: ink, fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '480px', textAlign: 'center' }}>
        {state === 'loading' && <div style={{ color: `${ink}99` }}>Confirming your order…</div>}

        {state === 'error' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>😕</div>
            <h1 style={{ fontSize: '26px', margin: '0 0 8px' }}>Something went sideways</h1>
            <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: `${ink}aa` }}>{msg} If you were charged, check your email for the download link, or contact us.</p>
            <p style={{ marginTop: '20px' }}><a href={`/store/${slug}`} style={{ color: accent }}>← Back to {store?.name || 'the store'}</a></p>
          </>
        )}

        {state === 'ok' && data && (
          <>
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>🎉</div>
            <h1 style={{ fontSize: 'clamp(24px, 5vw, 32px)', margin: '0 0 10px' }}>Thank you!</h1>
            <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: `${ink}bb`, lineHeight: 1.6 }}>
              Your download of <strong>{data.title}</strong> is ready{data.email ? <>, and we've emailed a copy of the link to <strong>{data.email}</strong></> : ''}.
            </p>
            <p style={{ marginTop: '24px' }}>
              <a href={`/api/store/download?token=${data.token}`}
                style={{ display: 'inline-block', fontFamily: 'system-ui, sans-serif', padding: '14px 30px', borderRadius: '999px', background: accent, color: '#fff', textDecoration: 'none', fontSize: '15px', fontWeight: 700 }}>
                Download now
              </a>
            </p>
            <p style={{ marginTop: '18px', fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: `${ink}88` }}>Keep the email — the link works again anytime.</p>
            <p style={{ marginTop: '18px' }}><a href={`/store/${slug}`} style={{ color: accent, fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>← Back to {store?.name || 'the store'}</a></p>
          </>
        )}
      </div>
    </div>
  )
}
