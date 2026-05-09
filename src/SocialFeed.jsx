import { useState, useEffect, useCallback } from 'react'

const PLATFORM_COLORS = {
  twitter: '#1DA1F2',
  instagram: '#E1306C',
  linkedin: '#0A66C2',
}

const PLATFORM_ICONS = {
  twitter: '𝕏',
  instagram: '📸',
  linkedin: 'in',
}

function timeAgo(str) {
  return str
}

function PostCard({ post }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = post.text.length > 200
  const displayText = !expanded && isLong ? post.text.slice(0, 200) + '…' : post.text

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div style={{ ...s.avatar, background: post.avatarColor }}>
          {post.avatar}
        </div>
        <div style={s.cardMeta}>
          <div style={s.displayName}>
            {post.displayName}
            {post.verified && <span style={s.verified}>✓</span>}
          </div>
          <div style={s.username}>{post.username}</div>
        </div>
        <div style={{ ...s.platformBadge, background: PLATFORM_COLORS[post.platform] }}>
          {PLATFORM_ICONS[post.platform]}
        </div>
      </div>

      <p style={s.postText}>
        {displayText}
        {isLong && (
          <span style={s.expandBtn} onClick={() => setExpanded(!expanded)}>
            {expanded ? ' show less' : ' more'}
          </span>
        )}
      </p>

      {post.image && (
        <img src={post.image} alt="post" style={s.postImage} loading="lazy" />
      )}

      <div style={s.cardFooter}>
        <span style={s.stat}>❤️ {post.likes.toLocaleString()}</span>
        {post.retweets > 0 && (
          <span style={s.stat}>🔁 {post.retweets.toLocaleString()}</span>
        )}
        <span style={{ ...s.stat, marginLeft: 'auto', color: '#6b7280' }}>{post.time}</span>
        {post.url && post.url !== '#' && (
          <a href={post.url} target="_blank" rel="noopener noreferrer" style={s.viewLink}>
            View ↗
          </a>
        )}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ ...s.card, opacity: 0.4 }}>
      <div style={s.cardHeader}>
        <div style={{ ...s.avatar, background: '#374151' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 12, background: '#374151', borderRadius: 4, width: '60%', marginBottom: 6 }} />
          <div style={{ height: 10, background: '#374151', borderRadius: 4, width: '40%' }} />
        </div>
      </div>
      <div style={{ height: 12, background: '#374151', borderRadius: 4, marginBottom: 6 }} />
      <div style={{ height: 12, background: '#374151', borderRadius: 4, width: '80%', marginBottom: 6 }} />
      <div style={{ height: 12, background: '#374151', borderRadius: 4, width: '60%' }} />
    </div>
  )
}

export default function SocialFeed() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [source, setSource] = useState('demo')
  const [message, setMessage] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  const loadFeed = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/social-feed')
      const data = await res.json()
      setPosts(data.posts || [])
      setSource(data.source || 'demo')
      setMessage(data.message || '')
      setLastRefresh(new Date())
    } catch (e) {
      setMessage('Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadFeed() }, [loadFeed])

  const FILTERS = [
    { key: 'all', label: '🌐 All' },
    { key: 'twitter', label: '𝕏 X' },
    { key: 'instagram', label: '📸 IG' },
    { key: 'linkedin', label: 'in LinkedIn' },
  ]

  const filtered = filter === 'all' ? posts : posts.filter(p => p.platform === filter)

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>Conference Feed</div>
          <div style={s.subtitle}>
            {source === 'live' ? '🟢 Live' : '🟡 Demo'}
            {lastRefresh && ` · ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </div>
        </div>
        <button style={s.refreshBtn} onClick={loadFeed} disabled={loading}>
          {loading ? '⏳' : '↺'}
        </button>
      </div>

      {/* Search terms reminder */}
      <div style={s.searchBanner}>
        Tracking: Ericsson TPC 2026 · Shangri-La Boracay · Boracay Conference
      </div>

      {/* Demo notice */}
      {source === 'demo' && (
        <div style={s.demoNotice}>
          ⚡ Add <code style={{ background: '#1e3a5f', padding: '1px 5px', borderRadius: 3 }}>APIFY_TOKEN</code> to Vercel env vars for live posts
        </div>
      )}

      {/* Filter chips */}
      <div style={s.filterRow}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            style={{ ...s.filterChip, ...(filter === f.key ? s.filterActive : {}) }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div style={s.feed}>
        {loading
          ? [1, 2, 3].map(i => <SkeletonCard key={i} />)
          : filtered.length === 0
            ? <div style={s.empty}>No posts found for this filter.</div>
            : filtered.map(post => <PostCard key={post.id} post={post} />)
        }
        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}

const s = {
  root: {
    flex: 1, display: 'flex', flexDirection: 'column',
    overflow: 'hidden', background: '#0a0a0a',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px 8px', flexShrink: 0,
  },
  title: { fontSize: 20, fontWeight: 700 },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  refreshBtn: {
    width: 38, height: 38, borderRadius: '50%',
    background: '#1e293b', color: '#fff', fontSize: 18,
    border: '1px solid #334155',
  },
  searchBanner: {
    margin: '0 12px 6px', padding: '6px 12px',
    background: '#1e3a5f', color: '#93c5fd',
    borderRadius: 8, fontSize: 11, flexShrink: 0,
  },
  demoNotice: {
    margin: '0 12px 6px', padding: '6px 12px',
    background: '#1c1407', color: '#fbbf24',
    borderRadius: 8, fontSize: 11, flexShrink: 0,
  },
  filterRow: {
    display: 'flex', gap: 8, padding: '0 12px 8px',
    flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none',
  },
  filterChip: {
    padding: '5px 12px', borderRadius: 20, fontSize: 12,
    background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  filterActive: {
    background: '#1d4ed8', color: '#fff', border: '1px solid #2563eb',
  },
  feed: {
    flex: 1, overflowY: 'auto', padding: '0 12px',
    scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent',
  },
  card: {
    background: '#111827', borderRadius: 14, padding: 14,
    marginBottom: 10, border: '1px solid #1f2937',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0,
  },
  cardMeta: { flex: 1, minWidth: 0 },
  displayName: {
    fontSize: 14, fontWeight: 600, color: '#f1f5f9',
    display: 'flex', alignItems: 'center', gap: 4,
  },
  verified: {
    fontSize: 11, background: '#1d4ed8', color: '#fff',
    borderRadius: '50%', width: 14, height: 14,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  username: { fontSize: 12, color: '#6b7280' },
  platformBadge: {
    padding: '3px 7px', borderRadius: 6, fontSize: 11,
    fontWeight: 700, color: '#fff', flexShrink: 0,
  },
  postText: {
    fontSize: 14, lineHeight: 1.55, color: '#d1d5db',
    marginBottom: 10, wordBreak: 'break-word',
  },
  expandBtn: { color: '#3b82f6', cursor: 'pointer' },
  postImage: {
    width: '100%', borderRadius: 10,
    maxHeight: 200, objectFit: 'cover', marginBottom: 10,
  },
  cardFooter: {
    display: 'flex', alignItems: 'center', gap: 12,
    borderTop: '1px solid #1f2937', paddingTop: 8, marginTop: 4,
  },
  stat: { fontSize: 12, color: '#9ca3af' },
  viewLink: {
    fontSize: 12, color: '#3b82f6', textDecoration: 'none',
  },
  empty: { textAlign: 'center', color: '#6b7280', padding: '40px 0', fontSize: 15 },
}
