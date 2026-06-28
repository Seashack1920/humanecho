import StoryPage from './StoryPage'

export default async function StoryServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StoryPage id={id} />
}