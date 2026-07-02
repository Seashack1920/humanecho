// Voyage AI embeddings (voyage-3.5, 1024-dim) for the PD reference library.
const VOYAGE_MODEL = 'voyage-3.5'

export const isVoyageConfigured = () => !!process.env.VOYAGE_API_KEY

export async function embed(texts: string[], inputType: 'document' | 'query'): Promise<number[][]> {
  const key = process.env.VOYAGE_API_KEY
  if (!key) throw new Error('VOYAGE_API_KEY is not set.')
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ input: texts, model: VOYAGE_MODEL, input_type: inputType }),
  })
  if (!res.ok) throw new Error(`Voyage error ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  return (data.data || []).map((d: any) => d.embedding as number[])
}
