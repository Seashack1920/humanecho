'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useBrowsingMusic } from '@/context/BrowsingMusicContext'
import { usePlayer } from '@/context/PlayerContext'
import BrowsingMusicBar from '@/components/BrowsingMusicBar'

type Issue = {
  id: string
  issue_number: number
  slug: string
  title: string
  subtitle: string | null
  logline: string | null
  cover_image_url: string | null
  theme: string
  status: string
  published_at: string | null
}

// ─── Theme accent colors for cards ───────────────────────────────────────────

const THEME_ACCENTS: Record<string, { bg: string; text: string; accent: string; border: string }> = {
  midnight: { bg: '#0d0d14', text: '#e8e0d0', accent: '#c9a84c', border: '#2a2535' },
  linen:    { bg: '#f5f0e8', text: '#2c2418', accent: '#8b5e3c', border: '#d8d0c0' },
  ember:    { bg: '#1a0a08', text: '#e8d5c0', accent: '#d4823a', border: '#3a2018' },
  slate:    { bg: '#f0f2f4', text: '#1a2030', accent: '#3a5f8a', border: '#c8d0d8' },
  verdant:  { bg: '#0a1a10', text: '#d8e8d0', accent: '#5aaa6a', border: '#1e3020' },
}

export default function EscapesPage() {
  const router = useRouter()
  const { stop: stopBrowsingMusic, tracks: browsingTracks, setTracks } = useBrowsingMusic()
  const { stop: stopPlayer } = usePlayer()

  const [latestIssue, setLatestIssue]   = useState<Issue | null>(null)
  const [pastIssues, setPastIssues]     = useState<Issue[]>([])
  const [loading, setLoading]           = useState(true)
  const [isAdmin, setIsAdmin]           = useState(false)
  const [draftIssues, setDraftIssues]   = useState<Issue[]>([])
  const [hoveredId, setHoveredId]       = useState<string | null>(null)

  useEffect(() => {
    stopPlayer()

    const load = async () => {
      // Check if admin
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role === 'admin') setIsAdmin(true)
      }

      // Load published issues
      const { data: publishedData } = await supabase
        .from('issues')
        .select('id, issue_number, slug, title, subtitle, logline, cover_image_url, theme, status, published_at')
        .eq('status', 'published')
        .order('issue_number', { ascending: false })

      if (publishedData && publishedData.length > 0) {
        setLatestIssue(publishedData[0])
        setPastIssues(publishedData.slice(1))
      }

      // Load drafts for admin preview
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role === 'admin') {
          const { data: draftData } = await supabase
            .from('issues')
            .select('id, issue_number, slug, title, subtitle, logline, cover_image_url, theme, status, published_at')
            .in('status', ['draft', 'private'])
            .order('issue_number', { ascending: false })
          setDraftIssues(draftData || [])
        }
      }

      // Load browsing music
      try {
        const { data: musicData } = await supabase
          .from('background_tracks')
          .select('id, title, cloudinary_url, mood, loop_enabled, description')
          .eq('is_active', true)
          .order('title', { ascending: true })
        if (musicData) setTracks(musicData)
      } catch (e) {}

      setLoading(false)
    }
    load()

    return () => stopBrowsingMusic(true)
  }, [])

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Loading</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HERO / LATEST ISSUE ── */}
      {latestIssue ? (
        <section style={{
          position: 'relative', minHeight: '80vh',
          display: 'flex', alignItems: 'flex-end',
          overflow: 'hidden', background: THEME_ACCENTS[latestIssue.theme]?.bg || '#0d0d14',
          marginTop: '-70px', paddingTop: '70px',
          cursor: 'pointer',
        }} onClick={() => router.push(`/escapes/${latestIssue.slug}`)}>
          {latestIssue.cover_image_url ? (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${latestIssue.cover_image_url})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              filter: 'brightness(0.5)',
            }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${THEME_ACCENTS[latestIssue.theme]?.bg || '#0d0d14'} 0%, #1a1a2e 100%)` }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)' }} />

          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 48px 80px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: THEME_ACCENTS[latestIssue.theme]?.accent || '#c9a84c', marginBottom: '16px', fontWeight: '600' }}>
              Current Issue · #{latestIssue.issue_number}
            </div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 7vw, 80px)', fontWeight: '700', color: 'white', lineHeight: '1.05', marginBottom: '16px', letterSpacing: '-0.02em', maxWidth: '800px' }}>
              {latestIssue.title}
            </h1>
            {latestIssue.subtitle && (
              <div style={{ fontSize: 'clamp(16px, 2vw, 22px)', color: 'rgba(255,255,255,0.65)', marginBottom: '8px' }}>
                {latestIssue.subtitle}
              </div>
            )}
            {latestIssue.logline && (
              <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', maxWidth: '560px', lineHeight: '1.6', marginBottom: '32px', fontStyle: 'italic' }}>
                {latestIssue.logline}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={e => { e.stopPropagation(); router.push(`/escapes/${latestIssue.slug}`) }}
                style={{ padding: '14px 32px', borderRadius: '50px', background: 'white', color: '#0a0a0b', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Read Issue #{latestIssue.issue_number} →
              </button>
              {latestIssue.published_at && (
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                  {new Date(latestIssue.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', marginTop: '-70px', paddingTop: '70px' }}>
          <div style={{ textAlign: 'center', padding: '80px 40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📰</div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '40px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>Escapes</h1>
            <div style={{ fontSize: '16px', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: '1.6' }}>
              Our first issue is on its way. Something special is being assembled.
            </div>
          </div>
        </section>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 48px 120px' }}>

        {/* ── BROWSING MUSIC ── */}
        {browsingTracks.length > 0 && (
          <div style={{ marginBottom: '48px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Set the mood</span>
            <BrowsingMusicBar tracks={browsingTracks} />
          </div>
        )}

        {/* ── ADMIN DRAFT PREVIEWS ── */}
        {isAdmin && draftIssues.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Drafts</h2>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(43,122,143,0.15)', color: 'var(--accent-primary)', fontWeight: '600' }}>Admin only</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {draftIssues.map(issue => (
                <IssueCard key={issue.id} issue={issue} onClick={() => router.push(`/escapes/${issue.slug}?preview=1`)} isDraft />
              ))}
            </div>
          </div>
        )}

        {/* ── PAST ISSUES ── */}
        {pastIssues.length > 0 && (
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '28px' }}>
              Past Issues
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {pastIssues.map(issue => (
                <IssueCard key={issue.id} issue={issue} onClick={() => router.push(`/escapes/${issue.slug}`)} />
              ))}
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!latestIssue && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '14px' }}>No published issues yet.</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Issue Card ───────────────────────────────────────────────────────────────

function IssueCard({ issue, onClick, isDraft }: { issue: Issue; onClick: () => void; isDraft?: boolean }) {
  const [hovered, setHovered] = useState(false)
  const theme = THEME_ACCENTS[issue.theme] || THEME_ACCENTS.midnight

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer', borderRadius: '16px', overflow: 'hidden',
        background: 'var(--bg-secondary)',
        border: hovered ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
        transition: 'border-color 0.2s, transform 0.2s',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
    >
      {/* Cover */}
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: theme.bg }}>
        {issue.cover_image_url ? (
          <img src={issue.cover_image_url} alt={issue.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease', transform: hovered ? 'scale(1.04)' : 'scale(1)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${theme.bg}, #1a1a2e)` }}>
            <div style={{ fontSize: '40px', opacity: 0.4 }}>📰</div>
          </div>
        )}
        {/* Theme accent overlay at bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: `linear-gradient(to top, ${theme.bg}cc, transparent)` }} />
        {/* Issue number badge */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', color: 'white', backdropFilter: 'blur(4px)', fontWeight: '600' }}>
          Issue #{issue.issue_number}
        </div>
        {isDraft && (
          <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(43,122,143,0.85)', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', color: 'white', fontWeight: '600' }}>
            {issue.status.toUpperCase()}
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.05em' }}>
          {issue.published_at
            ? new Date(issue.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
            : issue.status === 'draft' ? 'Draft' : 'Coming soon'}
        </div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px', lineHeight: '1.3' }}>
          {issue.title}
        </div>
        {issue.subtitle && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>{issue.subtitle}</div>
        )}
        {issue.logline && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>
            {issue.logline}
          </div>
        )}
      </div>
    </div>
  )
}
