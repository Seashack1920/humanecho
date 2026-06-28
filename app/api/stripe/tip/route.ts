import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'), { apiVersion: '2024-06-20' })

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key')
)

export async function POST(req: NextRequest) {
  try {
    const { artistId, itemType, itemId, amount, message, userId, email, returnUrl } = await req.json()

    if (!artistId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const amt = Number(amount)
    if (!amt || amt < 1)    return NextResponse.json({ error: 'Minimum tip is $1.' }, { status: 400 })
    if (amt > 1000)         return NextResponse.json({ error: 'Maximum tip is $1000.' }, { status: 400 })

    // Artist must be Connect-onboarded to receive tips
    const { data: artist } = await supabase
      .from('artists')
      .select('id, name, stripe_account_id, stripe_onboarded')
      .eq('id', artistId)
      .maybeSingle()

    if (!artist?.stripe_account_id || !artist.stripe_onboarded) {
      return NextResponse.json({ error: 'This artist is not set up to receive tips yet.' }, { status: 400 })
    }

    const amountCents = Math.round(amt * 100)

    const metadata = {
      kind: 'tip',
      supabase_user_id: userId || '',
      artist_id: artist.id,
      item_type: itemType || '',
      item_id: itemId || '',
      tip_message: (message || '').slice(0, 200),
    }

    const ret = returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/`
    const sep = ret.includes('?') ? '&' : '?'

    // 100% to the artist: NO application fee (platform takes nothing). The
    // connected account (artist) is merchant of record via on_behalf_of, so
    // Stripe's processing fee comes out of the tip — platform stays cost-neutral.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      submit_type: 'donate',
      customer_email: email || undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: { name: `Tip for ${artist.name}` },
        },
      }],
      payment_intent_data: {
        on_behalf_of: artist.stripe_account_id,
        transfer_data: { destination: artist.stripe_account_id },
        metadata,
      },
      success_url: `${ret}${sep}tip=thanks`,
      cancel_url: ret,
      metadata,
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    console.error('Tip checkout error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
