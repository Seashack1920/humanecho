import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { ensureStoreOrder } from '@/lib/storeOrder'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { apiVersion: '2024-06-20' })

// Success-page lookup: verify the Stripe session and return the download token.
// Creates the order if the webhook hasn't landed yet (idempotent), so the buyer
// can download immediately. Does NOT email (the webhook owns that).
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()
    if (!sessionId) return NextResponse.json({ error: 'Missing session.' }, { status: 400 })

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status !== 'paid') return NextResponse.json({ error: 'Payment not completed.' }, { status: 402 })

    const res = await ensureStoreOrder(session)
    if (!res?.order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

    return NextResponse.json({
      token: res.order.download_token,
      title: res.productTitle,
      email: res.order.email,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
