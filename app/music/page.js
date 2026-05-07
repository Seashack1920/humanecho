import { supabase } from '@/lib/supabase'
import BrowseClient from '@/components/BrowseClient'

export default async function MusicPage() {
  const { data: albums } = await supabase
    .from('albums')
    .select('*, artists(name, photo_url)')
    .order('created_at', { ascending: false })

  const { data: tracks } = await supabase
    .from('tracks')
    .select('*, artists(name)')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <BrowseClient
      type="music"
      title="Music"
      emoji="🎵"
      description="Albums, singles and instrumentals from Human Echo artists"
      albums={albums || []}
      tracks={tracks || []}
    />
  )
}
