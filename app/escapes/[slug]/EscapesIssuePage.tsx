'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useBrowsingMusic } from '@/context/BrowsingMusicContext'
import { usePlayer } from '@/context/PlayerContext'
import BrowsingMusicBar from '@/components/BrowsingMusicBar'

// ─── Types ───────────────────────────────────────────────────────────────────

type Issue = {
  id: string
  issue_number: number
  slug: string
  title: string
  subtitle: string | null
  logline: string | null
  cover_image_url: string | null
  theme: string
  status: string
  published_at: string | null
}

type Block = {
  id: string
  block_type: string
  position: number
  content: Record<string, any>
  settings: Record<string, any>
}

type Artist = {
  id: string
  name: string
  photo_url: string | null
  bio: string | null
  tagline: string | null
}

type Track = {
  id: string
  title: string
  cloudinary_url: string
  artist_id: string | null
}

type Story = {
  id: string
  title: string
  logline: string | null
  cover_image_url: string | null
  read_time_minutes: number | null
  story_type: string
}

// ─── Issue Themes ─────────────────────────────────────────────────────────────

const THEMES: Record<string, {
  bg: string; surface: string; text: string; muted: string; accent: string;
  border: string; headingFont: string; bodyFont: string; label: string
}> = {
  midnight: {
    bg: '#0d0d14', surface: '#16161f', text: '#e8e0d0', muted: '#8a8097',
    accent: '#c9a84c', border: '#2a2535',
    headingFont: 'Playfair Display, Georgia, serif',
    bodyFont: 'DM Sans, system-ui, sans-serif',
    label: 'Midnight',
  },
  linen: {
    bg: '#f5f0e8', surface: '#ede8e0', text: '#2c2418', muted: '#7a6e5c',
    accent: '#8b5e3c', border: '#d8d0c0',
    headingFont: 'Playfair Display, Georgia, serif',
    bodyFont: 'Lora, Georgia, serif',
    label: 'Linen',
  },
  ember: {
    bg: '#1a0a08', surface: '#241210', text: '#e8d5c0', muted: '#9a7560',
    accent: '#d4823a', border: '#3a2018',
    headingFont: 'Playfair Display, Georgia, serif',
    bodyFont: 'DM Sans, system-ui, sans-serif',
    label: 'Ember',
  },
  slate: {
    bg: '#f0f2f4', surface: '#e4e8ec', text: '#1a2030', muted: '#6070848',
    accent: '#3a5f8a', border: '#c8d0d8',
    headingFont: 'DM Sans, system-ui, sans-serif',
    bodyFont: 'DM Sans, system-ui, sans-serif',
    label: 'Slate',
  },
  verdant: {
    bg: '#0a1a10', surface: '#101e14', text: '#d8e8d0', muted: '#7a9870',
    accent: '#5aaa6a', border: '#1e3020',
    headingFont: 'Playfair Display, Georgia, serif',
    bodyFont: 'Lora, Georgia, serif',
    label: 'Verdant',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── Inline Audio Player ──────────────────────────────────────────────────────

function InlineAudioPlayer({ url, title, theme }: { url: string; title?: string; theme: typeof THEMES[string] }) {
  const audioRef              = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = new Audio(url)
    audioRef.current = audio
    audio.addEventListener('timeupdate', () => setProgress(audio.currentTime))
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration))
    audio.addEventListener('ended', () => { setPlaying(false); setProgress(0) })
    return () => { audio.pause(); audio.src = '' }
  }, [url])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = parseFloat(e.target.value)
    setProgress(audio.currentTime)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 20px', borderRadius: '12px',
      background: theme.surface, border: `1px solid ${theme.border}`,
    }}>
      <button onClick={togglePlay} style={{
        width: '40px', height: '40px', borderRadius: '50%',
        background: theme.accent, border: 'none', cursor: 'pointer',
        color: 'white', fontSize: '15px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {playing ? '⏸' : '▶'}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div style={{ fontSize: '13px', color: theme.muted, marginBottom: '6px', fontFamily: theme.bodyFont, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </div>
        )}
        <input type="range" min="0" max={duration || 100} step="0.1" value={progress}
          onChange={seek}
          style={{ width: '100%', accentColor: theme.accent, cursor: 'pointer' }} />
      </div>
      <div style={{ fontSize: '12px', color: theme.muted, flexShrink: 0, fontVariantNumeric: 'tabular-nums', fontFamily: theme.bodyFont }}>
        {formatTime(progress)} / {formatTime(duration)}
      </div>
    </div>
  )
}

