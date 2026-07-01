'use client'

/**
 * Human Echo — Member Personal Page  (/profile)
 * ------------------------------------------------------------------
 * SUBSCRIBERS ONLY. Non-subscribers get a teasing upsell gate.
 * The page builds itself from the member's likes (hearts): each
 * content section appears only once they've hearted something there.
 *
 * BEFORE USE:
 *   alter table profiles add column if not exists avatar_url text;
 *   (Cloudinary unsigned preset `Playlist_Builder` reused for avatar upload.)
 *
 * Save as app/profile/page.jsx
 *
 * LINK TARGETS (no detail [id] routes exist yet for these sections,
 * so cards link to the section landing page for now — change these
 * constants when detail routes are built):
 */
const ROUTES = {
  story: '/stories',   // change to `/story/${id}` when detail route exists
  film: '/cinema',     // change to `/film/${id}` or `/cinema/${id}` later
  escape: '/escapes',
}

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { usePlayer } from '@/context/PlayerContext'
import IdentityCardEditor from '@/components/IdentityCardEditor'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = 'Playlist_Builder'

async function uploadToCloudinary(file) {
  if (!CLOUD_NAME) throw new Error('Image uploads are not configured yet.')
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', UPLOAD_PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST', body: form,
  })
  if (!res.ok) throw new Error('That image did not upload. Try another one.')
  return (await res.json()).secure_url
}

async function attachArtistNames(rows) {
  const ids = [...new Set(rows.map((r) => r.artist_id).filter(Boolean))]
  if (ids.length === 0) return rows.map((r) => ({ ...r, artistName: '' }))
  const { data } = await supabase.from('artists').select('id, name').in('id', ids)
  const byId = Object.fromEntries((data || []).map((a) => [a.id, a.name]))
  return rows.map((r) => ({ ...r, artistName: byId[r.artist_id] || '' }))
}

function gradientFromString(str) {
  let hash = 0
  const s = str || 'untitled'
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash)
  const h1 = Math.abs(hash) % 360
  return `linear-gradient(135deg, hsl(${h1} 45% 30%), hsl(${(h1 + 50) % 360} 50% 16%))`
}

function Thumb({ url, title, className, rounded }) {
  if (url) return <img src={url} alt={title || ''} className={className}
    style={{ objectFit: 'cover', borderRadius: rounded ? '50%' : undefined }} />
  return <div className={className}
    style={{ background: gradientFromString(title), borderRadius: rounded ? '50%' : undefined }} />
}

