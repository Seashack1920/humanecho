'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminContent() {
  const [artists, setArtists] = useState<any[]>([])
const [albums, setAlbums] = useState<any[]>([])
const [tracks, setTracks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('artists')

  useEffect(() => {
    async function fetchAll() {
      const [{ data: a }, { data: al }, { data: t }] = await Promise.all([
        supabase.from('artists').select('id, name, photo_url, created_at').order('name'),
        supabase.from('albums').select('id, title, artist_id, album_type, status, cover_url, release_date, price, created_at').order('created_at', { ascending: false }),
        supabase.from('tracks').select('id, title, artist_id, album_id, track_number, track_type, duration, status, price, content_origin, created_at').order('created_at', { ascending: false }),
      ])
      setArtists(a || [])
      setAlbums(al || [])
      setTracks(t || [])
      setLoading(false)
    }
    fetchAll()
  }, [])

  // Helper to get artist name by id
  const artistName = (id) => artists.find(a => a.id === id)?.name || '—'
  const albumTitle = (id) => id ? (albums.find(a => a.id === id)?.title || '—') : 'Single'

  const s = {
    page: { maxWidth: '1100px', margin: '0 auto', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' },
    h1: { fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' },
    subtitle: { fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '24px' },
    tab: (active) => ({
      padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '500',
      border: 'none', cursor: 'pointer',
      background: active ? 'var(--accent-primary)' : 'var(--bg-secondary)',
      color: active ? 'white' : 'var(--text-muted)',
    }),
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { textAlign: 'left' as const, fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' as const, padding: '8px 12px', borderBottom: '1px solid var(--border)' },
    td: { padding: '12px 12px', fontSize: '13px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' as const },
    badge: (color) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500', background: color === 'green' ? 'rgba(43,180,100,0.15)' : color === 'blue' ? 'rgba(43,122,143,0.15)' : 'rgba(150,150,150,0.15)', color: color === 'green' ? '#2bb464' : color === 'blue' ? 'var(--accent-primary)' : 'var(--text-muted)' }),
    link: { color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '500' },
    thumb: { width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' as const, background: 'var(--bg-secondary)', display: 'block' },
    navRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' },
  }

  const statusBadge = (status) => {
    const color = status === 'published' ? 'green' : status === 'private' ? 'blue' : 'gray'
    return <span style={s.badge(color)}>{status}</span>
  }

  if (loading) return (
    <div style={{ ...s.page, color: 'var(--text-muted)', paddingTop: '80px', textAlign: 'center' }}>
      Loading content...
    </div>
  )

  return (
    <div style={s.page}>
      <div style={s.navRow}>
        <div>
          <h1 style={s.h1}>Content Library</h1>
          <p style={s.subtitle}>
            {artists.length} artists · {albums.length} albums · {tracks.length} tracks
          </p>
        </div>
        <Link href="/admin/upload" style={{ ...s.link, fontSize: '14px' }}>
          + Upload New
        </Link>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {[
          { key: 'artists', label: `Artists (${artists.length})` },
          { key: 'albums', label: `Albums (${albums.length})` },
          { key: 'tracks', label: `Tracks (${tracks.length})` },
        ].map(tab => (
          <button key={tab.key} style={s.tab(activeTab === tab.key)} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Artists */}
      {activeTab === 'artists' && (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}></th>
              <th style={s.th}>Name</th>
              <th style={s.th}>Albums</th>
              <th style={s.th}>Tracks</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {artists.map(artist => (
              <tr key={artist.id}>
                <td style={{ ...s.td, width: '48px' }}>
                  {artist.photo_url
                    ? <img src={artist.photo_url} alt={artist.name} style={s.thumb} />
                    : <div style={{ ...s.thumb, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🎵</div>
                  }
                </td>
                <td style={s.td}>
                  <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{artist.name}</span>
                </td>
                <td style={s.td}>
                  {albums.filter(al => al.artist_id === artist.id).length}
                </td>
                <td style={s.td}>
                  {tracks.filter(t => t.artist_id === artist.id).length}
                </td>
                <td style={s.td}>
                  <Link href={`/artist/${artist.id}`} style={s.link} target="_blank">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Albums */}
      {activeTab === 'albums' && (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}></th>
              <th style={s.th}>Title</th>
              <th style={s.th}>Artist</th>
              <th style={s.th}>Type</th>
              <th style={s.th}>Tracks</th>
              <th style={s.th}>Price</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {albums.map(album => (
              <tr key={album.id}>
                <td style={{ ...s.td, width: '48px' }}>
                  {album.cover_url
                    ? <img src={album.cover_url} alt={album.title} style={s.thumb} />
                    : <div style={{ ...s.thumb, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🎵</div>
                  }
                </td>
                <td style={s.td}>
                  <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{album.title}</span>
                </td>
                <td style={s.td}>{artistName(album.artist_id)}</td>
                <td style={s.td}>{album.album_type}</td>
                <td style={s.td}>{tracks.filter(t => t.album_id === album.id).length}</td>
                <td style={s.td}>{album.price ? `$${parseFloat(album.price).toFixed(2)}` : '—'}</td>
                <td style={s.td}>{statusBadge(album.status)}</td>
                <td style={s.td}>
                  <Link href={`/album/${album.id}`} style={s.link} target="_blank">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Tracks */}
      {activeTab === 'tracks' && (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>#</th>
              <th style={s.th}>Title</th>
              <th style={s.th}>Artist</th>
              <th style={s.th}>Album</th>
              <th style={s.th}>Type</th>
              <th style={s.th}>Duration</th>
              <th style={s.th}>Price</th>
              <th style={s.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map(track => (
              <tr key={track.id}>
                <td style={{ ...s.td, color: 'var(--text-muted)', width: '40px' }}>
                  {track.track_number || '—'}
                </td>
                <td style={s.td}>
                  <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{track.title}</span>
                </td>
                <td style={s.td}>{artistName(track.artist_id)}</td>
                <td style={s.td}>
                  <span style={{ color: track.album_id ? 'var(--text-secondary)' : 'var(--accent-gold)' }}>
                    {albumTitle(track.album_id)}
                  </span>
                </td>
                <td style={s.td}>{track.track_type}</td>
                <td style={s.td}>{track.duration || '—'}</td>
                <td style={s.td}>{track.price ? `$${parseFloat(track.price).toFixed(2)}` : '—'}</td>
                <td style={s.td}>{statusBadge(track.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

