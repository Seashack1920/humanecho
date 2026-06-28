'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/context/PlayerContext'

type TeamMember = {
  id: string
  name: string
  title: string
  video_url: string | null
  section: string
  display_order: number
}

function TeamMemberCard({ member }: { member: TeamMember }) {
  const videoRef              = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [hovered, setHovered] = useState(false)

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (playing) { v.pause(); setPlaying(false) }
    else { v.play(); setPlaying(true) }
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{ position: 'relative', aspectRatio: '9/16', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-secondary)', marginBottom: '16px', cursor: member.video_url ? 'pointer' : 'default', border: '1px solid var(--border)' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={togglePlay}
      >
        {member.video_url ? (
          <>
            <video
              ref={videoRef}
              src={member.video_url}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              playsInline
              onEnded={() => setPlaying(false)}
            />
            {/* Play/pause overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: playing && !hovered ? 'transparent' : 'rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              opacity: playing && !hovered ? 0 : 1,
            }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.92)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', color: '#0a0a0b',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                transform: hovered ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.2s',
              }}>
                {playing ? '⏸' : '▶'}
              </div>
            </div>
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '48px' }}>🎬</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Video coming soon</div>
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
        {member.name}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
        {member.title}
      </div>
    </div>
  )
}

export default function TeamPage() {
  const { stop: stopPlayer } = usePlayer()
  const [executives, setExecutives] = useState<TeamMember[]>([])
  const [djs, setDjs]               = useState<TeamMember[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    stopPlayer()
    const load = async () => {
      const { data } = await supabase
        .from('team_members')
        .select('id, name, title, video_url, section, display_order')
        .eq('is_active', true)
        .order('display_order')
      if (data) {
        setExecutives(data.filter(m => m.section === 'executives'))
        setDjs(data.filter(m => m.section === 'djs'))
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>Loading</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── HEADER ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 48px 64px', textAlign: 'center' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '16px', fontWeight: '600' }}>
          Human Echo
        </div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.1', marginBottom: '16px' }}>
          Our Team
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto', lineHeight: '1.6' }}>
          The people behind Human Echo — building a platform where independent artists are heard.
        </p>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 48px 120px' }}>

        {/* ── EXECUTIVES ── */}
        {executives.length > 0 && (
          <section style={{ marginBottom: '96px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '48px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
              Leadership
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
              {executives.map(member => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          </section>
        )}

        {/* ── DJs ── */}
        {djs.length > 0 && (
          <section>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '48px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
              Our DJs
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
              {djs.map(member => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          </section>
        )}

        {/* ── EMPTY STATE ── */}
        {executives.length === 0 && djs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Coming soon</div>
            <div style={{ fontSize: '14px' }}>Meet the team — videos on their way.</div>
          </div>
        )}
      </div>
    </div>
  )
}
