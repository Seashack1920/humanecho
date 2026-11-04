import ShopPage from './ShopPage'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <ShopPage slug={slug} />
}
