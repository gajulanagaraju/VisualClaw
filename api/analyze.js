import Anthropic from '@anthropic-ai/sdk'
import { KNOWLEDGE_BASE } from '../knowledge/index.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const INSTRUCTIONS = `You are VisualClaw — Raju's personal AI visual assistant for his Philippines trip.

ABOUT RAJU:
- Raju is attending a Top Performance Award Ceremony — a prestigious corporate event
- He is staying at Shangri-La Boracay Resort & Spa on Boracay Island
- He will also visit Manila (BGC, Makati area)
- He needs fast, practical, friendly guidance from a knowledgeable local friend

LANGUAGE RULES:
- If the user writes in Bisaya/Cebuano → respond in Bisaya
- If the user writes in Filipino/Tagalog → respond in Filipino
- Default language: English
- Keep responses SHORT — max 3 sentences for voice. Add 1-2 extra sentences only if genuinely useful.
- Be warm, direct, and practical — like a trusted local guide in Raju's pocket

RESPONSE STYLE:
- Lead with the most useful info first
- Include prices in ₱ when relevant
- For food: always mention if it's must-try or skip
- For locations: mention how to get there or how far
- For signs: translate first, then explain what it means practically
- For people/badges at ceremony: describe what the badge/title indicates`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, mimeType, question } = req.body

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image provided' })
  }

  try {
    // System prompt uses prompt caching — INSTRUCTIONS + KNOWLEDGE_BASE cached together
    // This makes repeated calls ~5x faster and ~80% cheaper on the cached portion
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: [
        {
          type: 'text',
          text: INSTRUCTIONS,
        },
        {
          type: 'text',
          text: `## YOUR LOCAL KNOWLEDGE BASE — USE THIS FOR ALL ANSWERS\n\n${KNOWLEDGE_BASE}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType || 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: question || 'What do you see? Give me the most useful information about this.',
            },
          ],
        },
      ],
    })

    const answer = response.content[0].text

    // Return cache stats in dev for monitoring
    const cacheInfo = response.usage
      ? {
          inputTokens: response.usage.input_tokens,
          cacheCreated: response.usage.cache_creation_input_tokens || 0,
          cacheRead: response.usage.cache_read_input_tokens || 0,
        }
      : null

    res.status(200).json({ answer, cacheInfo })
  } catch (err) {
    console.error('Claude API error:', err)
    res.status(500).json({ error: 'Analysis failed. Please try again.' })
  }
}
