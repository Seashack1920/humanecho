import CinemaProfileDetailPage from './CinemaProfileDetailPage'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CinemaProfileDetailPage id={id} />
}