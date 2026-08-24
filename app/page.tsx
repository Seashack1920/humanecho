'use client'

import ArtistInvite from '@/components/ArtistInvite'
import { supabase } from '@/lib/supabase'
import { useState, useEffect, useRef } from 'react'
import { usePlayer } from '@/context/PlayerContext'
import LikeButton from '@/components/LikeButton'
import { useRouter } from 'next/navigation'
import JoinBlock from '@/components/JoinBlock'
import HomeStoryWinners from '@/components/HomeStoryWinners'
import HomeContestWinners from '@/components/HomeContestWinners'
import HeroMedia from '@/components/HeroMedia'

// ─── Types ───────────────────────────────────────────────────────────────────

type Track     = { id: string; title: string; duration: string | null; cloudinary_url: string | null; track_image_url: string | null; content_origin: string | null; track_type: string | null; artist_id: string | null; music_video_url?: string | null; cover_welcome?: boolean }
type Album     = { id: string; title: string; cover_url: string | null; artist_id: string | null; hero_image_url?: string | null; hero_video_url?: string | null }
type Artist    = { id: string; name: string; photo_url: string | null; bio: string | null; content_origin: string | null; creator_label?: string | null; creator_type?: string[] | null; featured_order?: number | null }
type Executive = { id: string; name: string; title: string; photo_url: string | null; intro_video_url: string | null; featured_message: string | null; department: string | null }
type Genre     = { id: string; name: string }
type HubCard   = { id: string; icon: string; title: string; description: string; status: string; url: string | null; display_order: number }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const originEmoji = (o?: string | null) =>
  o === '100% human' ? '🧑' : o === 'human+ai' ? '🧑🤖' : o === 'ai generated' ? '🤖' : ''

// Guarantees a promise settles within `ms`; on timeout resolves to `fallback`.
// Some Supabase queries can hang indefinitely in Safari/WebKit — this stops
// any single query from freezing the whole page load.
function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

