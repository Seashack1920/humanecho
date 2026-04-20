import { supabase } from '@/lib/supabase'
import HomepageClient from './HomepageClient'

export default async function Home() {
  const { data: albums } = await supabase
    .from('albums')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(6)

  const { data: artists } = await supabase
    .from('artists')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(8)

  const { data: tracks } = await supabase
    .from('tracks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(4)

  return <HomepageClient albums={albums || []} artists={artists || []} tracks={tracks || []} />
}