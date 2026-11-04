'use client'

// The Shop home. Each "shop" is an artist-connected storefront built on the
// same themed block engine the Escapes magazine used — the kicker reads
// "{Artist}'s Shop" and the big headline is the shop's distinctive handle
// (e.g. "Quiet Beginnings"). Digital downloads (PDFs, zip bundles) live at
// /shop/downloads and are surfaced here too.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useBrowsingMusic } from '@/context/BrowsingMusicContext'
import { usePlayer } from '@/context/PlayerContext'
import BrowsingMusicBar from '@/components/BrowsingMusicBar'
import HeroMedia from '@/components/HeroMedia'

type ShopArtist = { id: string; name: string; photo_url: string | null }

type Shop = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  logline: string | null
  cover_image_url: string | null
  hero_video_url: string | null
  theme: string
  status: string
  published_at: string | null
  artist_id: string | null
  artist?: ShopArtist | null
}

const THEME_ACCENTS: Record<string, { bg: string; accent: string }> = {
  midnight: { bg: '#0d0d14', accent: '#c9a84c' },
  linen:    { bg: '#f5f0e8', accent: '#8b5e3c' },
  ember:    { bg: '#1a0a08', accent: '#d4823a' },
  slate:    { bg: '#f0f2f4', accent: '#3a5f8a' },
  verdant:  { bg: '#0a1a10', accent: '#5aaa6a' },
}

const shopLabel = (s: Shop) => (s.artist ? `${s.artist.name}'s Shop` : 'Shop')

