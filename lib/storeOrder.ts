import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

// Server-only. Idempotently records a paid guest storefront order (keyed to the
// Stripe session) and returns it with the product title. Safe to call from both
// the webhook and the success page — a unique constraint on stripe_session_id
// prevents duplicates, so whoever runs first creates the row.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
)

const newToken = () =>
  (globalThis.crypto?.randomUUID?.() || `${Date.now()}${Math.random()}`).replace(/-/g, '')

export async function ensureStoreOrder(session: Stripe.Checkout.Session) {
  const md = session.metadata || {}
  if (md.kind !== 'store_guest' || !md.item_id) return null
  if (session.payment_status !== 'paid') return null

  const email = session.customer_details?.email || session.customer_email || null
  await supabase.from('store_orders').upsert({
    storefront: md.storefront,
    product_id: md.item_id,
    email,
    amount: (session.amount_total || 0) / 100,
    stripe_session_id: session.id,
    download_token: newToken(),
    status: 'paid',
  }, { onConflict: 'stripe_session_id', ignoreDuplicates: true })

  const { data: order } = await supabase.from('store_orders').select('*').eq('stripe_session_id', session.id).maybeSingle()
  const { data: product } = await supabase.from('products').select('title').eq('id', md.item_id).maybeSingle()
  return { order, productTitle: product?.title || 'your purchase' }
}
