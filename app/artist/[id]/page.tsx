import ArtistPage from './ArtistPage'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ArtistPage id={id} />
}
