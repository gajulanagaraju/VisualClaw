import { put } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Blob storage not configured. Enable Vercel Blob in the project dashboard.' })
  }

  const { platform, eventName, caption, hashtags, slides, thumbnail, createdAt } = req.body

  if (!slides?.length) return res.status(400).json({ error: 'No slides provided' })

  const id = Date.now().toString()
  const ts = createdAt || new Date().toISOString()

  try {
    const slidesBlob = await put(
      `vc-history/${id}.slides.json`,
      JSON.stringify({ slides }),
      { access: 'public', contentType: 'application/json', addRandomSuffix: false }
    )

    const meta = {
      id,
      platform: platform || 'instagram',
      eventName: eventName || '',
      caption: (caption || '').slice(0, 600),
      hashtags: hashtags || '',
      slideCount: slides.length,
      createdAt: ts,
      thumbnail,
      slidesUrl: slidesBlob.url,
    }

    await put(
      `vc-history/${id}.meta.json`,
      JSON.stringify(meta),
      { access: 'public', contentType: 'application/json', addRandomSuffix: false }
    )

    res.status(200).json({ success: true, id })
  } catch (err) {
    console.error('History save error:', err?.message)
    res.status(500).json({ error: 'Save failed. Check Blob storage is linked to this project.' })
  }
}
