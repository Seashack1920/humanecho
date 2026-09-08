import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { Resend } from 'resend'
import { getStorefront } from '@/lib/storefronts'

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

// Emails the buyer their token download link. Used on first purchase (webhook)
// and when an admin resends from the orders view.
export async function sendStoreDownloadEmail(order: any, productTitle: string) {
  if (!order?.email || !order?.download_token) return
  const store = getStorefront(order.storefront)
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanechomusic.com').replace(/\/$/, '')
  const link = `${site}/api/store/download?token=${order.download_token}`
  const brand = store?.name || 'Our Store'
  const accent = store?.accent || '#e8743b'
  const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder')
  await resend.emails.send({
    from: `${brand} <hello@humanechomusic.com>`,
    to: order.email,
    subject: `Your download: ${productTitle || 'your purchase'}`,
    html: `<div style="font-family:Georgia,serif;color:#2a2320;max-width:520px">
      <h2 style="font-family:Helvetica,Arial,sans-serif">Thank you for your purchase!</h2>
      <p>Your download of <strong>${productTitle || 'your book'}</strong> is ready.</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 22px;border-radius:8px;background:${accent};color:#fff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-weight:600">Download your file</a></p>
      <p style="font-size:13px;color:#777">Keep this email — you can use the link again anytime. Purchased from ${brand}.</p>
    </div>`,
  })
}
