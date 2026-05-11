import { useState, useEffect, useCallback, useRef } from 'react'
import {
  WINNERS, CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS,
  getWinnersByCategory, getProjectsInCategory, getInitials, COUNTRY_FLAGS,
} from './winnersData'

// ── Colour palette ────────────────────────────────────────────────────────
const C = {
  bg: '#070b14',
  surface: 'rgba(15,23,42,0.95)',
  card: 'rgba(15,23,42,0.8)',
  border: 'rgba(56,189,248,0.12)',
  text: '#e2e8f0',
  muted: '#64748b',
  accent: '#38bdf8',
}

// ── Avatar ────────────────────────────────────────────────────────────────
function Avatar({ name, size = 40, color = '#38bdf8', picture }) {
  const initials = getInitials(name)
  if (picture) {
    return (
      <img
        src={picture}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${color}40` }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color}30, ${color}15)`,
      border: `1.5px solid ${color}50`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color,
      letterSpacing: '-0.5px',
    }}>
      {initials}
    </div>
  )
}

// ── Social pill ───────────────────────────────────────────────────────────
function SocialPill({ platform, url, label }) {
  const colors = { linkedin: '#0A66C2', twitter: '#1DA1F2', instagram: '#E1306C' }
  const icons = { linkedin: 'in', twitter: '𝕏', instagram: '◎' }
  const color = colors[platform] || '#64748b'
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 20,
        background: `${color}18`, border: `1px solid ${color}40`,
        color, fontSize: 11, fontWeight: 600, textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 12 }}>{icons[platform]}</span>
      {label || platform}
    </a>
  )
}

// ── Tweet card ────────────────────────────────────────────────────────────
function TweetCard({ tweet }) {
  const d = new Date(tweet.createdAt)
  const ago = (() => {
    const diff = Date.now() - d.getTime()
    const h = Math.floor(diff / 3600000)
    if (h < 1) return `${Math.floor(diff / 60000)}m ago`
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  })()
  return (
    <a
      href={tweet.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block', textDecoration: 'none',
        background: 'rgba(29,161,242,0.06)',
        border: '1px solid rgba(29,161,242,0.2)',
        borderRadius: 10, padding: '10px 12px', marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#1DA1F2', fontWeight: 700 }}>𝕏</span>
        <span style={{ fontSize: 11, color: C.muted }}>{ago}</span>
        {tweet.isRetweet && <span style={{ fontSize: 10, color: C.muted, background: 'rgba(100,116,139,0.15)', padding: '1px 6px', borderRadius: 8 }}>RT</span>}
      </div>
      <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5, marginBottom: 6 }}>
        {tweet.text.slice(0, 200)}{tweet.text.length > 200 ? '…' : ''}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {[['❤️', tweet.likes], ['🔁', tweet.retweets], ['💬', tweet.replies]].map(([icon, val]) => (
          <span key={icon} style={{ fontSize: 11, color: C.muted }}>{icon} {val?.toLocaleString()}</span>
        ))}
      </div>
    </a>
  )
}

