'use client'

import { supabase } from '@/lib/supabase'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useBrowsingMusic } from '@/context/BrowsingMusicContext'
import { usePlayer } from '@/context/PlayerContext'
import BrowsingMusicBar from '@/components/BrowsingMusicBar'

type Story = {
  id: string
  title: string
  logline: string | null
  text_content: string | null
  cover_image_url: string | null
  story_type: string
  read_time_minutes: number | null
  word_count: number | null
  content_origin: string | null
  explicit: boolean
  content_warnings: string[] | null
  tip_enabled: boolean
  price: number | null
  artist_id: string | null
  contributors: { name: string; artist_id: string | null }[] | null
  available_narrators: string[] | null
  available_bg_music: string[] | null
  reading_theme: string | null
  series_id: string | null
  series_position: number | null
}

type Narrator = { id: string; name: string; tagline: string | null; avatar_url: string | null; voice_style: string | null; eleven_labs_voice_id: string | null; voice_sample_url: string | null }
type BgTrack  = { id: string; title: string; cloudinary_url: string; mood: string | null; loop_enabled: boolean; description: string | null }
type Artist   = { id: string; name: string; photo_url: string | null }

const THEMES: Record<string, { bg: string; text: string; muted: string; border: string; label: string }> = {
  light: { bg: '#ffffff',  text: '#1a1a1a',  muted: '#666666', border: '#e5e5e5', label: 'Light'  },
  sepia: { bg: '#f8f0e3',  text: '#2c1f0e',  muted: '#7a6045', border: '#ddd0b8', label: 'Sepia'  },
  dark:  { bg: '#1a1a2e',  text: '#e8e8f0',  muted: '#9090b0', border: '#2a2a40', label: 'Dark'   },
  night: { bg: '#0a0a0b',  text: '#d4d4d8',  muted: '#71717a', border: '#1a1a1a', label: 'Night'  },
}

const FONTS: Record<string, { family: string; label: string }> = {
  serif:    { family: 'Playfair Display, Georgia, serif', label: 'Serif'     },
  sans:     { family: 'DM Sans, system-ui, sans-serif',  label: 'Sans'       },
  humanist: { family: 'Lora, Georgia, serif',            label: 'Lora'       },
}

const STORY_TYPE_LABELS: Record<string, string> = {
  short_story: 'Short Story', flash_fiction: 'Flash Fiction',
  educational: 'Educational', children: "Children's", series: 'Series', essay: 'Essay',
}

function extractParagraphs(html: string): string[] {
  if (typeof window === 'undefined') return []
  const div = document.createElement('div')
  div.innerHTML = html
  const paragraphs: string[] = []
  div.querySelectorAll('p, h1, h2, h3, h4, blockquote, li').forEach(el => {
    const text = el.textContent?.trim()
    if (text && text.length > 0) paragraphs.push(text)
  })
  if (paragraphs.length === 0) {
    const text = div.textContent || ''
    return text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 10)
  }
  return paragraphs
}

function ClockIcon({ animating, color }: { animating: boolean; color: string }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!animating) return
    const interval = setInterval(() => setTick(t => (t + 1) % 12), 1000)
    return () => clearInterval(interval)
  }, [animating])
  const handAngle = (tick / 12) * 360
  const handRad   = (handAngle - 90) * (Math.PI / 180)
  const cx = 10, cy = 10, r = 7
  const hx = cx + r * 0.6 * Math.cos(handRad)
  const hy = cy + r * 0.6 * Math.sin(handRad)
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="1.5" />
      <line x1={cx} y1={cy} x2={hx} y2={hy} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="1" fill={color} />
    </svg>
  )
}

