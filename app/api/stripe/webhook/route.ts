import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {

      // ── Subscription created or updated ──────────────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.supabase_user_id
        if (!userId) break

        const status       = subscription.status // active, past_due, canceled, etc.
        const priceId      = subscription.items.data[0]?.price.id
        const plan         = priceId === process.env.STRIPE_ANNUAL_PRICE_ID ? 'annual' : 'monthly'
        const item = subscription.items.data[0]
        const periodEndUnix = (item as any)?.current_period_end ?? (subscription as any).current_period_end
        const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null
        const isActive     = status === 'active' || status === 'trialing'

       const { error: updateError } = await supabase.from('profiles').update({
          subscription_status:    status,
          subscription_plan:      plan,
          subscription_id:        subscription.id,
          subscription_period_end: periodEnd,
          is_subscriber:          isActive,
          updated_at:             new Date().toISOString(),
        }).eq('id', userId)

        if (updateError) {
          console.error('PROFILE UPDATE FAILED:', updateError)
        } else {
          console.log('Profile updated OK for', userId)
        }

        console.log(`Subscription ${event.type} for user ${userId}: ${plan} ${status}`)
        break
      }

      // ── Subscription cancelled ────────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.supabase_user_id
        if (!userId) break

        await supabase.from('profiles').update({
          subscription_status:    'canceled',
          subscription_plan:      null,
          is_subscriber:          false,
          subscription_period_end: null,
          updated_at:             new Date().toISOString(),
        }).eq('id', userId)

        console.log(`Subscription cancelled for user ${userId}`)
        break
      }

      // ── Payment succeeded ─────────────────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice    = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Look up user by Stripe customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          // Record the payment
        await supabase.from('payments').upsert({
            user_id:        profile.id,
            stripe_invoice_id: invoice.id,
            amount:         (invoice.amount_paid || 0) / 100,
            currency:       invoice.currency,
            status:         'succeeded',
            payment_type:   'subscription',
            created_at:     new Date().toISOString(),
          }, { onConflict: 'stripe_invoice_id', ignoreDuplicates: true })
        }
        break
      }

      // ── Payment failed ────────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice    = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase.from('profiles').update({
            subscription_status: 'past_due',
            updated_at:          new Date().toISOString(),
          }).eq('id', profile.id)
        }
        break
      }

      // ── Checkout completed ────────────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId  = session.metadata?.supabase_user_id
        if (!userId) break

        // One-time track/album purchase (destination charge with 85/15 split).
        // Recorded here so the buyer gains ownership + download access.
        if (session.mode === 'payment' && session.metadata?.kind === 'purchase') {
          const md = session.metadata
          const { error: purchaseErr } = await supabase.from('purchases').upsert({
            user_id:           userId,
            item_type:         md.item_type,
            item_id:           md.item_id,
            artist_id:         md.artist_id,
            amount:            (session.amount_total || 0) / 100,
            stripe_payment_id: session.payment_intent as string,
            status:            'completed',
          }, { onConflict: 'stripe_payment_id', ignoreDuplicates: true })

          if (purchaseErr) console.error('PURCHASE INSERT FAILED:', purchaseErr)
          else console.log(`Purchase recorded: ${md.item_type} ${md.item_id} for user ${userId}`)
          break
        }

        // Subscription checkout: save the Stripe customer ID for the portal.
        if (session.customer) {
          await supabase.from('profiles').update({
            stripe_customer_id: session.customer as string,
          }).eq('id', userId)
        }
        break
      }

      // ── Artist Connect onboarding completed ──────────────────────────────────
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const artistId = account.metadata?.artist_id
        if (!artistId) break
        // Stripe considers the account ready when it can accept charges and receive payouts
        const isReady = account.charges_enabled && account.payouts_enabled
        const { error: onboardErr } = await supabase
          .from('artists')
          .update({ stripe_onboarded: isReady })
          .eq('id', artistId)
        if (onboardErr) {
          console.error('Failed to update stripe_onboarded:', onboardErr)
        } else {
          console.log(`Artist ${artistId} onboarding status: ${isReady ? 'COMPLETE' : 'incomplete'}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
