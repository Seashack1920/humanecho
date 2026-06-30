'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProductDownloadButton from '@/components/ProductDownloadButton'

type LibItem = {
  key: string
  type: 'track' | 'album' | 'product'
  id: string
  title: string
  image: string | null
  artistName: string
  fileUrl: string | null      // tracks: audio download; albums: null (go to album page)
  purchasedAt: string
  amount: number | null
}

export default function LibraryPage() {
  const router = useRouter()
  const [justPurchased, setJustPurchased] = useState(false)
  const [items, setItems]     = useState<LibItem[]>([])
  const [loading, setLoading] = useState(true)
  const [signedOut, setSignedOut] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('purchase') === 'success') {
      setJustPurchased(true)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSignedOut(true); setLoading(false); return }

      const { data: purchases } = await supabase
        .from('purchases')
        .select('item_type, item_id, amount, created_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (!purchases || purchases.length === 0) { setItems([]); setLoading(false); return }

      const trackIds   = purchases.filter(p => p.item_type === 'track').map(p => p.item_id)
      const albumIds   = purchases.filter(p => p.item_type === 'album').map(p => p.item_id)
      const productIds = purchases.filter(p => p.item_type === 'product').map(p => p.item_id)

      const [{ data: tracks }, { data: albums }, { data: products }] = await Promise.all([
        trackIds.length
          ? supabase.from('tracks').select('id, title, track_image_url, cloudinary_url, artist_id').in('id', trackIds)
          : Promise.resolve({ data: [] as any[] }),
        albumIds.length
          ? supabase.from('albums').select('id, title, cover_url, artist_id').in('id', albumIds)
          : Promise.resolve({ data: [] as any[] }),
        productIds.length
          ? supabase.from('products').select('id, title, image_url, product_type').in('id', productIds)
          : Promise.resolve({ data: [] as any[] }),
      ])
      const productMap = new Map((products || []).map(p => [p.id, p]))

      const artistIds = [
        ...(tracks || []).map(t => t.artist_id),
        ...(albums || []).map(a => a.artist_id),
      ].filter(Boolean)
      const { data: artists } = artistIds.length
        ? await supabase.from('artists').select('id, name').in('id', artistIds)
        : { data: [] as any[] }
      const artistName = (aid: string) => artists?.find(a => a.id === aid)?.name || ''

      const trackMap = new Map((tracks || []).map(t => [t.id, t]))
      const albumMap = new Map((albums || []).map(a => [a.id, a]))

      const built: LibItem[] = purchases.map(p => {
        if (p.item_type === 'product') {
          const pr = productMap.get(p.item_id)
          return pr && {
            key: `product-${p.item_id}`, type: 'product' as const, id: p.item_id,
            title: pr.title, image: pr.image_url, artistName: pr.product_type || 'ebook',
            fileUrl: null, purchasedAt: p.created_at, amount: p.amount,
          }
        }
        if (p.item_type === 'track') {
          const t = trackMap.get(p.item_id)
          return t && {
            key: `track-${p.item_id}`, type: 'track' as const, id: p.item_id,
            title: t.title, image: t.track_image_url, artistName: artistName(t.artist_id),
            fileUrl: t.cloudinary_url, purchasedAt: p.created_at, amount: p.amount,
          }
        }
        const a = albumMap.get(p.item_id)
        return a && {
          key: `album-${p.item_id}`, type: 'album' as const, id: p.item_id,
          title: a.title, image: a.cover_url, artistName: artistName(a.artist_id),
          fileUrl: null, purchasedAt: p.created_at, amount: p.amount,
        }
      }).filter(Boolean) as LibItem[]

      setItems(built)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px 120px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Your Library</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px' }}>Everything you've purchased on Human Echo.</p>

        {justPurchased && (
          <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(43,122,143,0.1)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', fontSize: '14px', marginBottom: '24px' }}>
            ✓ Thank you — your purchase is complete. It may take a moment to appear below.
          </div>
        )}

        {loading && <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading…</div>}

        {!loading && signedOut && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Sign in to see your library.</p>
            <button onClick={() => router.push('/login?redirect=/library')} style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px' }}>Sign in</button>
          </div>
        )}

        {!loading && !signedOut && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎵</div>
            <p>Nothing here yet. Tracks, albums, and shop items you buy will live here.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map(item => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.image ? <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '22px' }}>{item.type === 'album' ? '💿' : '🎵'}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{item.artistName} · {item.type}</div>
              </div>
              {item.type === 'product' ? (
                <ProductDownloadButton productId={item.id} />
              ) : item.type === 'track' && item.fileUrl ? (
                <a href={item.fileUrl} download style={{ padding: '8px 16px', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', fontSize: '13px', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>⬇ Download</a>
              ) : (
                <button onClick={() => router.push(`/album/${item.id}`)} style={{ padding: '8px 16px', borderRadius: '999px', background: 'transparent', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Open album</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
