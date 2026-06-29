import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key')
)

// Self-service: turn a paid member into an uploader by creating their own
// artist record and linking it to their profile. Idempotent.
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Missing user' }, { status: 400 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, artist_id, is_subscriber')
      .eq('id', userId)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Already set up — return their existing artist.
    if (profile.artist_id) {
      return NextResponse.json({ artistId: profile.artist_id, alreadyEnabled: true })
    }

    // Uploading is a paid-member benefit.
    if (!profile.is_subscriber) {
      return NextResponse.json({ error: 'Membership required to upload your music.' }, { status: 403 })
    }

    // Create the member's own artist record — a private creator space, NOT house
    // content (platform_owned stays false; their content is curated to feature).
    const { data: artist, error: artistErr } = await supabase
      .from('artists')
      .insert({
        name: (profile.full_name && profile.full_name.trim()) || 'My Music',
        platform_owned: false,
      })
      .select('id')
      .single()

    if (artistErr || !artist) {
      return NextResponse.json({ error: artistErr?.message || 'Could not create your artist profile.' }, { status: 500 })
    }

    const { error: linkErr } = await supabase
      .from('profiles')
      .update({ artist_id: artist.id })
      .eq('id', userId)

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })

    return NextResponse.json({ artistId: artist.id })
  } catch (err) {
    console.error('Creator enable error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
