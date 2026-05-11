import { put } from '@vercel/blob'

// Convert a base64 data URL to a Buffer
function dataUrlToBuffer(dataUrl) {
  const base64 = dataUrl.split(',')[1]
  return Buffer.from(base64, 'base64')
}

// Try public upload first; if the store is private, retry with access: 'private'
async function putAuto(path, data, opts) {
  try {
    return await put(path, data, { ...opts, access: 'public' })
  } catch (err) {
    if (
      err?.message?.includes('private store') ||
      err?.message?.includes('private access') ||
      err?.message?.includes('Cannot use public access')
    ) {
      // Store is configured as private — explicitly use access: 'private'
      return await put(path, data, { ...opts, access: 'private' })
    }
    throw err
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({
      error: 'Blob storage not configured. Add BLOB_READ_WRITE_TOKEN to your Vercel environment variables.',
      note: 'blob_not_configured',
    })
  }

  const { platform, eventName, caption, hashtags, slides, thumbnail, createdAt } = req.body

  if (!slides?.length) return res.status(400).json({ error: 'No slides provided' })

  const id = Date.now().toString()
  const ts = createdAt || new Date().toISOString()

  try {
    // ── 1. Upload each slide as an individual image file ──────────────────────
    // This avoids the 4.5 MB Vercel body limit that breaks base64-in-JSON storage
    const slideUrls = await Promise.all(
      slides.map(async (dataUrl, i) => {
        const buf = dataUrlToBuffer(dataUrl)
        const blob = await putAuto(
          `vc-history/${id}/slide_${String(i + 1).padStart(2, '0')}.jpg`,
          buf,
          { contentType: 'image/jpeg', addRandomSuffix: false }
        )
        return blob.url
      })
    )

    // ── 2. Upload thumbnail as a separate image file ──────────────────────────
    let thumbnailUrl = null
    if (thumbnail) {
      try {
        const thumbBuf = dataUrlToBuffer(thumbnail)
        const thumbBlob = await putAuto(
          `vc-history/${id}/thumbnail.jpg`,
          thumbBuf,
          { contentType: 'image/jpeg', addRandomSuffix: false }
        )
        thumbnailUrl = thumbBlob.url
      } catch (thumbErr) {
        console.warn('Thumbnail upload failed (non-fatal):', thumbErr?.message)
      }
    }

    // ── 3. Save a lightweight meta JSON (no base64 blobs inside) ─────────────
    const meta = {
      id,
      platform: platform || 'instagram',
      eventName: eventName || '',
      caption: (caption || '').slice(0, 800),
      hashtags: (hashtags || '').slice(0, 400),
      slideCount: slideUrls.length,
      createdAt: ts,
      thumbnailUrl,
      slideUrls,        // array of CDN URLs — tiny JSON, no base64
      type: 'carousel', // distinguish from reel entries
    }

    await putAuto(
      `vc-history/${id}.meta.json`,
      JSON.stringify(meta),
      { contentType: 'application/json', addRandomSuffix: false }
    )

    res.status(200).json({ success: true, id })
  } catch (err) {
    console.error('History save error:', err?.message)
    res.status(500).json({
      error: `Save failed: ${err?.message || 'Check Blob storage is linked to this project.'}`,
    })
  }
}
