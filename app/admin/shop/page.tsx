'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/lib/useCurrentUser'

const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', 'humanecho_upload')
  formData.append('folder', folder)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST', body: formData,
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.secure_url as string
}

type Product = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  price: number
  product_type: string
  file_path: string | null
  file_name: string | null
  status: string
  display_order: number
  is_featured: boolean
}

const BLANK = {
  id: null as string | null,
  title: '', description: '', image_url: '', price: '',
  product_type: 'ebook', file_path: '', file_name: '',
  status: 'draft', display_order: 0, is_featured: false,
}

const PRODUCT_TYPES = ['ebook', 'audiobook', 'sheet_music', 'art', 'other']

export default function AdminShopPage() {
  const { loading: authLoading, isAdmin } = useCurrentUser()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...BLANK })
  const [saving, setSaving] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
    setProducts((data as Product[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { if (isAdmin) load() }, [isAdmin, load])

  const resetForm = () => { setForm({ ...BLANK }); setMsg(null); setErr(null) }

  const editProduct = (p: Product) => {
    setForm({
      id: p.id, title: p.title, description: p.description || '',
      image_url: p.image_url || '', price: String(p.price ?? ''),
      product_type: p.product_type || 'ebook',
      file_path: p.file_path || '', file_name: p.file_name || '',
      status: p.status || 'draft', display_order: p.display_order || 0,
      is_featured: !!p.is_featured,
    })
    setMsg(null); setErr(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onImage = async (file?: File) => {
    if (!file) return
    setUploadingImg(true); setErr(null)
    try {
      const url = await uploadToCloudinary(file, 'humanecho/products')
      setForm(f => ({ ...f, image_url: url }))
    } catch (e) { setErr(`Image upload failed: ${(e as Error).message}`) }
    finally { setUploadingImg(false) }
  }

  const onFile = async (file?: File) => {
    if (!file) return
    setUploadingFile(true); setErr(null)
    try {
      const folder = crypto.randomUUID()
      const path = `${folder}/${file.name}`
      const { error } = await supabase.storage.from('product-files').upload(path, file, { upsert: true })
      if (error) throw error
      setForm(f => ({ ...f, file_path: path, file_name: file.name }))
    } catch (e) { setErr(`File upload failed: ${(e as Error).message}`) }
    finally { setUploadingFile(false) }
  }

  const save = async () => {
    setErr(null); setMsg(null)
    if (!form.title.trim()) { setErr('Title is required.'); return }
    const priceNum = Number(form.price)
    if (isNaN(priceNum) || priceNum < 0) { setErr('Enter a valid price.'); return }
    setSaving(true)
    const row = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url || null,
      price: priceNum,
      product_type: form.product_type,
      file_path: form.file_path || null,
      file_name: form.file_name || null,
      status: form.status,
      display_order: Number(form.display_order) || 0,
      is_featured: form.is_featured,
      updated_at: new Date().toISOString(),
    }
    const res = form.id
      ? await supabase.from('products').update(row).eq('id', form.id)
      : await supabase.from('products').insert(row)
    setSaving(false)
    if (res.error) { setErr(res.error.message); return }
    setMsg(form.id ? 'Product updated.' : 'Product created.')
    resetForm()
    load()
  }

  const togglePublish = async (p: Product) => {
    await supabase.from('products').update({ status: p.status === 'published' ? 'draft' : 'published' }).eq('id', p.id)
    load()
  }
  const toggleFeature = async (p: Product) => {
    await supabase.from('products').update({ is_featured: !p.is_featured }).eq('id', p.id)
    load()
  }
  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return
    if (p.file_path) { await supabase.storage.from('product-files').remove([p.file_path]) }
    await supabase.from('products').delete().eq('id', p.id)
    load()
  }

  if (authLoading) return <Shell><p style={muted}>Loading…</p></Shell>
  if (!isAdmin) return <Shell><p style={muted}>Admins only.</p></Shell>

  return (
    <Shell>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Shop — Products</h1>
      <p style={{ ...muted, marginBottom: '28px' }}>Add and manage digital products (ebooks and more) sold in the store.</p>

      {/* ── Add / edit form ── */}
      <div style={panel}>
        <h2 style={panelTitle}>{form.id ? 'Edit product' : 'New product'}</h2>

        <label style={lbl}>Title</label>
        <input style={input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="The Midnight Library" />

        <label style={lbl}>Description</label>
        <textarea style={{ ...input, minHeight: '90px', resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="A short pitch for the product…" />

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label style={lbl}>Price (USD)</label>
            <input style={input} type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="9.99" />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={lbl}>Type</label>
            <select style={input} value={form.product_type} onChange={e => setForm(f => ({ ...f, product_type: e.target.value }))}>
              {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={lbl}>Sort order</label>
            <input style={input} type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: Number(e.target.value) }))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '8px' }}>
          {/* Cover image */}
          <div style={{ flex: '1 1 240px' }}>
            <label style={lbl}>Cover image</label>
            <input type="file" accept="image/*" onChange={e => onImage(e.target.files?.[0])} />
            {uploadingImg && <span style={{ ...muted, marginLeft: '8px' }}>Uploading…</span>}
            {form.image_url && <img src={form.image_url} alt="" style={{ display: 'block', marginTop: '10px', width: '90px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />}
          </div>
          {/* Downloadable file */}
          <div style={{ flex: '1 1 240px' }}>
            <label style={lbl}>Download file (PDF / EPUB / ZIP)</label>
            <input type="file" onChange={e => onFile(e.target.files?.[0])} />
            {uploadingFile && <span style={{ ...muted, marginLeft: '8px' }}>Uploading…</span>}
            {form.file_name && <div style={{ ...muted, marginTop: '10px' }}>✓ {form.file_name}</div>}
            <div style={{ ...muted, fontSize: '12px', marginTop: '6px' }}>Stored privately. Buyers get a time-limited link.</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
          <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
            <select style={{ ...input, width: 'auto', marginBottom: 0 }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="draft">Draft (hidden)</option>
              <option value="published">Published (live)</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />
            Featured
          </label>
        </div>

        {err && <div style={{ color: '#dc3c3c', fontSize: '14px', marginTop: '14px' }}>{err}</div>}
        {msg && <div style={{ color: 'var(--accent-primary)', fontSize: '14px', marginTop: '14px' }}>{msg}</div>}

        <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
          <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? 'Saving…' : (form.id ? 'Save changes' : 'Create product')}</button>
          {form.id && <button onClick={resetForm} style={btnGhost}>Cancel</button>}
        </div>
      </div>

      {/* ── List ── */}
      <h2 style={{ ...panelTitle, marginTop: '36px' }}>All products ({products.length})</h2>
      {loading ? <p style={muted}>Loading…</p> : products.length === 0 ? (
        <p style={muted}>No products yet. Create your first one above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {products.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div style={{ width: '48px', height: '64px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>📖</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.title}</div>
                <div style={{ ...muted, fontSize: '13px' }}>
                  ${Number(p.price).toFixed(2)} · {p.product_type}
                  {p.status === 'published' ? <span style={{ color: 'var(--accent-primary)' }}> · live</span> : <span> · draft</span>}
                  {p.is_featured && <span style={{ color: 'var(--accent-gold)' }}> · ★ featured</span>}
                  {!p.file_path && <span style={{ color: '#c08a2d' }}> · ⚠ no file</span>}
                </div>
              </div>
              <button onClick={() => editProduct(p)} style={btnSmall}>Edit</button>
              <button onClick={() => togglePublish(p)} style={btnSmall}>{p.status === 'published' ? 'Unpublish' : 'Publish'}</button>
              <button onClick={() => toggleFeature(p)} style={btnSmall}>{p.is_featured ? 'Unfeature' : 'Feature'}</button>
              <button onClick={() => remove(p)} style={{ ...btnSmall, color: '#dc3c3c', borderColor: '#dc3c3c' }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px 120px' }}>{children}</div>
    </div>
  )
}

const muted: React.CSSProperties = { color: 'var(--text-muted)', fontSize: '14px' }
const panel: React.CSSProperties = { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }
const panelTitle: React.CSSProperties = { fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }
const lbl: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', marginTop: '12px' }
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', marginBottom: '4px', boxSizing: 'border-box' }
const btnPrimary: React.CSSProperties = { padding: '11px 24px', borderRadius: '999px', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '11px 24px', borderRadius: '999px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }
const btnSmall: React.CSSProperties = { padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }
