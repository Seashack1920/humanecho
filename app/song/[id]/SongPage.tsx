'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/context/PlayerContext'
import LikeButton from '@/components/LikeButton'
import BuyButton from '@/components/BuyButton'
import TipButton from '@/components/TipButton'
import HeroMedia from '@/components/HeroMedia'
import { useDefaultTrackImage } from '@/lib/siteSettings'

type Track = {
  id: string
  title: string
  track_number: number | null
  duration: string | null
  cloudinary_url: string | null
  track_image_url: string | null
  track_canvas_url: string | null
  content_origin: string | null
  track_type: string | null
  text_content: string | null
  text_content_type: string | null
  tagline: string | null
  price: number | null
  album_id: string | null
  artist_id: string
}

type Artist = {
  id: string
  name: string
  photo_url: string | null
  creator_label: string | null
  stripe_onboarded: boolean | null
  platform_owned: boolean | null
}

type Album = { id: string; title: string; cover_url: string | null }

type OtherTrack = {
  id: string
  title: string
  track_image_url: string | null
  content_origin: string | null
  duration: string | null
}

type NavSection = { key: string; label: string }

const ORIGIN_EMOJI: Record<string, string> = {
  '100% human': '🧑',
  'human+ai': '🧑🤖',
  'ai generated': '🤖',
}

