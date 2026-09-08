import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendStoreDownloadEmail } from '@/lib/storeOrder'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
)

async function requireAdmin(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false as const, res: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }) }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { ok: false as const, res: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }) }
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (prof?.role !== 'admin') return { ok: false as const, res: NextResponse.json({ error: 'Admins only.' }, { status: 403 }) }
  return { ok: true as const }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.res

  try {
    const b = await req.json()

    if (b.action === 'list') {
      const { data: orders } = await supabase
        .from('store_orders')
        .select('id, storefront, product_id, email, amount, status, emailed_at, created_at, download_token')
        .order('created_at', { ascending: false }).limit(500)
      const ids = [...new Set((orders || []).map(o => o.product_id).filter(Boolean))]
      const titles: Record<string, string> = {}
      if (ids.length) {
        const { data: prods } = await supabase.from('products').select('id, title').in('id', ids as string[])
        for (const p of prods || []) titles[p.id] = p.title
      }
      const rows = (orders || []).map(o => ({ ...o, product_title: o.product_id ? (titles[o.product_id] || '(removed product)') : '—' }))
      const revenue = rows.filter(o => o.status === 'paid').reduce((s, o) => s + Number(o.amount || 0), 0)
      return NextResponse.json({ orders: rows, count: rows.length, revenue })
    }

    if (b.action === 'resend') {
      if (!b.orderId) return NextResponse.json({ error: 'Missing order.' }, { status: 400 })
      const { data: order } = await supabase.from('store_orders').select('*').eq('id', b.orderId).maybeSingle()
      if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
      if (!order.email) return NextResponse.json({ error: 'This order has no email on file.' }, { status: 400 })
      const { data: product } = await supabase.from('products').select('title').eq('id', order.product_id).maybeSingle()
      await sendStoreDownloadEmail(order, product?.title || 'your purchase')
      await supabase.from('store_orders').update({ emailed_at: new Date().toISOString() }).eq('id', order.id)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
