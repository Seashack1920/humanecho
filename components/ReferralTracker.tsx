'use client'

/**
 * Records inbound clicks on personalized "Share the Echo" links.
 *
 * When someone lands on any page with ?ref=<code>, we POST the visit to
 * /api/referral/visit (which resolves the referrer, ignores self-visits, and
 * dedupes), then strip the ref/utm params from the URL so refreshes don't
 * re-fire. Runs once per landing — best-effort, never blocks the page.
 */

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ReferralTracker() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('ref')
      if (!code) return

      const utm_source = params.get('utm_source') || undefined
      const campaign = params.get('utm_campaign') || undefined
      const path = window.location.pathname

      ;(async () => {
        let viewerId: string | undefined
        try {
          const { data } = await supabase.auth.getUser()
          viewerId = data.user?.id
        } catch { /* anonymous */ }

        try {
          await fetch('/api/referral/visit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, path, campaign, utm_source, viewerId }),
            keepalive: true,
          })
        } catch { /* best-effort */ }

        // Clean the URL so a refresh doesn't look like a new visit.
        ;['ref', 'utm_source', 'utm_medium', 'utm_campaign'].forEach(p => params.delete(p))
        const qs = params.toString()
        window.history.replaceState({}, '', path + (qs ? `?${qs}` : '') + window.location.hash)
      })()
    } catch { /* no-op */ }
  }, [])

  return null
}