async function fetchScheduled(slot: string, contentType: string, selectFields: string) {
  console.log('[HE]   fetchScheduled START', slot, contentType)
  try {
    const now = new Date().toISOString()
    const empty = { data: null } as any

    const { data: scheduled } = await withTimeout(
      supabase
        .from('scheduled_content')
        .select('content_id')
        .eq('slot', slot)
        .eq('content_type', contentType)
        .eq('is_active', true)
        .lte('go_live_at', now)
        .or(`expires_at.is.null,expires_at.gte.${now}`)
        .order('go_live_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      4000, empty
    )
    console.log('[HE]   fetchScheduled got scheduled row', slot)

    if (scheduled?.content_id) {
      const { data } = await withTimeout(
        supabase
          .from(contentType === 'track' ? 'tracks' : contentType === 'album' ? 'albums' : contentType === 'executive' ? 'executives' : 'artists')
          .select(selectFields)
          .eq('id', scheduled.content_id)
          .maybeSingle(),
        4000, empty
      )
      return data
    }

    const table = contentType === 'track' ? 'tracks' : contentType === 'album' ? 'albums' : contentType === 'executive' ? 'executives' : 'artists'
    // If more than one item is featured, pick the most recently featured one.
    // (limit(1) keeps maybeSingle from erroring when multiple rows match.)
    const { data } = await withTimeout(
      supabase.from(table).select(selectFields).eq('is_featured', true)
        .or(`featured_from.is.null,featured_from.lte.${now}`)
        .or(`featured_until.is.null,featured_until.gte.${now}`)
        .order('featured_from', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      4000, empty
    )
    return data
  } catch (err) {
    console.error('[HE] fetchScheduled failed for', slot, contentType, err)
    return null
  }
}

// ─── Share Panel ─────────────────────────────────────────────────────────────

function ShareTheEchoPanel({ profile }: { profile: any }) {
  const [copied, setCopied] = useState(false)
  const code: string | null = profile?.referral_code || null

  const site = (process.env.NEXT_PUBLIC_SITE_URL
    || (typeof window !== 'undefined' ? window.location.origin : 'https://humanechomusic.com')).replace(/\/$/, '')

  // Personalized, attributed link (falls back to a plain link when logged out).
  const buildLink = (source: string) => {
    const p = new URLSearchParams()
    if (code) p.set('ref', code)
    p.set('utm_source', source); p.set('utm_medium', 'share'); p.set('utm_campaign', 'share_the_echo')
    return `${site}/?${p.toString()}`
  }

  const logShare = (platform: string) => {
    if (!profile?.id) return
    // Best-effort share-intent log — never block opening the share dialog.
    supabase.from('share_events').insert({
      user_id: profile.id, referral_code: code, platform,
      campaign: 'share_the_echo', share_url: buildLink(platform),
    }).then(() => {}, () => {})
  }

  const openShare = (platform: string, href: string) => {
    logShare(platform)
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  const copyLink = (platform = 'copy') => {
    navigator.clipboard.writeText(buildLink(platform))
    logShare(platform)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const text = 'Discover music made by humans on Human Echo 🎵'
  const urlButtons = [
    { label: 'X / Twitter', icon: '𝕏', platform: 'x',        color: '#000',     href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(buildLink('x'))}&text=${encodeURIComponent(text)}` },
    { label: 'Facebook',    icon: 'f', platform: 'facebook', color: '#1877f2',  href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(buildLink('facebook'))}` },
    { label: 'WhatsApp',    icon: '💬', platform: 'whatsapp', color: '#25d366', href: `https://wa.me/?text=${encodeURIComponent(text + ' ' + buildLink('whatsapp'))}` },
  ]
  // Instagram/TikTok have no web share-intent — copy the link to paste into a post.
  const copyButtons = [
    { label: 'Instagram (copy link)', icon: '📸', platform: 'instagram', color: '#e1306c' },
    { label: 'TikTok (copy link)',    icon: '🎵', platform: 'tiktok',    color: '#010101' },
  ]

  return (
    <section style={{ paddingBottom: '80px' }}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '24px', padding: '56px 48px', border: '1px solid var(--border)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at bottom, rgba(43,122,143,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '12px', fontWeight: '600' }}>Share the Echo</div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Help artists get heard</div>
          <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '36px', maxWidth: '420px', margin: '0 auto 36px', lineHeight: '1.6' }}>
            Share Human Echo with your world. Every share helps independent artists reach new fans.
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
            {urlButtons.map(s => (
              <button key={s.label} onClick={() => openShare(s.platform, s.href)} title={s.label}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '18px', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >{s.icon}</button>
            ))}
            {copyButtons.map(s => (
              <button key={s.label} onClick={() => copyLink(s.platform)} title={s.label}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '18px', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >{s.icon}</button>
            ))}
            <button onClick={() => copyLink('copy')} title="Copy your link"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '50%', background: copied ? 'var(--accent-primary)' : 'var(--bg-card)', border: `1px solid ${copied ? 'var(--accent-primary)' : 'var(--border)'}`, fontSize: '18px', cursor: 'pointer', color: copied ? 'white' : 'var(--text-primary)', transition: 'all 0.2s ease' }}
            >{copied ? '✓' : '🔗'}</button>
          </div>
          {code ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {copied ? 'Your personal link is copied — paste it anywhere.' : 'Shares from your personal link are credited to you — we thank our top sharers.'}
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              <a href="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Sign in</a> so your shares are credited to you.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const { playTrack, togglePlay, currentTrack, isPlaying } = usePlayer()

  const [heroTrack, setHeroTrack]     = useState<Track | null>(null)
  const [heroAlbum, setHeroAlbum]     = useState<Album | null>(null)
  const [heroArtist, setHeroArtist]   = useState<Artist | null>(null)
  const [executive, setExecutive]     = useState<Executive | null>(null)
  const [newArrivals, setNewArrivals] = useState<(Track & { artist_name?: string })[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [arrivalGenreMap, setArrivalGenreMap] = useState<Record<string, string[]>>({})
  const [artists, setArtists]         = useState<Artist[]>([])
  const [genres, setGenres]           = useState<Genre[]>([])
  const [hubCards, setHubCards]       = useState<HubCard[]>([])
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [hoveredArtist, setHoveredArtist] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [showGate, setShowGate]       = useState(false)
  const [loading, setLoading]         = useState(true)
  const [email, setEmail]             = useState('')
  const [subscribed, setSubscribed]   = useState(false)
  const execVideoRef = useRef<HTMLVideoElement>(null)
  const [execMuted, setExecMuted]     = useState(true)
  const [execEnded, setExecEnded]     = useState(false)

  const MAX_FREE_PLAYS = 3

  useEffect(() => {
    const load = async () => {
      try {
        console.log('[HE] load start')
        const now = new Date().toISOString()

        // Load user profile to check subscription/admin status (timeout-guarded so Safari can't hang)
        const userResult: any = await Promise.race([
          supabase.auth.getUser(),
          new Promise((resolve) => setTimeout(() => resolve({ data: { user: null } }), 3000)),
        ])
        const user = userResult?.data?.user ?? null
        if (user) {
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
          setProfile(profileData)
        }
        console.log('[HE] past auth/profile')

        console.log('[HE] calling Promise.all of fetchScheduled')
        const [featuredTrack, featuredAlbum, featuredArtist, exec] = await Promise.all([
          fetchScheduled('hero', 'track',     'id, title, duration, cloudinary_url, track_image_url, content_origin, track_type, artist_id, music_video_url, cover_welcome'),
          fetchScheduled('hero', 'album',     'id, title, cover_url, artist_id, hero_image_url, hero_video_url'),
          fetchScheduled('hero', 'artist',    'id, name, photo_url, bio, content_origin, creator_label'),
          fetchScheduled('spotlight', 'executive', 'id, name, title, photo_url, intro_video_url, featured_message, department'),
        ])
        console.log('[HE] past fetchScheduled')

        if (featuredTrack) setHeroTrack(featuredTrack as Track)
        if (featuredAlbum) setHeroAlbum(featuredAlbum as Album)
        if (featuredArtist) setHeroArtist(featuredArtist as Artist)
        if (exec) setExecutive(exec as Executive)

        console.log('[HE] arrivals: querying tracks')
        const arrivalFields = 'id, title, duration, cloudinary_url, track_image_url, content_origin, track_type, artist_id, album_id, music_video_url, cover_welcome'
        // Curate-or-auto: admin-featured tracks take priority (in their order);
        // if none are featured, fall back to the newest published tracks.
        const featRes: any = await withTimeout(
          supabase.from('tracks').select(arrivalFields + ', featured_order')
            .eq('status', 'published').eq('is_featured', true)
            .order('featured_order', { ascending: true, nullsFirst: false }).limit(12),
          5000, { data: null }
        )
        let arrivals: any[] | null = (featRes?.data && featRes.data.length > 0) ? featRes.data : null
        let dedupeArrivals = false
        if (!arrivals) {
          const autoRes: any = await withTimeout(
            supabase.from('tracks').select(arrivalFields)
              .eq('status', 'published').order('created_at', { ascending: false }).limit(8),
            5000, { data: null }
          )
          arrivals = autoRes?.data
          dedupeArrivals = true
        }
        console.log('[HE] arrivals: tracks returned', arrivals ? arrivals.length : 'null', 'featured:', !dedupeArrivals)

        if (arrivals) {
          const enriched = await Promise.all(arrivals.map(async (t: any) => {
            const res: any = await withTimeout(
              supabase.from('artists').select('name').eq('id', t.artist_id).maybeSingle(),
              4000, { data: null }
            )
            return { ...t, artist_name: res?.data?.name || '' }
          }))
          // Curated picks shown exactly as featured; auto fallback deduped one-per-artist.
          let finalArrivals = enriched
          if (dedupeArrivals) {
            const seen = new Set<string>()
            finalArrivals = enriched.filter(t => {
              if (seen.has(t.artist_id)) return false
              seen.add(t.artist_id)
              return true
            })
          }
          setNewArrivals(finalArrivals)

          const trackIds = arrivals.map((t: any) => t.id)
          const glRes: any = await withTimeout(
            supabase
              .from('content_genres')
              .select('content_id, genre_id')
              .eq('content_type', 'track')
              .in('content_id', trackIds),
            4000, { data: null }
          )
          const genreLinks = glRes?.data

          if (genreLinks) {
            const map: Record<string, string[]> = {}
            for (const link of genreLinks) {
              if (!map[link.content_id]) map[link.content_id] = []
              map[link.content_id].push(link.genre_id)
            }
            setArrivalGenreMap(map)
          }
        }
        console.log('[HE] past arrivals')

        const raRes: any = await withTimeout(
          supabase
            .from('artists')
            .select('id, name, photo_url, bio, content_origin, creator_label, creator_type, featured_order')
            .is('deleted_at', null)
            .not('featured_order', 'is', null)
            .gt('featured_order', 0)
            .order('featured_order', { ascending: true })
            .limit(8),
          5000, { data: null }
        )
        if (raRes?.data) setArtists(raRes.data)

        const gRes: any = await withTimeout(
          supabase.from('genres').select('id, name').eq('content_type', 'music').order('name'),
          5000, { data: null }
        )
        if (gRes?.data) setGenres(gRes.data)

        const now2 = new Date().toISOString()
        const cRes: any = await withTimeout(
          supabase
            .from('hub_cards')
            .select('id, icon, title, description, status, url, display_order')
            .eq('is_active', true)
            .or(`featured_from.is.null,featured_from.lte.${now2}`)
            .or(`featured_until.is.null,featured_until.gte.${now2}`)
            .order('display_order', { ascending: true }),
          5000, { data: null }
        )
        if (cRes?.data) setHubCards(cRes.data)

        console.log('[HE] load finished ok')
      } catch (err) {
        console.error('[HE] LOAD FAILED:', err)
      } finally {
        setLoading(false)
      }
    }
    load()

    try {
      const stored = parseInt(localStorage.getItem('he_play_count') || '0')
      if (stored >= MAX_FREE_PLAYS) setShowGate(false)
    } catch (err) {
      console.warn('[HE] localStorage unavailable', err)
    }
  }, [])

  const handlePlay = (track: Track) => {
    if (currentTrack?.id === track.id) { togglePlay(); return }
    let count = 0
    try { count = parseInt(localStorage.getItem('he_play_count') || '0') } catch {}
    if (count >= MAX_FREE_PLAYS && !profile) { setShowGate(true); return }
    try { localStorage.setItem('he_play_count', String(count + 1)) } catch {}
    playTrack(track)
  }

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubscribed(true)
    setEmail('')
  }

  const filteredArrivals = newArrivals

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#666', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '80vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', background: '#0a0a0b', marginTop: '-70px', paddingTop: '70px' }}>
        {(heroAlbum?.hero_image_url || heroAlbum?.cover_url || heroAlbum?.hero_video_url) ? (
          <HeroMedia
            imageUrl={heroAlbum.hero_image_url || heroAlbum.cover_url}
            videoUrl={heroAlbum.hero_video_url}
            position="center center"
            style={{
              filter: 'brightness(0.9)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 8%, #000 88%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, transparent 0%, #000 8%, #000 88%, transparent 100%)',
            }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0d1f2d 0%, #0a0a0b 60%, #1a0d0d 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,11,0.92) 0%, rgba(10,10,11,0.25) 30%, rgba(10,10,11,0) 60%)' }} />
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 40px 80px' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'flex-end', textAlign: isMobile ? 'center' : 'left', gap: isMobile ? '24px' : '48px' }}>
            {heroAlbum?.cover_url && (
              <div style={{ flexShrink: 0 }}>
                <img src={heroAlbum.cover_url} alt={heroAlbum.title} style={{ width: isMobile ? '160px' : '220px', height: isMobile ? '160px' : '220px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '12px', fontWeight: '600' }}>Featured Release</div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: '700', color: 'white', lineHeight: '1.05', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                {heroAlbum?.title || 'Human Echo'}
              </h1>
              <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
                {heroArtist?.name}
                {heroArtist?.creator_label && <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginLeft: '10px' }}>{heroArtist.creator_label}</span>}
              </div>
              {heroTrack && (
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '32px' }}>
                  Now playing: {heroTrack.title} · {heroTrack.duration}
                  {heroTrack.music_video_url && <span style={{ marginLeft: '10px' }}>🎬</span>}
                  {heroTrack.cover_welcome && <span style={{ marginLeft: '6px' }}>🎤</span>}
                </div>
              )}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                {heroTrack && (
                  <button onClick={() => handlePlay(heroTrack)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 28px', borderRadius: '50px', background: currentTrack?.id === heroTrack.id && isPlaying ? 'rgba(255,255,255,0.15)' : 'white', color: currentTrack?.id === heroTrack.id && isPlaying ? 'white' : '#0a0a0b', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                    <span style={{ fontSize: '18px' }}>{currentTrack?.id === heroTrack.id && isPlaying ? '⏸' : '▶'}</span>
                    {currentTrack?.id === heroTrack.id && isPlaying ? 'Playing' : 'Play'}
                  </button>
                )}
                {heroAlbum && (
                  <button onClick={() => router.push(`/album/${heroAlbum.id}`)} style={{ padding: '14px 28px', borderRadius: '50px', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '15px', fontWeight: '500', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s ease' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  >View Album →</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLAY GATE ── */}
      {showGate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,10,11,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '20px', padding: '48px 40px', maxWidth: '420px', width: '90%', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎵</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>You've been listening a lot</div>
            <div style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '32px' }}>We love that. Create a free account to keep listening — and we'll throw in a free track as a thank you.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => router.push('/login')} style={{ padding: '14px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>Join Human Echo — it's free →</button>
              <button onClick={() => setShowGate(false)} style={{ padding: '12px', borderRadius: '10px', background: 'none', color: 'var(--text-muted)', fontSize: '14px', border: '1px solid var(--border)', cursor: 'pointer' }}>Maybe later</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>

        {/* ── EXECUTIVE SPOTLIGHT ── */}
        {executive && (
          <section style={{ padding: '80px 0 60px' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '20px' : '40px', alignItems: 'center', textAlign: isMobile ? 'center' : 'left', background: 'var(--bg-secondary)', borderRadius: '20px', padding: isMobile ? '32px 22px' : '40px', border: '1px solid var(--border)', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))' }} />
              {executive.intro_video_url ? (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <video ref={execVideoRef} src={executive.intro_video_url} style={{ width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '3px solid var(--accent-primary)', display: 'block' }} autoPlay muted playsInline onEnded={() => setExecEnded(true)} />
                  {execEnded && (
                    <div onClick={() => { execVideoRef.current?.play(); setExecEnded(false) }} style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Replay">
                      <div style={{ fontSize: '28px' }}>↺</div>
                    </div>
                  )}
                  <button onClick={() => { if (execVideoRef.current) { execVideoRef.current.muted = !execVideoRef.current.muted; setExecMuted(execVideoRef.current.muted) } }} title={execMuted ? 'Unmute' : 'Mute'}
                    style={{ position: 'absolute', bottom: '4px', right: '4px', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-primary)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                    {execMuted ? '🔇' : '🔊'}
                  </button>
                </div>
              ) : executive.photo_url ? (
                <img src={executive.photo_url} alt={executive.name} style={{ width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, border: '3px solid var(--accent-primary)' }} />
              ) : (
                <div style={{ width: '140px', height: '140px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', flexShrink: 0 }}>🤖</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '8px', fontWeight: '600' }}>A message from {executive.department || 'the team'}</div>
                {executive.featured_message && (
                  <blockquote style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(16px, 2.5vw, 22px)', fontWeight: '400', color: 'var(--text-primary)', lineHeight: '1.5', marginBottom: '20px', fontStyle: 'italic' }}>
                    "{executive.featured_message}"
                  </blockquote>
                )}
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{executive.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{executive.title} · Human Echo</div>
              </div>
            </div>
          </section>
        )}

        {/* ── NEW ARRIVALS ── */}
        {newArrivals.length > 0 && (
          <section style={{ paddingBottom: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)' }}>New Arrivals</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Latest from our artists</div>
            </div>

            {filteredArrivals.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {filteredArrivals.map(track => (
                  <div key={track.id} style={{ cursor: track.cloudinary_url ? 'pointer' : 'default' }} onClick={() => track.cloudinary_url && handlePlay(track)}>
                    <div style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', background: 'var(--bg-secondary)' }}>
                      {track.track_image_url
                        ? <img src={track.track_image_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🎵</div>
                      }
                      <div style={{ position: 'absolute', bottom: '8px', left: '8px' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = currentTrack?.id === track.id && isPlaying ? '1' : '0.7')}
                      >
                        {currentTrack?.id === track.id && isPlaying ? (
                          <div style={{ background: 'rgba(0,0,0,0.7)', borderRadius: '6px', padding: '5px 7px', display: 'flex', gap: '3px', alignItems: 'center' }}>
                            <div style={{ width: '3px', height: '12px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
                            <div style={{ width: '3px', height: '12px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
                          </div>
                        ) : (
                          <div style={{ background: 'rgba(0,0,0,0.7)', borderRadius: '6px', padding: '5px 8px 5px 10px', display: 'flex', alignItems: 'center' }}>
                            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 1L11 7L1 13V1Z" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      {track.content_origin && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: 'white', backdropFilter: 'blur(4px)' }}>{originEmoji(track.content_origin)}</div>
                      )}
                      {(track.music_video_url || track.cover_welcome) && (
                        <div style={{ position: 'absolute', bottom: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                          {track.music_video_url && <span style={{ background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 5px', fontSize: '11px', backdropFilter: 'blur(4px)' }} title="Music video available">🎬</span>}
                          {track.cover_welcome && <span style={{ background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 5px', fontSize: '11px', backdropFilter: 'blur(4px)' }} title="Covers welcome">🎤</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{track.artist_name} · {track.duration || '—'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No new arrivals in this genre yet.</div>
            )}
          </section>
        )}

        {/* ── STORY CONTEST WINNERS TEASER ── */}
        <HomeStoryWinners />
        {/* ── CONTEST WINNERS TEASER ── */}
        <HomeContestWinners />
        {/* ── BROWSE BY GENRE ── */}
        {genres.length > 0 && (
          <section style={{ paddingBottom: '80px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Browse</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Explore by genre</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button onClick={() => setSelectedGenre(null)} style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: selectedGenre === null ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: selectedGenre === null ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>All</button>
              {genres.map(genre => (
                <button key={genre.id} onClick={() => { setSelectedGenre(genre.id === selectedGenre ? null : genre.id); router.push(`/music/genre/${genre.id}`) }} style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: selectedGenre === genre.id ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: selectedGenre === genre.id ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                  {genre.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── ARTIST ROSTER ── */}
        {artists.length > 0 && (
          <section style={{ paddingBottom: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '32px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)' }}>Our Artists</h2>
              <button onClick={() => router.push('/music')} style={{ fontSize: '13px', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '24px' }}>
              {artists.map(artist => (
                <div key={artist.id} onClick={() => router.push(`/artist/${artist.id}`)} onMouseEnter={() => setHoveredArtist(artist.id)} onMouseLeave={() => setHoveredArtist(null)} style={{ cursor: 'pointer', textAlign: 'center', position: 'relative' }}>
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    {artist.photo_url
                      ? <img src={artist.photo_url} alt={artist.name} style={{ width: '100%', aspectRatio: '1', borderRadius: '50%', objectFit: 'cover', border: hoveredArtist === artist.id ? '2px solid var(--accent-primary)' : '2px solid var(--border)', transition: 'border-color 0.2s, transform 0.2s', transform: hoveredArtist === artist.id ? 'scale(1.04)' : 'scale(1)' }} />
                      : <div style={{ width: '100%', aspectRatio: '1', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', border: '2px solid var(--border)' }}>🎤</div>
                    }
                    {artist.content_origin && (
                      <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'var(--bg-primary)', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', border: '1px solid var(--border)' }}>
                        {originEmoji(artist.content_origin)}
                      </div>
                    )}
                    {hoveredArtist === artist.id && artist.creator_label && (
                      <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-secondary)', zIndex: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', pointerEvents: 'none' }}>
                        {artist.creator_label}
                        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid var(--border)' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{artist.name}</div>
                  {artist.creator_label && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{artist.creator_label}</div>}
                </div>
              ))}
            </div>
          </section>
        )}
<ArtistInvite />  

        {/* ── PLATFORM HUB ── */}
        {hubCards.length > 0 && (
          <section style={{ paddingBottom: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '32px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)' }}>Platform Hub</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Explore everything Human Echo</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {hubCards.map(card => (
                <div key={card.id} onClick={() => card.url && router.push(card.url)}
                  style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '28px', border: '1px solid var(--border)', cursor: card.url ? 'pointer' : 'default', transition: 'border-color 0.2s, transform 0.2s', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => { if (card.url) { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '14px' }}>{card.icon}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)' }}>{card.title}</div>
                    {card.status === 'coming_soon' && (
                      <span style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-secondary)', background: 'rgba(224,122,95,0.1)', border: '1px solid rgba(224,122,95,0.25)', borderRadius: '4px', padding: '2px 7px' }}>Soon</span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>{card.description}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── SUBSCRIBE CTA ── */}

        <JoinBlock />

        {/* ── SHARE THE ECHO ── */}
        <ShareTheEchoPanel profile={profile} />

      </div>

    </div>
  )
}
