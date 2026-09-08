'use client'

// Lightweight client access to site_settings (public-readable key/value store).
// The default track image is fetched once per page load and cached at module
// level, so any number of components can read it without refetching.

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

let cache: string | null | undefined = undefined
let inflight: Promise<string | null> | null = null

export function getDefaultTrackImage(): Promise<string | null> {
  if (cache !== undefined) return Promise.resolve(cache)
  if (!inflight) {
    inflight = supabase.from('site_settings').select('value').eq('key', 'default_track_image').maybeSingle()
      .then(({ data }) => { cache = data?.value || null; return cache })
      .catch(() => { cache = null; return null })
  }
  return inflight
}

// Lets callers push a fresh value into the cache after saving in admin.
export function setDefaultTrackImageCache(v: string | null) { cache = v; inflight = null }

export function useDefaultTrackImage(): string | null {
  const [v, setV] = useState<string | null>(cache ?? null)
  useEffect(() => {
    let off = false
    getDefaultTrackImage().then(x => { if (!off) setV(x) })
    return () => { off = true }
  }, [])
  return v
}