export default function SongPage({ id }: { id: string }) {
  const router = useRouter()
  const { playTrack, togglePlay, currentTrack, isPlaying } = usePlayer()
  const defaultImg = useDefaultTrackImage()

  const [track, setTrack]   = useState<Track | null>(null)
  const [artist, setArtist] = useState<Artist | null>(null)
  const [album, setAlbum]   = useState<Album | null>(null)
  const [others, setOthers] = useState<OtherTrack[]>([])
  const [artistAlbums, setArtistAlbums]   = useState<{ id: string }[]>([])
  const [artistStories, setArtistStories] = useState<{ id: string }[]>([])
  const [artistFilms, setArtistFilms]     = useState<{ id: string }[]>([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isOwner, setIsOwner]   = useState(false)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [owned, setOwned]       = useState(false)
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: trackData } = await supabase
        .from('tracks')
        .select('id, title, track_number, duration, cloudinary_url, track_image_url, track_canvas_url, content_origin, track_type, text_content, text_content_type, tagline, price, album_id, artist_id')
        .eq('id', id)
        .eq('status', 'published')
        .single()

      if (!trackData) { setNotFound(true); setLoading(false); return }
      setTrack(trackData)

      const [
        { data: artistData },
        { data: albumData },
        { data: othersData },
        { data: albumsData },
        { data: storiesData },
        { data: filmsData },
      ] = await Promise.all([
        supabase.from('artists').select('id, name, photo_url, creator_label, stripe_onboarded, platform_owned').eq('id', trackData.artist_id).single(),
        trackData.album_id
          ? supabase.from('albums').select('id, title, cover_url').eq('id', trackData.album_id).single()
          : Promise.resolve({ data: null }),
        supabase.from('tracks').select('id, title, track_image_url, content_origin, duration')
          .eq('artist_id', trackData.artist_id).eq('status', 'published').neq('id', id).order('track_number').limit(12),
        supabase.from('albums').select('id').eq('artist_id', trackData.artist_id).eq('status', 'published'),
        supabase.from('stories').select('id').eq('artist_id', trackData.artist_id).eq('status', 'published'),
        supabase.from('films').select('id').eq('artist_id', trackData.artist_id).eq('status', 'published'),
      ])

      if (artistData) setArtist(artistData)
      if (albumData) setAlbum(albumData as Album)
      setOthers(othersData || [])
      setArtistAlbums(albumsData || [])
      setArtistStories(storiesData || [])
      setArtistFilms(filmsData || [])
      setLoading(false)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role, artist_id').eq('id', user.id).single()
        if (profile?.role === 'admin') { setIsOwner(true); setIsAdmin(true) }
        else if (profile?.artist_id === trackData.artist_id) setIsOwner(true)

        // An album purchase grants every track on it, so a track counts as owned
        // if the buyer owns either this track or its album.
        const { data: purchases } = await supabase
          .from('purchases')
          .select('item_type, item_id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
        if (purchases) {
          setOwned(purchases.some(p =>
            (p.item_type === 'track' && p.item_id === id) ||
            (p.item_type === 'album' && trackData.album_id && p.item_id === trackData.album_id)
          ))
        }
      }
    }
    load()
  }, [id])

  const navPills: NavSection[] = [
    { key: 'artist', label: artist?.name || 'Artist' },
    ...(artistAlbums.length > 0  ? [{ key: 'albums',  label: 'Albums' }]  : []),
    ...(artistStories.length > 0 ? [{ key: 'stories', label: 'Stories' }] : []),
    ...(artistFilms.length > 0   ? [{ key: 'films',   label: 'Films' }]   : []),
  ]

  const handleNavPill = (key: string) => {
    if (!artist) return
    if (key === 'artist') router.push(`/artist/${artist.id}`)
    else router.push(`/artist/${artist.id}#${key}`)
  }

  const isCurrent = currentTrack?.id === track?.id

  const play = () => {
    if (!track) return
    if (isCurrent) { togglePlay(); return }
    playTrack({
      id: track.id,
      title: track.title,
      cloudinary_url: track.cloudinary_url,
      track_image_url: track.track_image_url,
      album_id: track.album_id,
      artist_id: track.artist_id,
      artist_name: artist?.name,
      content_origin: track.content_origin,
      track_type: track.track_type,
      duration: track.duration,
    } as any)
  }

  const shareUrl = () => (typeof window !== 'undefined' ? window.location.href : `https://humanechomusic.com/song/${id}`)
  const shareText = () => `${track?.title}${artist ? ' — ' + artist.name : ''} on Human Echo`

  const nativeShare = async () => {
    const url = shareUrl()
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try { await (navigator as any).share({ title: track?.title || 'Song', text: shareText(), url }) } catch { /* dismissed */ }
    } else {
      copyLink()
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Loading</div>
    </div>
  )

  if (notFound || !track) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎵</div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Song not found</div>
        <button onClick={() => router.back()} style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', marginTop: '16px' }}>← Go back</button>
      </div>
    </div>
  )

  const cover = track.track_image_url || album?.cover_url || defaultImg || ''
  const sellable = !!(artist?.platform_owned || artist?.stripe_onboarded)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── SONG HERO ── */}
      <div style={{ position: 'relative', background: '#0a0a0b', marginTop: '-70px', paddingTop: '70px', minHeight: '500px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {isOwner && (
          <a href={isAdmin ? '/admin/upload' : '/dashboard'} style={{ position: 'absolute', top: '90px', left: '24px', zIndex: 20, padding: '6px 14px', borderRadius: '20px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', fontSize: '12px', textDecoration: 'none', backdropFilter: 'blur(10px)', fontFamily: 'DM Sans, sans-serif' }}>
            {isAdmin ? '← Admin Portal' : '← Dashboard'}
          </a>
        )}

        {/* Hero media — the song's Canvas (looping visual) or its artwork, framed
            like the artist/album heroes: bright, solid top, feathered bottom. */}
        {(track.track_canvas_url || track.track_image_url || album?.cover_url) ? (
          <HeroMedia
            videoUrl={track.track_canvas_url}
            imageUrl={track.track_image_url || album?.cover_url}
            position="center"
            style={{
              filter: 'brightness(0.9)',
              WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 88%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, #000 0%, #000 88%, transparent 100%)',
            }}
          />
        ) : null}

        {/* Gradient overlays — legibility + bottom melt into the page */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(to top, var(--bg-primary), transparent)' }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '860px', margin: '0 auto', width: '100%', padding: '48px 48px 52px', display: 'flex', gap: '40px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <img src={cover} alt={track.title} style={{ width: '200px', height: '200px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: '200px', paddingBottom: '8px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '8px', fontWeight: '600', textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}>
              {track.track_type || 'Song'}
            </div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(24px, 5vw, 48px)', fontWeight: '700', color: 'white', lineHeight: '1.1', marginBottom: '12px', textShadow: '0 2px 16px rgba(0,0,0,0.75)' }}>
              {track.title}
            </h1>
            {track.tagline && (
              <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', marginBottom: '12px', textShadow: '0 1px 10px rgba(0,0,0,0.7)' }}>{track.tagline}</div>
            )}
            {artist && (
              <button onClick={() => router.push(`/artist/${artist.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '12px' }}>
                {artist.photo_url && <img src={artist.photo_url} alt={artist.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />}
                <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.9)', fontWeight: '500', textShadow: '0 1px 10px rgba(0,0,0,0.7)' }}>{artist.name}</span>
              </button>
            )}
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}>
              {album && (
                <button onClick={() => router.push(`/album/${album.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '13px', textDecoration: 'underline', padding: 0, fontFamily: 'DM Sans, sans-serif' }}>
                  {album.title}
                </button>
              )}
              {track.content_origin && <span>{ORIGIN_EMOJI[track.content_origin] || ''} {track.content_origin}</span>}
              {track.duration && <span>{track.duration}</span>}
              <LikeButton contentType="track" contentId={track.id} size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* ── ARTIST NAV PILLS ── */}
      {navPills.length > 1 && (
        <div style={{ position: 'sticky', top: '70px', zIndex: 40, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)', padding: '0 48px' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', gap: '4px', padding: '12px 0' }}>
            {navPills.map(pill => (
              <button key={pill.key} onClick={() => handleNavPill(pill.key)}
                style={{ padding: '7px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--text-muted)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── BODY ── */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 48px 120px' }}>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '28px' }}>
          <button onClick={play}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 28px', borderRadius: '50px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '600' }}>
            {isCurrent && isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          {sellable && (
            <BuyButton itemType="track" itemId={track.id} price={track.price} owned={owned}
              label={track.price ? `$${Number(track.price).toFixed(2)}` : undefined}
              style={{ padding: '12px 28px', fontSize: '15px' }} />
          )}
          {artist?.stripe_onboarded && (
            <TipButton artistId={track.artist_id} artistName={artist.name} itemType="track" itemId={track.id}
              style={{ padding: '12px 24px', fontSize: '15px' }} />
          )}
        </div>

        {/* Share */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '36px' }}>
          <button onClick={nativeShare}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '20px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif' }}>
            ↗ Share this song
          </button>
          <button onClick={copyLink}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '20px', background: 'transparent', color: copied ? 'var(--accent-primary)' : 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif' }}>
            {copied ? '✓ Link copied' : '🔗 Copy link'}
          </button>
          {[
            { label: '𝕏', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl())}&text=${encodeURIComponent(shareText())}` },
            { label: 'f', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl())}` },
            { label: '💬', href: `https://wa.me/?text=${encodeURIComponent(`${shareText()} — ${shareUrl()}`)}` },
          ].map(item => (
            <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--border)', fontSize: '13px', textDecoration: 'none', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
              {item.label}
            </a>
          ))}
        </div>

        {/* Lyrics / text */}
        {track.text_content && (
          <div style={{ marginBottom: '48px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: '600' }}>
              {track.text_content_type === 'lyrics' ? 'Lyrics' : 'Words'}
            </div>
            <div style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.9', whiteSpace: 'pre-wrap', fontFamily: track.text_content_type === 'lyrics' ? 'Playfair Display, serif' : 'DM Sans, sans-serif', maxWidth: '620px' }}>
              {track.text_content}
            </div>
          </div>
        )}

        {/* More from this artist — the body of work */}
        {others.length > 0 && artist && (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>
                More from {artist.name}
              </h2>
              <button onClick={() => router.push(`/artist/${artist.id}`)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', fontSize: '13px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif' }}>
                View artist →
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
              {others.map(o => (
                <button key={o.id} onClick={() => router.push(`/song/${o.id}`)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                  <div style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px', background: 'var(--bg-secondary)' }}>
                    <img src={o.track_image_url || defaultImg || ''} alt={o.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {o.content_origin ? ORIGIN_EMOJI[o.content_origin] || '' : ''} {o.duration || ''}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
