import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Service-role client: reads auth emails and updates profiles (bypasses RLS).
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

// Map every auth user id → email (paginated).
async function emailMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) break
    for (const u of data.users) map[u.id] = u.email || ''
    if (data.users.length < 200) break
  }
  return map
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.res

  try {
    const b = await req.json()

    if (b.action === 'list') {
      const [{ data: artists }, { data: profiles }] = await Promise.all([
        supabase.from('artists').select('id, name').is('deleted_at', null).order('name'),
        supabase.from('profiles').select('id, full_name, role, artist_id, is_subscriber'),
      ])
      const emails = await emailMap()
      const users = (profiles || []).map(p => ({
        id: p.id, email: emails[p.id] || '(no email)', full_name: p.full_name,
        role: p.role, artist_id: p.artist_id, is_subscriber: p.is_subscriber,
      })).sort((a, b) => (a.email || '').localeCompare(b.email || ''))
      return NextResponse.json({ artists: artists || [], users })
    }

    if (b.action === 'link') {
      const { artistId, userId } = b
      if (!artistId || !userId) return NextResponse.json({ error: 'Pick an artist and a user.' }, { status: 400 })
      const { data: artist } = await supabase.from('artists').select('id').eq('id', artistId).maybeSingle()
      if (!artist) return NextResponse.json({ error: 'Artist not found.' }, { status: 404 })
      const { data: prof } = await supabase.from('profiles').select('id, role').eq('id', userId).maybeSingle()
      if (!prof) return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })

      // Enforce one account per artist: clear anyone else currently linked to it.
      await supabase.from('profiles').update({ artist_id: null }).eq('artist_id', artistId).neq('id', userId)
      // Link this user; promote 'fan' → 'artist' (never touch an admin).
      const updates: any = { artist_id: artistId }
      if (prof.role !== 'admin') updates.role = 'artist'
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (b.action === 'unlink') {
      const { artistId } = b
      if (!artistId) return NextResponse.json({ error: 'Missing artist.' }, { status: 400 })
      const { error } = await supabase.from('profiles').update({ artist_id: null }).eq('artist_id', artistId)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || 'Something went wrong.' }, { status: 500 })
  }
}
