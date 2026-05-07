import { supabase } from '@/lib/supabase'
import BrowseClient from '@/components/BrowseClient'

export default async function StoriesPage() {
  const { data: stories } = await supabase
    .from('stories')
    .select('*, artists(name, photo_url)')
    .order('created_at', { ascending: false })

  return (
    <BrowseClient
      type="stories"
      title="Stories"
      emoji="✍️"
      description="Fiction, essays, audio dramas and spoken word"
      stories={stories || []}
    />
  )
}