function NarratorSample({ narrator, themeColor, themeBorder }: {
  narrator: Narrator
  themeColor: string
  themeBorder: string
}) {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleSample = async () => {
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }
    if (narrator.voice_sample_url) {
      if (!audioRef.current) audioRef.current = new Audio()
      audioRef.current.src = narrator.voice_sample_url
      audioRef.current.onended = () => setPlaying(false)
      audioRef.current.play()
      setPlaying(true)
      return
    }
    if (!narrator.eleven_labs_voice_id) return
    setLoading(true)
    try {
      const res = await fetch('/api/elevenlabs/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice_id: narrator.eleven_labs_voice_id,
          text: `Hi, I'm ${narrator.name}. I'll be reading this story for you today.`
        }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      if (!audioRef.current) audioRef.current = new Audio()
      audioRef.current.src = url
      audioRef.current.onended = () => { setPlaying(false); URL.revokeObjectURL(url) }
      audioRef.current.play()
      setPlaying(true)
    } catch {}
    setLoading(false)
  }

  return (
    <button onClick={handleSample} title={playing ? 'Stop sample' : 'Hear narrator sample'}
      style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${themeBorder}`, background: 'none', cursor: 'pointer', fontSize: '13px', color: themeColor, flexShrink: 0 }}>
      {loading ? '⏳' : playing ? '■' : '▶'}
    </button>
  )
}

export default function StoryPage({ id }: { id: string }) {

  const router = useRouter()
  const {
    stop: stopBrowsingMusic,
    tracks: browsingTracks,
    setTracks,
    registerStopBgMusic,
    unregisterStopBgMusic,
  } = useBrowsingMusic()
  const { stop: stopPlayer } = usePlayer()

  const [story, setStory]             = useState<Story | null>(null)
  const [artist, setArtist]           = useState<Artist | null>(null)
  const [narrators, setNarrators]     = useState<Narrator[]>([])
  const [bgTracks, setBgTracks]       = useState<BgTrack[]>([])
  const [loading, setLoading]         = useState(true)
  const [showWarning, setShowWarning] = useState(false)
  const [warningAcknowledged, setWarningAcknowledged] = useState(false)

  const [theme, setTheme]               = useState('light')
  const [font, setFont]                 = useState('serif')
  const [fontSize, setFontSize]         = useState(18)
  const [showControls, setShowControls] = useState(false)

  const [selectedNarrator, setSelectedNarrator]         = useState<Narrator | null>(null)
  const [narrating, setNarrating]                       = useState(false)
  const [narratingParagraph, setNarratingParagraph]     = useState(0)
  const [paragraphs, setParagraphs]                     = useState<string[]>([])
  const [narrateError, setNarrateError]                 = useState<string | null>(null)
  const narrateRef          = useRef<HTMLAudioElement | null>(null)
  const shouldContinueRef   = useRef(false)
  const currentParagraphRef = useRef(0)

  const [selectedBgTrack, setSelectedBgTrack] = useState<BgTrack | null>(null)
  const [musicVolume, setMusicVolume]         = useState(0.3)
  const bgAudioRef = useRef<HTMLAudioElement | null>(null)

  const [tipAmount, setTipAmount] = useState('')
  const [tipSent, setTipSent]     = useState(false)

  const stopBgMusic = useCallback(() => {
    if (bgAudioRef.current) {
      bgAudioRef.current.pause()
      bgAudioRef.current.currentTime = 0
    }
    setSelectedBgTrack(null)
  }, [])

  const playBgTrack = useCallback((track: BgTrack) => {
    stopBrowsingMusic(true)
    if (!bgAudioRef.current) bgAudioRef.current = new Audio()
    const audio = bgAudioRef.current
    audio.src    = track.cloudinary_url
    audio.loop   = track.loop_enabled
    audio.volume = musicVolume
    audio.play().catch(() => {})
    setSelectedBgTrack(track)
  }, [musicVolume, stopBrowsingMusic])

  const handleMusicVolume = (vol: number) => {
    setMusicVolume(vol)
    if (bgAudioRef.current) bgAudioRef.current.volume = vol
  }

  useEffect(() => {
    stopPlayer()

    const load = async () => {
      const { data: storyData } = await supabase
        .from('stories')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .single()

      if (!storyData) { router.push('/stories'); return }
      setStory(storyData)

      if (storyData.reading_theme) setTheme(storyData.reading_theme)
      if (storyData.explicit || storyData.content_warnings?.length > 0) setShowWarning(true)

      if (storyData.text_content) {
        const ps = extractParagraphs(storyData.text_content)
        setParagraphs(ps)
      }

      if (storyData.artist_id) {
        const { data: artistData } = await supabase
          .from('artists').select('id, name, photo_url').eq('id', storyData.artist_id).single()
        if (artistData) setArtist(artistData)
      }

      if (storyData.available_narrators?.length > 0) {
        const { data: narratorsData } = await supabase
          .from('narrators')
          .select('id, name, tagline, avatar_url, voice_style, eleven_labs_voice_id, voice_sample_url')
          .in('id', storyData.available_narrators)
          .eq('is_active', true)
        if (narratorsData) setNarrators(narratorsData)
      }

      if (storyData.available_bg_music?.length > 0) {
        const { data: musicData } = await supabase
          .from('background_tracks')
          .select('id, title, cloudinary_url, mood, loop_enabled, description')
          .in('id', storyData.available_bg_music)
          .eq('is_active', true)
        if (musicData) setBgTracks(musicData)
      }

      try {
        const { data: browsingData } = await supabase
          .from('background_tracks')
          .select('id, title, cloudinary_url, mood, loop_enabled, description')
          .eq('is_active', true)
          .order('title', { ascending: true })
        if (browsingData) setTracks(browsingData)
      } catch (e) {}

      const savedTheme = localStorage.getItem('he_reading_theme')
      const savedFont  = localStorage.getItem('he_reading_font')
      const savedSize  = localStorage.getItem('he_reading_size')
      if (savedTheme) setTheme(savedTheme)
      if (savedFont)  setFont(savedFont)
      if (savedSize)  setFontSize(parseInt(savedSize))

      setLoading(false)
    }
    load()

    registerStopBgMusic(stopBgMusic)

    return () => {
      unregisterStopBgMusic()
      shouldContinueRef.current = false
      narrateRef.current?.pause()
      bgAudioRef.current?.pause()
    }
  }, [id])

  useEffect(() => {
    if (!bgAudioRef.current) return
    bgAudioRef.current.volume = narrating ? Math.min(musicVolume * 0.15, 0.05) : musicVolume
  }, [narrating, musicVolume])

  const generateParagraphAudio = async (text: string, voiceId: string): Promise<string> => {
    const res = await fetch('/api/elevenlabs/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_id: voiceId, text: text.slice(0, 500) }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Generation failed')
    }
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  }

  const startNarration = useCallback(async (narrator: Narrator, fromParagraph = 0) => {
    if (!narrator.eleven_labs_voice_id || paragraphs.length === 0) return
    setNarrating(true)
    setNarrateError(null)
    shouldContinueRef.current   = true
    currentParagraphRef.current = fromParagraph

    if (!narrateRef.current) narrateRef.current = new Audio()
    const audio = narrateRef.current

    for (let i = fromParagraph; i < paragraphs.length; i++) {
      if (!shouldContinueRef.current) break
      currentParagraphRef.current = i
      setNarratingParagraph(i)
      try {
        const audioUrl = await generateParagraphAudio(paragraphs[i], narrator.eleven_labs_voice_id)
        if (!shouldContinueRef.current) { URL.revokeObjectURL(audioUrl); break }
        audio.src = audioUrl
        await audio.play()
        await new Promise<void>((resolve, reject) => {
          audio.onerror = () => reject(new Error('Playback error'))
          const check = setInterval(() => {
            if (!shouldContinueRef.current) { clearInterval(check); URL.revokeObjectURL(audioUrl); resolve() }
          }, 100)
          audio.onended = () => { clearInterval(check); URL.revokeObjectURL(audioUrl); resolve() }
        })
      } catch (err) {
        setNarrateError((err as Error).message)
        break
      }
    }
    setNarrating(false)
    setNarratingParagraph(0)
  }, [paragraphs])

  const stopNarration = useCallback(() => {
    shouldContinueRef.current = false
    narrateRef.current?.pause()
    setNarrating(false)
    setNarratingParagraph(0)
  }, [])

  const handleSelectNarrator = (narrator: Narrator | null) => {
    stopNarration()
    setSelectedNarrator(narrator)
    if (narrator) stopBrowsingMusic(true)
  }

  const savePreference = (key: string, value: string) => localStorage.setItem(key, value)

  const handleTip = async () => {
    if (!tipAmount || !story) return
    setTipSent(true)
  }

  const currentTheme = THEMES[theme] || THEMES.light
  const currentFont  = FONTS[font]   || FONTS.serif

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em' }}>Loading</div>
    </div>
  )

  if (!story) return null

  if (showWarning && !warningAcknowledged) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '20px', padding: '48px 40px', maxWidth: '440px', width: '100%', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>Content Notice</div>
          {story.explicit && <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>This story contains explicit content and is intended for readers 18+.</div>}
          {story.content_warnings && story.content_warnings.length > 0 && (
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>Content warnings: {story.content_warnings.join(', ')}.</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => setWarningAcknowledged(true)} style={{ padding: '12px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
              I understand — continue reading
            </button>
            <button onClick={() => router.push('/stories')} style={{ padding: '10px', borderRadius: '10px', background: 'none', color: 'var(--text-muted)', fontSize: '14px', border: '1px solid var(--border)', cursor: 'pointer' }}>
              ← Back to Stories
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: currentTheme.bg, transition: 'background 0.3s ease' }}>

      {/* ── TOP CONTROLS BAR ── */}
      <div style={{ position: 'fixed', top: '70px', left: 0, right: 0, zIndex: 50, background: currentTheme.bg, borderBottom: `1px solid ${currentTheme.border}`, padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/stories')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: currentTheme.muted }}>
            ← Stories
          </button>
          {browsingTracks.length > 0 && (
            <BrowsingMusicBar tracks={browsingTracks} />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => { const s = Math.max(14, fontSize - 1); setFontSize(s); savePreference('he_reading_size', String(s)) }} style={{ background: 'none', border: `1px solid ${currentTheme.border}`, borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '13px', color: currentTheme.muted }}>A−</button>
          <button onClick={() => { const s = Math.min(26, fontSize + 1); setFontSize(s); savePreference('he_reading_size', String(s)) }} style={{ background: 'none', border: `1px solid ${currentTheme.border}`, borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '15px', color: currentTheme.muted }}>A+</button>
          {selectedNarrator && selectedNarrator.eleven_labs_voice_id && (
            <button
              onClick={() => narrating ? stopNarration() : startNarration(selectedNarrator, currentParagraphRef.current)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', border: `1px solid ${narrating ? 'var(--accent-primary)' : currentTheme.border}`, background: narrating ? 'rgba(43,122,143,0.1)' : 'none', cursor: 'pointer', fontSize: '13px', color: narrating ? 'var(--accent-primary)' : currentTheme.muted }}
            >
              {narrating ? (
                <><ClockIcon animating={true} color="var(--accent-primary)" /> <span>Narrating...</span> <span style={{ fontSize: '11px' }}>■ Stop</span></>
              ) : (
                <><span>▶</span> <span>{selectedNarrator.name}</span></>
              )}
            </button>
          )}
          <button onClick={() => setShowControls(!showControls)} style={{ background: showControls ? 'var(--accent-primary)' : 'none', border: `1px solid ${showControls ? 'var(--accent-primary)' : currentTheme.border}`, borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontSize: '13px', color: showControls ? 'white' : currentTheme.muted }}>
            ⚙ Settings
          </button>
        </div>
      </div>

      {/* ── SETTINGS PANEL ── */}
      {showControls && (
        <div style={{ position: 'fixed', top: '110px', right: '24px', zIndex: 60, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', width: '300px', boxShadow: '0 16px 48px rgba(0,0,0,0.3)', maxHeight: '80vh', overflowY: 'auto' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>Background</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {Object.entries(THEMES).map(([key, t]) => (
                <button key={key} onClick={() => { setTheme(key); savePreference('he_reading_theme', key) }} title={t.label}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: t.bg, border: theme === key ? '2px solid var(--accent-primary)' : `2px solid ${t.border}`, cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>Font</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(FONTS).map(([key, f]) => (
                <button key={key} onClick={() => { setFont(key); savePreference('he_reading_font', key) }}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: font === key ? '1px solid var(--accent-primary)' : '1px solid var(--border)', background: font === key ? 'rgba(43,122,143,0.1)' : 'none', cursor: 'pointer', fontSize: '13px', color: font === key ? 'var(--accent-primary)' : 'var(--text-secondary)', fontFamily: f.family, textAlign: 'left' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {narrators.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>Narrator</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button onClick={() => handleSelectNarrator(null)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: selectedNarrator === null ? '1px solid var(--accent-primary)' : '1px solid var(--border)', background: selectedNarrator === null ? 'rgba(43,122,143,0.1)' : 'none', cursor: 'pointer', fontSize: '13px', color: selectedNarrator === null ? 'var(--accent-primary)' : 'var(--text-secondary)', textAlign: 'left' }}>
                  No narration
                </button>
                {narrators.map(n => (
                  <button key={n.id} onClick={() => handleSelectNarrator(n)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: selectedNarrator?.id === n.id ? '1px solid var(--accent-primary)' : '1px solid var(--border)', background: selectedNarrator?.id === n.id ? 'rgba(43,122,143,0.1)' : 'none', cursor: 'pointer', textAlign: 'left' as const }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span onClick={e => e.stopPropagation()}>
                        <NarratorSample narrator={n} themeColor={currentTheme.muted} themeBorder={currentTheme.border} />
                      </span>
                      {n.avatar_url && <img src={n.avatar_url} alt={n.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />}
                      <div>
                        <div style={{ fontSize: '13px', color: selectedNarrator?.id === n.id ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: '500' }}>{n.name}</div>
                        {n.voice_style && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{n.voice_style}</div>}
                      </div>
                    </div>
                  </button>
                ))}
                {selectedNarrator && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Press ▶ in the top bar to start narration
                  </div>
                )}
                {narrateError && <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc3c3c' }}>⚠ {narrateError}</div>}
              </div>
            </div>
          )}
          {bgTracks.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>Background Music</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button onClick={stopBgMusic}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: selectedBgTrack === null ? '1px solid var(--accent-primary)' : '1px solid var(--border)', background: selectedBgTrack === null ? 'rgba(43,122,143,0.1)' : 'none', cursor: 'pointer', fontSize: '13px', color: selectedBgTrack === null ? 'var(--accent-primary)' : 'var(--text-secondary)', textAlign: 'left' }}>
                  No music
                </button>
                {bgTracks.map(t => (
                  <button key={t.id} onClick={() => playBgTrack(t)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: selectedBgTrack?.id === t.id ? '1px solid var(--accent-primary)' : '1px solid var(--border)', background: selectedBgTrack?.id === t.id ? 'rgba(43,122,143,0.1)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', color: selectedBgTrack?.id === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: '500' }}>
                      {selectedBgTrack?.id === t.id ? '▶ ' : ''}{t.title}
                    </div>
                    {t.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.description}</div>}
                  </button>
                ))}
              </div>
              {selectedBgTrack && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Music volume {narrating ? '(ducked while narrating)' : ''}
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={musicVolume}
                    onChange={e => handleMusicVolume(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-primary)' }} />
                </div>
              )}
            </div>
          )}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <button onClick={() => setShowControls(false)}
              style={{ padding: '8px 24px', borderRadius: '20px', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)' }}>
              Close Settings ✕
            </button>
          </div>
        </div>
      )}

      {/* ── STORY CONTENT ── */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '140px 32px 80px' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif' }}>
            {STORY_TYPE_LABELS[story.story_type] || story.story_type}
            {story.read_time_minutes && ` · ${story.read_time_minutes} min read`}
          </div>
          <h1 style={{ fontFamily: currentFont.family, fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: '700', color: currentTheme.text, lineHeight: '1.15', marginBottom: '16px' }}>
            {story.title}
          </h1>
          {story.logline && (
            <p style={{ fontFamily: currentFont.family, fontSize: `${fontSize + 2}px`, color: currentTheme.muted, lineHeight: '1.6', marginBottom: '24px', fontStyle: 'italic' }}>
              {story.logline}
            </p>
          )}
          {(artist || story.contributors) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '24px', borderBottom: `1px solid ${currentTheme.border}` }}>
              {artist?.photo_url && <img src={artist.photo_url} alt={artist.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />}
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.text, fontFamily: 'DM Sans, sans-serif' }}>{artist?.name || 'Unknown author'}</div>
                {story.contributors && story.contributors.length > 0 && (
                  <div style={{ fontSize: '12px', color: currentTheme.muted, fontFamily: 'DM Sans, sans-serif' }}>With {story.contributors.map(c => c.name).join(', ')}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {narrating && paragraphs.length > 0 && (
          <div style={{ marginBottom: '24px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(43,122,143,0.08)', border: '1px solid rgba(43,122,143,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'DM Sans, sans-serif' }}>
            <ClockIcon animating={true} color="var(--accent-primary)" />
            <span style={{ fontSize: '13px', color: 'var(--accent-primary)' }}>
              {selectedNarrator?.name} is narrating · paragraph {narratingParagraph + 1} of {paragraphs.length}
            </span>
            <div style={{ flex: 1, height: '3px', background: 'rgba(43,122,143,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${((narratingParagraph + 1) / paragraphs.length) * 100}%`, background: 'var(--accent-primary)', borderRadius: '2px', transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )}

        {story.text_content ? (
          <div style={{ fontFamily: currentFont.family, fontSize: `${fontSize}px`, lineHeight: '1.8', color: currentTheme.text, letterSpacing: '0.01em' }}
            dangerouslySetInnerHTML={{ __html: story.text_content }} />
        ) : (
          <div style={{ color: currentTheme.muted, fontSize: `${fontSize}px`, fontStyle: 'italic' }}>Story content coming soon.</div>
        )}

        {story.tip_enabled && (
          <div style={{ marginTop: '64px', padding: '32px', borderRadius: '16px', background: theme === 'light' ? '#f8f8f8' : `rgba(255,255,255,0.04)`, border: `1px solid ${currentTheme.border}`, textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: '700', color: currentTheme.text, marginBottom: '8px' }}>Enjoyed the story?</div>
            <div style={{ fontSize: '14px', color: currentTheme.muted, marginBottom: '24px' }}>This story is free. A tip goes directly to the author.</div>
            {tipSent ? (
              <div style={{ fontSize: '16px', color: 'var(--accent-primary)', fontWeight: '600' }}>✓ Thank you — your support means everything.</div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {['1', '3', '5', '10'].map(amt => (
                    <button key={amt} onClick={() => setTipAmount(amt)}
                      style={{ padding: '8px 20px', borderRadius: '20px', border: tipAmount === amt ? '1px solid var(--accent-primary)' : `1px solid ${currentTheme.border}`, background: tipAmount === amt ? 'var(--accent-primary)' : 'none', color: tipAmount === amt ? 'white' : currentTheme.muted, fontSize: '14px', cursor: 'pointer' }}>
                      ${amt}
                    </button>
                  ))}
                  <input type="number" placeholder="Other" value={tipAmount} onChange={e => setTipAmount(e.target.value)}
                    style={{ width: '80px', padding: '8px 12px', borderRadius: '20px', border: `1px solid ${currentTheme.border}`, background: 'none', color: currentTheme.text, fontSize: '14px', outline: 'none', textAlign: 'center' }} />
                </div>
                <button onClick={handleTip} disabled={!tipAmount}
                  style={{ padding: '10px 28px', borderRadius: '20px', background: tipAmount ? 'var(--accent-primary)' : 'var(--border)', color: 'white', fontSize: '14px', fontWeight: '600', border: 'none', cursor: tipAmount ? 'pointer' : 'not-allowed', opacity: tipAmount ? 1 : 0.5 }}>
                  Send tip {tipAmount ? `$${tipAmount}` : ''}
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '40px', paddingTop: '32px', borderTop: `1px solid ${currentTheme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontFamily: 'DM Sans, sans-serif' }}>
          <div style={{ fontSize: '13px', color: currentTheme.muted }}>Share this story</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: '𝕏', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(`Just read "${story.title}" on Human Echo`)}` },
              { label: 'f', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}` },
              { label: '💬', href: `https://wa.me/?text=${encodeURIComponent(`"${story.title}" — ${typeof window !== 'undefined' ? window.location.href : ''}`)}` },
            ].map(item => (
              <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${currentTheme.border}`, fontSize: '14px', textDecoration: 'none', color: currentTheme.muted }}>
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
          <button onClick={() => router.push('/stories')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: currentTheme.muted, textDecoration: 'underline', fontFamily: 'DM Sans, sans-serif' }}>
            ← Back to all stories
          </button>
          {browsingTracks.length > 0 && (
            <BrowsingMusicBar tracks={browsingTracks} />
          )}
        </div>
      </div>
    </div>
  )
}
