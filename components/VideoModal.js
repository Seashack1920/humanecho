'use client'

import { useEffect, useRef } from 'react'

export default function VideoModal({ videoUrl, artistName, thumbUrl, onClose, label }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', borderRadius: '20px', overflow: 'hidden',
          width: '100%', maxWidth: '640px',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{
              fontSize: '11px', fontWeight: '500', letterSpacing: '1.5px',
              textTransform: 'uppercase', color: 'var(--accent-gold)', marginBottom: '4px',
            }}>
              {label || 'Personal Message'}
            </div>
            <div style={{
              fontFamily: 'Playfair Display, serif', fontSize: '18px',
              fontWeight: '600', color: 'var(--text-primary)',
            }}>
              {artistName || 'From the Artist'}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', color: 'var(--text-muted)', transition: 'background 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
          >
            ×
          </button>
        </div>

        {/* Video */}
        <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            src={videoUrl}
            poster={thumbUrl || undefined}
            controls
            autoPlay
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              fontSize: '13px', color: 'var(--text-muted)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
