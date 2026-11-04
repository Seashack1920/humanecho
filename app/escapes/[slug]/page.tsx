import { redirect } from 'next/navigation'

// Escapes issues are now shops at /shop/[slug]. Preserve old deep links.
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/shop/${slug}`)
}
