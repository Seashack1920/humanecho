'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { signOut } from '@/lib/signOut'

export default function Header() {
  const router = useRouter()
  const [theme, setTheme] = useState('light')
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [acctOpen, setAcctOpen] = useState(false)
  const acctRef = useRef(null)

  const { loading, signedIn, profile, isAdmin, isArtist, isMember } = useCurrentUser()

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close the account dropdown when clicking outside
  useEffect(() => {
    const onClick = (e) => {
      if (acctRef.current && !acctRef.current.contains(e.target)) setAcctOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  const navLinks = ['Music', 'Stories', 'Cinema', 'Escapes']

  // Build the account-menu items based on derived role
  const displayName = profile?.full_name || 'Account'
  const initial = (profile?.full_name || '?').trim().charAt(0).toUpperCase()

  const menuItems = []
  menuItems.push({ label: 'Your profile', action: () => router.push('/profile') })
  if (isArtist) menuItems.push({ label: 'Your Studio', action: () => router.push('/dashboard') })
  if (isAdmin) menuItems.push({ label: 'Admin', action: () => router.push('/dashboard') })
  menuItems.push({ label: 'Log out', action: () => signOut(router), danger: true })

  // ── The account area (right side of header) ──
  const accountArea = () => {
    if (loading) {
      return <div style={{ width: '40px', height: '40px' }} aria-hidden />
    }
    if (!signedIn) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link href="/login" style={{ fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>
            Log in
          </Link>
        </div>
      )
    }
    return (
      <div style={{ position: 'relative' }} ref={acctRef}>
        <button
          onClick={() => setAcctOpen(o => !o)}
          aria-expanded={acctOpen}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
          ) : (
            <span style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>
              {initial}
            </span>
          )}
        </button>

        {acctOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '12px', minWidth: '190px', padding: '8px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)', zIndex: 200,
          }}>
            <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border)', marginBottom: '6px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {isAdmin ? 'Admin' : isArtist ? 'Artist' : isMember ? 'Member' : 'Follower'}
              </div>
            </div>
            {menuItems.map((item, i) => (
              <button
                key={i}
                onClick={() => { setAcctOpen(false); item.action() }}
                style={{
                  width: '100%', textAlign: 'left', padding: '9px 12px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '14px', borderRadius: '7px',
                  color: item.danger ? 'var(--accent-secondary)' : 'var(--text-primary)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '70px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: scrolled || menuOpen ? 'var(--player-bg)' : 'transparent',
        backdropFilter: scrolled || menuOpen ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled || menuOpen ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        {/* Logo */}
        <Link href="/" style={{
          fontFamily: 'Playfair Display, serif', fontSize: isMobile ? '20px' : '24px',
          fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px',
          fontStyle: 'italic', textDecoration: 'none',
        }}>
          Human Echo
        </Link>

        {/* Desktop nav */}
        {!isMobile && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            {navLinks.map((item) => (
              <Link key={item} href={`/${item.toLowerCase()}`} style={{
                fontSize: '14px', fontWeight: '400', color: 'var(--text-secondary)',
                letterSpacing: '0.5px', transition: 'color 0.2s ease', textDecoration: 'none',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                {item}
              </Link>
            ))}
            <button onClick={toggleTheme} style={{
              width: '40px', height: '22px', borderRadius: '11px',
              background: theme === 'dark' ? 'var(--accent-primary)' : 'var(--border)',
              position: 'relative', transition: 'background 0.3s ease',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}>
              <div style={{
                position: 'absolute', top: '2px', left: theme === 'dark' ? '19px' : '2px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: theme === 'dark' ? 'white' : 'var(--accent-gold)',
                transition: 'left 0.3s ease', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '9px',
              }}>
                {theme === 'dark' ? '🌙' : '☀️'}
              </div>
            </button>
            {/* Account area */}
            {accountArea()}
          </nav>
        )}

        {/* Mobile controls */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={toggleTheme} style={{
              width: '36px', height: '20px', borderRadius: '10px',
              background: theme === 'dark' ? 'var(--accent-primary)' : 'var(--border)',
              position: 'relative', border: '1px solid var(--border)', cursor: 'pointer',
            }}>
              <div style={{
                position: 'absolute', top: '2px', left: theme === 'dark' ? '17px' : '2px',
                width: '14px', height: '14px', borderRadius: '50%',
                background: theme === 'dark' ? 'white' : 'var(--accent-gold)',
                transition: 'left 0.3s ease', fontSize: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {theme === 'dark' ? '🌙' : '☀️'}
              </div>
            </button>
            {/* Account area (mobile) */}
            {accountArea()}
            {/* Hamburger */}
            <button onClick={() => setMenuOpen(!menuOpen)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px', display: 'flex', flexDirection: 'column', gap: '5px',
            }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: '22px', height: '2px', background: 'var(--text-primary)',
                  borderRadius: '2px', opacity: menuOpen && i === 1 ? 0 : 1,
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </button>
          </div>
        )}
      </header>

      {/* Mobile menu */}
      {isMobile && menuOpen && (
        <div style={{
          position: 'fixed', top: '70px', left: 0, right: 0, zIndex: 99,
          background: 'var(--player-bg)', backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)',
          padding: '16px 24px 24px',
        }}>
          {navLinks.map((item) => (
            <Link key={item} href={`/${item.toLowerCase()}`} onClick={() => setMenuOpen(false)} style={{
              display: 'block', padding: '14px 0', fontSize: '18px',
              fontFamily: 'Playfair Display, serif', fontWeight: '500',
              color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', textDecoration: 'none',
            }}>
              {item}
            </Link>
          ))}
          {!signedIn && (
            <Link href="/login" onClick={() => setMenuOpen(false)} style={{
              display: 'block', padding: '14px 0', fontSize: '18px',
              fontFamily: 'Playfair Display, serif', fontWeight: '500',
              color: 'var(--accent-primary)', textDecoration: 'none',
            }}>
              Log in
            </Link>
          )}
        </div>
      )}
    </>
  )
}