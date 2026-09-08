import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { apiVersion: '2024-06-20' })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
)

// Guest checkout for a standalone storefront product — no account required.
// Stripe collects the email; delivery is by token (see webhook + /api/store/download).
export async function POST(req: NextRequest) {
  try {
    const { productId, storefront } = await req.json()
    if (!productId || !storefront) return NextResponse.json({ error: 'Missing product or storefront.' }, { status: 400 })

    const { data: product } = await supabase
      .from('products')
      .select('id, title, description, price, status, storefront, image_url')
      .eq('id', productId).maybeSingle()

    if (!product || product.storefront !== storefront) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
    if (product.status !== 'published') return NextResponse.json({ error: 'This item is not available.' }, { status: 400 })
    const price = Number(product.price)
    if (!price || price <= 0) return NextResponse.json({ error: 'This item is not for sale.' }, { status: 400 })

    const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanechomusic.com').replace(/\/$/, '')
    const metadata = { kind: 'store_guest', item_id: productId, storefront }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(price * 100),
          product_data: {
            name: product.title,
            description: product.description ? String(product.description).slice(0, 300) : undefined,
            images: product.image_url ? [product.image_url] : undefined,
          },
        },
      }],
      payment_intent_data: { metadata },
      metadata,
      success_url: `${site}/store/${storefront}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/store/${storefront}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
