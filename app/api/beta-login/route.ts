import { NextRequest, NextResponse } from 'next/server'

// Validates the shared beta password and, on success, drops the same unlock
// cookie the launch-gate middleware checks (he_beta=1). The password is the
// BETA_ACCESS_CODE env var — admin sets it and shares it with testers.
export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}))
  const code = process.env.BETA_ACCESS_CODE
  if (!code) return NextResponse.json({ error: 'Beta access isn’t set up yet.' }, { status: 503 })
  if (!password || password !== code) {
    return NextResponse.json({ error: 'That password isn’t right. Check with the Human Echo team.' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set('he_beta', '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 90 })
  return res
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
