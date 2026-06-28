'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BrowsingMusicBar from '@/components/BrowsingMusicBar'
import { useBrowsingMusic } from '@/context/BrowsingMusicContext'
import { usePlayer } from '@/context/PlayerContext'
import LikeButton from '@/components/LikeButton'
import StoryContest from '@/components/StoryContest'
import StoryContestWinners from '@/components/StoryContestWinners'

type Story = {
  id: string
  title: string
  logline: string | null
  cover_image_url: string | null
  story_type: string
  read_time_minutes: number | null
  word_count: number | null
  content_origin: string | null
  explicit: boolean
  status: string
  is_featured: boolean
  featured_order: number | null
  tip_enabled: boolean
  artist_id: string | null
  artist?: { name: string; photo_url: string | null }
  created_at: string
}

type Chapbook = {
  id: string
  title: string
  logline: string | null
  cover_image_url: string | null
  content_origin: string | null
  status: string
  is_featured: boolean
}

type BgTrack = {
  id: string
  title: string
  cloudinary_url: string
  mood: string | null
  loop_enabled: boolean
  description: string | null
}

const STORY_TYPE_LABELS: Record<string, string> = {
  short_story:   'Short Story',
  flash_fiction: 'Flash Fiction',
  educational:   'Educational',
  children:      "Children's",
  series:        'Series',
  essay:         'Essay',
}

const originEmoji = (o?: string | null) =>
  o === '100% human' ? '🧑' : o === 'human+ai' ? '🧑🤖' : o === 'ai generated' ? '🤖' : ''

const CATEGORIES = [
  { key: 'all',           label: 'All' },
  { key: 'short_story',   label: 'Short Stories' },
  { key: 'flash_fiction', label: 'Flash Fiction' },
  { key: 'educational',   label: 'Educational' },
  { key: 'children',      label: "Children's" },
  { key: 'essay',         label: 'Essays' },
  { key: 'chapbook',      label: 'Poetry' },
]

