import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── Launch gate ──────────────────────────────────────────────────────────────
// During the private beta, set LAUNCH_MODE=holding in the environment. The public
// then sees only the /holding (coming-soon) page; you and beta testers unlock the
// full site by visiting any URL with ?beta=<BETA_ACCESS_CODE> once, which drops a
// cookie granting access. To go fully public, set LAUNCH_MODE=live (or remove it)
// and redeploy — no code change required.
const BETA_COOKIE = 'he_beta'
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

  // Off unless explicitly in holding mode → site behaves normally (public).
  if (process.env.LAUNCH_MODE !== 'holding') return withRef(NextResponse.next())

  const { pathname, searchParams } = req.nextUrl
  const code = process.env.BETA_ACCESS_CODE

  // Redeem an access code: ?beta=CODE → set cookie, then strip the param.
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

  // Already a beta tester → full access.
  if (req.cookies.get(BETA_COOKIE)?.value === '1') return withRef(NextResponse.next())

  // Public visitor: allow only the holding page, framework internals, API
  // routes (Stripe webhooks etc.), and static asset files. Everything else is
  // rewritten to the holding page so the real site stays private.
  const isAllowed =
    pathname === '/holding' ||
    pathname === '/beta' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    /\.[a-zA-Z0-9]+$/.test(pathname) // any file with an extension (.png, .css, .mp4…)

  if (isAllowed) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/holding'
  url.search = ''
  return NextResponse.rewrite(url)
}

export const config = {
  // Run on everything except Next's static output (the in-function checks above
  // handle the finer-grained allowances).
  matcher: ['/((?!_next/static|_next/image).*)'],
}
