import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'), { apiVersion: '2024-06-20' })

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key')
)

// Human Echo keeps 15% of each sale as the Stripe application fee; the
// remaining 85% is transferred to the artist's connected account.
const PLATFORM_FEE_RATE = 0.15

export async function POST(req: NextRequest) {
  try {
    const { itemType, itemId, userId, email, returnUrl } = await req.json()

    if (!itemType || !itemId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (itemType !== 'track' && itemType !== 'album') {
      return NextResponse.json({ error: 'Invalid item type' }, { status: 400 })
    }

    // ── Load the item (price, artist, title) ──
    const table = itemType === 'track' ? 'tracks' : 'albums'
    const { data: item } = await supabase
      .from(table)
      .select('id, title, price, artist_id, status')
      .eq('id', itemId)
      .maybeSingle()

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    if (item.status !== 'published') {
      return NextResponse.json({ error: 'This item is not available for purchase.' }, { status: 400 })
    }
    const price = Number(item.price)
    if (!price || price <= 0) {
      return NextResponse.json({ error: 'This item is not for sale.' }, { status: 400 })
    }

    // ── Don't let the same user buy the same thing twice ──
    const { data: existing } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .eq('status', 'completed')
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'You already own this.', alreadyOwned: true }, { status: 409 })
    }

    const { data: artist } = await supabase
      .from('artists')
      .select('id, name, stripe_account_id, stripe_onboarded, platform_owned')
      .eq('id', item.artist_id)
      .maybeSingle()

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found.' }, { status: 404 })
    }

    // House content (platform_owned) charges straight to Human Echo's own
    // Stripe account — no Connect split. Third-party artists require a
    // connected, onboarded Stripe account and get the 85/15 destination split.
    const isHouse = artist.platform_owned === true
    if (!isHouse && (!artist.stripe_account_id || !artist.stripe_onboarded)) {
      return NextResponse.json(
        { error: 'This artist is not set up to receive payments yet.' },
        { status: 400 }
      )
    }

    const amountCents = Math.round(price * 100)
    const feeCents    = Math.round(amountCents * PLATFORM_FEE_RATE)

    const metadata = {
      supabase_user_id: userId,
      item_type: itemType,
      item_id: itemId,
      artist_id: artist.id,
      kind: 'purchase',
    }

    // House content: plain charge to Human Echo (100%). Third-party artist:
    // destination charge — platform keeps the 15% fee, 85% transfers to them.
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
            name: item.title,
            description: `${itemType === 'album' ? 'Album' : 'Track'} by ${artist.name}`,
          },
        },
      }],
      payment_intent_data: isHouse
        ? { metadata }
        : {
            application_fee_amount: feeCents,
            transfer_data: { destination: artist.stripe_account_id },
            metadata,
          },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/library?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/album/${itemType === 'album' ? itemId : ''}`,
      metadata,
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    console.error('Purchase checkout error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
