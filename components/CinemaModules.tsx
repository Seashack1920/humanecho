'use client'

/**
 * CinemaModules — public display of curated cinema content modules.
 * Renders on the cinema landing page, below the nav pills.
 *
 *   <CinemaModules featuredFilmId={featuredFilm?.id} />
 *
 * Two parts:
 *  1. FEATURED: the published module connected to the currently-featured film
 *     (if any) surfaces up top, shown expanded with its full body.
 *  2. COLLECTION: the latest few other published modules shown as cards that
 *     expand inline to read. A "See all" link points to a future archive.
 *
 * Body is stored as HTML (TipTap) and rendered via dangerouslySetInnerHTML,
 * matching the story pages' approach.
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const TYPE_LABEL = {
  interview: 'Interview',
  filmmaker_profile: 'Filmmaker Profile',
  film_to_watch: 'Film to Watch',
}
const COLLECTION_LIMIT = 3

export default function CinemaModules({ featuredFilmId }) {
  const [featured, setFeatured] = useState(null)
  const [collection, setCollection] = useState([])
  const [openId, setOpenId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let off = false
    ;(async () => {
      const { data } = await supabase
        .from('cinema_modules')
        .select('id, type, title, subtitle, body, film_id, is_featured, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      const mods = data || []

      // featured = module connected to the currently-featured film (most recent if several)
      let feat = null
      if (featuredFilmId) feat = mods.find(m => m.film_id === featuredFilmId) || null

      // collection = the rest (excluding the featured one), latest few
      const rest = mods.filter(m => !feat || m.id !== feat.id).slice(0, COLLECTION_LIMIT)

      if (!off) {
        setFeatured(feat)
        setCollection(rest)
        setLoading(false)
      }
    })()
    return () => { off = true }
  }, [featuredFilmId])

  if (loading) return null
  if (!featured && collection.length === 0) return null

  return (
    <section style={{ marginBottom: '80px' }}>
      {/* FEATURED module — connected to the hero film */}
      {featured && (
        <div style={{ marginBottom: collection.length > 0 ? '56px' : 0 }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))' }} />
            <div style={{ padding: 'clamp(28px, 4vw, 48px)' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '12px' }}>
                {TYPE_LABEL[featured.type] || 'Feature'}
              </div>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                {featured.title}
              </h2>
              {featured.subtitle && (
                <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(16px, 2vw, 20px)', fontStyle: 'italic', color: 'var(--text-muted)', margin: '0 0 28px', lineHeight: 1.5 }}>
                  {featured.subtitle}
                </p>
              )}
              <div
                className="cinema-module-body"
                style={{ fontFamily: 'Georgia, serif', fontSize: '17px', lineHeight: 1.8, color: 'var(--text-primary)', maxWidth: '720px' }}
                dangerouslySetInnerHTML={{ __html: featured.body }}
              />
            </div>
          </div>
        </div>
      )}

      {/* COLLECTION — latest few other modules */}
      {collection.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Cinema Notes</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Interviews · Profiles · Films to Watch</span>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            {collection.map(m => {
              const isOpen = openId === m.id
              return (
                <div key={m.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : m.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '4px' }}>
                        {TYPE_LABEL[m.type] || 'Feature'}
                      </div>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{m.title}</div>
                      {m.subtitle && <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '3px', fontStyle: 'italic' }}>{m.subtitle}</div>}
                    </div>
                    <span aria-hidden style={{ flexShrink: 0, fontSize: '14px', color: 'var(--text-muted)', transition: 'transform 0.3s ease', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 24px 28px' }}>
                      <div
                        className="cinema-module-body"
                        style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', fontFamily: 'Georgia, serif', fontSize: '16px', lineHeight: 1.8, color: 'var(--text-primary)', maxWidth: '720px' }}
                        dangerouslySetInnerHTML={{ __html: m.body }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* See all — placeholder for future archive */}
          <div style={{ marginTop: '20px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>More interviews and profiles coming soon.</span>
          </div>
        </div>
      )}
    </section>
  )
}
