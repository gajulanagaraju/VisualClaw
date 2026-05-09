import { useState, useEffect, useCallback } from 'react'

const PLATFORM_COLORS = { twitter: '#1DA1F2', instagram: '#E1306C', linkedin: '#0A66C2' }
const PLATFORM_ICONS  = { twitter: '𝕏', instagram: '◎', linkedin: 'in' }
const PLATFORM_LABELS = { twitter: 'X / Twitter', instagram: 'Instagram', linkedin: 'LinkedIn' }

function PostCard({ post, delay = 0 }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = post.text.length > 220
  const displayText = !expanded && isLong ? post.text.slice(0, 220) + '…' : post.text
  const color = PLATFORM_COLORS[post.platform] || '#475569'

  return (
    <div style={{
      ...s.card,
      animation: `cardEntrance 0.4s cubic-bezier(0.16,1,0.3,1) ${delay}ms both`,
      borderLeft: `2px solid ${color}40`,
    }}>
      {/* Subtle top accent */}
      <div style={{ ...s.cardAccent, background: `linear-gradient(90deg, ${color}30, transparent)` }} />

      <div style={s.cardHeader}>
        <div style={{ ...s.avatar, background: `${post.avatarColor}22`, border: `1.5px solid ${post.avatarColor}50`, color: post.avatarColor }}>
          {post.avatar}
        </div>
        <div style={s.metaCol}>
          <div style={s.displayName}>
            {post.displayName}
            {post.verified && (
              <span style={{ ...s.verifiedBadge, background: color }}>✓</span>
            )}
          </div>
          <div style={s.username}>{post.username}</div>
        </div>
        <div style={{ ...s.platformChip, background: `${color}18`, border: `1px solid ${color}30`, color }}>
          {PLATFORM_ICONS[post.platform]}
        </div>
      </div>

      <p style={s.postText}>
        {displayText}
        {isLong && (
          <span style={s.expandBtn} onClick={() => setExpanded(!expanded)}>
            {expanded ? ' less' : ' more'}
          </span>
        )}
      </p>

      {post.image && (
        <div style={s.imageWrap}>
          <img src={post.image} alt="" style={s.postImage} loading="lazy" />
          <div style={s.imageSheen} />
        </div>
      )}

      <div style={s.cardFooter}>
        {post.likes > 0 && <span style={s.stat}><span style={{ color: '#f43f5e' }}>♥</span> {post.likes.toLocaleString()}</span>}
        {post.retweets > 0 && <span style={s.stat}><span style={{ color: '#10b981' }}>↺</span> {post.retweets.toLocaleString()}</span>}
        <span style={{ ...s.stat, marginLeft: 'auto', color: '#475569' }}>{post.time}</span>
        {post.url && post.url !== '#' && (
          <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ ...s.viewLink, color }}>
            View ↗
          </a>
        )}
      </div>
    </div>
  )
}

