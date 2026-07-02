// TEMPORARY DIAGNOSTIC — reports the SHAPE of ANTHROPIC_API_KEY without ever
// returning the secret itself. Remove once the key is confirmed working.
export async function GET() {
  const k = process.env.ANTHROPIC_API_KEY || ''
  return Response.json({
    present: !!process.env.ANTHROPIC_API_KEY,          // false => wrong var name or not on Production
    is_placeholder: k === 'sk-ant-placeholder',        // true  => Vercel isn't injecting the value at runtime
    length: k.length,                                  // a real key is ~100+ chars
    starts_with_sk_ant: k.startsWith('sk-ant-'),       // false => wrong/partial value
    has_whitespace: /\s/.test(k),                      // true  => stray space/newline in the value
    contains_label: k.toLowerCase().includes('x-api-key'), // true => the "x-api-key:" label got pasted in
  })
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
