import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'product-files'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
)

// Token-gated download for guest storefront buyers. The token comes from their
// order (success page or emailed link); we verify it, then redirect to a fresh
// short-lived signed URL for the file. No account needed.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || ''
  if (!token) return NextResponse.json({ error: 'Missing download token.' }, { status: 400 })

  const { data: order } = await supabase
    .from('store_orders').select('product_id, status').eq('download_token', token).maybeSingle()
  if (!order || order.status !== 'paid') return NextResponse.json({ error: 'This download link is not valid.' }, { status: 403 })

  const { data: product } = await supabase
    .from('products').select('file_path, file_name, title').eq('id', order.product_id).maybeSingle()
  if (!product?.file_path) return NextResponse.json({ error: 'No file is available for this item yet.' }, { status: 404 })

  const { data: signed, error } = await supabase.storage
    .from(BUCKET).createSignedUrl(product.file_path, 120, { download: product.file_name || product.title || 'download' })
  if (error || !signed?.signedUrl) return NextResponse.json({ error: 'Could not prepare the download.' }, { status: 500 })

  return NextResponse.redirect(signed.signedUrl)
}