function SkeletonCard({ delay = 0 }) {
  return (
    <div style={{ ...s.card, animation: `fadeInScale 0.3s ease ${delay}ms both` }}>
      <div style={s.cardHeader}>
        <div style={{ ...s.avatar, background: '#1e293b' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton" style={{ height: 12, width: '55%' }} />
          <div className="skeleton" style={{ height: 10, width: '35%' }} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        <div className="skeleton" style={{ height: 12, width: '100%' }} />
        <div className="skeleton" style={{ height: 12, width: '90%' }} />
        <div className="skeleton" style={{ height: 12, width: '70%' }} />
      </div>
      <div className="skeleton" style={{ height: 10, width: '40%' }} />
    </div>
  )
}

const FILTERS = [
  { key: 'all',       label: '🌐 All' },
  { key: 'twitter',   label: '𝕏 Twitter' },
  { key: 'instagram', label: '◎ Instagram' },
  { key: 'linkedin',  label: 'in LinkedIn' },
]

export default function SocialFeed() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [source, setSource] = useState('demo')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadFeed = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch('/api/social-feed')
      const data = await res.json()
      setPosts(data.posts || [])
      setSource(data.source || 'demo')
      setLastRefresh(new Date())
    } catch {
      // keep existing posts on error
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadFeed() }, [loadFeed])

  const filtered = filter === 'all' ? posts : posts.filter(p => p.platform === filter)

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>Conference Feed</div>
          <div style={s.subtitle}>
            <span style={{ color: source === 'live' ? '#10b981' : '#f59e0b' }}>
              {source === 'live' ? '● Live' : '● Demo'}
            </span>
            {lastRefresh && ` · ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </div>
        </div>
        <button style={{ ...s.refreshBtn, ...(refreshing ? s.refreshBtnSpin : {}) }}
          onClick={() => loadFeed(true)} disabled={refreshing}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}>
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
        </button>
      </div>

      {/* Tracking banner */}
      <div style={s.trackBanner}>
        <span style={s.trackDot} />
        Tracking: Ericsson TPC 2026 · Shangri-La Boracay · Boracay Conference
      </div>

      {/* Demo notice */}
      {source === 'demo' && (
        <div style={s.demoNotice}>
          ⚡ Add <code style={s.code}>APIFY_TOKEN</code> to Vercel env for live posts
        </div>
      )}

      {/* Filter row */}
      <div style={s.filterRow}>
        {FILTERS.map(f => (
          <button key={f.key}
            style={{ ...s.filterChip, ...(filter === f.key ? s.filterActive : {}) }}
            onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div style={s.feed}>
        {loading
          ? [0, 1, 2, 3].map(i => <SkeletonCard key={i} delay={i * 80} />)
          : filtered.length === 0
            ? <div style={s.empty}>No posts for this filter yet.</div>
            : filtered.map((post, i) => <PostCard key={post.id} post={post} delay={i * 60} />)
        }
        <div style={{ height: 16 }} />
      </div>
    </div>
  )
}

const s = {
  root: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#05060f' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 18px 8px', flexShrink: 0,
  },
  title: { fontSize: 20, fontWeight: 800, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 3, fontWeight: 500 },
  refreshBtn: {
    width: 38, height: 38, borderRadius: '50%',
    background: 'rgba(15,20,40,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.2s ease',
  },
  trackBanner: {
    margin: '0 14px 6px', padding: '6px 14px',
    background: 'rgba(29,78,216,0.12)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: 10, fontSize: 11, color: '#93c5fd',
    display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
  },
  trackDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: '#38bdf8', flexShrink: 0,
    boxShadow: '0 0 6px rgba(56,189,248,0.8)',
    animation: 'pulseRing 2s ease-in-out infinite',
  },
  demoNotice: {
    margin: '0 14px 6px', padding: '6px 14px',
    background: 'rgba(28,20,7,0.8)', color: '#fbbf24',
    borderRadius: 10, fontSize: 11, flexShrink: 0,
    border: '1px solid rgba(251,191,36,0.2)',
  },
  code: {
    background: 'rgba(251,191,36,0.15)', padding: '1px 5px',
    borderRadius: 4, fontFamily: 'monospace', fontSize: 11,
  },
  filterRow: {
    display: 'flex', gap: 8, padding: '0 14px 8px',
    flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none',
  },
  filterChip: {
    padding: '5px 13px', borderRadius: 20, fontSize: 12,
    background: 'rgba(15,20,40,0.8)',
    border: '1px solid rgba(255,255,255,0.07)',
    color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0,
    transition: 'all 0.2s ease',
  },
  filterActive: {
    background: 'rgba(29,78,216,0.25)',
    border: '1px solid rgba(59,130,246,0.4)',
    color: '#93c5fd',
  },
  feed: {
    flex: 1, overflowY: 'auto', padding: '4px 14px 0',
  },
  card: {
    background: 'rgba(10,14,28,0.9)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 14, marginBottom: 10,
    position: 'relative', overflow: 'hidden',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  },
  cardAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 15, flexShrink: 0,
  },
  metaCol: { flex: 1, minWidth: 0 },
  displayName: {
    fontSize: 14, fontWeight: 700, color: '#f1f5f9',
    display: 'flex', alignItems: 'center', gap: 5,
  },
  verifiedBadge: {
    fontSize: 9, color: '#fff',
    borderRadius: '50%', width: 14, height: 14,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800,
  },
  username: { fontSize: 12, color: '#475569', marginTop: 1 },
  platformChip: {
    padding: '3px 8px', borderRadius: 8,
    fontSize: 12, fontWeight: 700, flexShrink: 0,
  },
  postText: {
    fontSize: 14, lineHeight: 1.6, color: '#cbd5e1',
    marginBottom: 10, wordBreak: 'break-word',
  },
  expandBtn: { color: '#3b82f6', cursor: 'pointer', fontWeight: 600 },
  imageWrap: { position: 'relative', marginBottom: 10, borderRadius: 12, overflow: 'hidden' },
  postImage: { width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' },
  imageSheen: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(180deg, transparent 60%, rgba(5,6,15,0.5))',
  },
  cardFooter: {
    display: 'flex', alignItems: 'center', gap: 12,
    borderTop: '1px solid rgba(255,255,255,0.05)',
    paddingTop: 8, marginTop: 4,
  },
  stat: { fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 },
  viewLink: { fontSize: 12, textDecoration: 'none', fontWeight: 600, marginLeft: 4 },
  empty: { textAlign: 'center', color: '#475569', padding: '48px 0', fontSize: 15 },
}
