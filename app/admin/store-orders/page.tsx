'use client'

/**
 * Admin → Store Orders. Guest storefront purchases (who bought what), with a
 * resend-download-link action. Read-only otherwise.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { STOREFRONTS } from '@/lib/storefronts'

type Order = {
  id: string; storefront: string; product_title: string; email: string | null
  amount: number | null; status: string; emailed_at: string | null; created_at: string
  download_token: string
}

export default function StoreOrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([])
  const [revenue, setRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const call = async (body: any) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const res = await fetch('/api/admin/store-orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const d = await res.json()
    if (!res.ok) throw new Error(d.error || 'Request failed')
    return d
  }

  const load = async () => {
    try { const d = await call({ action: 'list' }); setOrders(d.orders); setRevenue(d.revenue) }
    catch (e) { setMsg({ type: 'error', text: (e as Error).message }) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const resend = async (id: string) => {
    setBusy(id); setMsg(null)
    try { await call({ action: 'resend', orderId: id }); await load(); setMsg({ type: 'success', text: 'Download link re-sent.' }) }
    catch (e) { setMsg({ type: 'error', text: (e as Error).message }) }
    setBusy(null)
  }

  const copyLink = (o: Order) => {
    const site = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '')
    navigator.clipboard.writeText(`${site}/api/store/download?token=${o.download_token}`)
    setCopied(o.id); setTimeout(() => setCopied(null), 1800)
  }

  const storeName = (slug: string) => STOREFRONTS[slug]?.name || slug
  const when = (iso: string) => new Date(iso).toLocaleString()
  const money = (n: number | null) => n != null ? `$${Number(n).toFixed(2)}` : '—'

  if (loading) return <div style={{ ...s.page, color: 'var(--text-muted)', textAlign: 'center', paddingTop: '80px' }}>Loading…</div>

  return (
    <div style={s.page}>
      <div style={s.navRow}>
        <div>
          <h1 style={s.h1}>Store Orders</h1>
          <p style={s.subtitle}>{orders.length} orders · {money(revenue)} collected · standalone storefront purchases (guest checkout)</p>
        </div>
        <Link href="/admin/content" style={s.link}>← Content</Link>
      </div>

      {msg && <div style={{ ...s.banner, background: msg.type === 'success' ? 'rgba(52,168,83,0.12)' : 'rgba(220,60,60,0.12)', color: msg.type === 'success' ? '#34a853' : '#dc3c3c' }}>{msg.text}</div>}

      {orders.length === 0 ? (
        <div style={s.empty}>No store orders yet.</div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>When</th>
                <th style={s.th}>Store</th>
                <th style={s.th}>Item</th>
                <th style={s.th}>Buyer</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Amount</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ ...s.td, whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '12px' }}>{when(o.created_at)}</td>
                  <td style={s.td}>{storeName(o.storefront)}</td>
                  <td style={{ ...s.td, fontWeight: 500 }}>{o.product_title}</td>
                  <td style={{ ...s.td, fontSize: '13px' }}>
                    {o.email || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    {o.emailed_at && <div style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>✓ emailed</div>}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(o.amount)}</td>
                  <td style={{ ...s.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => copyLink(o)} style={s.btnGhost} title="Copy the download link">{copied === o.id ? '✓' : '🔗'}</button>
                    <button onClick={() => resend(o.id)} disabled={busy === o.id || !o.email} style={s.btnGhost} title="Email the download link again">{busy === o.id ? '…' : '✉ Resend'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: '900px', margin: '0 auto', padding: '32px 24px 80px', fontFamily: 'DM Sans, sans-serif' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' },
  h1: { fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0' },
  link: { fontSize: '14px', color: 'var(--accent-primary)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 },
  banner: { padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '18px' },
  empty: { fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px 0' },
  tableWrap: { border: '1px solid var(--border)', borderRadius: '12px', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', whiteSpace: 'nowrap' },
  td: { padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', verticalAlign: 'top' },
  btnGhost: { marginLeft: '6px', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' },
}
