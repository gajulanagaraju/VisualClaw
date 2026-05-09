import { list } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(200).json({ items: [] })
  }

  try {
    const { blobs } = await list({ prefix: 'vc-guide/', limit: 100 })

    const items = (
      await Promise.all(
        blobs.map(async b => {
          try {
            const r = await fetch(b.url, { cache: 'no-store' })
            return await r.json()
          } catch { return null }
        })
      )
    )
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ items })
  } catch (err) {
    console.error('Guide items error:', err?.message)
    res.status(500).json({ error: 'Failed to load guide items' })
  }
}
