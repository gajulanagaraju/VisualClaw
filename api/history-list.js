import { list } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(200).json({ items: [], note: 'blob_not_configured' })
  }

  try {
    // List all blobs — for private stores, each blob object includes a `downloadUrl`
    // which is a pre-signed URL valid for ~1 hour. Use that to fetch the content.
    const { blobs } = await list({ prefix: 'vc-history/', limit: 500 })
    const metaBlobs = blobs.filter(b => b.pathname.endsWith('.meta.json'))

    const items = (
      await Promise.all(
        metaBlobs.map(async b => {
          try {
            // Use downloadUrl (pre-signed, works for both public and private stores)
            // Fall back to url if downloadUrl is not present (older SDK versions)
            const fetchUrl = b.downloadUrl || b.url
            const r = await fetch(fetchUrl, { cache: 'no-store' })
            if (!r.ok) return null
            const data = await r.json()
            if (!data) return null

            // ── Backwards compatibility: old entries stored thumbnail as base64
            // in the meta JSON under `thumbnail` field. New entries use `thumbnailUrl`.
            if (!data.thumbnailUrl && data.thumbnail) {
              data.thumbnailUrl = data.thumbnail
              delete data.thumbnail
            }

            // ── Backwards compatibility: old entries stored slides as base64
            // array in a separate .slides.json file referenced by `slidesUrl`.
            // New entries use `slideUrls` (array of CDN URLs).
            if (!data.slideUrls && data.slidesUrl) {
              data.legacySlidesUrl = data.slidesUrl
            }

            // Ensure type field exists
            if (!data.type) {
              data.type = data.reelUrl ? 'reel' : 'carousel'
            }

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
