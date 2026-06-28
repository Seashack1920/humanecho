import MusicGenrePage from './MusicGenrePage'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <MusicGenrePage id={id} />
}