export default function StoriesPage() {
  const router = useRouter()
  const { setTracks, stop } = useBrowsingMusic()
  const { stop: stopPlayer } = usePlayer()

  const [stories, setStories]         = useState<Story[]>([])
  const [chapbooks, setChapbooks]     = useState<Chapbook[]>([])
  const [heroStory, setHeroStory]     = useState<Story | null>(null)
  const [bgTracks, setBgTracks]       = useState<BgTrack[]>([])
  const [selectedCat, setSelectedCat] = useState('all')
  const [loading, setLoading]         = useState(true)
  const [hoveredId, setHoveredId]     = useState<string | null>(null)
  const [contestIds, setContestIds]   = useState<{ id: string; winners_published: boolean }[]>([])

  useEffect(() => {
    stopPlayer()

    const load = async () => {
      try {
        const { data: storiesData } = await supabase
          .from('stories')
          .select('id, title, logline, cover_image_url, story_type, read_time_minutes, word_count, content_origin, explicit, status, is_featured, featured_order, tip_enabled, artist_id, created_at')
          .eq('status', 'published')
          .order('created_at', { ascending: false })

        const { data: chapbooksData } = await supabase
          .from('chapbooks')
          .select('id, title, logline, cover_image_url, content_origin, status, is_featured')
          .eq('status', 'published')
          .order('created_at', { ascending: false })

        if (storiesData) {
          const enriched = await Promise.all(storiesData.map(async s => {
            if (!s.artist_id) return s
            const { data: artist } = await supabase
              .from('artists')
              .select('name, photo_url')
              .eq('id', s.artist_id)
              .single()
            return { ...s, artist: artist || undefined }
          }))
          setStories(enriched)
          const featured = enriched
            .filter(s => s.is_featured)
            .sort((a, b) => (a.featured_order || 99) - (b.featured_order || 99))
          setHeroStory(featured[0] || enriched[0] || null)
        }

        if (chapbooksData) setChapbooks(chapbooksData)

        // Featured story-type contests (flash fiction / short story / memoir)
        const { data: contestsData } = await supabase
          .from('contests')
          .select('id, winners_published')
          .eq('featured', true)
          .in('type', ['flash_fiction', 'short_story', 'memoir'])
          .order('created_at', { ascending: false })
        if (contestsData) setContestIds(contestsData.map(c => ({ id: c.id, winners_published: c.winners_published })))

        try {
          const { data: musicData } = await supabase
            .from('background_tracks')
            .select('id, title, cloudinary_url, mood, loop_enabled, description')
            .eq('is_active', true)
            .order('title', { ascending: true })
          if (musicData) {
            setBgTracks(musicData)
            setTracks(musicData)
          }
        } catch (e) {
          // browsing music unavailable — non-fatal
        }

        setLoading(false)
      } catch (e) {
        console.error('Stories load error:', e)
        setLoading(false)
      }
    }
    load()

    return () => stop(true)
  }, [])

  const filteredStories = selectedCat === 'all'
    ? stories
    : selectedCat === 'chapbook'
    ? []
    : stories.filter(s => s.story_type === selectedCat)

  const showChapbooks = selectedCat === 'all' || selectedCat === 'chapbook'

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HERO ── */}
      {heroStory && (
        <section style={{
          position: 'relative', minHeight: '70vh',
          display: 'flex', alignItems: 'flex-end',
          overflow: 'hidden', background: '#0a0a0b',
          marginTop: '-70px', paddingTop: '70px',
        }}>
          {heroStory.cover_image_url ? (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${heroStory.cover_image_url})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              filter: 'blur(2px) brightness(0.45)', transform: 'scale(1.05)',
            }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a0d2e 0%, #0a0a0b 60%, #0d1a2e 100%)' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,11,0.98) 0%, rgba(10,10,11,0.4) 55%, rgba(10,10,11,0.1) 100%)' }} />
          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 40px 72px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '40px' }}>
              {heroStory.artist?.photo_url && (
                <div style={{ flexShrink: 0 }}>
                  <img src={heroStory.artist.photo_url} alt={heroStory.artist.name}
                    style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.2)', boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '10px', fontWeight: '600' }}>
                  {STORY_TYPE_LABELS[heroStory.story_type] || heroStory.story_type}
                  {heroStory.read_time_minutes && ` · ${heroStory.read_time_minutes} min read`}
                </div>
                <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(28px, 5vw, 60px)', fontWeight: '700', color: 'white', lineHeight: '1.1', marginBottom: '12px', letterSpacing: '-0.02em' }}>
                  {heroStory.title}
                </h1>
                {heroStory.logline && (
                  <p style={{ fontSize: 'clamp(14px, 2vw, 18px)', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', lineHeight: '1.6', maxWidth: '600px' }}>
                    {heroStory.logline}
                  </p>
                )}
                {heroStory.artist && (
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '28px' }}>
                    By {heroStory.artist.name} {originEmoji(heroStory.content_origin)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => router.push(`/stories/${heroStory.id}`)}
                    style={{ padding: '12px 28px', borderRadius: '50px', background: 'white', color: '#0a0a0b', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.88)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    Read now →
                  </button>
                  {heroStory.tip_enabled && (
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Free · Pay what you want</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 40px 64px' }}>

        {/* ── BROWSING MUSIC BAR ── */}
        {bgTracks.length > 0 && (
          <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Set the mood</span>
            <BrowsingMusicBar tracks={bgTracks} />
          </div>
        )}

        {/* ── CATEGORY FILTER ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '48px' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setSelectedCat(cat.key)}
              style={{ padding: '6px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: selectedCat === cat.key ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: selectedCat === cat.key ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── STORY CONTEST(S) ── */}
        {contestIds.map(c => (
          c.winners_published
            ? <StoryContestWinners key={c.id} contestId={c.id} />
            : <StoryContest key={c.id} contestId={c.id} />
        ))}

        {/* ── STORIES GRID ── */}
        {filteredStories.length > 0 && (
          <section style={{ marginBottom: '64px' }}>
            {selectedCat === 'all' && (
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '28px' }}>Stories</h2>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {filteredStories.map(story => (
                <div key={story.id} onClick={() => router.push(`/stories/${story.id}`)}
                  onMouseEnter={() => setHoveredId(story.id)} onMouseLeave={() => setHoveredId(null)}
                  style={{ cursor: 'pointer', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-secondary)', border: hoveredId === story.id ? '1px solid var(--accent-primary)' : '1px solid var(--border)', transition: 'border-color 0.2s, transform 0.2s', transform: hoveredId === story.id ? 'translateY(-3px)' : 'translateY(0)' }}>
                  <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: 'var(--bg-card)' }}>
                    {story.cover_image_url
                      ? <img src={story.cover_image_url} alt={story.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease', transform: hoveredId === story.id ? 'scale(1.04)' : 'scale(1)' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>📖</div>
                    }
                    {story.artist?.photo_url && (
                      <div style={{ position: 'absolute', bottom: '-20px', left: '16px' }}>
                        <img src={story.artist.photo_url} alt={story.artist.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--bg-secondary)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', color: 'white', backdropFilter: 'blur(4px)' }}>
                      {STORY_TYPE_LABELS[story.story_type] || story.story_type}
                    </div>
                    {story.explicit && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(224,122,95,0.85)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: 'white', fontWeight: '600' }}>18+</div>
                    )}
                  </div>
                  <div style={{ padding: '28px 16px 16px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      {story.artist?.name && `${story.artist.name} · `}
                      {story.read_time_minutes ? `${story.read_time_minutes} min read` : story.word_count ? `${story.word_count.toLocaleString()} words` : ''}
                      {story.content_origin && ` · ${originEmoji(story.content_origin)}`}
                    </div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.3' }}>{story.title}</div>
                    {story.logline && (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>{story.logline}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                      {story.tip_enabled && (
                        <div style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>Free · Pay what you want</div>
                      )}
                      <LikeButton contentType="story" contentId={story.id} size="sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── CHAPBOOKS ── */}
        {showChapbooks && chapbooks.length > 0 && (
          <section style={{ marginBottom: '64px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '28px' }}>Poetry & Chapbooks</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
              {chapbooks.map(chapbook => (
                <div key={chapbook.id} onClick={() => router.push(`/stories/chapbook/${chapbook.id}`)}
                  onMouseEnter={() => setHoveredId(chapbook.id)} onMouseLeave={() => setHoveredId(null)}
                  style={{ cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-secondary)', border: hoveredId === chapbook.id ? '1px solid var(--accent-primary)' : '1px solid var(--border)', transition: 'all 0.2s', transform: hoveredId === chapbook.id ? 'translateY(-3px)' : 'translateY(0)' }}>
                  <div style={{ aspectRatio: '1', overflow: 'hidden', background: 'var(--bg-card)' }}>
                    {chapbook.cover_image_url
                      ? <img src={chapbook.cover_image_url} alt={chapbook.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>📜</div>
                    }
                  </div>
                  <div style={{ padding: '14px' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '4px', fontWeight: '600' }}>Chapbook</div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{chapbook.title}</div>
                    {chapbook.logline && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{chapbook.logline}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── EMPTY STATE ── */}
        {filteredStories.length === 0 && (!showChapbooks || chapbooks.length === 0) && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📖</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>Coming soon</div>
            <div style={{ fontSize: '14px' }}>Stories are on their way.</div>
          </div>
        )}
      </div>
    </div>
  )
}
