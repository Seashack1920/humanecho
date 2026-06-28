'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  contentType: 'track' | 'album' | 'story' | 'film'
  contentId: string
  size?: 'sm' | 'md'
}

const LIKE_THRESHOLD = 3

export default function LikeButton({ contentType, contentId, size = 'md' }: Props) {
  const [liked, setLiked]       = useState(false)
  const [count, setCount]       = useState(0)
  const [userId, setUserId]     = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [mounted, setMounted]   = useState(false)

  const fontSize  = size === 'sm' ? '14px' : '16px'
  const countSize = size === 'sm' ? '11px' : '12px'

  useEffect(() => {
    setMounted(true)
    const load = async () => {
      // Get like count
      const { count: likeCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('content_type', contentType)
        .eq('content_id', contentId)
      setCount(likeCount || 0)

      // Check if current user has liked
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', user.id)
          .eq('content_type', contentType)
          .eq('content_id', contentId)
          .single()
        setLiked(!!data)
      }
    }
    load()
  }, [contentType, contentId])

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userId || loading) return
    setLoading(true)

    if (liked) {
      // Unlike
      await supabase.from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('content_type', contentType)
        .eq('content_id', contentId)
      setLiked(false)
      setCount(c => Math.max(0, c - 1))
    } else {
      // Like
      await supabase.from('likes')
        .insert({ user_id: userId, content_type: contentType, content_id: contentId })
      setLiked(true)
      setCount(c => c + 1)
    }
    setLoading(false)
  }

  if (!mounted) return null

  return (
    <button
      onClick={handleLike}
      disabled={!userId || loading}
      title={userId ? (liked ? 'Unlike' : 'Like') : 'Sign in to like'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'none',
        border: 'none',
        cursor: userId ? 'pointer' : 'default',
        padding: '4px 6px',
        borderRadius: '6px',
        transition: 'all 0.15s ease',
        opacity: loading ? 0.6 : 1,
      }}
      onMouseEnter={e => { if (userId) e.currentTarget.style.background = 'var(--bg-secondary)' }}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <span style={{
        fontSize,
        lineHeight: 1,
        transition: 'all 0.15s ease',
        display: 'inline-block',
        transform: liked ? 'scale(1.2)' : 'scale(1)',
        color: liked ? 'var(--accent-secondary)' : 'var(--text-muted)',
      }}>
        ♥
      </span>
      {count >= LIKE_THRESHOLD && (
        <span style={{
          fontSize: countSize,
          color: liked ? 'var(--accent-secondary)' : 'var(--text-muted)',
          fontWeight: '500',
          lineHeight: 1,
          transition: 'color 0.15s ease',
        }}>
          {count}
        </span>
      )}
    </button>
  )
}
