import { list, getDownloadUrl } from '@vercel/blob'

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

            // For public stores, b.url is directly accessible.
            // For private stores, we need a signed download URL.
            let fetchUrl = b.url
            try {
              const r = await fetch(b.url, { cache: 'no-store' })
              if (r.ok) {
                data = await r.json()
              } else if (r.status === 401 || r.status === 403) {
                // Private store — get a signed download URL
                fetchUrl = await getDownloadUrl(b.url)
                const r2 = await fetch(fetchUrl, { cache: 'no-store' })
                if (!r2.ok) return null
                data = await r2.json()
              } else {
                return null
              }
            } catch {
              // Network error — try signed URL as fallback
              try {
                fetchUrl = await getDownloadUrl(b.url)
                const r2 = await fetch(fetchUrl, { cache: 'no-store' })
                if (!r2.ok) return null
                data = await r2.json()
              } catch {
                return null
              }
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

            // For private stores, generate signed download URLs for slide images
            // so the browser can display them in <img> tags
            if (data.slideUrls?.length) {
              data.slideUrls = await Promise.all(
                data.slideUrls.map(async url => {
                  try {
                    // Try direct access first (public store)
                    const probe = await fetch(url, { method: 'HEAD' })
                    if (probe.ok) return url
                    // Private — get signed URL
                    return await getDownloadUrl(url)
                  } catch {
                    try { return await getDownloadUrl(url) } catch { return url }
                  }
                })
              )
            }

            if (data.thumbnailUrl) {
              try {
                const probe = await fetch(data.thumbnailUrl, { method: 'HEAD' })
                if (!probe.ok) {
                  data.thumbnailUrl = await getDownloadUrl(data.thumbnailUrl)
                }
              } catch {
                try { data.thumbnailUrl = await getDownloadUrl(data.thumbnailUrl) } catch {}
              }
            }

            if (data.reelUrl) {
              try {
                const probe = await fetch(data.reelUrl, { method: 'HEAD' })
                if (!probe.ok) {
                  data.reelUrl = await getDownloadUrl(data.reelUrl)
                }
              } catch {
                try { data.reelUrl = await getDownloadUrl(data.reelUrl) } catch {}
              }
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
