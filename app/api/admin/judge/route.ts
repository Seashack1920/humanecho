import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic, MODELS } from '@/lib/anthropic'
import { JUDGE_SYSTEM, JUDGE_SCHEMA, buildJudgeUser, statusFromJudgment } from '@/lib/writingCoach/judge'
import { retrieveChunks, chunksToReferenceBlock } from '@/lib/rag'

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key')
)

const extractText = (content: any[]) => (content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim()

async function requireAdmin(req: NextRequest): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, res: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }) }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { ok: false, res: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }) }
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (prof?.role !== 'admin') return { ok: false, res: NextResponse.json({ error: 'Admins only.' }, { status: 403 }) }
  return { ok: true }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.res

  try {
    const { submissionId, action, decision } = await req.json()
    if (!submissionId) return NextResponse.json({ error: 'Missing submissionId.' }, { status: 400 })

    // ── Human final decision (accept / reject) ──
    if (action === 'decision') {
      if (!['accepted', 'rejected'].includes(decision)) {
        return NextResponse.json({ error: 'Invalid decision.' }, { status: 400 })
      }
      await supabase.from('story_submissions').update({ status: decision }).eq('id', submissionId)
      return NextResponse.json({ ok: true, status: decision })
    }

    // ── AI first-pass judge ──
    const { data: sub } = await supabase
      .from('story_submissions')
      .select('id, title, body, contest_id, word_count')
      .eq('id', submissionId)
      .maybeSingle()
    if (!sub) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 })
    if (!sub.body?.trim()) return NextResponse.json({ error: 'This submission has no text.' }, { status: 400 })

    const { data: contest } = await supabase
      .from('contests').select('title, description, word_limit').eq('id', sub.contest_id).maybeSingle()

    const userContent = buildJudgeUser({
      contestTitle: contest?.title, contestDesc: contest?.description || undefined,
      wordLimit: contest?.word_limit, title: sub.title || 'Untitled', body: sub.body,
    })

    // Best-effort PD grounding (Phase 2). No-op until the library/key exist.
    const refs = await retrieveChunks({ queryText: sub.body, tier: 'revisionist', documentType: 'novel_excerpt', count: 6 })
    const system = JUDGE_SYSTEM + (refs.length ? chunksToReferenceBlock(refs) : '')

    const msg = await anthropic.messages.create({
      model: MODELS.base, // Sonnet 4.6 — consistent, cost-effective first-pass
      max_tokens: 1800,
      system,
      output_config: { format: { type: 'json_schema', schema: JUDGE_SCHEMA } },
      messages: [{ role: 'user', content: userContent }],
    } as any)

    let j: any
    try { j = JSON.parse(extractText(msg.content as any[])) } catch { return NextResponse.json({ error: 'Could not parse the assessment. Try again.' }, { status: 502 }) }

    const status = statusFromJudgment(j.recommendation, j.overall)

    const { data: judgment } = await supabase.from('submission_judgments').insert({
      submission_id: sub.id, contest_id: sub.contest_id,
      scores: j.scores, overall: j.overall, recommendation: j.recommendation,
      strengths: j.strengths, weaknesses: j.weaknesses, flags: j.flags, rationale: j.rationale,
      retrieved_chunk_ids: refs.map(r => r.id),
      model: MODELS.base,
    }).select().maybeSingle()

    await supabase.from('story_submissions').update({ status }).eq('id', sub.id)

    return NextResponse.json({ ok: true, status, judgment })
  } catch (err) {
    console.error('Judge error:', err)
    return NextResponse.json({ error: (err as Error).message || 'Something went wrong.' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
