import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export const runtime = 'nodejs'

// Service-role client so we can record visits for anonymous visitors (RLS on
// referral_visits blocks all non-admin reads and all client inserts).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
)

/**
 * Records an inbound click on a personalized "Share the Echo" link.
 * Body: { code, path?, campaign?, utm_source?, viewerId? }
 *
 * - Resolves the referrer from the code.
 * - Ignores self-visits (a signed-in viewer who is the referrer).
 * - Dedupes the same visitor + code within 24h so refreshes don't inflate counts.
 */
export async function POST(req: NextRequest) {
  try {
    const { code, path, campaign, utm_source, viewerId } = await req.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ ok: false, error: 'missing code' }, { status: 400 })
    }

    const { data: referrer } = await supabase
      .from('profiles').select('id').eq('referral_code', code).maybeSingle()
    if (!referrer) return NextResponse.json({ ok: true, ignored: 'unknown code' })

    // Don't credit someone for visiting via their own link.
    if (viewerId && viewerId === referrer.id) {
      return NextResponse.json({ ok: true, ignored: 'self' })
    }

    const fwd = req.headers.get('x-forwarded-for') || ''
    const ip = fwd.split(',')[0].trim() || 'unknown'
    const ua = req.headers.get('user-agent') || ''
    const visitorHash = createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32)

    // De-dupe: same code + visitor within the last 24 hours.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('referral_visits')
      .select('id')
      .eq('referral_code', code)
      .eq('visitor_hash', visitorHash)
      .gte('created_at', since)
      .limit(1)
    if (recent && recent.length) return NextResponse.json({ ok: true, deduped: true })

    await supabase.from('referral_visits').insert({
      referral_code: code,
      referrer_id: referrer.id,
      landing_path: typeof path === 'string' ? path.slice(0, 300) : null,
      campaign: typeof campaign === 'string' ? campaign.slice(0, 80) : null,
      utm_source: typeof utm_source === 'string' ? utm_source.slice(0, 40) : null,
      visitor_hash: visitorHash,
      user_agent: ua.slice(0, 300),
    })

    return NextResponse.json({ ok: true, recorded: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
