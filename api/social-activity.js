// api/social-activity.js
// Fetches recent social media activity for a TPC 2026 winner
// Uses built-in LinkedIn and Twitter APIs via Manus API Hub

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Generate LinkedIn search URL for a person at Ericsson
function linkedInSearchUrl(name) {
  const q = encodeURIComponent(`${name} Ericsson`)
  return `https://www.linkedin.com/search/results/people/?keywords=${q}`
}

// Generate Twitter/X search URL for a person
function twitterSearchUrl(name) {
  const q = encodeURIComponent(`"${name}" Ericsson`)
  return `https://twitter.com/search?q=${q}&f=user`
}

// Generate Instagram search URL
function instagramSearchUrl(name) {
  const q = encodeURIComponent(name.replace(/\s+/g, '').toLowerCase())
  return `https://www.instagram.com/${q}/`
}

// Try to find LinkedIn username via Google-style search using the LinkedIn API
async function findLinkedInProfile(name) {
  try {
    const { default: fetch } = await import('node-fetch')
    // Use LinkedIn people search via the Manus API Hub
    const apiUrl = `https://api.manus.im/v1/LinkedIn/search_people?keywords=${encodeURIComponent(name + ' Ericsson')}&count=3`
    // We'll use the built-in data_api approach via a subprocess call
    return null // Will be handled client-side
  } catch {
    return null
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { name, linkedinUsername, twitterUsername } = req.query

  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }

  const result = {
    name,
    searchUrls: {
      linkedin: linkedInSearchUrl(name),
      twitter: twitterSearchUrl(name),
      instagram: instagramSearchUrl(name),
    },
    linkedin: null,
    twitter: null,
    fetchedAt: new Date().toISOString(),
  }

  // ── LinkedIn: fetch profile if username provided ──────────────────────────
  if (linkedinUsername) {
    try {
      const { execSync } = require('child_process')
      const script = `
import sys
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient
import json
client = ApiClient()
try:
  data = client.call_api('LinkedIn/get_user_profile_by_username', query={'username': '${linkedinUsername}'})
  print(json.dumps(data))
except Exception as e:
  print(json.dumps({'error': str(e)}))
`
      const output = execSync(`python3 -c "${script.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, {
        timeout: 10000,
        encoding: 'utf-8',
      }).trim()
      const data = JSON.parse(output)
      if (!data.error) {
        result.linkedin = {
          username: linkedinUsername,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          headline: data.headline || '',
          profileUrl: `https://www.linkedin.com/in/${linkedinUsername}`,
          profilePicture: data.profilePicture || null,
          summary: data.summary || '',
          isPremium: data.isPremium || false,
          isTopVoice: data.isTopVoice || false,
          followers: data.followersCount || 0,
        }
      }
    } catch (e) {
      result.linkedin = { error: 'Profile fetch failed', profileUrl: `https://www.linkedin.com/in/${linkedinUsername}` }
    }
  }

  // ── Twitter/X: fetch recent tweets if username provided ───────────────────
  if (twitterUsername) {
    try {
      const { execSync } = require('child_process')

      // Step 1: Get user ID from username
      const userScript = `
import sys
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient
import json
client = ApiClient()
try:
  data = client.call_api('Twitter/get_user_by_username', query={'username': '${twitterUsername}'})
  print(json.dumps(data))
except Exception as e:
  print(json.dumps({'error': str(e)}))
`
      const userOutput = execSync(`python3 -c "${userScript.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, {
        timeout: 10000,
        encoding: 'utf-8',
      }).trim()
      const userData = JSON.parse(userOutput)

      // Extract user rest_id
      let userId = null
      if (userData?.data?.user?.result?.rest_id) {
        userId = userData.data.user.result.rest_id
      } else if (userData?.result?.rest_id) {
        userId = userData.result.rest_id
      }

      if (userId) {
        // Step 2: Get recent tweets
        const tweetsScript = `
import sys
sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient
import json
client = ApiClient()
try:
  data = client.call_api('Twitter/get_user_tweets', query={'user': '${userId}', 'count': '10'})
  print(json.dumps(data))
except Exception as e:
  print(json.dumps({'error': str(e)}))
`
        const tweetsOutput = execSync(`python3 -c "${tweetsScript.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, {
          timeout: 15000,
          encoding: 'utf-8',
        }).trim()
        const tweetsData = JSON.parse(tweetsOutput)

        // Parse tweets from Twitter API v2 structure
        const tweets = []
        const timeline = tweetsData?.result?.timeline || tweetsData?.data?.user?.result?.timeline_v2
        if (timeline) {
          const instructions = timeline?.timeline?.instructions || []
          for (const instruction of instructions) {
            if (instruction.type === 'TimelineAddEntries') {
              for (const entry of (instruction.entries || [])) {
                if (entry.entryId?.startsWith('tweet-')) {
                  const tweetResult = entry?.content?.itemContent?.tweet_results?.result
                  if (tweetResult) {
                    const legacy = tweetResult.legacy || {}
                    const createdAt = legacy.created_at ? new Date(legacy.created_at) : null
                    // Only include tweets from last 7 days
                    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    if (createdAt && createdAt > sevenDaysAgo) {
                      tweets.push({
                        id: legacy.id_str || tweetResult.rest_id,
                        text: legacy.full_text || '',
                        createdAt: legacy.created_at,
                        likes: legacy.favorite_count || 0,
                        retweets: legacy.retweet_count || 0,
                        replies: legacy.reply_count || 0,
                        url: `https://twitter.com/${twitterUsername}/status/${legacy.id_str || tweetResult.rest_id}`,
                        isRetweet: !!legacy.retweeted_status_result,
                        hasMedia: !!(legacy.entities?.media?.length),
                      })
                    }
                  }
                }
              }
            }
          }
        }

        // Get user profile info
        const userResult = userData?.data?.user?.result || userData?.result
        const userLegacy = userResult?.legacy || {}

        result.twitter = {
          username: twitterUsername,
          displayName: userLegacy.name || twitterUsername,
          profileUrl: `https://twitter.com/${twitterUsername}`,
          profilePicture: userLegacy.profile_image_url_https?.replace('_normal', '_400x400') || null,
          followers: userLegacy.followers_count || 0,
          verified: userLegacy.verified || false,
          recentTweets: tweets.slice(0, 5),
        }
      }
    } catch (e) {
      result.twitter = {
        error: 'Tweet fetch failed',
        profileUrl: `https://twitter.com/${twitterUsername}`,
      }
    }
  }

  // Cache for 30 minutes
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600')
  return res.status(200).json(result)
}
