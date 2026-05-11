import { list } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'No BLOB_READ_WRITE_TOKEN' })
  }

  try {
    const result = await list({ prefix: 'vc-history/', limit: 10 })
    
    // Return raw blob metadata so we can see what fields are available
    const blobMeta = result.blobs.map(b => ({
      pathname: b.pathname,
      url: b.url,
      downloadUrl: b.downloadUrl,
      size: b.size,
      uploadedAt: b.uploadedAt,
      hasDownloadUrl: !!b.downloadUrl,
      urlAccessible: null, // will test below
    }))

    // Test if the first meta.json URL is accessible
    const metaBlobs = result.blobs.filter(b => b.pathname.endsWith('.meta.json'))
    const testResults = await Promise.all(
      metaBlobs.slice(0, 3).map(async b => {
        const tests = {}
        
        // Test direct URL
        try {
          const r = await fetch(b.url, { cache: 'no-store' })
          tests.directUrl = { status: r.status, ok: r.ok }
          if (r.ok) {
            const text = await r.text()
            tests.directUrlContent = text.slice(0, 100)
          }
        } catch(e) {
          tests.directUrl = { error: e.message }
        }

        // Test downloadUrl if present
        if (b.downloadUrl) {
          try {
            const r = await fetch(b.downloadUrl, { cache: 'no-store' })
            tests.downloadUrl = { status: r.status, ok: r.ok }
            if (r.ok) {
              const text = await r.text()
              tests.downloadUrlContent = text.slice(0, 100)
            }
          } catch(e) {
            tests.downloadUrl = { error: e.message }
          }
        }

        return { pathname: b.pathname, tests }
      })
    )

    res.status(200).json({
      totalBlobs: result.blobs.length,
      metaJsonCount: metaBlobs.length,
      blobMeta: blobMeta.slice(0, 5),
      testResults,
    })
  } catch (err) {
    res.status(500).json({ error: err?.message, stack: err?.stack?.slice(0, 500) })
  }
}
