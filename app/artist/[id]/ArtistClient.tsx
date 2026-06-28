'use client'

import { useState, useEffect, useRef } from 'react'
import { usePlayer } from '@/context/PlayerContext'
import VideoModal from '@/components/VideoModal'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Story = {
  id: string
  title: string
  logline: string | null
  cover_image_url: string | null
  story_type: string
  read_time_minutes: number | null
  status: string
  content_origin: string | null
  explicit: boolean
  tip_enabled: boolean
  created_at: string
}

type Film = {
  id: string
  title: string
  logline: string | null
  poster_url: string | null
  film_type: string
  runtime_minutes: number | null
  status: string
  content_origin: string | null
  created_at: string
}

const STORY_TYPE_LABELS: Record<string, string> = {
  short_story: 'Short Story', flash_fiction: 'Flash Fiction',
  educational: 'Educational', children: "Children's", series: 'Series', essay: 'Essay',
}

const FILM_TYPE_LABELS: Record<string, string> = {
  feature: 'Feature Film', short: 'Short Film',
  music_video: 'Music Video', documentary: 'Documentary',
}

const originEmoji = (o?: string | null) =>
  o === '100% human' ? '🧑' : o === 'human+ai' ? '🧑🤖' : o === 'ai generated' ? '🤖' : ''