// ── Winner detail bottom sheet ────────────────────────────────────────────
function WinnerSheet({ winner, onClose }) {
  const [social, setSocial] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const color = CATEGORY_COLORS[winner.category] || C.accent
  const flag = COUNTRY_FLAGS[winner.country] || '🌐'

  // Build search URLs (no API key needed)
  const linkedinSearch = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(winner.name + ' Ericsson')}`
  const twitterSearch = `https://twitter.com/search?q=${encodeURIComponent('"' + winner.name + '"')}&f=user`
  const instagramSearch = `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(winner.name)}`

  // Fetch social activity if we have handles stored
  useEffect(() => {
    if (winner.linkedinUsername || winner.twitterUsername) {
      setLoading(true)
      const params = new URLSearchParams({ name: winner.name })
      if (winner.linkedinUsername) params.set('linkedinUsername', winner.linkedinUsername)
      if (winner.twitterUsername) params.set('twitterUsername', winner.twitterUsername)
      fetch(`/api/social-activity?${params}`)
        .then(r => r.json())
        .then(data => { setSocial(data); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [winner])

  const copyStarter = () => {
    navigator.clipboard?.writeText(winner.starter).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}
      onTouchMove={e => e.stopPropagation()}
    >
      <div style={{
        width: '100%', maxHeight: '88vh', overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        background: 'linear-gradient(180deg, #0f172a 0%, #070b14 100%)',
        borderTop: `2px solid ${color}60`,
        borderRadius: '20px 20px 0 0',
        padding: '0 0 40px',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '12px 20px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <Avatar name={winner.name} size={52} color={color} picture={social?.linkedin?.profilePicture || social?.twitter?.profilePicture} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 3 }}>{winner.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
                {flag} {winner.country} · {winner.unit}
              </div>
              <div style={{
                display: 'inline-block', fontSize: 11, fontWeight: 600,
                padding: '3px 10px', borderRadius: 12,
                background: `${color}20`, color,
                border: `1px solid ${color}40`,
              }}>
                {CATEGORY_ICONS[winner.category]} {winner.category}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 20, cursor: 'pointer', padding: 4, flexShrink: 0 }}>✕</button>
          </div>
        </div>

        {/* Project */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Project</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{winner.project}</div>
        </div>

        {/* Conversation Starter */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>💬 Conversation Starter</div>
            <button
              onClick={copyStarter}
              style={{
                background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(56,189,248,0.1)',
                border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'rgba(56,189,248,0.3)'}`,
                color: copied ? '#10b981' : C.accent,
                fontSize: 11, fontWeight: 600, padding: '4px 10px',
                borderRadius: 8, cursor: 'pointer',
              }}
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
          <div style={{
            fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.6,
            background: 'rgba(56,189,248,0.05)',
            border: '1px solid rgba(56,189,248,0.15)',
            borderRadius: 10, padding: '10px 14px',
            fontStyle: 'italic',
          }}>
            "{winner.starter}"
          </div>
        </div>

        {/* Social Links */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>🔍 Find on Social Media</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <SocialPill platform="linkedin" url={linkedinSearch} label="Search LinkedIn" />
            <SocialPill platform="twitter" url={twitterSearch} label="Search X/Twitter" />
            <SocialPill platform="instagram" url={instagramSearch} label="Search Instagram" />
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
            Tap to search for {winner.name.split(' ')[0]} on each platform
          </div>
        </div>

        {/* Recent Twitter activity (if handles available) */}
        {loading && (
          <div style={{ padding: '16px 20px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
            Loading recent activity…
          </div>
        )}

        {social?.twitter?.recentTweets?.length > 0 && (
          <div style={{ padding: '14px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Recent Tweets · @{social.twitter.username}
            </div>
            {social.twitter.recentTweets.map(tweet => (
              <TweetCard key={tweet.id} tweet={tweet} />
            ))}
          </div>
        )}

        {/* LinkedIn profile summary if available */}
        {social?.linkedin && !social.linkedin.error && (
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              LinkedIn Profile
            </div>
            <div style={{
              background: 'rgba(10,102,194,0.08)',
              border: '1px solid rgba(10,102,194,0.25)',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{social.linkedin.headline}</div>
              {social.linkedin.followers > 0 && (
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{social.linkedin.followers.toLocaleString()} followers</div>
              )}
              <a
                href={social.linkedin.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#0A66C2', fontWeight: 600, textDecoration: 'none' }}
              >
                View LinkedIn Profile →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Winner card ───────────────────────────────────────────────────────────
function WinnerCard({ winner, onTap }) {
  const color = CATEGORY_COLORS[winner.category] || C.accent
  const flag = COUNTRY_FLAGS[winner.country] || '🌐'
  return (
    <button
      onClick={() => onTap(winner)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', textAlign: 'left',
        background: C.card,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 12, padding: '12px 14px',
        cursor: 'pointer', marginBottom: 8,
        transition: 'background 0.15s',
      }}
    >
      <Avatar name={winner.name} size={40} color={color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {winner.name}
        </div>
        <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {flag} {winner.country} · {winner.unit}
        </div>
      </div>
      <div style={{ fontSize: 16, color: C.muted, flexShrink: 0 }}>›</div>
    </button>
  )
}

// ── Project group ─────────────────────────────────────────────────────────
function ProjectGroup({ project, winners, onTap, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const color = CATEGORY_COLORS[winners[0]?.category] || C.accent
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          width: '100%', textAlign: 'left',
          background: `${color}08`,
          border: `1px solid ${color}25`,
          borderRadius: 10, padding: '10px 14px',
          cursor: 'pointer', marginBottom: open ? 8 : 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, lineHeight: 1.4, marginBottom: 3 }}>
            {project}
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>
            {winners.length} winner{winners.length !== 1 ? 's' : ''}
          </div>
        </div>
        <span style={{ color: C.muted, fontSize: 16, flexShrink: 0, marginTop: 2 }}>{open ? '▾' : '›'}</span>
      </button>
      {open && winners.map(w => <WinnerCard key={w.id} winner={w} onTap={onTap} />)}
    </div>
  )
}

// ── Category section ──────────────────────────────────────────────────────
function CategorySection({ category, winners, onTap, searchQuery }) {
  const [open, setOpen] = useState(true)
  const color = CATEGORY_COLORS[category] || C.accent
  const icon = CATEGORY_ICONS[category] || '◆'

  // Filter by search
  const filtered = searchQuery
    ? winners.filter(w =>
        w.name.toLowerCase().includes(searchQuery) ||
        w.project.toLowerCase().includes(searchQuery) ||
        w.country.toLowerCase().includes(searchQuery) ||
        w.unit.toLowerCase().includes(searchQuery)
      )
    : winners

  if (filtered.length === 0) return null

  // Group by project
  const byProject = filtered.reduce((acc, w) => {
    if (!acc[w.project]) acc[w.project] = []
    acc[w.project].push(w)
    return acc
  }, {})

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Category header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', textAlign: 'left',
          background: `${color}12`,
          border: `1px solid ${color}35`,
          borderRadius: 12, padding: '12px 16px',
          cursor: 'pointer', marginBottom: open ? 12 : 0,
        }}
      >
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color }}>{category}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{filtered.length} winners · {Object.keys(byProject).length} projects</div>
        </div>
        <span style={{ color: C.muted, fontSize: 18 }}>{open ? '▾' : '›'}</span>
      </button>

      {open && Object.entries(byProject).map(([project, pWinners]) => (
        <ProjectGroup
          key={project}
          project={project}
          winners={pWinners}
          onTap={onTap}
          defaultOpen={!!searchQuery || Object.keys(byProject).length === 1}
        />
      ))}
    </div>
  )
}

// ── Stats bar ─────────────────────────────────────────────────────────────
function StatsBar() {
  const byCategory = getWinnersByCategory()
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 0 4px', scrollbarWidth: 'none' }}>
      {Object.entries(byCategory).map(([cat, winners]) => {
        const color = CATEGORY_COLORS[cat] || C.accent
        const icon = CATEGORY_ICONS[cat] || '◆'
        return (
          <div key={cat} style={{
            flexShrink: 0, background: `${color}10`,
            border: `1px solid ${color}30`,
            borderRadius: 10, padding: '8px 12px',
            textAlign: 'center', minWidth: 90,
          }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{winners.length}</div>
            <div style={{ fontSize: 9, color: C.muted, marginTop: 2, lineHeight: 1.2 }}>
              {cat.replace('Excellence in ', '').replace('Sales ', '')}
            </div>
          </div>
        )
      })}
      <div style={{
        flexShrink: 0, background: 'rgba(56,189,248,0.08)',
        border: '1px solid rgba(56,189,248,0.2)',
        borderRadius: 10, padding: '8px 12px',
        textAlign: 'center', minWidth: 70,
      }}>
        <div style={{ fontSize: 18, marginBottom: 2 }}>🌍</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.accent, lineHeight: 1 }}>
          {new Set(WINNERS.map(w => w.country)).size}
        </div>
        <div style={{ fontSize: 9, color: C.muted, marginTop: 2, lineHeight: 1.2 }}>Countries</div>
      </div>
    </div>
  )
}

// ── Main Winners screen ───────────────────────────────────────────────────
export default function Winners() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const byCategory = getWinnersByCategory()
  const q = search.trim().toLowerCase()

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: C.bg, color: C.text, fontFamily: 'system-ui, -apple-system, sans-serif', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(7,11,20,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        padding: '14px 16px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>🏆 TPC 2026 Winners</div>
            <div style={{ fontSize: 11, color: C.muted }}>Top Performance Conference · Boracay</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: C.muted, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', padding: '3px 8px', borderRadius: 8 }}>
            {WINNERS.length} winners
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 14 }}>🔍</span>
          <input
            type="text"
            placeholder="Search by name, project, country…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(15,23,42,0.8)',
              border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '9px 12px 9px 32px',
              color: C.text, fontSize: 13,
              outline: 'none',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}
            >✕</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '14px 16px 4px' }}>
        <StatsBar />
      </div>

      {/* Winner list */}
      <div style={{ padding: '12px 16px 100px' }}>
        {q ? (
          // Flat search results
          (() => {
            const results = WINNERS.filter(w =>
              w.name.toLowerCase().includes(q) ||
              w.project.toLowerCase().includes(q) ||
              w.country.toLowerCase().includes(q) ||
              w.unit.toLowerCase().includes(q)
            )
            if (results.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
                  <div style={{ fontSize: 14 }}>No winners found for "{search}"</div>
                </div>
              )
            }
            return (
              <>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{results.length} result{results.length !== 1 ? 's' : ''}</div>
                {results.map(w => <WinnerCard key={w.id} winner={w} onTap={setSelected} />)}
              </>
            )
          })()
        ) : (
          // Grouped by category
          Object.entries(byCategory).map(([cat, winners]) => (
            <CategorySection
              key={cat}
              category={cat}
              winners={winners}
              onTap={setSelected}
              searchQuery={q}
            />
          ))
        )}
      </div>

      {/* Detail sheet */}
      {selected && (
        <WinnerSheet
          winner={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
