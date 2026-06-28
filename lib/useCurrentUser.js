'use client'

/**
 * useCurrentUser — the single source of truth for "who is signed in and what
 * can they do?" Any component (header, page guards, homepage) calls this.
 *
 * Roles are DERIVED from authoritative attributes, never from a stored "type"
 * (which could drift):
 *   - isAdmin    ← profile.role === 'admin'   (the one deliberately-granted privilege)
 *   - isArtist   ← profile.artist_id is set   (linked to an artists row)
 *   - isMember   ← profile.is_subscriber === true   (paid)
 *   - isFollower ← signed in, but none of the above
 *
 * A person can be several at once (an artist who is also a paying member, etc.).
 * Ask the specific question you care about rather than a single "type".
 *
 * Returns:
 *   { loading, signedIn, user, profile, isAdmin, isArtist, isMember, isFollower, refresh }
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useCurrentUser() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const load = useCallback(async () => {
    try {
      // Timeout-guard the auth call (Safari lock safety — same lesson as before)
      const res = await Promise.race([
        supabase.auth.getUser(),
        new Promise((resolve) => setTimeout(() => resolve({ data: { user: null } }), 3000)),
      ])
      const u = res?.data?.user ?? null
      setUser(u)

      if (u) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, role, artist_id, is_subscriber, full_name, avatar_url')
          .eq('id', u.id)
          .maybeSingle()
        setProfile(prof ?? null)
      } else {
        setProfile(null)
      }
    } catch (err) {
      console.error('[HE] useCurrentUser load failed:', err)
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()

    // React to login/logout happening elsewhere in the app
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        load()
      }
    })
    return () => subscription.unsubscribe()
  }, [load])

  const signedIn = !!user
  const isAdmin    = signedIn && profile?.role === 'admin'
  const isArtist   = signedIn && !!profile?.artist_id
  const isMember   = signedIn && profile?.is_subscriber === true
  const isFollower = signedIn && !isAdmin && !isArtist && !isMember

  return {
    loading,
    signedIn,
    user,
    profile,
    isAdmin,
    isArtist,
    isMember,
    isFollower,
    refresh: load,
  }
}