export default function ArtistClient({
  artist, albums, tracks, stories = [], films = [], creatorType = ['music']
}: {
  artist: any
  albums: any[]
  tracks: any[]
  stories?: Story[]
  films?: Film[]
  creatorType?: string[]
}) {
  const router = useRouter()
  const { playTrack, togglePlay, currentTrack, isPlaying } = usePlayer() as any
  const [isMobile, setIsMobile]       = useState(false)
  const [modalVideo, setModalVideo]   = useState<string | null>(null)
  const [modalThumb, setModalThumb]   = useState<string | null>(null)
  const [modalLabel, setModalLabel]   = useState<string | null>(null)
  const [videoVisible, setVideoVisible] = useState(false)
  const [videoPlayed, setVideoPlayed] = useState(false)
  const [activeTab, setActiveTab]     = useState<string>('')
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const isMusic = creatorType.includes('music')
  const isStory = creatorType.includes('story')
  const isBook  = creatorType.includes('book')
  const isFilm  = creatorType.includes('film')

  // Set default tab based on creator type
  useEffect(() => {
    if (isMusic) setActiveTab('music')
    else if (isStory) setActiveTab('stories')
    else if (isFilm) setActiveTab('films')
    else if (isBook) setActiveTab('books')
  }, [isMusic, isStory, isFilm, isBook])

  // Tabs to show — only content types this creator has
  const tabs = [
    isMusic && { key: 'music',   label: '🎵 Music' },
    isStory && { key: 'stories', label: '📖 Stories' },
    isFilm  && { key: 'films',   label: '🎬 Films' },
    isBook  && { key: 'books',   label: '📚 Books' },
  ].filter(Boolean) as { key: string; label: string }[]

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!artist.artist_profile_video_url) return
    const timer = setTimeout(() => {
      setVideoVisible(true)
      if (videoRef.current) videoRef.current.play().catch(() => {})
    }, 1000)
    return () => clearTimeout(timer)
  }, [artist.artist_profile_video_url])

  const handleVideoEnded = () => { setVideoVisible(false); setVideoPlayed(true) }
  const replayVideo = () => {
    setVideoVisible(true); setVideoPlayed(false)
    if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play().catch(() => {}) }
  }

  const openModal = (videoUrl: string, thumbUrl: string, label: string) => {
    setModalVideo(videoUrl); setModalThumb(thumbUrl); setModalLabel(label || null)
  }
  const closeModal = () => { setModalVideo(null); setModalThumb(null); setModalLabel(null) }

  const originBadge = (origin: string): string | null => {
    const map: Record<string, string> = {
      '100% human': '🧑 100% Human',
      'human+ai': '🧑🤖 Human + AI',
      'ai generated': '🤖 AI Generated',
    }
    return map[origin] || null
  }

  return (
    <>
      {modalVideo && (
        <VideoModal videoUrl={modalVideo} thumbUrl={modalThumb} artistName={artist.name} label={modalLabel} onClose={closeModal} />
      )}

      {/* ── HERO ── */}
      <div style={{
        position: 'relative', height: isMobile ? '70vh' : '80vh',
        overflow: 'hidden', display: 'flex', alignItems: 'flex-end',
      }}>
        {artist.photo_url && (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${artist.photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center top' }} />
        )}
        {artist.artist_profile_video_url && (
          <video ref={videoRef} muted playsInline onEnded={handleVideoEnded}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: videoVisible ? 1 : 0, transition: 'opacity 1s ease', pointerEvents: 'none' }}>
            <source src={artist.artist_profile_video_url} />
          </video>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.92) 100%)' }} />
        <div style={{ position: 'relative', width: '100%', maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '0 20px 40px' : '0 32px 56px' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: isMobile ? '48px' : 'clamp(56px, 8vw, 96px)', fontWeight: '700', color: 'white', lineHeight: '1.0', letterSpacing: '-2px', marginBottom: '12px', textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
            {artist.name}
          </h1>
          {/* Creator label */}
          {artist.creator_label && (
            <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.55)', marginBottom: '16px', fontStyle: 'italic' }}>
              {artist.creator_label}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {isMusic && <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{albums.length} {albums.length === 1 ? 'album' : 'albums'}</span>}
            {isMusic && <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{tracks.length} tracks</span>}
            {isStory && stories.length > 0 && <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{stories.length} {stories.length === 1 ? 'story' : 'stories'}</span>}
            {isFilm  && films.length > 0  && <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{films.length} {films.length === 1 ? 'film' : 'films'}</span>}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {isMusic && tracks.length > 0 && (
              <button onClick={() => playTrack(tracks[0], tracks)} style={{ padding: '12px 28px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '14px', fontWeight: '500', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>▶</span><span>Play Latest</span>
              </button>
            )}
            {artist.artist_message_url && (
              <button onClick={() => openModal(artist.artist_message_url, artist.artist_message_thumb_url, 'Artist Message')} style={{ padding: '12px 24px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', color: 'white', fontSize: '14px', fontWeight: '500', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>▶</span><span>Message</span>
              </button>
            )}
            {artist.artist_profile_video_url && videoPlayed && (
              <button onClick={replayVideo} style={{ padding: '12px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: 'rgba(255,255,255,0.7)', fontSize: '13px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ↺ Replay
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '40px 20px' : '56px 32px' }}>

        {/* Bio */}
        {artist.bio && (
          <div style={{ marginBottom: '48px', maxWidth: '680px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: isMobile ? '22px' : '28px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '-0.5px' }}>About</h2>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>{artist.bio}</p>
          </div>
        )}

        {/* Content tabs — only show if creator has multiple types */}
        {tabs.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '36px', flexWrap: 'wrap' }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer', background: activeTab === tab.key ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: activeTab === tab.key ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ── MUSIC TAB ── */}
        {(activeTab === 'music' || tabs.length === 0) && isMusic && (
          <>
            {albums.length > 0 && (
              <div style={{ marginBottom: '56px' }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: isMobile ? '22px' : '28px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '24px', letterSpacing: '-0.5px' }}>Albums</h2>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: isMobile ? '16px' : '24px' }}>
                  {albums.map(album => (
                    <Link key={album.id} href={`/album/${album.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                      <div style={{ borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-secondary)', aspectRatio: '1', marginBottom: '10px', transition: 'transform 0.2s ease' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                        {album.cover_url
                          ? <img src={album.cover_url} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🎵</div>
                        }
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>{album.title}</div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {album.content_origin && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{originBadge(album.content_origin)}</span>}
                        {album.price && <span style={{ fontSize: '12px', color: 'var(--accent-secondary)' }}>${parseFloat(album.price).toFixed(2)}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {tracks.length > 0 && (
              <div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: isMobile ? '22px' : '28px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)', letterSpacing: '-0.5px' }}>Tracks</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {tracks.map((track, index) => {
                    const isActive           = currentTrack?.id === track.id
                    const isCurrentlyPlaying = isActive && isPlaying
                    const handleTrackClick   = () => isActive ? togglePlay() : playTrack(track, tracks)
                    return (
                      <div key={track.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '32px 40px 1fr auto' : '40px 48px 1fr auto', alignItems: 'center', gap: isMobile ? '10px' : '16px', padding: isMobile ? '10px 8px' : '12px 16px', borderRadius: '10px', background: isActive ? 'var(--bg-secondary)' : 'transparent', transition: 'background 0.2s ease', cursor: 'pointer' }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                        <div onClick={handleTrackClick} style={{ width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', borderRadius: '50%', background: isActive ? 'var(--accent-primary)' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: isActive ? 'white' : 'var(--text-muted)', flexShrink: 0, cursor: 'pointer' }}>
                          {isCurrentlyPlaying ? '⏸' : isActive ? '▶' : index + 1}
                        </div>
                        <div style={{ width: isMobile ? '36px' : '44px', height: isMobile ? '36px' : '44px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                          {track.track_image_url
                            ? <img src={track.track_image_url} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🎵</div>
                          }
                        </div>
                        <div onClick={handleTrackClick}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: isActive ? '500' : '400', color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{track.title}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{track.duration || '—'}</span>
                          </div>
                          {track.album_id && (
                            <Link href={`/album/${track.album_id}`} onClick={e => e.stopPropagation()} style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none' }}>
                              {albums.find(a => a.id === track.album_id)?.title || 'View album'}
                            </Link>
                          )}
                        </div>
                        {track.price && (
                          <button style={{ fontSize: isMobile ? '11px' : '12px', color: 'var(--accent-secondary)', background: 'none', border: '1px solid var(--accent-secondary)', borderRadius: '4px', padding: isMobile ? '3px 8px' : '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-secondary)'; e.currentTarget.style.color = 'white' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--accent-secondary)' }}>
                            ${parseFloat(track.price || 0).toFixed(2)}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── STORIES TAB ── */}
        {activeTab === 'stories' && isStory && (
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: isMobile ? '22px' : '28px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '24px', letterSpacing: '-0.5px' }}>Stories</h2>
            {stories.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📖</div>
                <div>No published stories yet.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                {stories.map(story => (
                  <div key={story.id} onClick={() => router.push(`/stories/${story.id}`)}
                    onMouseEnter={() => setHoveredCard(story.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    style={{ cursor: 'pointer', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-secondary)', border: hoveredCard === story.id ? '1px solid var(--accent-primary)' : '1px solid var(--border)', transition: 'all 0.2s', transform: hoveredCard === story.id ? 'translateY(-3px)' : 'translateY(0)' }}>
                    <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: 'var(--bg-card)' }}>
                      {story.cover_image_url
                        ? <img src={story.cover_image_url} alt={story.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>📖</div>
                      }
                      <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', color: 'white', backdropFilter: 'blur(4px)' }}>
                        {STORY_TYPE_LABELS[story.story_type] || story.story_type}
                      </div>
                      {story.explicit && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(224,122,95,0.85)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: 'white', fontWeight: '600' }}>18+</div>
                      )}
                    </div>
                    <div style={{ padding: '16px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        {story.read_time_minutes ? `${story.read_time_minutes} min read` : ''}
                        {story.content_origin ? ` · ${originEmoji(story.content_origin)}` : ''}
                      </div>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.3' }}>{story.title}</div>
                      {story.logline && <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>{story.logline}</div>}
                      {story.tip_enabled && <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--accent-primary)' }}>Free · Pay what you want</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FILMS TAB ── */}
        {activeTab === 'films' && isFilm && (
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: isMobile ? '22px' : '28px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '24px', letterSpacing: '-0.5px' }}>Films</h2>
            {films.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎬</div>
                <div>No published films yet.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                {films.map(film => (
                  <div key={film.id}
                    onMouseEnter={() => setHoveredCard(film.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    style={{ cursor: 'pointer', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-secondary)', border: hoveredCard === film.id ? '1px solid var(--accent-primary)' : '1px solid var(--border)', transition: 'all 0.2s', transform: hoveredCard === film.id ? 'translateY(-3px)' : 'translateY(0)' }}>
                    <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: 'var(--bg-card)' }}>
                      {film.poster_url
                        ? <img src={film.poster_url} alt={film.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🎬</div>
                      }
                      <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', color: 'white', backdropFilter: 'blur(4px)' }}>
                        {FILM_TYPE_LABELS[film.film_type] || film.film_type}
                      </div>
                    </div>
                    <div style={{ padding: '16px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        {film.runtime_minutes ? `${film.runtime_minutes} min` : ''}
                        {film.content_origin ? ` · ${originEmoji(film.content_origin)}` : ''}
                      </div>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>{film.title}</div>
                      {film.logline && <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>{film.logline}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BOOKS TAB ── */}
        {activeTab === 'books' && isBook && (
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: isMobile ? '22px' : '28px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '24px', letterSpacing: '-0.5px' }}>Books</h2>
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📚</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>Books coming soon</div>
              <div>Check back for novels, collections, and more.</div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
