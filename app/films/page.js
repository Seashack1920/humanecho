import { supabase } from '@/lib/supabase'
import BrowseClient from '@/components/BrowseClient'

export default async function FilmsPage() {
  const { data: videos } = await supabase
    .from('videos')
    .select('*, artists(name, photo_url)')
    .order('created_at', { ascending: false })

  return (
    <BrowseClient
      type="films"
      title="Films"
      emoji="🎬"
      description="Feature films, documentaries, shorts and live performances"
      videos={videos || []}
    />
  )
}
