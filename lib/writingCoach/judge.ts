// First-pass editorial judging for Human Echo story contests. The AI produces a
// consistent, structured triage assessment; human curators make every final call.

export const CRITERIA = [
  'originality', 'craft_quality', 'thematic_depth', 'moral_clarity', 'authenticity', 'emotional_resonance',
] as const

export const JUDGE_SYSTEM = `You are an experienced editorial judge for the Human Echo Unearthed Collective, doing a FIRST-PASS assessment of a contest submission. Your job is a fair, consistent triage read that helps human curators focus their time — humans make every final decision.

Evaluate the submitted story and score each of these 1–10 (10 = exceptional):
- originality — freshness of idea, voice, and approach
- craft_quality — prose, structure, control of the form
- thematic_depth — meaning, resonance, what it's really about
- moral_clarity — a coherent moral/emotional center (not preachiness)
- authenticity — lived-in, human, genuine (not derivative or hollow)
- emotional_resonance — does it move the reader

Then provide: an overall score (roughly the average, one decimal, 1–10), key strengths, major weaknesses, a recommendation, a brief rationale tied to SPECIFIC moments in the text, and flags for any issues (e.g. derivative, lacks soul, technical problems, off-theme, over the word limit).

Recommendation must be exactly one of: "Strong Accept", "Accept", "Hold for Review", "Reject".

Human Echo's ethos: prioritize authentic human voice, lived experience, moral clarity, and genuine creativity. Be honest but respectful.

CRITICAL: You are ASSESSING only. Do NOT rewrite, continue, or generate any story text, dialogue, or prose. Feedback and evaluation only.`

export const JUDGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['scores', 'overall', 'recommendation', 'strengths', 'weaknesses', 'flags', 'rationale'],
  properties: {
    scores: {
      type: 'object',
      additionalProperties: false,
      required: [...CRITERIA],
      properties: Object.fromEntries(CRITERIA.map(c => [c, { type: 'integer' }])),
    },
    overall: { type: 'number' },
    recommendation: { type: 'string', enum: ['Strong Accept', 'Accept', 'Hold for Review', 'Reject'] },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    flags: { type: 'array', items: { type: 'string' } },
    rationale: { type: 'string' },
  },
}

export function buildJudgeUser(opts: { contestTitle?: string; contestDesc?: string; wordLimit?: number | null; title: string; body: string }): string {
  const ctx: string[] = []
  if (opts.contestTitle) ctx.push(`Contest: "${opts.contestTitle}".`)
  if (opts.contestDesc) ctx.push(`Contest brief: ${opts.contestDesc}`)
  if (opts.wordLimit) ctx.push(`Word limit: ${opts.wordLimit}.`)
  const header = ctx.length ? ctx.join(' ') + '\n\n' : ''
  return `${header}Submission title: "${opts.title}"\n\n----- BEGIN SUBMISSION -----\n${opts.body}\n----- END SUBMISSION -----`
}

// Safeguard: the AI never auto-accepts or auto-rejects. Anything promising OR
// borderline goes to human_review; only a clear low-scoring reject is filtered.
export function statusFromJudgment(recommendation: string, overall: number): 'human_review' | 'ai_filtered' {
  const promising = recommendation !== 'Reject' || Number(overall) >= 6
  return promising ? 'human_review' : 'ai_filtered'
}
