import { supabase } from '@/lib/supabase'
import ArtistClient from './ArtistClient'

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id

  // Fetch artist
  const { data: artist, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !artist) {
    return <div style={{ padding: '40px', color: 'var(--text-primary)' }}>Artist not found.</div>
  }

  // Fetch their albums
  const { data: albums } = await supabase
    .from('albums')
    .select('*')
    .eq('artist_id', id)
    .order('created_at', { ascending: false })

  // Fetch their tracks
  const { data: tracks } = await supabase
    .from('tracks')
    .select('*')
    .eq('artist_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  return <ArtistClient artist={artist} albums={albums || []} tracks={tracks || []} />
}
