import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Artist Stripe Connect onboarding.
 * POST body: { artistId, userId, email }
 * Creates (or reuses) an Express connected account, saves the id to
 * artists.stripe_account_id, and returns a single-use onboarding URL.
 */
export async function POST(req: NextRequest) {
  try {
    const { artistId, userId, email } = await req.json()
    if (!artistId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: artist, error: artistErr } = await supabase
      .from('artists')
      .select('id, name, stripe_account_id')
      .eq('id', artistId)
      .maybeSingle()

    if (artistErr || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    let accountId = artist.stripe_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: email || undefined,
        metadata: {
          supabase_user_id: userId,
          artist_id: artistId,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      accountId = account.id

      const { error: saveErr } = await supabase
        .from('artists')
        .update({ stripe_account_id: accountId })
        .eq('id', artistId)

      if (saveErr) {
        console.error('Failed to save stripe_account_id:', saveErr)
        return NextResponse.json({ error: 'Could not save Stripe account' }, { status: 500 })
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/artist/connect/refresh?artist=${artistId}`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/artist/connect/return?artist=${artistId}`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    console.error('Connect onboarding error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
