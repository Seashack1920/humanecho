'use client'

// Keeps the `he_member` cookie in sync with the logged-in user's subscription
// status (profiles.is_subscriber). The gate middleware reads this cookie to let
// paid members into the full site under LAUNCH_MODE=subscribers. Because auth
// lives in the browser (localStorage), this client-side sync is how the edge
// learns "this person is a paid member". Harmless when the gate is off — the
// middleware simply ignores the cookie.

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const MEMBER_COOKIE = 'he_member'

function setMemberCookie(on: boolean) {
  if (typeof document === 'undefined') return
  document.cookie = on
    ? `${MEMBER_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
    : `${MEMBER_COOKIE}=; path=/; max-age=0; samesite=lax`
}

export default function MemberCookieSync() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const sync = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) { setMemberCookie(false); return }
      const { data: prof } = await supabase.from('profiles').select('is_subscriber').eq('id', user.id).maybeSingle()
      if (cancelled) return
      const isMember = !!prof?.is_subscriber
      setMemberCookie(isMember)
      // A paid member who landed on the porch belongs inside the full site.
      if (isMember && pathname === '/welcome') router.replace('/')
    }
    sync()
    return () => { cancelled = true }
  }, [pathname, router])

  return null
}
