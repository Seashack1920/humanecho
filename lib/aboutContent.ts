// About / Ethos content. The live page reads this from site_settings
// (key 'about_content') via the admin editor; this is the default/fallback.
// Bodies use blank lines to separate paragraphs.

export type AboutSection = { label: string; title: string; body: string }
export type AboutContent = {
  hero: { eyebrow: string; title: string; subhead: string }
  sections: AboutSection[]
  cta: { title: string; body: string }
}

export const DEFAULT_ABOUT: AboutContent = {
  hero: {
    eyebrow: 'Our Ethos',
    title: 'Human lyrics, brought to life.',
    subhead:
      'Human Echo is a curated home for songs that begin with a human lyric — something real, worth saying — and are brought to life with the most advanced music, image and video technologies in the world. A members’ place, made with care, where every song opens into a larger story.',
  },
  sections: [
    {
      label: 'What We Believe',
      title: 'It starts with a lyric.',
      body:
        'Everything here begins with a human being writing something true. A line that earns its place. A verse that means something. That’s the part no technology replaces, and it’s the part we build everything else around.\n\n' +
        'Then we bring it to life — with original music, striking imagery, and performers who give each song a face and a world — using the best creative technology available today. The words are human. The experience is everything.\n\n' +
        'That’s the name: Human Echo — the human voice, amplified and echoed through whatever brings the art fully alive.',
    },
    {
      label: 'A Curated World',
      title: 'Not an infinite feed. A place with a point of view.',
      body:
        'We’re not trying to host everything. Human Echo is curated on purpose — a smaller, richer catalog where every release is given real attention instead of being lost in an endless scroll.\n\n' +
        'Membership is what keeps it that way. It funds the craft, keeps the experience uncluttered, and means the people making this answer to you — not to an algorithm or an advertiser. You’re not renting access to ten million tracks you’ll never hear; you’re joining a world that was made to be spent time in.',
    },
    {
      label: 'The World Behind the Song',
      title: 'Every song is a doorway.',
      body:
        'An artist here is more than a name on a track. Many are recurring characters — with their own look, their own voice, their own story that deepens release after release. You come to know them.\n\n' +
        'And a song is rarely just a song. It’s the lyric, the music video, the story behind how it was made, the images and the world it belongs to. Some songs are simply great songs, and that’s enough. Others are a glimpse of something much bigger — and if you want to follow that thread, it’s there.',
    },
    {
      label: 'Honest About How It’s Made',
      title: 'We don’t hide the tools. We’re proud of them.',
      body:
        'Every release carries a clear label — 100% Human, Human + AI, or AI Generated. Not as a disclaimer, but as a declaration. The lyric is human; the life around it is made with the most advanced technology there is. We think you deserve to know exactly what you’re experiencing — and we think both halves are worth celebrating.',
    },
    {
      label: 'Our Origins',
      title: 'An experiment in adaptation.',
      body:
        'Human Echo began with experiments in audio drama — writers who noticed that, for a lot of people, audio and visual media have quietly taken the place the written page used to hold.\n\n' +
        'We love books. But we also love what happens when text is brought to life: a lyric carried by music, a character and a story given form through image and video. That’s where we find ourselves now — human creative expression that starts with writing, made more accessible, and more alive, through media.\n\n' +
        'We don’t pretend to know where the AI era will take us, as artists or as audiences. But artists have always adapted, and we believe they should. Human Echo is our experiment in adaptation.',
    },
  ],
  cta: {
    title: 'Come in and stay a while.',
    body:
      'Discover songs and stories you won’t find anywhere else, go deep into an artist’s world, and support work made with genuine care.',
  },
}

// Merge stored content (possibly partial) over the defaults so the page is never
// broken by a missing field.
export function mergeAbout(stored: any): AboutContent {
  if (!stored || typeof stored !== 'object') return DEFAULT_ABOUT
  return {
    hero: { ...DEFAULT_ABOUT.hero, ...(stored.hero || {}) },
    sections: Array.isArray(stored.sections) && stored.sections.length ? stored.sections : DEFAULT_ABOUT.sections,
    cta: { ...DEFAULT_ABOUT.cta, ...(stored.cta || {}) },
  }
}