// ─── Video Renderer ───────────────────────────────────────────────────────────

function VideoRenderer({ content, settings, theme }: { content: Record<string, any>; settings: Record<string, any>; theme: typeof THEMES[string] }) {
  const url = content.cloudinary_url || content.embed_url || ''
  if (!url) return null

  const isEmbed = !content.cloudinary_url && content.embed_url
  const isYoutube = isEmbed && (url.includes('youtube.com') || url.includes('youtu.be'))
  const isVimeo   = isEmbed && url.includes('vimeo.com')

  const getEmbedUrl = (u: string) => {
    if (isYoutube) {
      const id = u.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]
      return id ? `https://www.youtube.com/embed/${id}` : u
    }
    if (isVimeo) {
      const id = u.match(/vimeo\.com\/(\d+)/)?.[1]
      return id ? `https://player.vimeo.com/video/${id}` : u
    }
    return u
  }

  return (
    <div>
      <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
        {isYoutube || isVimeo ? (
          <iframe src={getEmbedUrl(url)} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
        ) : (
          <video src={url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        )}
      </div>
      {content.caption && (
        <div style={{ fontSize: '13px', color: theme.muted, marginTop: '10px', textAlign: 'center', fontFamily: theme.bodyFont, fontStyle: 'italic' }}>
          {content.caption}
        </div>
      )}
    </div>
  )
}

// ─── Block Renderer ───────────────────────────────────────────────────────────

