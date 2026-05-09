import { del, list } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end()

  const key = req.headers['x-api-key'] || req.body?.apiKey
  if (process.env.GUIDE_UPDATE_KEY && key !== process.env.GUIDE_UPDATE_KEY) {
    return res.status(401).json({ error: 'Invalid API key' })
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Blob storage not configured' })
  }

  const { id } = req.body
  if (!id) return res.status(400).json({ error: 'Missing id' })

  try {
    const { blobs } = await list({ prefix: `vc-guide/${id}` })
    if (blobs.length > 0) await del(blobs.map(b => b.url))
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Guide delete error:', err?.message)
    res.status(500).json({ error: 'Delete failed' })
  }
}
