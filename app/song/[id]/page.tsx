import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import SongPage from './SongPage'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanechomusic.com').replace(/\/$/, '')

// A lightweight, session-less client for server-side metadata fetches. The
// shared browser client persists sessions and touches navigator, which we don't
// want on the server.
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

// Open Graph / Twitter metadata so a shared song link renders as a rich card
// (cover art + title + artist) in iMessage, WhatsApp, Slack, X, etc.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const { data: track } = await db()
    .from('tracks')
    .select('title, track_image_url, tagline, album_id, artist_id, status')
    .eq('id', id)
    .maybeSingle()

  if (!track || track.status !== 'published') {
    return { title: 'Song · Human Echo' }
  }

  let artistName = ''
  if (track.artist_id) {
    const { data: artist } = await db().from('artists').select('name').eq('id', track.artist_id).maybeSingle()
    artistName = artist?.name || ''
  }

  let cover = track.track_image_url || ''
  if (!cover && track.album_id) {
    const { data: album } = await db().from('albums').select('cover_url').eq('id', track.album_id).maybeSingle()
    cover = album?.cover_url || ''
  }

  const title = artistName ? `${track.title} — ${artistName}` : track.title
  const description = track.tagline
    || (artistName ? `Listen to ${track.title} by ${artistName} on Human Echo.` : `Listen to ${track.title} on Human Echo.`)
  const url = `${SITE}/song/${id}`

  return {
    title: `${title} · Human Echo`,
    description,
    openGraph: {
      type: 'music.song',
      title,
      description,
      url,
      siteName: 'Human Echo',
      images: cover ? [{ url: cover }] : undefined,
    },
    twitter: {
      card: cover ? 'summary_large_image' : 'summary',
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SongPage id={id} />
}
