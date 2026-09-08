// Standalone storefronts that ride Human Echo's Stripe + database + file storage
// but sit outside the Human Echo umbrella (own name, look, and URL). Each key is
// the URL slug at /store/<slug> AND the value stored in products.storefront.
//
// To add a store: add an entry here, then tag products with its slug in
// Admin → Shop. To rebrand one: edit its fields below.

export type Storefront = {
  slug: string
  name: string
  tagline: string
  blurb: string
  accent: string   // buttons / highlights
  ink: string      // headings / body text
  bg: string       // page background
  card: string     // product card background
}

export const STOREFRONTS: Record<string, Storefront> = {
  'kids-books': {
    slug: 'kids-books',
    name: 'Fugitive Poets Press',
    tagline: 'Picture books & stories for curious kids',
    blurb: 'Handmade books to read together — delivered straight to your device the moment you buy.',
    accent: '#e8743b',
    ink: '#2a2320',
    bg: '#fffaf2',
    card: '#ffffff',
  },
}

export const getStorefront = (slug: string): Storefront | null => STOREFRONTS[slug] || null
