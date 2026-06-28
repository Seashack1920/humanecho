import FilmDetailPage from './FilmDetailPage'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <FilmDetailPage id={id} />
}
