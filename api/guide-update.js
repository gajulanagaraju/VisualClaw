import Anthropic from '@anthropic-ai/sdk'
import { put } from '@vercel/blob'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const RESEARCH_PROMPT = `You are VisualClaw's Guide assistant for Nagaraju Gajula (Raju) at Top Performance Conference 2026, Shangri-La Boracay.

Raju is an engineering leader focused on: AI transformation, agentic AI workflows, telecom software, RAN systems, rAPP ecosystem, cross-functional execution.

A topic has been submitted for research. Turn it into ONE of:
- A "talking_point": a confident 30-45 second pitch Raju can deliver in conference conversations
- A "conversation_starter": a sharp opener or follow-up question Raju can use on this topic

Rules:
- Make it specific to Raju's real work and the TPC 2026 conference context
- Talking point format: first-person, confident, ends with an invitation to discuss
- Conversation starter format: a question that makes the other person feel interesting and opens a real exchange
- Short and punchy — no jargon overload

Respond ONLY with valid JSON, no markdown:
{
  "type": "talking_point" | "conversation_starter",
  "title": "3-5 word label",
  "text": "The actual text Raju would say or ask"
}`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // API key auth — any external system (OpenClaw, n8n, WhatsApp relay) must provide this
  const key = req.headers['x-api-key'] || req.body?.apiKey
  if (process.env.GUIDE_UPDATE_KEY && key !== process.env.GUIDE_UPDATE_KEY) {
    return res.status(401).json({ error: 'Invalid API key' })
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Blob storage not configured' })
  }

  const { section, title, text, rawTopic, source, day, category } = req.body

  if (!rawTopic && (!title || !text)) {
    return res.status(400).json({ error: 'Provide rawTopic (to research) or both title + text' })
  }

  let finalTitle = title
  let finalText = text
  let finalSection = section || 'talking_points'

  // If only a raw topic is provided, call Claude Haiku to research + format it
  if (rawTopic && !text) {
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `${RESEARCH_PROMPT}\n\nTopic to research: "${rawTopic}"\nPreferred section: ${section || 'talking_points'}`,
        }],
      })

      const raw = response.content[0].text.trim()
      const jsonText = raw.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '')
      const parsed = JSON.parse(jsonText)

      finalTitle = parsed.title || rawTopic.slice(0, 40)
      finalText = parsed.text
      finalSection = parsed.type === 'conversation_starter' ? 'conversations' : 'talking_points'
    } catch (err) {
      console.error('Research error:', err?.message)
      // Fallback: store the raw topic as-is
      finalTitle = rawTopic.slice(0, 50)
      finalText = rawTopic
    }
  }

  const id = Date.now().toString()
  const item = {
    id,
    section: finalSection,
    title: finalTitle,
    text: finalText,
    rawTopic: rawTopic || null,
    source: source || 'api',
    day: day || null,
    category: category || null,
    createdAt: new Date().toISOString(),
  }

  try {
    await put(
      `vc-guide/${id}.json`,
      JSON.stringify(item),
      { access: 'public', contentType: 'application/json', addRandomSuffix: false }
    )

    res.status(200).json({ success: true, id, title: finalTitle, text: finalText, section: finalSection })
  } catch (err) {
    console.error('Guide save error:', err?.message)
    res.status(500).json({ error: 'Save failed' })
  }
}
