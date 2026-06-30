import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key')
)

const BUCKET = 'product-files'

// Serves a purchased digital product as a short-lived signed download URL.
// The caller's identity is taken from their Supabase JWT (not a client-supplied
// id), and ownership is checked against the purchases table before any URL is
// minted — so a signed link is only ever issued to someone who actually bought it.
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
    }

    const { productId } = await req.json()
    if (!productId) {
      return NextResponse.json({ error: 'Missing product id.' }, { status: 400 })
    }

    // Ownership check — must have a completed purchase of this product.
    const { data: owned } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_type', 'product')
      .eq('item_id', productId)
      .eq('status', 'completed')
      .maybeSingle()

    if (!owned) {
      return NextResponse.json({ error: 'You do not own this item.' }, { status: 403 })
    }

    const { data: product } = await supabase
      .from('products')
      .select('file_path, file_name, title')
      .eq('id', productId)
      .maybeSingle()

    if (!product?.file_path) {
      return NextResponse.json({ error: 'No download is available for this item yet.' }, { status: 404 })
    }

    const downloadName = product.file_name || `${product.title || 'download'}`
    const { data: signed, error: signErr } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUrl(product.file_path, 120, { download: downloadName })

    if (signErr || !signed?.signedUrl) {
      console.error('Signed URL error:', signErr)
      return NextResponse.json({ error: 'Could not prepare the download.' }, { status: 500 })
    }

    return NextResponse.json({ url: signed.signedUrl })
  } catch (err) {
    console.error('Product download error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
