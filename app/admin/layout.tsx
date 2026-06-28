'use client'

/**
 * Admin layout guard.
 *
 * Wraps EVERY page under app/admin/. Checks the current user via
 * useCurrentUser and:
 *   - while loading  → shows a neutral "Checking access…" state
 *                      (so admin content never flashes for a non-admin)
 *   - not signed in  → redirect to /login
 *   - signed in, not admin → redirect to /dashboard (or /profile)
 *   - admin          → render the admin pages
 *
 * Because this lives at app/admin/layout.tsx, it protects all current
 * AND future admin subfolders automatically — no per-page check needed.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/lib/useCurrentUser'

export default function AdminLayout({ children }) {
  const router = useRouter()
  const { loading, signedIn, isAdmin } = useCurrentUser()

  useEffect(() => {
    if (loading) return
    if (!signedIn) { router.replace('/login'); return }
    if (!isAdmin) { router.replace('/dashboard'); return }
  }, [loading, signedIn, isAdmin, router])

  // While we don't yet know, or the user isn't allowed, show a neutral
  // screen rather than the admin content (prevents any flash of admin UI).
  if (loading || !signedIn || !isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          {loading ? 'Checking access…' : 'Redirecting…'}
        </div>
      </div>
    )
  }

  return <>{children}</>
}
