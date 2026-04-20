'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Header() {
  const [theme, setTheme] = useState('light')
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  const navLinks = ['Music', 'Films', 'Books', 'Stories']

  return (
    <>
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: scrolled || menuOpen ? 'var(--player-bg)' : 'transparent',
        backdropFilter: scrolled || menuOpen ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled || menuOpen ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        {/* Logo */}
        <Link href="/" style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: isMobile ? '20px' : '24px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          letterSpacing: '-0.5px',
          fontStyle: 'italic',
          textDecoration: 'none',
        }}>
          Human Echo
        </Link>

        {/* Desktop nav */}
        {!isMobile && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            {navLinks.map((item) => (
              <Link
                key={item}
                href={`/${item.toLowerCase()}`}
                style={{
                  fontSize: '14px',
                  fontWeight: '400',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.5px',
                  transition: 'color 0.2s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                {item}
              </Link>
            ))}
            <button
              onClick={toggleTheme}
              style={{
                width: '40px', height: '22px', borderRadius: '11px',
                background: theme === 'dark' ? 'var(--accent-primary)' : 'var(--border)',
                position: 'relative', transition: 'background 0.3s ease',
                border: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute', top: '2px',
                left: theme === 'dark' ? '19px' : '2px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: theme === 'dark' ? 'white' : 'var(--accent-gold)',
                transition: 'left 0.3s ease', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '9px',
              }}>
                {theme === 'dark' ? '🌙' : '☀️'}
              </div>
            </button>
          </nav>
        )}

        {/* Mobile controls */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={toggleTheme}
              style={{
                width: '36px', height: '20px', borderRadius: '10px',
                background: theme === 'dark' ? 'var(--accent-primary)' : 'var(--border)',
                position: 'relative', border: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute', top: '2px',
                left: theme === 'dark' ? '17px' : '2px',
                width: '14px', height: '14px', borderRadius: '50%',
                background: theme === 'dark' ? 'white' : 'var(--accent-gold)',
                transition: 'left 0.3s ease', fontSize: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {theme === 'dark' ? '🌙' : '☀️'}
              </div>
            </button>

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px', display: 'flex', flexDirection: 'column', gap: '5px',
              }}
            >
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: '22px', height: '2px',
                  background: 'var(--text-primary)',
                  borderRadius: '2px',
                  opacity: menuOpen && i === 1 ? 0 : 1,
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
            <Link
              key={item}
              href={`/${item.toLowerCase()}`}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block', padding: '14px 0',
                fontSize: '18px', fontFamily: 'Playfair Display, serif',
                fontWeight: '500', color: 'var(--text-primary)',
                borderBottom: '1px solid var(--border)', textDecoration: 'none',
              }}
            >
              {item}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
