'use client'

// Admin → About Page. Edit the /about (ethos) content — hero, sections, CTA —
// stored in site_settings (key 'about_content'). No code needed.

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DEFAULT_ABOUT, mergeAbout, type AboutContent, type AboutSection } from '@/lib/aboutContent'

export default function AboutAdmin() {
  const [c, setC] = useState<AboutContent>(DEFAULT_ABOUT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'about_content').maybeSingle()
      if (data?.value) { try { setC(mergeAbout(JSON.parse(data.value))) } catch { /* defaults */ } }
      setLoading(false)
    })()
  }, [])

  const setHero = (k: keyof AboutContent['hero'], v: string) => setC(p => ({ ...p, hero: { ...p.hero, [k]: v } }))
  const setCta  = (k: keyof AboutContent['cta'],  v: string) => setC(p => ({ ...p, cta:  { ...p.cta,  [k]: v } }))
  const setSec  = (i: number, k: keyof AboutSection, v: string) =>
    setC(p => ({ ...p, sections: p.sections.map((s, j) => j === i ? { ...s, [k]: v } : s) }))
  const addSec = () => setC(p => ({ ...p, sections: [...p.sections, { label: '', title: '', body: '' }] }))
  const removeSec = (i: number) => setC(p => ({ ...p, sections: p.sections.filter((_, j) => j !== i) }))
  const moveSec = (i: number, dir: -1 | 1) => setC(p => {
    const j = i + dir
    if (j < 0 || j >= p.sections.length) return p
    const next = [...p.sections]; [next[i], next[j]] = [next[j], next[i]]; return { ...p, sections: next }
  })

  const save = async () => {
    setSaving(true); setMsg(null)
    const { error } = await supabase.from('site_settings')
      .upsert({ key: 'about_content', value: JSON.stringify(c), updated_at: new Date().toISOString() }, { onConflict: 'key' })
    setSaving(false)
    setMsg(error ? { type: 'error', text: error.message } : { type: 'success', text: 'About page saved.' })
  }

  const resetToDefault = () => { if (window.confirm('Reset the About page to the built-in default text?')) setC(DEFAULT_ABOUT) }

  if (loading) return <div style={{ ...s.page, color: 'var(--text-muted)', textAlign: 'center', paddingTop: '80px' }}>Loading…</div>

  return (
    <div style={s.page}>
      <div style={s.navRow}>
        <div>
          <h1 style={s.h1}>About Page</h1>
          <p style={s.subtitle}>Edit the ethos / “About Us” page. Separate paragraphs with a blank line. Changes apply on each visitor’s next load.</p>
        </div>
        <a href="/about" target="_blank" rel="noreferrer" style={s.link}>View page ↗</a>
      </div>

      {msg && <div style={{ ...s.banner, background: msg.type === 'success' ? 'rgba(52,168,83,0.12)' : 'rgba(220,60,60,0.12)', color: msg.type === 'success' ? '#34a853' : '#dc3c3c' }}>{msg.text}</div>}

      {/* Hero */}
      <div style={s.card}>
        <h2 style={s.h2}>Hero</h2>
        <Field label="Eyebrow (small caps)" v={c.hero.eyebrow} on={v => setHero('eyebrow', v)} />
        <Field label="Title" v={c.hero.title} on={v => setHero('title', v)} />
        <Field label="Subhead" v={c.hero.subhead} on={v => setHero('subhead', v)} area />
      </div>

      {/* Sections */}
      {c.sections.map((sec, i) => (
        <div key={i} style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <h2 style={s.h2}>Section {i + 1}</h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => moveSec(i, -1)} disabled={i === 0} style={s.iconBtn} title="Move up">↑</button>
              <button onClick={() => moveSec(i, 1)} disabled={i === c.sections.length - 1} style={s.iconBtn} title="Move down">↓</button>
              <button onClick={() => removeSec(i)} style={{ ...s.iconBtn, color: '#dc3c3c' }} title="Remove section">✕</button>
            </div>
          </div>
          <Field label="Label (small caps)" v={sec.label} on={v => setSec(i, 'label', v)} />
          <Field label="Title" v={sec.title} on={v => setSec(i, 'title', v)} />
          <Field label="Body" v={sec.body} on={v => setSec(i, 'body', v)} area big />
        </div>
      ))}
      <button onClick={addSec} style={s.addBtn}>+ Add section</button>

      {/* CTA */}
      <div style={s.card}>
        <h2 style={s.h2}>Call to action (bottom)</h2>
        <Field label="Title" v={c.cta.title} on={v => setCta('title', v)} />
        <Field label="Body" v={c.cta.body} on={v => setCta('body', v)} area />
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
        <button onClick={save} disabled={saving} style={s.saveBtn}>{saving ? 'Saving…' : 'Save About page'}</button>
        <button onClick={resetToDefault} style={s.resetBtn}>Reset to default</button>
      </div>
    </div>
  )
}

function Field({ label, v, on, area, big }: { label: string; v: string; on: (v: string) => void; area?: boolean; big?: boolean }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={s.label}>{label}</label>
      {area
        ? <textarea value={v} onChange={e => on(e.target.value)} rows={big ? 8 : 3} style={{ ...s.input, resize: 'vertical', lineHeight: 1.6 }} />
        : <input value={v} onChange={e => on(e.target.value)} style={s.input} />}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: '760px', margin: '0 auto', padding: '32px 24px 100px', fontFamily: 'DM Sans, sans-serif' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' },
  h1: { fontFamily: 'Playfair Display, serif', fontSize: '30px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0', maxWidth: '560px', lineHeight: 1.5 },
  link: { fontSize: '14px', color: 'var(--accent-primary)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 },
  banner: { padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '18px' },
  card: { border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', background: 'var(--bg-secondary)', marginBottom: '16px' },
  h2: { fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' },
  label: { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' },
  input: { width: '100%', padding: '11px 13px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' },
  iconBtn: { width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' },
  addBtn: { padding: '10px 18px', borderRadius: '10px', border: '1px dashed var(--border)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', marginBottom: '16px' },
  saveBtn: { padding: '12px 24px', borderRadius: '10px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' },
  resetBtn: { padding: '12px 18px', borderRadius: '10px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' },
}
