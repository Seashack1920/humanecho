import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key')
)

// The five voices offered by the Notepad Reader (ElevenLabs premade voices).
const VOICES = new Set([
  '21m00Tcm4TlvDq8ikWAM', // Rachel
  'ErXwobaYiN019PkySvjV', // Antoni
  'EXAVITQu4vr4xnSDxMaL', // Bella
  'TxGEqnHWrfWFTfGW9XjX', // Josh
  'MF3mGyEYCl7XYWbV9V6O', // Elli
])
const MAX_CHARS = 5000

export async function POST(req: NextRequest) {
  try {
    // Auth
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

    // Reader is a Creator+ / Revisionist feature (admins too).
    const { data: prof } = await supabase
      .from('profiles').select('role, membership_tier, revisionist_addon').eq('id', user.id).maybeSingle()
    const allowed = prof?.role === 'admin' || prof?.revisionist_addon === true || prof?.membership_tier === 'creator_plus'
    if (!allowed) return NextResponse.json({ error: 'The Reader is a Creator+ feature.', upgrade: true }, { status: 403 })

    const { text, voice_id } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: 'Nothing to read yet.' }, { status: 400 })
    if (!VOICES.has(voice_id)) return NextResponse.json({ error: 'Unknown voice.' }, { status: 400 })

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Reader is not configured.' }, { status: 500 })

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text: String(text).slice(0, MAX_CHARS),
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err.detail?.message || err.detail || 'Reader error' }, { status: res.status })
    }
    const audio = await res.arrayBuffer()
    return new NextResponse(audio, { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': audio.byteLength.toString() } })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
