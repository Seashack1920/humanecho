import { supabase } from '@/lib/supabase'
import AlbumClient from './AlbumClient'

export default async function AlbumPage({ params }) {
  const id = (await params).id

  const { data: album, error: albumError } = await supabase
    .from('albums')
    .select('*')
    .eq('id', id)
    .single()

  if (albumError || !album) {
    return <div style={{ padding: '40px', color: 'var(--text-primary)' }}>Album not found.</div>
  }

  const { data: artist } = await supabase
    .from('artists')
    .select('*')
    .eq('id', album.artist_id)
    .single()

  const { data: tracks } = await supabase
    .from('tracks')
    .select('*')
    .eq('album_id', id)
    .order('track_number', { ascending: true })

  return <AlbumClient album={album} artist={artist} tracks={tracks || []} />
}