export default function ProfilePage() {
  const player = (() => { try { return usePlayer() } catch { return null } })()
  const playTrack = player?.playTrack
  const currentTrack = player?.currentTrack
  const isPlaying = player?.isPlaying

  const [authState, setAuthState] = useState('loading') // loading | anon | not_subscribed | ok
  const [userId, setUserId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [sub, setSub] = useState(null)

  const [playlists, setPlaylists] = useState([])
  const [likedTracks, setLikedTracks] = useState([])
  const [likedStories, setLikedStories] = useState([])
  const [likedFilms, setLikedFilms] = useState([])

  const [uploading, setUploading] = useState(false)
  const avatarInputRef = useRef(null)
  const [toast, setToast] = useState(null)
  const showToast = useCallback((m) => {
    setToast(m); clearTimeout(showToast._t); showToast._t = setTimeout(() => setToast(null), 2600)
  }, [])

  /* gate + load everything */
  useEffect(() => {
    let off = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (off) return
        if (!user) return setAuthState('anon')
        setUserId(user.id)

        const { data: prof } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, is_subscriber, subscription_status, subscription_plan, subscription_period_end, artist_id')
          .eq('id', user.id).single()
        if (off) return
        setProfile(prof)
        if (!prof?.is_subscriber) return setAuthState('not_subscribed')
        setAuthState('ok')

        // playlists
        const { data: pls } = await supabase.from('playlists')
          .select('id, title, cover_url, created_at')
          .eq('user_id', user.id).eq('is_curated', false)
          .order('created_at', { ascending: false })
        if (!off && pls) setPlaylists(pls)

        // likes → resolve per type
        const { data: likes } = await supabase.from('likes')
          .select('content_type, content_id, created_at')
          .eq('user_id', user.id).order('created_at', { ascending: false })
        if (off || !likes) return

        const idsOf = (type) => likes.filter((l) => l.content_type === type).map((l) => l.content_id)

        const trackIds = idsOf('track')
        if (trackIds.length) {
          const { data } = await supabase.from('tracks')
            .select('id, title, track_image_url, track_type, duration, cloudinary_url, stream_url, artist_id, status')
            .in('id', trackIds).eq('status', 'published')
          if (!off && data) setLikedTracks(await attachArtistNames(data))
        }
        const storyIds = idsOf('story')
        if (storyIds.length) {
          const { data } = await supabase.from('stories')
            .select('id, title, cover_image_url, artist_id, status')
            .in('id', storyIds).eq('status', 'published')
          if (!off && data) setLikedStories(await attachArtistNames(data))
        }
        const filmIds = idsOf('film')
        if (filmIds.length) {
          const { data } = await supabase.from('films')
            .select('id, title, poster_url, artist_id, status')
            .in('id', filmIds).eq('status', 'published')
          if (!off && data) setLikedFilms(await attachArtistNames(data))
        }
        // escapes: no data / table unconfirmed → intentionally skipped for now
      } catch { if (!off) setAuthState('anon') }
    })()
    return () => { off = true }
  }, [])

  async function handleAvatar(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return showToast('That image is over 10MB — pick a smaller one.')
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
      if (error) throw new Error('Could not save photo.')
      setProfile((p) => ({ ...p, avatar_url: url }))
      showToast('Photo updated.')
    } catch (err) { showToast(err.message || 'Upload failed.') }
    finally { setUploading(false) }
  }

  async function manageBilling() {
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data?.url) window.location.href = data.url
      else showToast('Could not open billing portal.')
    } catch { showToast('Could not open billing portal.') }
  }

  async function startUploading() {
    if (profile?.artist_id) { window.location.href = '/dashboard'; return }
    try {
      const res = await fetch('/api/creator/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not set up your Studio.')
      window.location.href = '/dashboard'
    } catch (e) {
      showToast(e.message || 'Could not set up your Studio.')
    }
  }

  const renewLabel = useMemo(() => {
    if (!profile?.subscription_period_end) return null
    try {
      const d = new Date(profile.subscription_period_end)
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    } catch { return null }
  }, [profile])

  const totalLikes = likedTracks.length + likedStories.length + likedFilms.length

  /* ---------- gated states ---------- */
  if (authState === 'loading')
    return <Shell><Styles /><div className="he-center he-muted">Loading your page…</div></Shell>
  if (authState === 'anon')
    return <Shell><Styles /><Gate title="Sign in to see your page"
      body="Your Human Echo page lives with your account. Log in to continue." cta="Log in" href="/login" /></Shell>
  if (authState === 'not_subscribed')
    return <Shell><Styles /><Gate
      title="Your personal page awaits"
      body="Everything you love on Human Echo — your music, stories, films, and escapes — gathered in one place, plus your own playlists. Become a member to unlock it."
      cta="Become a member" href="/subscribe" /></Shell>

  const firstName = (profile?.full_name || '').split(' ')[0] || 'there'

  return (
    <Shell>
      <Styles />

      {/* header / identity */}
      <header className="he-prof">
        <button className="he-avatarWrap" onClick={() => avatarInputRef.current?.click()} disabled={uploading} title="Change your photo">
          <Thumb url={profile?.avatar_url} title={profile?.full_name} className="he-avatar" rounded />
          <span className="he-avatarHint">{uploading ? 'Uploading…' : 'Photo'}</span>
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
        <div className="he-profMeta">
          <p className="he-eyebrow">Welcome back</p>
          <h1 className="he-name">{profile?.full_name || 'Your page'}</h1>
          <div className="he-memberRow">
            <span className="he-badge">Member</span>
            {profile?.subscription_plan && <span className="he-muted">{profile.subscription_plan}</span>}
            {renewLabel && <span className="he-muted">· renews {renewLabel}</span>}
            <button className="he-link" onClick={manageBilling}>Manage</button>
          </div>
        </div>
      </header>

      <IdentityCardEditor
        userId={userId}
        avatarUrl={profile?.avatar_url}
        fullName={profile?.full_name}
        onPhotoChange={(url) => setProfile((p) => ({ ...p, avatar_url: url }))}
      />

      {/* Your Studio — upload your own music */}
      <section className="he-sec">
        <div className="he-secHead">
          <h2 className="he-secTitle">Your Studio</h2>
          {profile?.artist_id
            ? <a className="he-btn he-btn--primary he-btn--sm" href="/dashboard">Open your Studio →</a>
            : <button className="he-btn he-btn--primary he-btn--sm" onClick={startUploading}>Share your music →</button>}
        </div>
        <p className="he-muted he-nudge">
          {profile?.artist_id
            ? 'Upload tracks, manage your releases, and see your whole library in your Studio.'
            : 'As a member, you can upload your own songs into your private library — play them, add them to playlists, and enter contests. Click to set up your Studio.'}
        </p>
      </section>

      {/* Writing Room — notepad + AI Writing Coach */}
      <section className="he-sec">
        <div className="he-secHead">
          <h2 className="he-secTitle">Your Writing Room</h2>
          <a className="he-btn he-btn--primary he-btn--sm" href="/writing-room">Open the Writing Room →</a>
        </div>
        <p className="he-muted he-nudge">
          A private notepad plus your personal Writing Coach — honest, developmental feedback on your
          prose, lyrics, screenplays, and stage plays. Your coach guides and never rewrites your work.
        </p>
      </section>

      {/* playlists */}
      <section className="he-sec">
        <div className="he-secHead">
          <h2 className="he-secTitle">Your playlists</h2>
          <a className="he-btn he-btn--primary he-btn--sm" href="/playlists">+ Build a playlist</a>
        </div>
        {playlists.length === 0 ? (
          <p className="he-muted he-nudge">No playlists yet — <a className="he-link" href="/playlists">make your first one</a> and drop your own cover art on it.</p>
        ) : (
          <div className="he-grid">
            {playlists.map((p) => (
              <a key={p.id} href="/playlists" className="he-card">
                <Thumb url={p.cover_url} title={p.title} className="he-cardArt he-cardArt--gold" />
                <span className="he-cardTitle">{p.title || 'Untitled playlist'}</span>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* the likes-driven sections */}
      {totalLikes === 0 && (
        <section className="he-sec">
          <div className="he-explore">
            <h2 className="he-secTitle">Your page grows from what you love</h2>
            <p className="he-muted">Tap the heart on any track, story, or film as you explore Human Echo — and it’ll gather here, building a page that’s all yours.</p>
            <div className="he-exploreLinks">
              <a className="he-btn he-btn--sm" href="/music">Explore music</a>
              <a className="he-btn he-btn--sm" href="/stories">Explore stories</a>
              <a className="he-btn he-btn--sm" href="/cinema">Explore cinema</a>
              <a className="he-btn he-btn--sm" href="/escapes">Explore escapes</a>
            </div>
          </div>
        </section>
      )}

      {likedTracks.length > 0 && (
        <section className="he-sec">
          <div className="he-secHead"><h2 className="he-secTitle">Music you love</h2></div>
          <div className="he-grid">
            {likedTracks.map((t) => {
              const playing = currentTrack?.id === t.id && isPlaying
              return (
                <button key={t.id} className={`he-card ${playing ? 'is-playing' : ''}`}
                  onClick={() => playTrack && playTrack(t)} title="Play">
                  <span className="he-cardArtWrap">
                    <Thumb url={t.track_image_url} title={t.title} className="he-cardArt" />
                    <span className="he-playOverlay">{playing ? <span className="he-eq"><i/><i/><i/></span> : '▶'}</span>
                  </span>
                  <span className="he-cardTitle">{t.title}</span>
                  <span className="he-cardSub">
                    {t.artistName}{t.track_type && t.track_type !== 'song' ? ` · ${t.track_type}` : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {likedStories.length > 0 && (
        <section className="he-sec">
          <div className="he-secHead"><h2 className="he-secTitle">Stories you love</h2></div>
          <div className="he-grid">
            {likedStories.map((s) => (
              <a key={s.id} href={ROUTES.story} className="he-card">
                <Thumb url={s.cover_image_url} title={s.title} className="he-cardArt" />
                <span className="he-cardTitle">{s.title}</span>
                {s.artistName && <span className="he-cardSub">{s.artistName}</span>}
              </a>
            ))}
          </div>
        </section>
      )}

      {likedFilms.length > 0 && (
        <section className="he-sec">
          <div className="he-secHead"><h2 className="he-secTitle">Cinema you love</h2></div>
          <div className="he-grid">
            {likedFilms.map((f) => (
              <a key={f.id} href={ROUTES.film} className="he-card">
                <Thumb url={f.poster_url} title={f.title} className="he-cardArt he-cardArt--poster" />
                <span className="he-cardTitle">{f.title}</span>
                {f.artistName && <span className="he-cardSub">{f.artistName}</span>}
              </a>
            ))}
          </div>
        </section>
      )}

      {totalLikes > 0 && (
        <p className="he-muted he-keepExploring">
          Keep exploring — every heart adds to your page.{' '}
          <a className="he-link" href="/music">Music</a> ·{' '}
          <a className="he-link" href="/stories">Stories</a> ·{' '}
          <a className="he-link" href="/cinema">Cinema</a> ·{' '}
          <a className="he-link" href="/escapes">Escapes</a>
        </p>
      )}

      {toast && <div className="he-toast" role="status">{toast}</div>}
    </Shell>
  )
}

function Shell({ children }) { return <div className="he-shell">{children}</div> }

function Gate({ title, body, cta, href }) {
  return (
    <div className="he-gate">
      <h1 className="he-gate__title">{title}</h1>
      <p className="he-gate__body">{body}</p>
      <a className="he-btn he-btn--primary" href={href}>{cta}</a>
    </div>
  )
}

function Styles() {
  return (
    <style>{`
      .he-shell{min-height:100vh;background:var(--bg-primary);color:var(--text-primary);
        font-family:'DM Sans',sans-serif;padding:clamp(16px,4vw,40px);max-width:1100px;margin:0 auto}
      .he-center{min-height:60vh;display:grid;place-items:center}
      .he-muted{color:var(--text-muted)}
      .he-eyebrow{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent-primary);font-weight:600;margin:0 0 6px}
      .he-link{background:none;border:none;color:var(--accent-primary);cursor:pointer;font-size:inherit;padding:0;text-decoration:underline;text-underline-offset:3px}

      .he-prof{display:flex;gap:24px;align-items:center;margin-bottom:40px;flex-wrap:wrap}
      .he-avatarWrap{position:relative;flex:none;width:104px;height:104px;border-radius:50%;border:none;
        padding:0;background:none;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.45)}
      .he-avatar{width:104px;height:104px}
      .he-avatarHint{position:absolute;inset:auto 0 0 0;background:rgba(10,10,11,.7);color:#fff;font-size:11px;
        padding:5px;border-radius:0 0 52px 52px;opacity:0;transition:opacity .15s ease}
      .he-avatarWrap:hover .he-avatarHint{opacity:1}
      .he-profMeta{min-width:0}
      .he-name{font-family:'Playfair Display',serif;font-size:clamp(28px,5vw,44px);font-weight:700;margin:0;letter-spacing:-.02em}
      .he-memberRow{display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap;font-size:14px}
      .he-badge{background:rgba(43,122,143,.16);border:1px solid var(--accent-primary);color:var(--accent-primary);
        border-radius:999px;padding:3px 12px;font-size:12px;font-weight:600}

      .he-sec{margin-bottom:44px}
      .he-secHead{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:18px;flex-wrap:wrap}
      .he-secTitle{font-family:'Playfair Display',serif;font-size:clamp(20px,3vw,28px);font-weight:700;margin:0}
      .he-nudge{padding:8px 0}
      .he-keepExploring{margin-top:8px;font-size:14px}

      .he-btn{border:1px solid rgba(255,255,255,.18);background:var(--bg-card);color:var(--text-primary);
        border-radius:999px;padding:10px 18px;font-size:14px;font-weight:500;cursor:pointer;text-decoration:none;
        display:inline-block;transition:transform .12s ease,border-color .2s ease}
      .he-btn:hover{transform:translateY(-1px)}
      .he-btn--primary{background:var(--accent-primary);border-color:transparent;color:#fff;font-weight:600;box-shadow:0 8px 28px rgba(43,122,143,.35)}
      .he-btn--sm{padding:8px 14px;font-size:13px}

      .he-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:18px}
      .he-card{display:flex;flex-direction:column;gap:8px;text-align:left;background:none;border:none;
        padding:0;cursor:pointer;color:inherit;text-decoration:none}
      .he-cardArtWrap{position:relative;display:block}
      .he-cardArt{width:100%;aspect-ratio:1;border-radius:12px;display:block;box-shadow:0 8px 24px rgba(0,0,0,.35)}
      .he-cardArt--poster{aspect-ratio:2/3}
      .he-cardArt--gold{border:1px solid rgba(232,180,90,.4);box-shadow:0 8px 24px rgba(232,180,90,.14)}
      .he-playOverlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        background:rgba(10,10,11,.4);color:#fff;font-size:22px;border-radius:12px;opacity:0;transition:opacity .15s ease}
      .he-card:hover .he-playOverlay,.he-card.is-playing .he-playOverlay{opacity:1}
      .he-cardTitle{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .he-cardSub{font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

      .he-eq{display:flex;align-items:flex-end;gap:3px;height:18px}
      .he-eq i{width:4px;background:#fff;border-radius:1px;animation:he-eq .9s ease-in-out infinite}
      .he-eq i:nth-child(1){height:8px;animation-delay:0s}
      .he-eq i:nth-child(2){height:16px;animation-delay:.2s}
      .he-eq i:nth-child(3){height:11px;animation-delay:.4s}
      @keyframes he-eq{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}

      .he-explore{background:var(--bg-secondary);border:1px solid var(--border);border-radius:18px;padding:28px}
      .he-exploreLinks{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}

      .he-gate{min-height:70vh;display:grid;place-content:center;justify-items:start;gap:14px;max-width:560px;margin:0 auto}
      .he-gate__title{font-family:'Playfair Display',serif;font-size:clamp(28px,5vw,44px);margin:0;font-weight:700}
      .he-gate__body{color:var(--text-muted);font-size:17px;line-height:1.55;margin:0 0 8px}

      .he-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:var(--bg-card);
        border:1px solid var(--border);color:var(--text-primary);padding:12px 20px;border-radius:999px;
        font-size:14px;z-index:50;box-shadow:0 12px 40px rgba(0,0,0,.5)}
    `}</style>
  )
}
