'use client'

/**
 * Admin → Share the Echo.
 *
 * Phase 1 dashboard for the referral program: a leaderboard of who's sharing
 * (share-button clicks), whose links actually bring people back (attributed
 * visits), and — once Phase 2 lands — who drives sign-ups (conversions).
 * Use it to spot top sharers and thank/gift them manually.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Row = { referrer_id: string; full_name: string | null; referral_code: string; shares: number; visits: number; conversions: number }
type ShareEvent = { id: string; platform: string | null; campaign: string | null; created_at: string; referral_code: string | null }
type Visit = { id: string; referral_code: string; landing_path: string | null; utm_source: string | null; created_at: string }

export default function ReferralsAdmin() {
  const [rows, setRows]       = useState<Row[]>([])
  const [shares, setShares]   = useState<ShareEvent[]>([])
  const [visits, setVisits]   = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const [lb, sh, vs] = await Promise.all([
        supabase.rpc('referral_leaderboard'),
        supabase.from('share_events').select('id, platform, campaign, created_at, referral_code').order('created_at', { ascending: false }).limit(25),
        supabase.from('referral_visits').select('id, referral_code, landing_path, utm_source, created_at').order('created_at', { ascending: false }).limit(25),
      ])
      if (lb.error) setErr(lb.error.message)
      setRows((lb.data as Row[]) || [])
      setShares((sh.data as ShareEvent[]) || [])
      setVisits((vs.data as Visit[]) || [])
      setLoading(false)
    })()
  }, [])

  const totals = rows.reduce((a, r) => ({ shares: a.shares + Number(r.shares), visits: a.visits + Number(r.visits), conversions: a.conversions + Number(r.conversions) }), { shares: 0, visits: 0, conversions: 0 })
  const when = (iso: string) => new Date(iso).toLocaleString()

  if (loading) return <div style={{ ...s.page, color: 'var(--text-muted)', textAlign: 'center', paddingTop: '80px' }}>Loading…</div>

  return (
    <div style={s.page}>
      <div style={s.navRow}>
        <div>
          <h1 style={s.h1}>Share the Echo</h1>
          <p style={s.subtitle}>Who's spreading Human Echo — and whose links bring people back. Thank your top sharers.</p>
        </div>
        <Link href="/admin/content" style={s.link}>← Content</Link>
      </div>

      {err && <div style={s.err}>{err}</div>}

      <div style={s.stats}>
        <Stat label="Shares" value={totals.shares} hint="share-button clicks" />
        <Stat label="Click-throughs" value={totals.visits} hint="visits from shared links" />
        <Stat label="Sign-ups" value={totals.conversions} hint="Phase 2" />
      </div>

      <h2 style={s.h2}>Leaderboard</h2>
      {rows.length === 0 ? (
        <div style={s.empty}>No shares or referral visits yet. Once people share from the homepage, they'll appear here.</div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Sharer</th>
                <th style={s.th}>Code</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Shares</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Click-throughs</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Sign-ups</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.referrer_id}>
                  <td style={s.td}>{r.full_name || <span style={{ color: 'var(--text-muted)' }}>(no name)</span>}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{r.referral_code}</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>{r.shares}</td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>{r.visits}</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>{r.conversions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={s.twoCol}>
        <div>
          <h2 style={s.h2}>Recent shares</h2>
          {shares.length === 0 ? <div style={s.empty}>None yet.</div> : (
            <ul style={s.feed}>
              {shares.map(e => (
                <li key={e.id} style={s.feedItem}>
                  <span style={s.badge}>{e.platform || '—'}</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '12px' }}>{e.referral_code || '—'}</span>
                  <span style={s.feedTime}>{when(e.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 style={s.h2}>Recent click-throughs</h2>
          {visits.length === 0 ? <div style={s.empty}>None yet.</div> : (
            <ul style={s.feed}>
              {visits.map(v => (
                <li key={v.id} style={s.feedItem}>
                  <span style={s.badge}>{v.utm_source || 'link'}</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '12px' }}>{v.referral_code}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{v.landing_path || '/'}</span>
                  <span style={s.feedTime}>{when(v.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div style={s.stat}>
      <div style={{ fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{hint}</div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: '860px', margin: '0 auto', padding: '32px 24px 80px', fontFamily: 'DM Sans, sans-serif' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '22px' },
  h1: { fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  h2: { fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '28px 0 12px' },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0', maxWidth: '560px', lineHeight: 1.5 },
  link: { fontSize: '14px', color: 'var(--accent-primary)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 },
  err: { padding: '10px 14px', borderRadius: '10px', background: 'rgba(220,60,60,0.12)', color: '#dc3c3c', fontSize: '13px', marginBottom: '16px' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' },
  stat: { border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', background: 'var(--bg-secondary)', textAlign: 'center' },
  tableWrap: { border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '12px 14px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' },
  td: { padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' },
  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' },
  feed: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
  feedItem: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg-secondary)' },
  feedTime: { marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' },
  badge: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-primary)' },
  empty: { fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' },
}
