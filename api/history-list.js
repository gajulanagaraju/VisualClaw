import { list } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return res.status(200).json({ items: [], note: 'blob_not_configured' })
  }

  try {
    // List all blobs in the history prefix
    const { blobs } = await list({ prefix: 'vc-history/', limit: 500 })
    const metaBlobs = blobs.filter(b => b.pathname.endsWith('.meta.json'))

    const items = (
      await Promise.all(
        metaBlobs.map(async b => {
          try {
            // Private blobs require Authorization: Bearer <token> to access.
            // The BLOB_READ_WRITE_TOKEN is available server-side so we can
            // fetch the blob content directly using the auth header.
            const r = await fetch(b.url, {
              cache: 'no-store',
              headers: { Authorization: `Bearer ${token}` },
            })
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

            // For private stores, the slideUrls, thumbnailUrl, and reelUrl
            // are private blob URLs that the browser cannot access directly.
            // We need to proxy them through our own API or generate signed URLs.
            // For now, we pass them through — the History UI will use the
            // /api/history-proxy endpoint to serve these images.
            return { ...data, _metaUrl: b.url, _isPrivate: true }
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
