import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'), { apiVersion: '2024-06-20' })

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key')
)

// Store products are house content (Fugitive Poets Press / Human Echo), so the
// full amount charges straight to Human Echo's own Stripe account — no Connect
// split, no application fee.
export async function POST(req: NextRequest) {
  try {
    const { productId, userId, email, returnUrl } = await req.json()

    if (!productId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: product } = await supabase
      .from('products')
      .select('id, title, description, price, status, product_type')
      .eq('id', productId)
      .maybeSingle()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    if (product.status !== 'published') {
      return NextResponse.json({ error: 'This item is not available for purchase.' }, { status: 400 })
    }
    const price = Number(product.price)
    if (!price || price <= 0) {
      return NextResponse.json({ error: 'This item is not for sale.' }, { status: 400 })
    }

    // Don't let the same user buy the same product twice.
    const { data: existing } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('item_type', 'product')
      .eq('item_id', productId)
      .eq('status', 'completed')
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'You already own this.', alreadyOwned: true }, { status: 409 })
    }

    const amountCents = Math.round(price * 100)

    const metadata = {
      supabase_user_id: userId,
      item_type: 'product',
      item_id: productId,
      kind: 'product',
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: product.title,
            description: product.description ? String(product.description).slice(0, 300) : undefined,
          },
        },
      }],
      payment_intent_data: { metadata },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/library?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/shop`,
      metadata,
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    console.error('Product checkout error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