export default function ShopHome() {
  const router = useRouter()
  const { stop: stopBrowsingMusic, tracks: browsingTracks, setTracks } = useBrowsingMusic()
  const { stop: stopPlayer } = usePlayer()

  const [featured, setFeatured] = useState<Shop | null>(null)
  const [rest, setRest]         = useState<Shop[]>([])
  const [drafts, setDrafts]     = useState<Shop[]>([])
  const [isAdmin, setIsAdmin]   = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    stopPlayer()

    const attachArtists = async (shops: Shop[]): Promise<Shop[]> => {
      const ids = [...new Set(shops.map(s => s.artist_id).filter(Boolean))] as string[]
      if (!ids.length) return shops
      const { data } = await supabase.from('artists').select('id, name, photo_url').in('id', ids)
      const map = Object.fromEntries((data || []).map(a => [a.id, a]))
      return shops.map(s => ({ ...s, artist: s.artist_id ? map[s.artist_id] || null : null }))
    }

    const load = async () => {
      const cols = 'id, slug, title, subtitle, logline, cover_image_url, hero_video_url, theme, status, published_at, artist_id'

      const { data: { user } } = await supabase.auth.getUser()
      let admin = false
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        admin = profile?.role === 'admin'
        setIsAdmin(admin)
      }

      const { data: pubData } = await supabase
        .from('issues').select(cols).eq('status', 'published').order('issue_number', { ascending: false })
      const published = await attachArtists((pubData as Shop[]) || [])
      if (published.length > 0) {
        setFeatured(published[0])
        setRest(published.slice(1))
      }

      if (admin) {
        const { data: draftData } = await supabase
          .from('issues').select(cols).in('status', ['draft', 'private']).order('issue_number', { ascending: false })
        setDrafts(await attachArtists((draftData as Shop[]) || []))
      }

      try {
        const { data: musicData } = await supabase
          .from('background_tracks').select('id, title, cloudinary_url, mood, loop_enabled, description')
          .eq('is_active', true).order('title', { ascending: true })
        if (musicData) setTracks(musicData)
      } catch (e) {}

      setLoading(false)
    }
    load()

    return () => stopBrowsingMusic(true)
  }, [])

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Loading</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HERO / FEATURED SHOP ── */}
      {featured ? (
        <section style={{
          position: 'relative', minHeight: '80vh', display: 'flex', alignItems: 'flex-end',
          overflow: 'hidden', background: THEME_ACCENTS[featured.theme]?.bg || '#0d0d14',
          marginTop: '-70px', paddingTop: '70px', cursor: 'pointer',
        }} onClick={() => router.push(`/shop/${featured.slug}`)}>
          {(featured.cover_image_url || featured.hero_video_url) ? (
            <HeroMedia imageUrl={featured.cover_image_url} videoUrl={featured.hero_video_url} style={{ filter: 'brightness(0.5)' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${THEME_ACCENTS[featured.theme]?.bg || '#0d0d14'} 0%, #1a1a2e 100%)` }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)' }} />

          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 48px 80px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              {featured.artist?.photo_url && (
                <img src={featured.artist.photo_url} alt={featured.artist.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.3)' }} />
              )}
              <span style={{ fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', color: THEME_ACCENTS[featured.theme]?.accent || '#c9a84c', fontWeight: 600 }}>
                {shopLabel(featured)}
              </span>
            </div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 7vw, 80px)', fontWeight: '700', color: 'white', lineHeight: '1.05', marginBottom: '16px', letterSpacing: '-0.02em', maxWidth: '800px' }}>
              {featured.title}
            </h1>
            {featured.subtitle && (
              <div style={{ fontSize: 'clamp(16px, 2vw, 22px)', color: 'rgba(255,255,255,0.65)', marginBottom: '8px' }}>{featured.subtitle}</div>
            )}
            {featured.logline && (
              <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', maxWidth: '560px', lineHeight: '1.6', marginBottom: '32px', fontStyle: 'italic' }}>{featured.logline}</div>
            )}
            <button
              onClick={e => { e.stopPropagation(); router.push(`/shop/${featured.slug}`) }}
              style={{ padding: '14px 32px', borderRadius: '50px', background: 'white', color: '#0a0a0b', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Enter {shopLabel(featured)} →
            </button>
          </div>
        </section>
      ) : (
        <section style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', marginTop: '-70px', paddingTop: '70px' }}>
          <div style={{ textAlign: 'center', padding: '80px 40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🛍</div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '40px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>Shop</h1>
            <div style={{ fontSize: '16px', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: '1.6' }}>
              Our first shop is being assembled. Come back soon.
            </div>
          </div>
        </section>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 48px 120px' }}>

        {/* ── BROWSING MUSIC ── */}
        {browsingTracks.length > 0 && (
          <div style={{ marginBottom: '48px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Set the mood</span>
            <BrowsingMusicBar tracks={browsingTracks} />
          </div>
        )}

        {/* ── ADMIN DRAFTS ── */}
        {isAdmin && drafts.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Drafts</h2>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(43,122,143,0.15)', color: 'var(--accent-primary)', fontWeight: '600' }}>Admin only</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {drafts.map(shop => (
                <ShopCard key={shop.id} shop={shop} onClick={() => router.push(`/shop/${shop.slug}?preview=1`)} isDraft />
              ))}
            </div>
          </div>
        )}

        {/* ── MORE SHOPS ── */}
        {rest.length > 0 && (
          <div style={{ marginBottom: '64px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '28px' }}>
              More shops
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {rest.map(shop => (
                <ShopCard key={shop.id} shop={shop} onClick={() => router.push(`/shop/${shop.slug}`)} />
              ))}
            </div>
          </div>
        )}

        {/* ── DIGITAL DOWNLOADS ── */}
        <div
          onClick={() => router.push('/shop/downloads')}
          style={{ cursor: 'pointer', borderRadius: '16px', padding: '32px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{ fontSize: '40px' }}>📦</div>
          <div style={{ flex: '1 1 260px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Digital Downloads</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>Ebooks, sheet music, art prints, and zipped bundles — buy once, download anywhere.</div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-primary)' }}>Browse downloads →</div>
        </div>
      </div>
    </div>
  )
}

// ─── Shop card ─────────────────────────────────────────────────────────────────

function ShopCard({ shop, onClick, isDraft }: { shop: Shop; onClick: () => void; isDraft?: boolean }) {
  const [hovered, setHovered] = useState(false)
  const accent = THEME_ACCENTS[shop.theme] || THEME_ACCENTS.midnight

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-secondary)',
        border: hovered ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
        transition: 'border-color 0.2s, transform 0.2s', transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: accent.bg }}>
        {shop.cover_image_url ? (
          <img src={shop.cover_image_url} alt={shop.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease', transform: hovered ? 'scale(1.04)' : 'scale(1)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${accent.bg}, #1a1a2e)` }}>
            <div style={{ fontSize: '40px', opacity: 0.4 }}>🛍</div>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: `linear-gradient(to top, ${accent.bg}cc, transparent)` }} />
        {isDraft && (
          <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(43,122,143,0.85)', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', color: 'white', fontWeight: '600' }}>
            {shop.status.toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          {shop.artist?.photo_url && (
            <img src={shop.artist.photo_url} alt={shop.artist.name} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
          )}
          <div style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: accent.accent, fontWeight: 600 }}>
            {shopLabel(shop)}
          </div>
        </div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px', lineHeight: '1.3' }}>
          {shop.title}
        </div>
        {shop.logline && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>
            {shop.logline}
          </div>
        )}
      </div>
    </div>
  )
}
