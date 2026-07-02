import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic, MODELS, type CritiqueTier } from '@/lib/anthropic'
import { buildSystemPrompt, buildUserContent, GUARD_SYSTEM } from '@/lib/writingCoach/prompts'
import { retrieveChunks, chunksToReferenceBlock } from '@/lib/rag'

// Map the writer's chosen format to the PD reference document_type.
const PD_TYPE: Record<string, string> = { prose: 'novel_excerpt', lyrics: 'song_lyrics', screenplay: 'screenplay', stage_play: 'stage_play' }

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key')
)

// Per-tier hard word ceilings + generation budget. Base is capped at 7,500
// words; paid tiers accept far larger drafts (Opus 4.8's 1M context holds a full
// novel — smart chunking is a Phase 3 optimization, not a correctness need here).
const TIER_LIMITS: Record<CritiqueTier, { maxWords: number; maxTokens: number }> = {
  base:         { maxWords: 7500,   maxTokens: 4000 },
  creator_plus: { maxWords: 120000, maxTokens: 6000 },
  revisionist:  { maxWords: 150000, maxTokens: 9000 },
}

function extractText(content: any[]): string {
  return (content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim()
}

async function generate(model: string, tier: CritiqueTier, system: string, user: string, maxTokens: number) {
  const isPaid = tier !== 'base'
  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    system,
    ...(isPaid
      ? { thinking: { type: 'adaptive' }, output_config: { effort: tier === 'revisionist' ? 'high' : 'medium' } }
      : { thinking: { type: 'disabled' } }),
    messages: [{ role: 'user', content: user }],
  } as any)
  const msg = await stream.finalMessage()
  return extractText(msg.content as any[])
}

// Ethos backstop: a cheap Haiku pass that flags if the coach actually wrote new
// creative text. Fails open (returns false) if the check itself errors — the
// primary system prompt is the main guard; this is defense in depth.
async function violatesEthos(feedback: string): Promise<boolean> {
  try {
    const msg = await anthropic.messages.create({
      model: MODELS.guard,
      max_tokens: 200,
      system: GUARD_SYSTEM,
      messages: [{ role: 'user', content: feedback.slice(0, 12000) }],
    } as any)
    const text = extractText(msg.content as any[])
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return false
    return JSON.parse(m[0]).violation === true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  let consumed: { userId: string; period: string } | null = null
  try {
    // ── Auth ──
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

    const { text: rawText, tone, genre, docType } = await req.json()

    // The client sends the writer's text directly (their work lives in their
    // browser, not our database). We use it transiently and never store it.
    const text: string = (rawText || '').trim()
    if (!text) return NextResponse.json({ error: 'There is nothing to critique yet — add some writing first.' }, { status: 400 })

    // ── Usage gate (atomic; derives tier, gates base tier) ──
    const { data: gate, error: gateErr } = await supabase.rpc('consume_critique', { p_user_id: user.id })
    if (gateErr) throw gateErr
    if (!gate?.allowed) {
      if (gate?.reason === 'not_subscriber') {
        return NextResponse.json({ error: 'The Writing Coach is a members feature.', needsMembership: true }, { status: 403 })
      }
      return NextResponse.json({
        error: "You've used all 5 free critiques this month.",
        upgrade: true, remaining: 0,
      }, { status: 402 })
    }
    const tier = gate.tier as CritiqueTier
    consumed = tier === 'base' ? { userId: user.id, period: gate.period } : null

    // ── Word-limit guard (refund the consumed credit if it's over) ──
    const wordCount = text.split(/\s+/).filter(Boolean).length
    if (wordCount > TIER_LIMITS[tier].maxWords) {
      if (consumed) { await supabase.rpc('refund_critique', { p_user_id: consumed.userId, p_period: consumed.period }); consumed = null }
      return NextResponse.json({
        error: `This piece is ${wordCount.toLocaleString()} words. The ${tier === 'base' ? 'base' : 'current'} tier limit is ${TIER_LIMITS[tier].maxWords.toLocaleString()} words.`,
        overLimit: true,
        upgrade: tier === 'base',
      }, { status: 413 })
    }

    // ── Generate ──
    const model = tier === 'base' ? MODELS.base : MODELS.paid
    let system = buildSystemPrompt(tier, tone, genre, docType)
    // Best-effort PD grounding (Phase 2). No-op until VOYAGE_API_KEY + a library exist.
    const refs = await retrieveChunks({ queryText: text, tier, documentType: PD_TYPE[docType] || null, count: tier === 'base' ? 4 : 6 })
    if (refs.length) system += chunksToReferenceBlock(refs)
    const userContent = buildUserContent(text)
    let feedback = await generate(model, tier, system, userContent, TIER_LIMITS[tier].maxTokens)

    // ── Ethos backstop: one corrective retry, then fail safe ──
    if (feedback && await violatesEthos(feedback)) {
      const stricter = system + '\n\nCRITICAL REMINDER: Your previous attempt wrote new creative text for the writer, which is forbidden. Provide ONLY analysis and guidance — never rewrite or generate any of their creative content.'
      feedback = await generate(model, tier, stricter, userContent, TIER_LIMITS[tier].maxTokens)
      if (await violatesEthos(feedback)) {
        if (consumed) { await supabase.rpc('refund_critique', { p_user_id: consumed.userId, p_period: consumed.period }); consumed = null }
        return NextResponse.json({ error: 'The coach had trouble giving safe feedback. Please try again.' }, { status: 502 })
      }
    }
    if (!feedback) {
      if (consumed) { await supabase.rpc('refund_critique', { p_user_id: consumed.userId, p_period: consumed.period }); consumed = null }
      return NextResponse.json({ error: 'No feedback was generated. Please try again.' }, { status: 502 })
    }

    // Privacy promise: we do NOT persist the writer's work or the critique text.
    // The only server-side record is the anonymous monthly usage count (already
    // incremented by consume_critique). Nothing here is written to the database.
    return NextResponse.json({ feedback, tier, remaining: gate.remaining ?? null, model })
  } catch (err) {
    // Best-effort refund so a crash never silently eats a base-tier credit.
    if (consumed) { try { await supabase.rpc('refund_critique', { p_user_id: consumed.userId, p_period: consumed.period }) } catch {} }
    console.error('Critique error:', err)
    return NextResponse.json({ error: (err as Error).message || 'Something went wrong.' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
