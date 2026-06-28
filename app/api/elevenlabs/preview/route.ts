// app/api/elevenlabs/preview/route.ts
// Server-side API route — ElevenLabs key never exposed to browser

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { voice_id, text } = await req.json()

  if (!voice_id || !text) {
    return NextResponse.json({ error: 'voice_id and text are required' }, { status: 400 })
  }

  if (text.length > 500) {
    return NextResponse.json({ error: 'Preview text must be under 500 characters' }, { status: 400 })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
      return NextResponse.json(
        { error: err.detail?.message || err.detail || 'ElevenLabs error' },
        { status: res.status }
      )
    }

    // Stream the audio back to the browser
    const audioBuffer = await res.arrayBuffer()
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
