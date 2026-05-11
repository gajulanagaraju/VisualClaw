// Proxy endpoint to serve private Vercel Blob images/videos to the browser.
// The browser cannot access private blob URLs directly (they return 403).
// This endpoint fetches the blob server-side using the token and streams it back.

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return res.status(503).json({ error: 'Blob storage not configured' })

  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'Missing url parameter' })

  // Security: only allow URLs from our private blob store domain
  let blobUrl
  try {
    blobUrl = decodeURIComponent(url)
    const parsed = new URL(blobUrl)
    if (!parsed.hostname.endsWith('.blob.vercel-storage.com') &&
        !parsed.hostname.endsWith('.private.blob.vercel-storage.com')) {
      return res.status(403).json({ error: 'URL not from allowed domain' })
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  try {
    const upstream = await fetch(blobUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Blob fetch failed: ${upstream.status}` })
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    const contentLength = upstream.headers.get('content-length')

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'private, max-age=3600') // cache for 1 hour
    if (contentLength) res.setHeader('Content-Length', contentLength)

    // Stream the response body
    const buffer = await upstream.arrayBuffer()
    res.status(200).send(Buffer.from(buffer))
  } catch (err) {
    console.error('Proxy error:', err?.message)
    res.status(500).json({ error: 'Failed to proxy blob' })
  }
}
