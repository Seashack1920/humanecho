'use client'

/**
 * Admin → Artist Accounts.
 * Links an existing user account to an artist record so that person can log in
 * and manage their own catalog (dashboard, uploads, bulk drop). The artist must
 * have signed up first; this connects their login to the artist profile.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Artist = { id: string; name: string }
type User = { id: string; email: string; full_name: string | null; role: string | null; artist_id: string | null; is_subscriber: boolean | null }

export default function ArtistLinksAdmin() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [users, setUsers]     = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState<string | null>(null)
  const [pick, setPick]       = useState<Record<string, string>>({})
  const [msg, setMsg]         = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const call = async (body: any) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const res = await fetch('/api/admin/link-artist', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const d = await res.json()
    if (!res.ok) throw new Error(d.error || 'Request failed')
    return d
  }

  const load = async () => {
    try { const d = await call({ action: 'list' }); setArtists(d.artists); setUsers(d.users) }
    catch (e) { setMsg({ type: 'error', text: (e as Error).message }) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const linkedUser = (artistId: string) => users.find(u => u.artist_id === artistId)

  const doLink = async (artistId: string) => {
    const userId = pick[artistId]
    if (!userId) { setMsg({ type: 'error', text: 'Choose a user to link.' }); return }
    setBusy(artistId); setMsg(null)
    try { await call({ action: 'link', artistId, userId }); await load(); setMsg({ type: 'success', text: 'Linked. That person can now log in and manage this artist.' }) }
    catch (e) { setMsg({ type: 'error', text: (e as Error).message }) }
    setBusy(null)
  }
  const doUnlink = async (artistId: string) => {
    setBusy(artistId); setMsg(null)
    try { await call({ action: 'unlink', artistId }); await load(); setMsg({ type: 'success', text: 'Unlinked.' }) }
    catch (e) { setMsg({ type: 'error', text: (e as Error).message }) }
    setBusy(null)
  }

  if (loading) return <div style={{ ...s.page, color: 'var(--text-muted)', textAlign: 'center', paddingTop: '80px' }}>Loading…</div>

  const unlinkedUsers = users.filter(u => !u.artist_id && u.role !== 'admin')

  return (
    <div style={s.page}>
      <div style={s.navRow}>
        <div>
          <h1 style={s.h1}>Artist Accounts</h1>
          <p style={s.subtitle}>Connect a signed-up user to an artist so they can log in and manage their own catalog. The person must create an account first — then link them here.</p>
        </div>
        <Link href="/admin/content" style={s.link}>← Content</Link>
      </div>

      {msg && <div style={{ ...s.banner, background: msg.type === 'success' ? 'rgba(52,168,83,0.12)' : 'rgba(220,60,60,0.12)', color: msg.type === 'success' ? '#34a853' : '#dc3c3c' }}>{msg.text}</div>}

      {unlinkedUsers.length === 0 && !artists.some(a => linkedUser(a.id)) && (
        <div style={s.note}>No non-admin user accounts to link yet. Once an artist signs up, they'll appear in the dropdowns below.</div>
      )}

      <div style={s.list}>
        {artists.map(a => {
          const lu = linkedUser(a.id)
          return (
            <div key={a.id} style={s.row}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={s.artistName}>{a.name}</div>
                {lu ? (
                  <div style={s.linked}>
                    ✓ {lu.email}{lu.full_name ? ` · ${lu.full_name}` : ''}
                    {!lu.is_subscriber && <span style={s.warn}> · not a subscriber (can log in, uploading needs a membership)</span>}
                  </div>
                ) : (
                  <div style={s.unlinked}>Not linked — no one can manage this artist's catalog</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                {lu ? (
                  <button onClick={() => doUnlink(a.id)} disabled={busy === a.id} style={s.btnDanger}>{busy === a.id ? '…' : 'Unlink'}</button>
                ) : (
                  <>
                    <select value={pick[a.id] || ''} onChange={e => setPick(p => ({ ...p, [a.id]: e.target.value }))} style={s.select}>
                      <option value="">— choose user —</option>
                      {unlinkedUsers.map(u => <option key={u.id} value={u.id}>{u.email}{u.full_name ? ` (${u.full_name})` : ''}{u.is_subscriber ? '' : ' · no sub'}</option>)}
                    </select>
                    <button onClick={() => doLink(a.id)} disabled={busy === a.id || !pick[a.id]} style={s.btn}>{busy === a.id ? '…' : 'Link'}</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: '820px', margin: '0 auto', padding: '32px 24px 80px', fontFamily: 'DM Sans, sans-serif' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' },
  h1: { fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0', maxWidth: '580px', lineHeight: 1.5 },
  link: { fontSize: '14px', color: 'var(--accent-primary)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 },
  banner: { padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '18px' },
  note: { fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 14px', border: '1px dashed var(--border)', borderRadius: '10px', marginBottom: '18px' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', padding: '14px 16px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-secondary)' },
  artistName: { fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' },
  linked: { fontSize: '12.5px', color: 'var(--accent-primary)', marginTop: '3px' },
  warn: { color: 'var(--accent-gold)' },
  unlinked: { fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px', fontStyle: 'italic' },
  select: { padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '13px', maxWidth: '260px' },
  btn: { padding: '8px 16px', borderRadius: '999px', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  btnDanger: { padding: '8px 16px', borderRadius: '999px', border: '1px solid var(--border)', background: 'transparent', color: '#dc3c3c', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
}
