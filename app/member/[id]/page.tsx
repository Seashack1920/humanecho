'use client'

/**
 * Public member card — /member/[id]
 *
 * What others see when they click a member's name (for members WITHOUT an
 * artist page — artists keep their richer /artist/[id] page). Shows the
 * member's photo, name, "why I make art" blurb, and work links.
 *
 * Graceful: if the member hasn't filled anything in, shows a quiet placeholder.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MemberCardPage() {
  const params = useParams()
  const id = params?.id
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    if (!id) return
    let off = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!off && user?.id === id) setIsOwner(true)
      } catch {}
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, artist_statement, work_links, disciplines')
          .eq('id', id)
          .maybeSingle()
        if (!off) setProfile(data || null)
      } catch {
        if (!off) setProfile(null)
      }
      if (!off) setLoading(false)
    })()
    return () => { off = true }
  }, [id])

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Loading…</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '70vh', display: 'grid', placeContent: 'center', background: 'var(--bg-primary)', padding: '40px', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', color: 'var(--text-primary)', marginBottom: '6px' }}>Member not found</div>
        </div>
      </div>
    )
  }

  const links = Array.isArray(profile.work_links) ? profile.work_links : []
  const teas = Array.isArray(profile.disciplines) ? profile.disciplines : []
  const initial = (profile.full_name || '?').trim().charAt(0).toUpperCase()
  const hasContent = !!profile.artist_statement || links.length > 0 || teas.length > 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: 'clamp(60px, 12vw, 120px) 24px 80px' }}>

 {/* Owner-only navigation (only the card's owner sees this) */}
        {isOwner && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px', fontSize: '13px' }}>
            <a href="/profile" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>← Edit this card on your profile page</a>
          </div>
        )}

        {/* Photo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name || ''} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
          ) : (
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '44px', fontWeight: 600 }}>
              {initial}
            </div>
          )}
        </div>

        {/* Name */}
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          {profile.full_name || 'A Human Echo member'}
        </h1>
        <div style={{ fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 600, textAlign: 'center', marginBottom: '24px' }}>
          Official Member
        </div>

        {/* Disciplines — their cup of tea */}
        {teas.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '24px' }}>
            {teas.map(t => (
              <span key={t} style={{ padding: '5px 16px', borderRadius: '50px', background: 'rgba(196,162,101,0.18)', color: 'var(--accent-gold)', fontSize: '13px', fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        )}

        {/* Blurb */}
        {profile.artist_statement && (
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.7, margin: '0 auto 32px', maxWidth: '520px' }}>
            {profile.artist_statement}
          </p>
        )}

        {/* Work links */}
        {links.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            {links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: '11px 22px', borderRadius: '50px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}
              >
                {l.label || 'See my work'} ↗
              </a>
            ))}
          </div>
        )}

        {/* Graceful empty state */}
        {!hasContent && (
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
            This member hasn’t added their story yet.
          </p>
        )}
      </div>
    </div>
  )
}
