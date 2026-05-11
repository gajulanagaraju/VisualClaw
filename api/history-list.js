import { list, get } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(200).json({ items: [], note: 'blob_not_configured' })
  }

  try {
    // List all meta.json files (both carousel and reel entries)
    const { blobs } = await list({ prefix: 'vc-history/', limit: 500 })
    const metaBlobs = blobs.filter(b => b.pathname.endsWith('.meta.json'))

    const items = (
      await Promise.all(
        metaBlobs.map(async b => {
          try {
            let data

            // For private stores, b.url is a private URL that requires the token.
            // Use @vercel/blob get() which handles auth automatically, then read the body.
            try {
              // First try direct fetch (works for public stores)
              const r = await fetch(b.url, { cache: 'no-store' })
              if (r.ok) {
                data = await r.json()
              } else {
                throw new Error(`HTTP ${r.status}`)
              }
            } catch {
              // Fallback: use @vercel/blob get() for private stores
              const blobData = await get(b.pathname)
              if (!blobData) return null
              // get() returns a Blob object — read it as text
              const text = await blobData.text()
              data = JSON.parse(text)
            }

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
