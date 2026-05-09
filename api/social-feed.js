// Social feed: searches Twitter/X and Instagram via Apify actors
// Set APIFY_TOKEN env var to enable live data. Falls back to curated demo posts.

const SEARCH_TERMS = [
  'Ericsson Top Performance Conference 2026',
  'Shangri-La Boracay conference',
  'Boracay conference 2026',
  '#TopPerformance Ericsson',
]

const DEMO_POSTS = [
  {
    id: 'demo1',
    platform: 'twitter',
    username: '@EricssonGlobal',
    displayName: 'Ericsson',
    avatar: 'E',
    avatarColor: '#0082F0',
    text: 'Celebrating our top performers from around the world at the Top Performance Conference 2026 in Boracay! 🏆🌊 Proud of every individual who earned this recognition. #TopPerformance #Ericsson',
    time: '2h ago',
    likes: 342,
    retweets: 87,
    image: null,
    url: '#',
    verified: true,
  },
  {
    id: 'demo2',
    platform: 'instagram',
    username: '@shangrila_boracay',
    displayName: 'Shangri-La Boracay',
    avatar: 'S',
    avatarColor: '#8B6914',
    text: 'We are honored to host Ericsson\'s Top Performance Conference 2026. Welcome to paradise! The Punta Bunga beach is ready for an unforgettable experience. 🌺 #ShangriLaBoracay #TopPerformance2026',
    time: '4h ago',
    likes: 1289,
    retweets: 0,
    image: null,
    url: '#',
    verified: true,
  },
  {
    id: 'demo3',
    platform: 'linkedin',
    username: 'linkedin.com',
    displayName: 'Engineering Leader',
    avatar: 'L',
    avatarColor: '#0A66C2',
    text: 'Arrived in Boracay for the Ericsson Top Performance Conference 2026. Incredible to be surrounded by global leaders and innovators at Shangri-La. Day 1 is already full of energy and great conversations. Looking forward to the workshops and award ceremony. 🌟 #Ericsson #TopPerformers #Leadership',
    time: '6h ago',
    likes: 458,
    retweets: 0,
    image: null,
    url: '#',
    verified: false,
  },
  {
    id: 'demo4',
    platform: 'twitter',
    username: '@EricssonTech',
    displayName: 'Ericsson Technology',
    avatar: 'T',
    avatarColor: '#0082F0',
    text: 'AI transformation, agentic workflows, and engineering acceleration — the conversations at #TPC2026 are setting the direction for the next wave of telecom innovation. Exciting times ahead! 🚀 #Ericsson #AITransformation',
    time: '8h ago',
    likes: 213,
    retweets: 45,
    image: null,
    url: '#',
    verified: true,
  },
  {
    id: 'demo5',
    platform: 'instagram',
    username: '@boracay_official',
    displayName: 'Boracay Tourism',
    avatar: 'B',
    avatarColor: '#00B4D8',
    text: 'White Beach glowing at sunset as Ericsson leaders gather at Shangri-La for the Top Performance Conference. Boracay is proud to welcome the world\'s best. 🏝️🌅 #Boracay #Philippines #TopPerformance2026',
    time: '10h ago',
    likes: 2341,
    retweets: 0,
    image: null,
    url: '#',
    verified: true,
  },
  {
    id: 'demo6',
    platform: 'linkedin',
    username: 'linkedin.com',
    displayName: 'Senior Director',
    avatar: 'D',
    avatarColor: '#0A66C2',
    text: 'The "We Own It" culture theme at Ericsson TPC2026 resonates deeply. Taking ownership, driving results before being asked, and building proof of concepts early — this is how we change the game. Proud to be part of this incredible team. #WeOwnIt #Ericsson #TPC2026',
    time: '12h ago',
    likes: 612,
    retweets: 0,
    image: null,
    url: '#',
    verified: false,
  },
  {
    id: 'demo7',
    platform: 'twitter',
    username: '@PhilippinesTour',
    displayName: 'Philippines Tourism',
    avatar: 'P',
    avatarColor: '#0038A8',
    text: 'Boracay welcomes Ericsson\'s global top performers this week! White Beach + Shangri-La Resort = the perfect backdrop for celebrating excellence 🇵🇭🏆 #Boracay #Philippines #Ericsson',
    time: '1d ago',
    likes: 876,
    retweets: 198,
    image: null,
    url: '#',
    verified: true,
  },
  {
    id: 'demo8',
    platform: 'instagram',
    username: '@shangrila_boracay',
    displayName: 'Shangri-La Boracay',
    avatar: 'S',
    avatarColor: '#8B6914',
    text: 'Dine Around evening at our award-winning restaurants. Our Sirena and Rima venues transformed for an unforgettable executive dining experience. 🍽✨ #ShangriLaBoracay #EricssonTPC #DineAround',
    time: '1d ago',
    likes: 987,
    retweets: 0,
    image: null,
    url: '#',
    verified: true,
  },
]

async function fetchFromApify(token) {
  const actorId = 'apidojo~tweet-scraper'
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=55&memory=256&maxItems=30`

  const input = {
    searchTerms: SEARCH_TERMS,
    maxItems: 30,
    queryType: 'Latest',
    lang: 'en',
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(55000),
  })

  if (!response.ok) throw new Error(`Apify error: ${response.status}`)

  const data = await response.json()

  return data.map((tweet, i) => ({
    id: tweet.id || `apify_${i}`,
    platform: 'twitter',
    username: `@${tweet.author?.userName || 'unknown'}`,
    displayName: tweet.author?.name || 'Unknown',
    avatar: (tweet.author?.name || 'U')[0].toUpperCase(),
    avatarColor: '#0082F0',
    text: tweet.text || '',
    time: tweet.createdAt ? new Date(tweet.createdAt).toLocaleDateString() : 'recent',
    likes: tweet.likeCount || 0,
    retweets: tweet.retweetCount || 0,
    image: tweet.extendedEntities?.media?.[0]?.media_url_https || null,
    url: tweet.url || '#',
    verified: tweet.author?.isVerified || false,
  }))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800')

  const token = process.env.APIFY_TOKEN

  if (!token) {
    return res.status(200).json({
      posts: DEMO_POSTS,
      source: 'demo',
      message: 'Add APIFY_TOKEN to Vercel env vars to enable live social posts',
    })
  }

  try {
    const posts = await fetchFromApify(token)
    return res.status(200).json({ posts, source: 'live' })
  } catch (err) {
    console.error('Apify error:', err.message)
    return res.status(200).json({
      posts: DEMO_POSTS,
      source: 'demo',
      message: 'Live fetch failed — showing demo posts. Check APIFY_TOKEN.',
    })
  }
}
