import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CAROUSEL_PROMPT = (platform, eventName, tone) => `
You are VisualClaw's carousel creator for Nagaraju Gajula (Raju), an engineering leader attending the Top Performance Conference 2026 at Shangri-La Boracay.

TASK: Analyze the uploaded photos and create a polished social media carousel post.

PLATFORM: ${platform}
EVENT: ${eventName || 'Top Performance Conference 2026, Boracay Philippines'}
TONE: ${tone || 'Professional, warm, and confident. Humble yet proud.'}

PLATFORM RULES:
- LinkedIn: Professional, achievement-focused, 5-8 slides, leadership language, minimal emojis
- Instagram: Visual storytelling, warm personal tone, 6-10 slides, emojis welcome
- Facebook: Personal and friendly, 4-6 slides, family/friend tone
- WhatsApp: Short and direct, 3-5 slides, simple language

PRIVACY RULES:
- Do not reference specific internal company strategy or confidential data
- Do not include names of other people unless Raju approves
- Flag if any photo contains sensitive info (QR codes, badges with full details, private slides)

OUTPUT FORMAT — respond ONLY with valid JSON, no markdown, no extra text:

{
  "slideOrder": [0, 1, 2, 3, ...],
  "slides": [
    {
      "photoIndex": 0,
      "slideTitle": "Short title max 8 words",
      "slideCaption": "Short slide caption max 20 words",
      "layout": "cover|text-left|text-bottom|text-top|split",
      "privacyFlag": false
    }
  ],
  "fullCaption": "Complete platform-optimized post caption ready to copy and paste. Include relevant line breaks.",
  "hashtags": "#TopPerformance #Ericsson #Boracay #Leadership",
  "postTheme": "One line describing the story arc of this carousel",
  "coverSlideIndex": 0
}
`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { photos, platform, eventName, tone } = req.body

  if (!photos || photos.length === 0) {
    return res.status(400).json({ error: 'No photos provided' })
  }

  const photoCount = Math.min(photos.length, 10)

  try {
    const imageContent = photos.slice(0, photoCount).map((p, i) => ([
      {
        type: 'text',
        text: `Photo ${i + 1} of ${photoCount} (filename: ${p.name || `photo_${i + 1}`}):`,
      },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: p.mimeType || 'image/jpeg',
          data: p.base64,
        },
      },
    ])).flat()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: CAROUSEL_PROMPT(platform, eventName, tone),
            },
            ...imageContent,
            {
              type: 'text',
              text: `Analyze all ${photoCount} photos above and return the JSON carousel structure. The slideOrder array should index from 0 to ${photoCount - 1}. Only include photos that work well for the carousel — skip blurry or low-quality ones by noting in a "skipped" array.`,
            },
          ],
        },
      ],
    })

    const rawText = response.content[0].text.trim()
    // Strip markdown code blocks if Claude wraps the JSON
    const jsonText = rawText.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '')

    let carouselData
    try {
      carouselData = JSON.parse(jsonText)
    } catch {
      // If JSON parse fails return the raw text and let frontend handle it
      return res.status(200).json({ raw: rawText, error: 'Parse failed — raw response included' })
    }

    res.status(200).json(carouselData)
  } catch (err) {
    console.error('Carousel creation error:', err)
    res.status(500).json({ error: 'Carousel generation failed. Please try again.' })
  }
}
