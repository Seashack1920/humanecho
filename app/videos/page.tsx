'use client'

// Music Videos gallery — a discovery surface for songs that have a music video.
// The song page remains each video's home; a card here links straight to it.
// Starts sparse on purpose (few songs have videos yet) and fills automatically
// as videos get added, so we don't surface it in the main nav until it's full.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useDefaultTrackImage } from '@/lib/siteSettings'

type VideoItem = {
  id: string
  title: string
  track_image_url: string | null
  music_video_thumb_url: string | null
  artist_id: string
  artist_name?: string
}

function VideoCard({ item }: { item: VideoItem }) {
  const router = useRouter()
  const defaultImg = useDefaultTrackImage()
  const [hovered, setHovered] = useState(false)
  const poster = item.music_video_thumb_url || item.track_image_url || defaultImg || ''

  return (
    <button
      onClick={() => router.push(`/song/${item.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif' }}
    >
      <div style={{ position: 'relative', aspectRatio: '16 / 9', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-secondary)', transition: 'transform 0.2s', transform: hovered ? 'translateY(-4px)' : 'translateY(0)', boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.15)' }}>
        <img src={poster} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: hovered ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#0a0a0b' }}>▶</div>
        </div>
      </div>
      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
      {item.artist_name && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.artist_name}</div>}
    </button>
  )
}

export default function MusicVideosPage() {
  const router = useRouter()
  const [items, setItems]     = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: tracks } = await supabase
        .from('tracks')
        .select('id, title, track_image_url, music_video_thumb_url, artist_id')
        .eq('status', 'published')
        .not('music_video_url', 'is', null)
        .neq('music_video_url', '')
        .order('created_at', { ascending: false })

      const list = (tracks || []) as VideoItem[]
      const ids = [...new Set(list.map(t => t.artist_id).filter(Boolean))]
      let names: Record<string, string> = {}
      if (ids.length) {
        const { data: artists } = await supabase.from('artists').select('id, name').in('id', ids)
        names = Object.fromEntries((artists || []).map(a => [a.id, a.name]))
      }
      setItems(list.map(t => ({ ...t, artist_name: names[t.artist_id] })))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '100px 24px 120px' }}>

        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '8px', fontWeight: '600' }}>Watch</div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.1' }}>Music Videos</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '10px', maxWidth: '560px' }}>
            Songs brought to life on screen. Tap any video to open its song.
          </p>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '40px 0' }}>Loading</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎬</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No music videos yet</div>
            <div style={{ fontSize: '14px' }}>They'll appear here as artists add them.</div>
            <button onClick={() => router.push('/music')} style={{ marginTop: '20px', padding: '10px 24px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px' }}>Browse music</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {items.map(item => <VideoCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  )
}
