import { supabase } from '@/lib/supabase'
import BrowseClient from '@/components/BrowseClient'

export default async function BooksPage() {
  const { data: books } = await supabase
    .from('books')
    .select('*, artists(name, photo_url)')
    .order('created_at', { ascending: false })

  return (
    <BrowseClient
      type="books"
      title="Books"
      emoji="📖"
      description="Reads, audiobooks and literary works from Human Echo artists"
      books={books || []}
    />
  )
}
