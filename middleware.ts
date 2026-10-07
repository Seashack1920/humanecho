import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── Launch gate ──────────────────────────────────────────────────────────────
// LAUNCH_MODE controls who can see the site (set it in the environment, redeploy —
// no code change needed):
//   unset / 'live'  → fully public.
//   'holding'       → private beta: the public sees only /holding (coming-soon);
//                     beta testers unlock via ?beta=<BETA_ACCESS_CODE>.
//   'subscribers'   → paid model: the public sees only the porch (/welcome); paid
//                     members (he_member cookie) and beta testers (he_beta) get the
//                     full site. Song pages pass through and self-gate so the porch's
//                     few public songs stay playable while the catalog stays private.
const BETA_COOKIE = 'he_beta'
const MEMBER_COOKIE = 'he_member'
const REF_COOKIE = 'he_ref'

export function middleware(req: NextRequest) {
  // First-touch referral attribution: remember who sent this visitor (for
  // Phase 2 signup crediting). Set on the first ?ref= we see; don't overwrite.
  const ref = req.nextUrl.searchParams.get('ref')
  const withRef = (res: NextResponse) => {
    if (ref && !req.cookies.get(REF_COOKIE)) {
      res.cookies.set(REF_COOKIE, ref.slice(0, 32), {
        sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }
    return res
  }

  // Off unless gated → site behaves normally (public).
  const mode = process.env.LAUNCH_MODE
  if (mode !== 'holding' && mode !== 'subscribers') return withRef(NextResponse.next())

  const { pathname, searchParams } = req.nextUrl
  const code = process.env.BETA_ACCESS_CODE

  // Redeem an access code: ?beta=CODE → set cookie, then strip the param. (Both modes.)
  const provided = searchParams.get('beta')
  if (code && provided && provided === code) {
    const url = req.nextUrl.clone()
    url.searchParams.delete('beta')
    const res = NextResponse.redirect(url)
    res.cookies.set(BETA_COOKIE, '1', {
      httpOnly: true, sameSite: 'lax', path: '/',
      maxAge: 60 * 60 * 24 * 90, // 90 days
    })
    return res
  }

  const hasBeta = req.cookies.get(BETA_COOKIE)?.value === '1'

  // ── Holding (private beta) ──
  if (mode === 'holding') {
    if (hasBeta) return withRef(NextResponse.next())
    const isAllowed =
      pathname === '/holding' ||
      pathname === '/beta' ||
      pathname.startsWith('/store') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname === '/favicon.ico' ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      /\.[a-zA-Z0-9]+$/.test(pathname)
    if (isAllowed) return NextResponse.next()
    const url = req.nextUrl.clone()
    url.pathname = '/holding'
    url.search = ''
    return NextResponse.rewrite(url)
  }

  // ── Subscribers (paid model) ──
  // Full site for paid members (he_member) and beta testers (he_beta). Everyone
  // else gets the porch, except the public allowlist. Song pages pass through and
  // self-gate (the porch's chosen songs stay public; the rest redirect to /welcome).
  const hasMember = req.cookies.get(MEMBER_COOKIE)?.value === '1'
  if (hasBeta || hasMember) return withRef(NextResponse.next())

  const isAllowed =
    pathname === '/welcome' ||
    pathname === '/beta' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/subscribe') ||
    pathname.startsWith('/auth') ||          // Supabase auth callback
    pathname.startsWith('/song/') ||          // song pages self-gate (porch songs public)
    pathname.startsWith('/store') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    /\.[a-zA-Z0-9]+$/.test(pathname)

  if (isAllowed) return withRef(NextResponse.next())

  const url = req.nextUrl.clone()
  url.pathname = '/welcome'
  url.search = ''
  return withRef(NextResponse.redirect(url))
}

export const config = {
  // Run on everything except Next's static output (the in-function checks above
  // handle the finer-grained allowances).
  matcher: ['/((?!_next/static|_next/image).*)'],
}
