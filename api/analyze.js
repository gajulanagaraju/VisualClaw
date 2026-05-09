import Anthropic from '@anthropic-ai/sdk'
import { KNOWLEDGE_BASE } from '../knowledge/index.js'
import { cameraScenes } from '../knowledge/camera-scenes.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Full instructions for Sonnet (conference/advice queries)
const SONNET_INSTRUCTIONS = `You are VisualClaw — Raju's personal AI advisor for Top Performance Conference 2026, Shangri-La Boracay.

ABOUT RAJU: Engineering leader, AI transformation, telecom/RAN/rAPP, award recipient at TPC 2026, also visiting Manila.

YOUR ROLES: Conference coach, outfit advisor, networking strategist, local Philippines guide, visual identifier.

LANGUAGE: Bisaya input → reply Bisaya. Filipino input → reply Filipino. Default: English.
RESPONSE: Max 3 sentences for voice. Direct, warm, actionable. Lead with the most useful info.
- Outfit: direct recommendation + one reason
- Networking: specific actionable advice
- Conference: use Raju's real work examples (AI workflows, rAPP, agentic systems)
- Signs: translate first, then practical meaning
- Food: always say must-try or skip`

// Compact instructions for Haiku (visual identification queries)
const HAIKU_INSTRUCTIONS = `You are VisualClaw — a visual assistant for Raju at Top Performance Conference 2026 in Boracay, Philippines.

Identify what's in the image quickly and accurately. Use the VISUAL KNOWLEDGE provided.
- Food: name it, say must-try or skip, one key flavor note
- Signs: translate first, then practical meaning
- Places/venues: identify and mention practical relevance to Raju's stay
- People/scenes: describe helpfully and briefly

Language: Bisaya input → Bisaya reply. Default: English.
Response: 2-3 sentences MAX. Direct and useful. No fluff.`

// Classify query to route to cheapest capable model
function classifyQuery(question) {
  if (!question || question.trim().length === 0) return 'simple'

  const q = question.toLowerCase()

  const complexPatterns = [
    'outfit', 'wear', 'dress', 'conference', 'networking', 'talk to', 'speech',
    'award', 'should i', 'advice', 'recommend', 'strategy', 'approach',
    'workshop', 'introduce', 'conversation', 'impress', 'impression',
    'how do i', 'what should', 'help me', 'prepare', 'present',
  ]

  const isComplex = complexPatterns.some(p => q.includes(p))
  if (isComplex) return 'complex'

  // Anything that's just a visual lookup
  return 'simple'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, mimeType, question } = req.body

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image provided' })
  }

  const queryType = classifyQuery(question)

  try {
    let response

    if (queryType === 'simple') {
      // HAIKU — fast, cheap, great at visual identification
      // No 8500-token knowledge base — just the camera-specific visual reference
      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        system: [
          { type: 'text', text: HAIKU_INSTRUCTIONS },
          {
            type: 'text',
            text: cameraScenes,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: imageBase64 },
              },
              {
                type: 'text',
                text: question || 'What is this? Give me the most useful info in 2 sentences.',
              },
            ],
          },
        ],
      })
    } else {
      // SONNET — full conference intelligence, used only for advice/strategy queries
      // Knowledge base prompt-cached: ~80% cheaper on cache hits (5-min TTL)
      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 250,
        system: [
          { type: 'text', text: SONNET_INSTRUCTIONS },
          {
            type: 'text',
            text: `## FULL KNOWLEDGE BASE\n\n${KNOWLEDGE_BASE}`,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: imageBase64 },
              },
              {
                type: 'text',
                text: question,
              },
            ],
          },
        ],
      })
    }

    const answer = response.content[0].text
    const cacheInfo = response.usage
      ? {
          model: queryType === 'simple' ? 'haiku' : 'sonnet',
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
