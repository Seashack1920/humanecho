'use client'

// Admin → Merch Shop. Curate the /merch showcase: the full-catalog store link,
// a blurb, and the hand-picked featured items (avatar-modeled image, title,
// price, and the link to that product's page on the hosted store). Stored in
// site_settings: merch_store_url, merch_blurb, merch_items (JSON).

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { uploadToCloudinary } from '@/lib/cloudinaryUpload'

type MerchItem = { image: string; title: string; price: string; url: string }

export default function MerchAdmin() {
  const [storeUrl, setStoreUrl] = useState('')
  const [blurb, setBlurb]       = useState('')
  const [items, setItems]       = useState<MerchItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('site_settings').select('key, value').in('key', ['merch_store_url', 'merch_blurb', 'merch_items'])
      const m = Object.fromEntries((data || []).map(r => [r.key, r.value]))
      setStoreUrl(m.merch_store_url || '')
      setBlurb(m.merch_blurb || '')
      try { setItems(m.merch_items ? JSON.parse(m.merch_items) : []) } catch { setItems([]) }
      setLoading(false)
    })()
  }, [])

  const setItem = (i: number, k: keyof MerchItem, v: string) =>
    setItems(p => p.map((it, j) => j === i ? { ...it, [k]: v } : it))
  const addItem = () => setItems(p => [...p, { image: '', title: '', price: '', url: '' }])
  const removeItem = (i: number) => setItems(p => p.filter((_, j) => j !== i))
  const moveItem = (i: number, dir: -1 | 1) => setItems(p => {
    const j = i + dir
    if (j < 0 || j >= p.length) return p
    const next = [...p]; [next[i], next[j]] = [next[j], next[i]]; return next
  })

  const uploadImage = async (i: number, file: File | null) => {
    if (!file) return
    setUploading(i)
    try {
      const { url } = await uploadToCloudinary(file, 'merch', 'image')
      setItem(i, 'image', url)
    } catch (e) { setMsg({ type: 'error', text: 'Upload failed: ' + (e as Error).message }) }
    setUploading(null)
  }

  const save = async () => {
    setSaving(true); setMsg(null)
    const rows = [
      { key: 'merch_store_url', value: storeUrl.trim() || null, updated_at: new Date().toISOString() },
      { key: 'merch_blurb', value: blurb.trim() || null, updated_at: new Date().toISOString() },
      { key: 'merch_items', value: JSON.stringify(items.filter(it => it.title.trim() || it.image)), updated_at: new Date().toISOString() },
    ]
    const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' })
    setSaving(false)
    setMsg(error ? { type: 'error', text: error.message } : { type: 'success', text: 'Merch shop saved.' })
  }

  if (loading) return <div style={{ ...s.page, color: 'var(--text-muted)', textAlign: 'center', paddingTop: '80px' }}>Loading…</div>

  return (
    <div style={s.page}>
      <div style={s.navRow}>
        <div>
          <h1 style={s.h1}>Merch Shop</h1>
          <p style={s.subtitle}>Curate the showcase on <code>/merch</code>. Feature a handful of items modeled by your avatars; each links to its product page on your hosted store (where size, color &amp; checkout live).</p>
        </div>
        <a href="/merch" target="_blank" rel="noreferrer" style={s.link}>View /merch ↗</a>
      </div>

      {msg && <div style={{ ...s.banner, background: msg.type === 'success' ? 'rgba(52,168,83,0.12)' : 'rgba(220,60,60,0.12)', color: msg.type === 'success' ? '#34a853' : '#dc3c3c' }}>{msg.text}</div>}

      {/* Store link + blurb */}
      <div style={s.card}>
        <h2 style={s.h2}>Full-catalog store</h2>
        <p style={s.help}>Your hosted store (Printful-connected Shopify / Big Cartel / Payhip, etc.). Powers the “Shop the full collection” button and lets the Shop link appear on the porch.</p>
        <label style={s.label}>Store link (URL)</label>
        <input value={storeUrl} onChange={e => setStoreUrl(e.target.value)} placeholder="https://shop.humanechomusic.com" style={s.input} />
        <label style={{ ...s.label, marginTop: '14px' }}>Short blurb <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— optional</span></label>
        <textarea value={blurb} onChange={e => setBlurb(e.target.value)} rows={2} style={{ ...s.input, resize: 'vertical', lineHeight: 1.5 }} placeholder="Shirts, prints and more — made on demand, modeled by our artists." />
      </div>

      {/* Featured items */}
      <div style={s.card}>
        <h2 style={s.h2}>Featured items</h2>
        <p style={s.help}>The curated first look — a half-dozen is perfect. Upload the avatar-modeled photo, add the title, price, and the link to that product on your store.</p>

        {items.length === 0 && <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '14px' }}>No items yet — add your first below.</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {items.map((it, i) => (
            <div key={i} style={s.itemRow}>
              <div style={s.thumbWrap}>
                <div style={s.thumbImg}>
                  {it.image
                    ? <img src={it.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '22px' }}>🛍</span>}
                </div>
                <label style={s.uploadBtn}>
                  {uploading === i ? '…' : (it.image ? 'Change' : 'Upload')}
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading === i} onChange={e => { uploadImage(i, e.target.files?.[0] || null); e.target.value = '' }} />
                </label>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input value={it.title} onChange={e => setItem(i, 'title', e.target.value)} placeholder="Item name (e.g. Saltwater Soul Tee)" style={s.input} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={it.price} onChange={e => setItem(i, 'price', e.target.value)} placeholder="Price (e.g. $28)" style={{ ...s.input, maxWidth: '130px' }} />
                  <input value={it.url} onChange={e => setItem(i, 'url', e.target.value)} placeholder="Link to this product on your store" style={s.input} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button onClick={() => moveItem(i, -1)} disabled={i === 0} style={s.iconBtn} title="Move up">↑</button>
                <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} style={s.iconBtn} title="Move down">↓</button>
                <button onClick={() => removeItem(i)} style={{ ...s.iconBtn, color: '#dc3c3c' }} title="Remove">✕</button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addItem} style={s.addBtn}>+ Add item</button>
      </div>

      <button onClick={save} disabled={saving} style={s.saveBtn}>{saving ? 'Saving…' : 'Save merch shop'}</button>
      <Link href="/admin/content" style={{ ...s.link, marginLeft: '14px' }}>← Content</Link>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: '760px', margin: '0 auto', padding: '32px 24px 100px', fontFamily: 'DM Sans, sans-serif' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' },
  h1: { fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0', maxWidth: '580px', lineHeight: 1.5 },
  link: { fontSize: '14px', color: 'var(--accent-primary)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 },
  banner: { padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '18px' },
  card: { border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', background: 'var(--bg-secondary)', marginBottom: '16px' },
  h2: { fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' },
  help: { fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5 },
  label: { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' },
  input: { width: '100%', padding: '11px 13px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' },
  itemRow: { display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' },
  thumbWrap: { width: '72px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
  thumbImg: { width: '72px', height: '72px', borderRadius: '10px', overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  uploadBtn: { fontSize: '11px', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 },
  iconBtn: { width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' },
  addBtn: { padding: '10px 18px', borderRadius: '10px', border: '1px dashed var(--border)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', marginTop: '14px' },
  saveBtn: { padding: '12px 24px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' },
}
