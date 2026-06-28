// ─── StoriesTab component ─────────────────────────────────────────────────────
// Drop this component into app/dashboard/page.tsx
// Then replace the "coming soon" stories section with: {contentTab === 'stories' && <StoriesTab artistId={artist.id} />}

import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Story = {
  id: string
  title: string
  logline: string | null
  story_type: string
  status: string
  content_origin: string
  explicit: boolean
  tip_enabled: boolean
  read_time_minutes: number | null
  word_count: number | null
  created_at: string
}

const STORY_TYPE_LABELS: Record<string, string> = {
  short_story: 'Short Story', flash_fiction: 'Flash Fiction',
  educational: 'Educational', children: "Children's", series: 'Series', essay: 'Essay',
}

const statusCycle = (s: string) => s === 'draft' ? 'private' : s === 'private' ? 'published' : 'draft'
const statusNext  = (s: string) => s === 'draft' ? 'Make Private' : s === 'private' ? 'Publish' : 'Unpublish'

export function StoriesTab({ artistId, isAdmin = false }: { artistId: string; isAdmin?: boolean }) {
  const router = useRouter()
  const [stories, setStories]       = useState<Story[]>([])
  const [loading, setLoading]       = useState(true)
  const [message, setMessage]       = useState<{ type: string; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null)

  const s = {
    comingSoon: { padding: '32px', textAlign: 'center' as const, color: 'var(--text-muted)', fontSize: '14px', background: 'var(--bg-secondary)', borderRadius: '14px', border: '1px dashed var(--border)' },
    btn:          { padding: '9px 20px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer' },
    btnSm:        { padding: '6px 12px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontSize: '12px', border: 'none', cursor: 'pointer' },
    btnSmSecondary: { padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-muted)', fontSize: '12px', border: '1px solid var(--border)', cursor: 'pointer' },
    btnSmDanger:  { padding: '6px 12px', borderRadius: '6px', background: 'rgba(220,60,60,0.1)', color: '#dc3c3c', fontSize: '12px', border: '1px solid rgba(220,60,60,0.3)', cursor: 'pointer' },
    storyCard:    { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 20px', marginBottom: '12px' },
    statusBadge:  (status: string) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', background: status === 'published' ? 'rgba(43,122,143,0.12)' : status === 'private' ? 'rgba(150,100,200,0.12)' : 'rgba(150,150,150,0.12)', color: status === 'published' ? 'var(--accent-primary)' : status === 'private' ? '#9664c8' : 'var(--text-muted)', cursor: 'pointer' }),
    sectionHead:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
    sectionTitle: { fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' },
    confirmBox:   { background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', fontSize: '13px', color: '#dc3c3c' },
  }

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('stories')
        .select('id, title, logline, story_type, status, content_origin, explicit, tip_enabled, read_time_minutes, word_count, created_at')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false })
      setStories(data || [])
      setLoading(false)
    }
    load()
  }, [artistId])

  const toggleStatus = async (story: Story) => {
    const newStatus = statusCycle(story.status)
    const { error } = await supabase.from('stories').update({ status: newStatus }).eq('id', story.id)
    if (!error) {
      setStories(prev => prev.map(s => s.id === story.id ? { ...s, status: newStatus } : s))
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    await supabase.from('stories').delete().eq('id', confirmDelete.id)
    setStories(prev => prev.filter(s => s.id !== confirmDelete.id))
    setConfirmDelete(null)
    setMessage({ type: 'success', text: 'Story deleted.' })
  }

  if (loading) return <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '14px' }}>Loading stories...</div>

  return (
    <div>
      <div style={s.sectionHead}>
        <div style={s.sectionTitle}>Stories</div>
        <button style={s.btn} onClick={() => router.push('/admin/stories')}>
          + New Story
        </button>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: 'rgba(43,122,143,0.1)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', fontSize: '14px' }}>
          {message.text}
        </div>
      )}

      {confirmDelete && (
        <div style={s.confirmBox}>
          <div style={{ marginBottom: '10px' }}>⚠️ Delete <strong>"{confirmDelete.title}"</strong>? This cannot be undone.</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={s.btnSmDanger} onClick={handleDelete}>Yes, delete</button>
            <button style={s.btnSmSecondary} onClick={() => setConfirmDelete(null)}>Cancel</button>
          </div>
        </div>
      )}

      {stories.length === 0 ? (
        <div style={s.comingSoon}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📖</div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>No stories yet</div>
          <div style={{ marginBottom: '20px' }}>Write and publish your first story.</div>
          <button style={s.btn} onClick={() => router.push('/admin/stories')}>Write a story →</button>
        </div>
      ) : (
        stories.map(story => (
          <div key={story.id} style={s.storyCard}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {story.title}
                  {story.explicit && <span style={{ marginLeft: '8px', fontSize: '10px', background: 'rgba(224,122,95,0.15)', color: 'var(--accent-secondary)', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>18+</span>}
                </div>
                {story.logline && (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>
                    {story.logline}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>{STORY_TYPE_LABELS[story.story_type] || story.story_type}</span>
                  {story.read_time_minutes && <span>{story.read_time_minutes} min read</span>}
                  {story.word_count && <span>{story.word_count.toLocaleString()} words</span>}
                  {story.tip_enabled && <span>💰 Tips on</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', flexShrink: 0 }}>
                <span style={s.statusBadge(story.status)} onClick={() => toggleStatus(story)} title="Click to cycle status">
                  {story.status}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' as const }}>
              <button style={s.btnSm} onClick={() => toggleStatus(story)}>{statusNext(story.status)}</button>
              <button style={s.btnSmSecondary} onClick={() => router.push('/admin/stories')}>Edit</button>
              <button style={s.btnSmSecondary} onClick={() => window.open(`/stories/${story.id}`, '_blank')}>View →</button>
              <button style={s.btnSmDanger} onClick={() => setConfirmDelete({ id: story.id, title: story.title })}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
