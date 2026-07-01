import Anthropic from '@anthropic-ai/sdk'

// Placeholder fallback keeps Vercel builds from throwing when the key isn't set
// at build time (matches the pattern used for Stripe/Supabase clients).
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'sk-ant-placeholder',
})

// Base tier (5 free/month) runs on Sonnet 4.6; Creator+ / Revisionist run on
// Opus 4.8 for the deepest analysis. The ethos guard is a cheap Haiku pass.
export const MODELS = {
  base: 'claude-sonnet-4-6',
  paid: 'claude-opus-4-8',
  guard: 'claude-haiku-4-5',
} as const

export type CritiqueTier = 'base' | 'creator_plus' | 'revisionist'
