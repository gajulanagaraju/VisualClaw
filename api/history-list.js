import { list } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(200).json({ items: [], note: 'blob_not_configured' })
  }

  try {
    const { blobs } = await list({ prefix: 'vc-history/', limit: 200 })
    const metaBlobs = blobs.filter(b => b.pathname.endsWith('.meta.json'))

    const items = (
      await Promise.all(
        metaBlobs.map(async b => {
          try {
            const r = await fetch(b.url, { cache: 'no-store' })
            const data = await r.json()
            return { ...data, _metaUrl: b.url }
          } catch { return null }
        })
      )
    )
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ items })
  } catch (err) {
    console.error('History list error:', err?.message)
    res.status(500).json({ error: 'Failed to load history' })
  }
}
