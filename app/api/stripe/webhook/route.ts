import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'), { apiVersion: '2024-06-20' })

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key')
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
        const sub0 = event.data.object as Stripe.Subscription
        const userId = sub0.metadata.supabase_user_id
        if (!userId) break

        // Re-fetch the subscription so we act on Stripe's CURRENT status, not a
        // (possibly stale / out-of-order) event payload. This is what prevents an
        // 'incomplete' event from clobbering an already-active member.
        let subscription = sub0
        try { subscription = await stripe.subscriptions.retrieve(sub0.id) } catch {}

        const status  = subscription.status // active, trialing, incomplete, past_due, canceled...
        const priceId = subscription.items.data[0]?.price.id
        const plan    = priceId === process.env.STRIPE_ANNUAL_PRICE_ID ? 'annual' : 'monthly'
        const item    = subscription.items.data[0]
        const periodEndUnix = (item as any)?.current_period_end ?? (subscription as any).current_period_end
        const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null

        const isActive         = status === 'active' || status === 'trialing'
        const terminalInactive = status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired'

        // Writing Room tier from the subscribed price. Creator+ and The Revisionist
        // are higher membership tiers (one price each); base = neither.
        const isRevisionist = !!priceId && (priceId === process.env.STRIPE_REVISIONIST_PRICE_ID || priceId === process.env.STRIPE_REVISIONIST_ANNUAL_PRICE_ID)
        const isCreatorPlus = !!priceId && (priceId === process.env.STRIPE_CREATORPLUS_PRICE_ID || priceId === process.env.STRIPE_CREATORPLUS_ANNUAL_PRICE_ID)
        let membershipTier: string | null = null
        let revisionistAddon = false
        if (isRevisionist) { membershipTier = 'creator_plus'; revisionistAddon = true }
        else if (isCreatorPlus) { membershipTier = 'creator_plus' }

        const updates: any = {
          subscription_status:     status,
          subscription_plan:       plan,
          subscription_id:         subscription.id,
          subscription_period_end: periodEnd,
          updated_at:              new Date().toISOString(),
        }
        // Only flip access on definitive states. Transient states ('incomplete',
        // 'past_due') must NOT downgrade an active member — they resolve via a
        // later event or the invoice.payment_succeeded backstop below.
        if (isActive) { updates.is_subscriber = true; updates.membership_tier = membershipTier; updates.revisionist_addon = revisionistAddon }
        else if (terminalInactive) { updates.is_subscriber = false; updates.membership_tier = null; updates.revisionist_addon = false }

        const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', userId)

        if (updateError) console.error('PROFILE UPDATE FAILED:', updateError)
        else console.log(`Subscription ${event.type} for ${userId}: ${plan} ${status} (is_subscriber=${updates.is_subscriber ?? 'unchanged'})`)
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
          membership_tier:        null,
          revisionist_addon:      false,
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

          // Backstop: a paid subscription invoice means the member IS active,
          // regardless of the order subscription events arrived in.
          if ((invoice as any).subscription) {
            await supabase.from('profiles').update({
              is_subscriber:       true,
              subscription_status: 'active',
              updated_at:          new Date().toISOString(),
            }).eq('id', profile.id)
          }
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
        const md = session.metadata || {}

        // One-time track/album purchase (destination charge with 85/15 split).
        // Recorded here so the buyer gains ownership + download access.
        if (session.mode === 'payment' && md.kind === 'purchase') {
          if (!md.supabase_user_id) { console.error('Purchase missing user id'); break }
          const { error: purchaseErr } = await supabase.from('purchases').upsert({
            user_id:           md.supabase_user_id,
            item_type:         md.item_type,
            item_id:           md.item_id,
            artist_id:         md.artist_id,
            amount:            (session.amount_total || 0) / 100,
            stripe_payment_id: session.payment_intent as string,
            status:            'completed',
          }, { onConflict: 'stripe_payment_id', ignoreDuplicates: true })

          if (purchaseErr) console.error('PURCHASE INSERT FAILED:', purchaseErr)
          else console.log(`Purchase recorded: ${md.item_type} ${md.item_id} for user ${md.supabase_user_id}`)
          break
        }

        // Digital product (ebook, etc.) — house content, full amount to Human
        // Echo. Recorded into purchases so the buyer gains download access.
        if (session.mode === 'payment' && md.kind === 'product') {
          if (!md.supabase_user_id) { console.error('Product purchase missing user id'); break }
          const { error: productErr } = await supabase.from('purchases').upsert({
            user_id:           md.supabase_user_id,
            item_type:         'product',
            item_id:           md.item_id,
            artist_id:         null,
            amount:            (session.amount_total || 0) / 100,
            stripe_payment_id: session.payment_intent as string,
            status:            'completed',
          }, { onConflict: 'stripe_payment_id', ignoreDuplicates: true })

          if (productErr) console.error('PRODUCT PURCHASE INSERT FAILED:', productErr)
          else console.log(`Product purchase recorded: ${md.item_id} for user ${md.supabase_user_id}`)
          break
        }

        // Tip (free-content support): 100% to the artist, no platform fee.
        // Tips may be anonymous, so user id is optional here.
        if (session.mode === 'payment' && md.kind === 'tip') {
          const { error: tipErr } = await supabase.from('tips').upsert({
            user_id:           md.supabase_user_id || null,
            artist_id:         md.artist_id,
            item_type:         md.item_type || null,
            item_id:           md.item_id || null,
            amount:            (session.amount_total || 0) / 100,
            stripe_payment_id: session.payment_intent as string,
            status:            'completed',
          }, { onConflict: 'stripe_payment_id', ignoreDuplicates: true })

          if (tipErr) console.error('TIP INSERT FAILED:', tipErr)
          else console.log(`Tip recorded: $${(session.amount_total || 0) / 100} to artist ${md.artist_id}`)
          break
        }

        // Subscription checkout: save the Stripe customer ID for the portal.
        if (md.supabase_user_id && session.customer) {
          await supabase.from('profiles').update({
            stripe_customer_id: session.customer as string,
          }).eq('id', md.supabase_user_id)
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