function BlockRenderer({ block, theme, artists, tracks, stories }: {
  block: Block
  theme: typeof THEMES[string]
  artists: Artist[]
  tracks: Track[]
  stories: Story[]
}) {
  const { content: c, settings: set } = block

  const narrowStyle = { maxWidth: '680px', margin: '0 auto' }
  const wideStyle   = { maxWidth: '900px', margin: '0 auto' }

  switch (block.block_type) {

    case 'hero': {
      return (
        <div style={{ position: 'relative', minHeight: '70vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', background: '#000', marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)', width: '100vw' }}>
          {c.image_url && (
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${c.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${(set.overlay_opacity ?? 50) / 100})` }} />
          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 48px 64px', textAlign: set.text_align || 'left' }}>
            {c.title && (
              <h1 style={{ fontFamily: theme.headingFont, fontSize: 'clamp(32px, 6vw, 72px)', fontWeight: '700', color: 'white', lineHeight: '1.1', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                {c.title}
              </h1>
            )}
            {c.subtitle && (
              <p style={{ fontFamily: theme.bodyFont, fontSize: 'clamp(16px, 2.5vw, 22px)', color: 'rgba(255,255,255,0.75)', maxWidth: '600px', lineHeight: '1.5', margin: set.text_align === 'center' ? '0 auto' : undefined }}>
                {c.subtitle}
              </p>
            )}
          </div>
        </div>
      )
    }

    case 'text': {
      const isNarrow = set.width !== 'full'
      return (
        <div style={isNarrow ? narrowStyle : {}}>
          <div
            style={{ fontFamily: theme.bodyFont, fontSize: '18px', lineHeight: '1.85', color: theme.text, letterSpacing: '0.01em' }}
            dangerouslySetInnerHTML={{ __html: c.html || '' }}
          />
        </div>
      )
    }

    case 'image': {
      const widthStyle = set.width === 'narrow' ? narrowStyle : set.width === 'wide' ? wideStyle : {}
      return (
        <div style={widthStyle}>
          <div style={{ textAlign: set.alignment || 'center' }}>
            {c.cloudinary_url && (
              <img src={c.cloudinary_url} alt={c.alt || ''} style={{ maxWidth: '100%', borderRadius: '10px', display: 'block', margin: set.alignment === 'center' ? '0 auto' : undefined }} />
            )}
            {c.caption && (
              <div style={{ fontSize: '13px', color: theme.muted, marginTop: '10px', fontFamily: theme.bodyFont, fontStyle: 'italic', textAlign: 'center' }}>
                {c.caption}
              </div>
            )}
          </div>
        </div>
      )
    }

    case 'image_pair': {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[1, 2].map(n => (
            <div key={n}>
              {c[`image_${n}_url`] && (
                <img src={c[`image_${n}_url`]} alt="" style={{ width: '100%', borderRadius: '10px', objectFit: 'cover', aspectRatio: '4/3' }} />
              )}
              {c[`caption_${n}`] && (
                <div style={{ fontSize: '13px', color: theme.muted, marginTop: '8px', fontFamily: theme.bodyFont, fontStyle: 'italic', textAlign: 'center' }}>
                  {c[`caption_${n}`]}
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }

    case 'pull_quote': {
      const isAccent = set.style !== 'minimal'
      return (
        <div style={{ ...narrowStyle, borderLeft: `4px solid ${theme.accent}`, paddingLeft: '32px', margin: '0 auto' }}>
          <blockquote style={{ fontFamily: theme.headingFont, fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: '600', color: isAccent ? theme.accent : theme.text, lineHeight: '1.4', margin: 0, fontStyle: 'italic' }}>
            "{c.quote}"
          </blockquote>
          {c.attribution && (
            <div style={{ fontFamily: theme.bodyFont, fontSize: '14px', color: theme.muted, marginTop: '14px', letterSpacing: '0.05em' }}>
              {c.attribution}
            </div>
          )}
        </div>
      )
    }

    case 'section_header': {
      const isBold   = set.style === 'bold'
      const isSubtle = set.style === 'subtle'
      return (
        <div style={{ ...narrowStyle, textAlign: 'center', paddingBottom: '8px', borderBottom: isSubtle ? 'none' : `1px solid ${theme.border}` }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.accent, marginBottom: '10px', fontFamily: theme.bodyFont, fontWeight: '600' }}>
            ✦ ✦ ✦
          </div>
          <h2 style={{ fontFamily: theme.headingFont, fontSize: isBold ? 'clamp(28px, 4vw, 48px)' : 'clamp(22px, 3vw, 36px)', fontWeight: '700', color: theme.text, margin: 0 }}>
            {c.title}
          </h2>
          {c.subtitle && (
            <div style={{ fontFamily: theme.bodyFont, fontSize: '16px', color: theme.muted, marginTop: '8px' }}>
              {c.subtitle}
            </div>
          )}
        </div>
      )
    }

    case 'video': {
      const widthStyle = set.width === 'narrow' ? narrowStyle : set.width === 'wide' ? wideStyle : {}
      return (
        <div style={widthStyle}>
          <VideoRenderer content={c} settings={set} theme={theme} />
        </div>
      )
    }

    case 'audio': {
      const audioUrl = c.upload_url || tracks.find(t => t.id === c.track_id)?.cloudinary_url || ''
      const audioTitle = c.track_title || tracks.find(t => t.id === c.track_id)?.title || ''
      if (!audioUrl) return null
      return (
        <div style={narrowStyle}>
          <InlineAudioPlayer url={audioUrl} title={audioTitle} theme={theme} />
        </div>
      )
    }

    case 'artist_card': {
      const artist = artists.find(a => a.id === c.artist_id)
      if (!artist) return null
      const isCompact = set.style === 'compact'
      return (
        <div style={{ ...narrowStyle, display: 'flex', gap: '24px', alignItems: isCompact ? 'center' : 'flex-start', padding: '24px', borderRadius: '16px', background: theme.surface, border: `1px solid ${theme.border}` }}>
          {artist.photo_url && (
            <img src={artist.photo_url} alt={artist.name} style={{ width: isCompact ? '56px' : '80px', height: isCompact ? '56px' : '80px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${theme.border}` }} />
          )}
          <div>
            <div style={{ fontFamily: theme.headingFont, fontSize: isCompact ? '16px' : '20px', fontWeight: '600', color: theme.text }}>
              {artist.name}
            </div>
            {!isCompact && artist.tagline && (
              <div style={{ fontFamily: theme.bodyFont, fontSize: '14px', color: theme.accent, marginTop: '4px' }}>{artist.tagline}</div>
            )}
            {!isCompact && artist.bio && (
              <div style={{ fontFamily: theme.bodyFont, fontSize: '15px', color: theme.muted, marginTop: '10px', lineHeight: '1.6' }}>{artist.bio}</div>
            )}
          </div>
        </div>
      )
    }

    case 'story_teaser': {
      const story = stories.find(s => s.id === c.story_id)
      if (!story) return null
      return (
        <div style={narrowStyle}>
          <a href={`/stories/${story.id}`} style={{ textDecoration: 'none', display: 'block', padding: '24px', borderRadius: '16px', background: theme.surface, border: `1px solid ${theme.border}`, transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = theme.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
          >
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              {story.cover_image_url && (
                <img src={story.cover_image_url} alt={story.title} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div>
                <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: theme.accent, marginBottom: '6px', fontFamily: theme.bodyFont, fontWeight: '600' }}>
                  Story {story.read_time_minutes ? `· ${story.read_time_minutes} min read` : ''}
                </div>
                <div style={{ fontFamily: theme.headingFont, fontSize: '20px', fontWeight: '600', color: theme.text, marginBottom: '8px', lineHeight: '1.3' }}>
                  {story.title}
                </div>
                {set.show_excerpt !== false && story.logline && (
                  <div style={{ fontFamily: theme.bodyFont, fontSize: '14px', color: theme.muted, lineHeight: '1.6' }}>
                    {story.logline}
                  </div>
                )}
                <div style={{ fontFamily: theme.bodyFont, fontSize: '13px', color: theme.accent, marginTop: '12px' }}>
                  Read now →
                </div>
              </div>
            </div>
          </a>
        </div>
      )
    }

    case 'divider': {
      if (set.style === 'space') return <div style={{ height: '40px' }} />
      if (set.style === 'ornament') {
        return (
          <div style={{ textAlign: 'center', color: theme.accent, fontSize: '18px', letterSpacing: '0.3em' }}>
            ✦ ✦ ✦
          </div>
        )
      }
      return <hr style={{ border: 'none', borderTop: `1px solid ${theme.border}`, margin: 0 }} />
    }

    default:
      return null
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EscapesIssuePage({ slug }: { slug: string }) {
  const router = useRouter()
  const { stop: stopBrowsingMusic, tracks: browsingTracks, setTracks } = useBrowsingMusic()
  const { stop: stopPlayer } = usePlayer()

  const [issue, setIssue]     = useState<Issue | null>(null)
  const [blocks, setBlocks]   = useState<Block[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [tracks, setTrackList] = useState<Track[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    stopPlayer()

    const load = async () => {
const { data: issueData, error } = await supabase
  .from('issues')
  .select('*')
  .eq('slug', slug)
  .single()

console.log('issueData:', issueData, 'error:', error)

      if (!issueData) { setNotFound(true); setLoading(false); return }
      setIssue(issueData)

      const { data: blocksData } = await supabase
        .from('issue_blocks')
        .select('*')
        .eq('issue_id', issueData.id)
        .order('position')
      setBlocks(blocksData || [])

      // Collect referenced IDs for efficient fetching
      const artistIds = [...new Set((blocksData || []).filter(b => b.content.artist_id).map(b => b.content.artist_id))]
      const trackIds  = [...new Set((blocksData || []).filter(b => b.content.track_id).map(b => b.content.track_id))]
      const storyIds  = [...new Set((blocksData || []).filter(b => b.content.story_id).map(b => b.content.story_id))]

      await Promise.all([
        artistIds.length > 0
          ? supabase.from('artists').select('id, name, photo_url, bio, tagline').in('id', artistIds).then(({ data }) => setArtists(data || []))
          : Promise.resolve(),
        trackIds.length > 0
          ? supabase.from('tracks').select('id, title, cloudinary_url, artist_id').in('id', trackIds).then(({ data }) => setTrackList(data || []))
          : Promise.resolve(),
        storyIds.length > 0
          ? supabase.from('stories').select('id, title, logline, cover_image_url, read_time_minutes, story_type').in('id', storyIds).then(({ data }) => setStories(data || []))
          : Promise.resolve(),
        // Browsing music
        supabase.from('background_tracks').select('id, title, cloudinary_url, mood, loop_enabled, description').eq('is_active', true).order('title').then(({ data }) => { if (data) setTracks(data) }).catch(() => {}),
      ])

      setLoading(false)
    }
    load()

    return () => {
      shouldStop.current = true
    }
  }, [slug])

  const shouldStop = useRef(false)

  const theme = THEMES[issue?.theme || 'midnight'] || THEMES.midnight

  if (loading) return (
    <div style={{ minHeight: '100vh', background: THEMES.midnight.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: THEMES.midnight.muted, fontSize: '14px', letterSpacing: '0.1em', fontFamily: 'DM Sans, sans-serif' }}>Loading</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📰</div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Issue not found</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>This issue may not be published yet.</div>
        <button onClick={() => router.push('/escapes')} style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
          ← Back to Escapes
        </button>
      </div>
    </div>
  )

  if (!issue) return null

  // Split blocks — check if first block is a hero (handled specially)
  const firstBlock = blocks[0]
  const isFirstHero = firstBlock?.block_type === 'hero'
  const remainingBlocks = isFirstHero ? blocks.slice(1) : blocks

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, transition: 'background 0.3s ease' }}>

      {/* ── TOP BAR ── */}
      <div style={{ position: 'fixed', top: '70px', left: 0, right: 0, zIndex: 50, background: theme.bg, borderBottom: `1px solid ${theme.border}`, padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.3s ease', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/escapes')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: theme.muted }}>
            ← Escapes
          </button>
          {browsingTracks.length > 0 && <BrowsingMusicBar tracks={browsingTracks} />}
        </div>
        <div style={{ fontSize: '12px', color: theme.muted, letterSpacing: '0.08em' }}>
          Issue #{issue.issue_number} · {theme.label}
        </div>
      </div>

      {/* ── HERO BLOCK (if first) ── */}
      {isFirstHero && (
        <div style={{ marginTop: '0px' }}>
          <BlockRenderer block={firstBlock} theme={theme} artists={artists} tracks={tracks} stories={stories} />
        </div>
      )}

      {/* ── ISSUE HEADER (if no hero) ── */}
      {!isFirstHero && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '140px 48px 64px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.accent, marginBottom: '16px', fontFamily: 'DM Sans, sans-serif', fontWeight: '600' }}>
            Issue #{issue.issue_number}
          </div>
          <h1 style={{ fontFamily: theme.headingFont, fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: '700', color: theme.text, lineHeight: '1.1', marginBottom: '16px' }}>
            {issue.title}
          </h1>
          {issue.subtitle && (
            <div style={{ fontFamily: theme.bodyFont, fontSize: 'clamp(16px, 2vw, 22px)', color: theme.muted, marginBottom: '8px' }}>
              {issue.subtitle}
            </div>
          )}
          {issue.logline && (
            <div style={{ fontFamily: theme.bodyFont, fontSize: '16px', color: theme.muted, maxWidth: '560px', margin: '0 auto', lineHeight: '1.6', fontStyle: 'italic' }}>
              {issue.logline}
            </div>
          )}
        </div>
      )}

      {/* ── ISSUE META (after hero) ── */}
      {isFirstHero && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 48px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.accent, marginBottom: '12px', fontFamily: 'DM Sans, sans-serif', fontWeight: '600' }}>
            Issue #{issue.issue_number}
          </div>
          <h1 style={{ fontFamily: theme.headingFont, fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: '700', color: theme.text, lineHeight: '1.15', marginBottom: '12px' }}>
            {issue.title}
          </h1>
          {issue.subtitle && (
            <div style={{ fontFamily: theme.bodyFont, fontSize: '18px', color: theme.muted }}>{issue.subtitle}</div>
          )}
          {issue.logline && (
            <div style={{ fontFamily: theme.bodyFont, fontSize: '15px', color: theme.muted, maxWidth: '520px', margin: '12px auto 0', lineHeight: '1.6', fontStyle: 'italic' }}>
              {issue.logline}
            </div>
          )}
          {issue.published_at && (
            <div style={{ fontFamily: theme.bodyFont, fontSize: '13px', color: theme.muted, marginTop: '16px', letterSpacing: '0.05em' }}>
              {new Date(issue.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          )}
        </div>
      )}

      {/* ── BLOCKS ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 48px 120px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '64px' }}>
          {remainingBlocks.map(block => (
            <BlockRenderer
              key={block.id}
              block={block}
              theme={theme}
              artists={artists}
              tracks={tracks}
              stories={stories}
            />
          ))}
        </div>

        {/* ── FOOTER ── */}
        <div style={{ marginTop: '96px', paddingTop: '40px', borderTop: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', fontFamily: 'DM Sans, sans-serif' }}>
          <button onClick={() => router.push('/escapes')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: theme.muted, textDecoration: 'underline' }}>
            ← Back to Escapes
          </button>
          {browsingTracks.length > 0 && <BrowsingMusicBar tracks={browsingTracks} />}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: '𝕏', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(`${issue.title} — Human Echo Escapes`)}` },
              { label: 'f', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}` },
              { label: '💬', href: `https://wa.me/?text=${encodeURIComponent(`${issue.title} — ${typeof window !== 'undefined' ? window.location.href : ''}`)}` },
            ].map(item => (
              <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${theme.border}`, fontSize: '14px', textDecoration: 'none', color: theme.muted }}>
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
