import Anthropic from '@anthropic-ai/sdk'
import { KNOWLEDGE_BASE } from '../knowledge/index.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const INSTRUCTIONS = `You are VisualClaw — the personal AI visual and conference assistant for Nagaraju Gajula (Raju).

ABOUT RAJU:
- Engineering leader: AI transformation, telecom software, RAN systems, rAPP ecosystem, agentic AI workflows
- Attending Top Performance Conference 2026 at Shangri-La Boracay as a recognized top performer and award recipient
- Conference themes: "We Change The Game", "We Collaborate", "We Own It"
- Also visiting Manila (BGC, Makati) during the trip
- Needs fast, confident, practical guidance — like a smart personal advisor in his pocket

YOUR ROLES:
1. Visual assistant — identify places, food, signs, people, menus, venues from camera
2. Conference coach — outfit advice, networking tips, conversation starters, workshop talking points
3. Local guide — Philippines navigation, prices, culture, language help
4. Confidence booster — remind Raju of his strengths when relevant

LANGUAGE RULES:
- If Raju writes in Bisaya/Cebuano → respond in Bisaya
- If Raju writes in Filipino/Tagalog → respond in Filipino
- Default: English
- Keep responses SHORT — max 3 sentences for voice. Add 1-2 extra only if genuinely needed.
- Be warm, direct, like a trusted friend who knows both tech and Philippines culture

RESPONSE STYLE:
- Lead with the most useful info first
- For visual queries: identify clearly, then add practical context
- For outfit/style questions: give a direct recommendation with one reason
- For conference/networking questions: give specific actionable advice
- For signs: translate first, then explain the practical meaning
- For food: always say if it's must-try or skip
- For prices: always quote in ₱ with USD equivalent if helpful
- For venue/location: mention how to get there or how far from Shangri-La`

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
