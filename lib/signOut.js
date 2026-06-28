'use client'

/**
 * signOut — shared logout. Call from any account menu / logout button.
 * Signs the user out of Supabase (clears the session everywhere) and sends
 * them to the homepage. Important for shared/public computers.
 *
 * Usage:
 *   import { signOut } from '@/lib/signOut'
 *   <button onClick={() => signOut(router)}>Log out</button>
 */

import { supabase } from '@/lib/supabase'

export async function signOut(router) {
  try {
    await supabase.auth.signOut()
  } catch (err) {
    console.error('[HE] signOut error:', err)
  } finally {
    // Always send them home, even if signOut hiccups
    if (router) {
      router.push('/')
    } else if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }
}
