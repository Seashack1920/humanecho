import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'), { apiVersion: '2024-06-20' })

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key')
)

// Guest checkout for a shop product BLOCK. No account required — Stripe Checkout
// collects the buyer's email (which feeds the funnel) and, for physical goods,
// their shipping address. The price and name are read from the block server-side
// so the client can't tamper with them. Printify fulfilment is wired in a later
// pass; the order is recorded either way.
export async function POST(req: NextRequest) {
  try {
    const { blockId, returnUrl } = await req.json()
    if (!blockId) {
      return NextResponse.json({ error: 'Missing product' }, { status: 400 })
    }

    const { data: block } = await supabase
      .from('issue_blocks')
      .select('id, block_type, content, issue_id, issues(slug, title, status, artist_id)')
      .eq('id', blockId)
      .maybeSingle()

    if (!block || block.block_type !== 'product') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const issue = (block as any).issues || {}
    if (issue.status && issue.status !== 'published') {
      return NextResponse.json({ error: 'This shop is not open yet.' }, { status: 400 })
    }

    const c = (block.content || {}) as Record<string, any>
    const price = Number(c.price)
    if (!price || price <= 0) {
      return NextResponse.json({ error: 'This item is not for sale.' }, { status: 400 })
    }

    const productType = c.product_type === 'digital' ? 'digital' : 'physical'
    const productName = String(c.name || issue.title || 'Shop item')
    const amountCents = Math.round(price * 100)
    const site = process.env.NEXT_PUBLIC_SITE_URL || ''
    const shopUrl = issue.slug ? `${site}/shop/${issue.slug}` : `${site}/shop`
    const back = returnUrl || shopUrl

    const metadata = {
      kind: 'shop_product',
      block_id: block.id,
      issue_id: block.issue_id || '',
      artist_id: issue.artist_id || '',
      product_type: productType,
      product_name: productName.slice(0, 120),
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: productName,
            images: c.image_url ? [String(c.image_url)] : undefined,
          },
        },
      }],
      // Physical POD goods need a shipping address; digital goods do not.
      ...(productType === 'physical'
        ? { shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] } }
        : {}),
      payment_intent_data: { metadata },
      metadata,
      success_url: `${back}${back.includes('?') ? '&' : '?'}purchased=1`,
      cancel_url: back,
    })

    // Pre-record a pending order so the webhook can finalise it on completion.
    await supabase.from('shop_orders').insert({
      issue_id: block.issue_id || null,
      block_id: block.id,
      artist_id: issue.artist_id || null,
      product_name: productName,
      product_type: productType,
      amount: price,
      currency: 'usd',
      stripe_session_id: session.id,
      status: 'pending',
      printify_product_id: c.printify_product_id || null,
      printify_variant_id: c.printify_variant_id || null,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Shop product checkout failed:', err)
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 })
  }
}
