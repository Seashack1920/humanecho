import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

// Server-side signup hook. Called by the porch (and any other email-capture form).
// It (1) stores the lead, (2) adds the person to the Resend Audience for
// Broadcasts, and (3) fires a trigger event that starts the welcome Automation
// (welcome now + timed follow-ups you design in the Resend dashboard).
//
// Env: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, and
// (optional) RESEND_AUDIENCE_ID — the Audience to add contacts to. Build the
// Automation in Resend with its trigger event name set to `porch.signup`.

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder')
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key',
  { auth: { persistSession: false } },
)

const TRIGGER_EVENT = 'porch.signup'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()
    const name = String(body.name || '').trim() || null
    const source = String(body.source || 'porch').slice(0, 40)

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    // 1. Store the lead (duplicate = already signed up, which is fine).
    const { error: dbErr } = await db.from('email_captures').insert({ email, name, source })
    if (dbErr && !dbErr.message.toLowerCase().includes('duplicate')) {
      console.error('email_captures insert error:', dbErr.message)
    }

    // 2. Add to the Resend Audience (for Broadcasts) — only if one is configured.
    const audienceId = process.env.RESEND_AUDIENCE_ID
    if (audienceId) {
      try {
        await resend.contacts.create({ email, firstName: name || undefined, unsubscribed: false, audienceId })
      } catch (e) { /* already a contact / transient — non-fatal */ }
    }

    // 3. Fire the welcome-Automation trigger (auto-creates the contact if needed).
    //    REST call so it works regardless of SDK version shape.
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/events/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: TRIGGER_EVENT, email, payload: { name, source } }),
        })
      } catch (e) { console.error('resend event error:', e) }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('email-signup error:', (err as Error).message)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
