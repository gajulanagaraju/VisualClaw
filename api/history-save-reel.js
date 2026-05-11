import { put } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({
      error: 'Blob storage not configured. Add BLOB_READ_WRITE_TOKEN to your Vercel environment variables.',
    })
  }

  const { platform, eventName, caption, thumbnail, mimeType, reelBase64, createdAt } = req.body

  if (!reelBase64) return res.status(400).json({ error: 'No reel data provided' })

  const id = `reel_${Date.now()}`
  const ts = createdAt || new Date().toISOString()
  const ext = (mimeType || 'video/mp4').includes('webm') ? 'webm' : 'mp4'

  try {
    // ── 1. Upload the reel video file ─────────────────────────────────────────
    const reelBuf = Buffer.from(reelBase64, 'base64')
    const reelBlob = await put(
      `vc-history/${id}/reel.${ext}`,
      reelBuf,
      { access: 'public', contentType: mimeType || 'video/mp4', addRandomSuffix: false }
    )

    // ── 2. Upload thumbnail if provided ───────────────────────────────────────
    let thumbnailUrl = null
    if (thumbnail) {
      try {
        const thumbBase64 = thumbnail.split(',')[1]
        const thumbBuf = Buffer.from(thumbBase64, 'base64')
        const thumbBlob = await put(
          `vc-history/${id}/thumbnail.jpg`,
          thumbBuf,
          { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false }
        )
        thumbnailUrl = thumbBlob.url
      } catch (thumbErr) {
        console.warn('Reel thumbnail upload failed (non-fatal):', thumbErr?.message)
      }
    }

    // ── 3. Save meta JSON ─────────────────────────────────────────────────────
    const meta = {
      id,
      platform: platform || 'instagram',
      eventName: eventName || '',
      caption: (caption || '').slice(0, 800),
      createdAt: ts,
      thumbnailUrl,
      reelUrl: reelBlob.url,
      reelMimeType: mimeType || 'video/mp4',
      type: 'reel', // distinguish from carousel entries
    }

    await put(
      `vc-history/${id}.meta.json`,
      JSON.stringify(meta),
      { access: 'public', contentType: 'application/json', addRandomSuffix: false }
    )

    res.status(200).json({ success: true, id, reelUrl: reelBlob.url })
  } catch (err) {
    console.error('Reel save error:', err?.message)
    res.status(500).json({ error: `Reel save failed: ${err?.message || 'Check Blob storage is linked to this project.'}` })
  }
}
