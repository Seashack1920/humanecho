'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/context/PlayerContext'
import LikeButton from '@/components/LikeButton'
import BuyButton from '@/components/BuyButton'
import TipButton from '@/components/TipButton'
import HeroMedia from '@/components/HeroMedia'
import VideoEmbed from '@/components/VideoEmbed'
import { useDefaultTrackImage } from '@/lib/siteSettings'
import { uploadToCloudinary } from '@/lib/cloudinaryUpload'

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
  music_video_url: string | null
  music_video_thumb_url: string | null
  song_notes: string | null
  song_notes_images: string[] | null
}

// A video tied to this song (subscriber/contest submission from the `videos`
// table). The artist's own official video lives on the track (music_video_url).
type SongVideo = {
  id: string
  title: string | null
  cloudinary_url: string | null
  thumbnail_url: string | null
  video_image_url: string | null
  video_type: string | null
  filmmaker_name: string | null
  content_origin: string | null
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

const VIDEO_TYPE_LABEL: Record<string, string> = {
  music_video: 'Music Video',
  lyric: 'Lyric Video',
  live: 'Live',
  cover: 'Cover',
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
  const [videos, setVideos]     = useState<SongVideo[]>([])
  const [lyricsOpen, setLyricsOpen] = useState(false)
  // Under the subscriber gate, an anonymous visitor may see a porch-pick song
  // but with the catalog-y links (nav pills, "More from artist") hidden.
  const [restricted, setRestricted] = useState(false)

  // Song Notes (admin-editable, inline)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft]     = useState('')
  const [imagesDraft, setImagesDraft]   = useState<string[]>([])
  const [uploadingImg, setUploadingImg] = useState(false)
  const [savingNotes, setSavingNotes]   = useState(false)

  // Official music video (admin-editable, inline) — paste a YouTube or video URL
  const [editingVideo, setEditingVideo] = useState(false)
  const [videoUrlDraft, setVideoUrlDraft] = useState('')
  const [savingVideo, setSavingVideo]   = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: trackData } = await supabase
        .from('tracks')
        .select('id, title, track_number, duration, cloudinary_url, track_image_url, track_canvas_url, content_origin, track_type, text_content, text_content_type, tagline, price, album_id, artist_id, music_video_url, music_video_thumb_url, song_notes, song_notes_images')
        .eq('id', id)
        .eq('status', 'published')
        .single()

      if (!trackData) { setNotFound(true); setLoading(false); return }
      setTrack(trackData)

      // ── Access gate (LAUNCH_MODE=subscribers) ──
      // Members/beta (he_member/he_beta cookie) see everything. Anonymous
      // visitors may see a porch-pick song (restricted view) or are sent to the
      // porch. When the gate is off, this whole block is skipped.
      if (process.env.NEXT_PUBLIC_LAUNCH_MODE === 'subscribers') {
        const hasAccess = typeof document !== 'undefined' && /(?:^|;\s*)he_(member|beta)=1(?:;|$)/.test(document.cookie)
        if (!hasAccess) {
          const { data: pp } = await supabase.from('site_settings').select('value').eq('key', 'porch_picks').maybeSingle()
          let picks: string[] = []
          try { picks = pp?.value ? JSON.parse(pp.value) : [] } catch { picks = [] }
          if (!picks.includes(id)) { router.replace('/welcome'); return }
          setRestricted(true)
        }
      }

      const [
        { data: artistData },
        { data: albumData },
        { data: othersData },
        { data: albumsData },
        { data: storiesData },
        { data: filmsData },
        { data: videosData },
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
        // Videos submitted for this song (subscriber/contest); only published ones show.
        supabase.from('videos').select('id, title, cloudinary_url, thumbnail_url, video_image_url, video_type, filmmaker_name, content_origin')
          .eq('track_id', id).eq('status', 'published').order('created_at'),
      ])

      if (artistData) setArtist(artistData)
      if (albumData) setAlbum(albumData as Album)
      setOthers(othersData || [])
      setVideos(videosData || [])
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

  // Admin takedown. A submitted video is hidden (status → 'removed', reversible);
  // the artist's own official video is cleared from the track.
  const removeSubmittedVideo = async (videoId: string) => {
    if (!window.confirm('Hide this video from the song page? (Admins can restore it later.)')) return
    const { error } = await supabase.from('videos').update({ status: 'removed' }).eq('id', videoId)
    if (error) { alert('Could not remove: ' + error.message); return }
    setVideos(prev => prev.filter(v => v.id !== videoId))
  }

  const removeOfficialVideo = async () => {
    if (!track) return
    if (!window.confirm('Remove the official music video from this song?')) return
    const { error } = await supabase.from('tracks').update({ music_video_url: null, music_video_thumb_url: null }).eq('id', track.id)
    if (error) { alert('Could not remove: ' + error.message); return }
    setTrack({ ...track, music_video_url: null, music_video_thumb_url: null })
  }

  const startEditVideo = () => { setVideoUrlDraft(track?.music_video_url || ''); setEditingVideo(true) }
  const saveVideo = async () => {
    if (!track) return
    setSavingVideo(true)
    const url = videoUrlDraft.trim() || null
    const { error } = await supabase.from('tracks').update({ music_video_url: url }).eq('id', track.id)
    setSavingVideo(false)
    if (error) { alert('Could not save: ' + error.message); return }
    setTrack({ ...track, music_video_url: url })
    setEditingVideo(false)
  }

  // ── Song Notes editing (admin, inline) ──
  const startEditNotes = () => {
    setNotesDraft(track?.song_notes || '')
    setImagesDraft(track?.song_notes_images || [])
    setEditingNotes(true)
  }
  const addNotesImage = async (file: File | null) => {
    if (!file || !track) return
    setUploadingImg(true)
    try {
      const { url } = await uploadToCloudinary(file, `song-notes/${track.id}`, 'image')
      setImagesDraft(prev => [...prev, url])
    } catch (e) { alert('Upload failed: ' + (e as Error).message) }
    setUploadingImg(false)
  }
  const saveNotes = async () => {
    if (!track) return
    setSavingNotes(true)
    const notes = notesDraft.trim() || null
    const imgs = imagesDraft
    const { error } = await supabase.from('tracks').update({ song_notes: notes, song_notes_images: imgs }).eq('id', track.id)
    setSavingNotes(false)
    if (error) { alert('Could not save: ' + error.message); return }
    setTrack({ ...track, song_notes: notes, song_notes_images: imgs })
    setEditingNotes(false)
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
      {!restricted && navPills.length > 1 && (
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

        {/* ── VIDEO ── the artist's official music video, plus any published
            submissions (subscriber / contest) tied to this song. */}
        {(track.music_video_url || videos.length > 0 || isAdmin) && (
          <div style={{ marginBottom: '48px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: '600' }}>
              {((track.music_video_url ? 1 : 0) + videos.length) > 1 ? 'Videos' : 'Video'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

              {/* Official music video (the artist's own) — admins paste a YouTube or video URL inline */}
              {editingVideo ? (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Music video link — paste a YouTube link, or a direct video file URL</label>
                  <input value={videoUrlDraft} onChange={e => setVideoUrlDraft(e.target.value)} placeholder="https://www.youtube.com/watch?v=…"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                  {videoUrlDraft.trim() && (
                    <div style={{ marginTop: '12px' }}><VideoEmbed url={videoUrlDraft.trim()} title={track.title} /></div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => setEditingVideo(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
                    <button onClick={saveVideo} disabled={savingVideo} style={{ padding: '9px 20px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>{savingVideo ? 'Saving…' : 'Save video'}</button>
                  </div>
                </div>
              ) : track.music_video_url ? (
                <div>
                  <VideoEmbed url={track.music_video_url} poster={track.music_video_thumb_url} title={track.title} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', gap: '10px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Official music video</div>
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button onClick={startEditVideo} title="Admin: replace the video link"
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Replace</button>
                        <button onClick={removeOfficialVideo} title="Admin: remove this video"
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: '#dc3c3c', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Remove</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : isAdmin ? (
                <button onClick={startEditVideo}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', aspectRatio: '16 / 9', borderRadius: '12px', border: '1px dashed var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>
                  ＋ Add music video <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>(paste a YouTube link)</span>
                </button>
              ) : null}

              {/* Submitted videos (subscriber / contest) */}
              {videos.map(v => (
                <div key={v.id}>
                  {v.cloudinary_url
                    ? <VideoEmbed url={v.cloudinary_url} poster={v.thumbnail_url || v.video_image_url} title={v.title || 'Music video'} />
                    : <div style={{ width: '100%', aspectRatio: '16 / 9', borderRadius: '12px', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🎬</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', gap: '10px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title || 'Music video'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {VIDEO_TYPE_LABEL[v.video_type || ''] || 'Video'}
                        {v.filmmaker_name ? ` · ${v.filmmaker_name}` : ''}
                        {v.content_origin ? ` · ${ORIGIN_EMOJI[v.content_origin] || ''}` : ''}
                      </div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => removeSubmittedVideo(v.id)} title="Admin: remove this video"
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: '#dc3c3c', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lyrics / text — long ones collapse to a peek so they don't bury the
            rest of the page; short ones show in full with no toggle. */}
        {track.text_content && (() => {
          const isLong = (track.text_content?.length || 0) > 400
          const collapsed = isLong && !lyricsOpen
          return (
            <div style={{ marginBottom: '48px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: '600' }}>
                {track.text_content_type === 'lyrics' ? 'Lyrics' : 'Words'}
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.9', whiteSpace: 'pre-wrap', fontFamily: track.text_content_type === 'lyrics' ? 'Playfair Display, serif' : 'DM Sans, sans-serif', maxWidth: '620px', maxHeight: collapsed ? '150px' : 'none', overflow: 'hidden' }}>
                  {track.text_content}
                </div>
                {collapsed && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70px', background: 'linear-gradient(to bottom, transparent, var(--bg-primary))', pointerEvents: 'none' }} />
                )}
              </div>
              {isLong && (
                <button onClick={() => setLyricsOpen(o => !o)}
                  style={{ marginTop: '12px', background: 'none', border: '1px solid var(--border)', borderRadius: '20px', padding: '7px 16px', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  {lyricsOpen ? 'Hide lyrics ▴' : 'Show full lyrics ▾'}
                </button>
              )}
            </div>
          )
        })()}

        {/* ── SONG NOTES ── expansion text + images. Shows only when populated;
            admins see Edit/Add controls even when empty. */}
        {(() => {
          const notesImages = track.song_notes_images || []
          const hasNotes = !!(track.song_notes && track.song_notes.trim()) || notesImages.length > 0
          if (!hasNotes && !isAdmin) return null
          return (
            <div style={{ marginBottom: '48px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Song Notes</div>
                {isAdmin && !editingNotes && (
                  <button onClick={startEditNotes} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    {hasNotes ? 'Edit' : '+ Add song notes'}
                  </button>
                )}
              </div>

              {editingNotes ? (
                <div>
                  <textarea value={notesDraft} onChange={e => setNotesDraft(e.target.value)} rows={6}
                    placeholder="The story behind this song, context, credits — anything that enriches it."
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px', lineHeight: '1.7', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', resize: 'vertical' }} />
                  {imagesDraft.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                      {imagesDraft.map(url => (
                        <div key={url} style={{ position: 'relative', width: '96px', height: '96px', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => setImagesDraft(prev => prev.filter(u => u !== url))}
                            style={{ position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(0,0,0,0.65)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px', lineHeight: 1 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '13px', color: 'var(--accent-primary)', cursor: uploadingImg ? 'default' : 'pointer', fontWeight: 500 }}>
                      {uploadingImg ? 'Uploading…' : '+ Add image'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingImg} onChange={e => { addNotesImage(e.target.files?.[0] || null); e.target.value = '' }} />
                    </label>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => setEditingNotes(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
                    <button onClick={saveNotes} disabled={savingNotes} style={{ padding: '9px 20px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>{savingNotes ? 'Saving…' : 'Save notes'}</button>
                  </div>
                </div>
              ) : (
                <>
                  {track.song_notes && track.song_notes.trim() && (
                    <div style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.8', whiteSpace: 'pre-wrap', maxWidth: '620px', marginBottom: notesImages.length ? '20px' : 0 }}>
                      {track.song_notes}
                    </div>
                  )}
                  {notesImages.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
                      {notesImages.map((url, i) => (
                        <img key={i} src={url} alt="" style={{ width: '100%', borderRadius: '12px', display: 'block' }} />
                      ))}
                    </div>
                  )}
                  {!hasNotes && isAdmin && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No notes yet — add text and/or images to enrich this song's page.</div>
                  )}
                </>
              )}
            </div>
          )
        })()}

        {/* More from this artist — the body of work */}
        {!restricted && others.length > 0 && artist && (
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
