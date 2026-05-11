import { useState, useEffect, useCallback } from 'react'

const PLATFORM_COLORS = {
  instagram: '#E1306C', linkedin: '#0A66C2',
  facebook: '#1877F2', whatsapp: '#25D366',
}
const PLATFORM_ICONS = {
  instagram: '◎', linkedin: 'in', facebook: 'f', whatsapp: '💬',
}

function formatDate(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/* ── Skeleton card ───────────────────────────── */
function SkeletonCard() {
  return (
    <div style={h.card}>
      <div style={{ ...h.cardThumb, background: 'rgba(30,41,59,0.5)' }} className="skeleton" />
      <div style={h.cardBody}>
        <div style={{ height: 10, width: '60%', borderRadius: 4, marginBottom: 6 }} className="skeleton" />
        <div style={{ height: 8, width: '40%', borderRadius: 4 }} className="skeleton" />
      </div>
    </div>
  )
}

/* ── Detail bottom sheet ─────────────────────── */
function DetailSheet({ item, onClose, onDelete }) {
  // For carousel entries: slides may be an array of CDN URLs (new) or fetched from a .slides.json (legacy)
  const [slides, setSlides] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    // New schema: slideUrls is an array of CDN image URLs
    if (item?.slideUrls?.length) {
      setSlides(item.slideUrls)
      setLoading(false)
      return
    }
    // Legacy schema: slides stored as base64 array in a separate .slides.json
    if (item?.legacySlidesUrl) {
      fetch(item.legacySlidesUrl)
        .then(r => r.json())
        .then(data => { setSlides(data.slides || []); setLoading(false) })
        .catch(() => setLoading(false))
      return
    }
    // Reel entries have no slides
    setLoading(false)
  }, [item])

  const downloadAllSlides = () => {
    if (!slides?.length) return
    slides.forEach((url, i) => {
      setTimeout(() => {
        const a = document.createElement('a')
        a.href = url
        a.download = `vc_${item.platform}_slide_${String(i + 1).padStart(2, '0')}.jpg`
        a.target = '_blank'
        a.click()
      }, i * 350)
    })
  }

  const downloadReel = () => {
    if (!item?.reelUrl) return
    const ext = (item.reelMimeType || 'video/mp4').includes('webm') ? 'webm' : 'mp4'
    const a = document.createElement('a')
    a.href = item.reelUrl
    a.download = `vc_${item.platform}_reel.${ext}`
    a.target = '_blank'
    a.click()
  }

  const shareReel = async () => {
    if (!item?.reelUrl) return
    try {
      const blob = await fetch(item.reelUrl).then(r => r.blob())
      const ext = (item.reelMimeType || 'video/mp4').includes('webm') ? 'webm' : 'mp4'
      const file = new File([blob], `vc_reel.${ext}`, { type: item.reelMimeType || 'video/mp4' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: item.eventName || 'Reel', text: item.caption || '' })
      } else {
        downloadReel()
      }
    } catch (e) {
      if (e.name !== 'AbortError') downloadReel()
    }
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); setTimeout(() => setDeleteConfirm(false), 3500); return }
    setDeleting(true)
    await onDelete(item.id)
  }

  const color = PLATFORM_COLORS[item.platform] || '#38bdf8'
  const isReel = item.type === 'reel'

  return (
    <div style={ds.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={ds.sheet}>
        <div style={ds.handle} />

        <div style={ds.header}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ ...ds.platformBadge, background: `${color}20`, color }}>
                {PLATFORM_ICONS[item.platform] || '◆'} {item.platform}
              </div>
              <div style={{ ...ds.typeBadge, background: isReel ? 'rgba(168,85,247,0.15)' : 'rgba(56,189,248,0.1)', color: isReel ? '#c084fc' : '#38bdf8', border: isReel ? '1px solid rgba(168,85,247,0.3)' : '1px solid rgba(56,189,248,0.2)' }}>
                {isReel ? '🎬 Reel' : '🖼 Carousel'}
              </div>
            </div>
            <div style={ds.title}>{item.eventName || 'TPC 2026'}</div>
            <div style={ds.meta}>
              {formatDate(item.createdAt)}
              {!isReel && item.slideCount ? ` · ${item.slideCount} slides` : ''}
            </div>
          </div>
          <button style={ds.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── Reel video player ── */}
        {isReel && item.reelUrl && (
          <div style={{ padding: '0 20px 16px' }}>
            <video
              src={item.reelUrl}
              controls
              loop
              playsInline
              style={ds.reelVideo}
            />
          </div>
        )}

        {/* ── Carousel slides scroll ── */}
        {!isReel && (
          <div style={ds.slidesRow}>
            {loading
              ? [0,1,2,3].map(i => <div key={i} style={{ ...ds.slideThumb, background: 'rgba(30,41,59,0.5)' }} className="skeleton" />)
              : !slides?.length
                ? <div style={{ fontSize: 13, color: '#475569', padding: '8px 0' }}>Slides not available</div>
                : (slides || []).map((url, i) => (
                  <div key={i} style={ds.slideWrap}>
                    <img src={url} alt={`Slide ${i+1}`} style={ds.slideThumb} />
                    <div style={ds.slideNum}>{i + 1}</div>
                  </div>
                ))
            }
          </div>
        )}

        {/* Caption */}
        {item.caption && (
          <div style={ds.captionBox}>
            <div style={ds.captionLabel}>Caption</div>
            <p style={ds.captionText}>{item.caption}</p>
          </div>
        )}

        {/* Actions */}
        <div style={ds.actions}>
          {isReel ? (
            <>
              <button
                style={{ ...ds.actionBtn, background: 'linear-gradient(135deg,#065f46,#047857)' }}
                onClick={downloadReel}>
                ⬇ Download Reel
              </button>
              <button
                style={{ ...ds.actionBtn, background: 'linear-gradient(135deg,#E1306C,#833ab4)' }}
                onClick={shareReel}>
                📲 Share Reel
              </button>
            </>
          ) : (
            <button
              style={{ ...ds.actionBtn, background: 'linear-gradient(135deg,#065f46,#047857)' }}
              onClick={downloadAllSlides}
              disabled={!slides?.length || loading}>
              ⬇ Download Slides
            </button>
          )}
          <button
            style={{
              ...ds.actionBtn,
              background: deleting ? 'rgba(30,41,59,0.5)' : deleteConfirm ? '#dc2626' : 'rgba(69,10,10,0.7)',
              border: '1px solid rgba(239,68,68,0.3)',
              transition: 'background 0.25s',
              flex: '0 0 auto',
              padding: '13px 18px',
            }}
            onClick={confirmDelete}
            disabled={deleting}>
            {deleting ? '⏳' : deleteConfirm ? '⚠ Confirm' : '🗑'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── History tab ─────────────────────────────── */
export default function History() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [blobNote, setBlobNote] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('all') // 'all' | 'carousel' | 'reel'

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError('')
    try {
      const r = await fetch('/api/history-list')
      const data = await r.json()
      if (data.note === 'blob_not_configured') { setBlobNote(true); setItems([]) }
      else { setItems(data.items || []); setBlobNote(false) }
    } catch {
      setError('Failed to load history. Check your connection.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const deleteItem = async (id) => {
    try {
      await fetch('/api/history-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setItems(prev => prev.filter(item => item.id !== id))
      setExpanded(null)
    } catch {
      setError('Delete failed. Try again.')
    }
  }

  const filteredItems = filter === 'all' ? items
    : items.filter(item => (item.type || 'carousel') === filter)

  const carouselCount = items.filter(i => (i.type || 'carousel') === 'carousel').length
  const reelCount = items.filter(i => i.type === 'reel').length

  return (
    <div style={h.root}>
      <div style={h.header}>
        <div style={h.headerLeft}>
          <div style={h.title}>☁️ Cloud History</div>
          <div style={h.subtitle}>
            {items.length > 0
              ? `${carouselCount} carousel${carouselCount !== 1 ? 's' : ''} · ${reelCount} reel${reelCount !== 1 ? 's' : ''}`
              : 'Saved carousels & reels · tap to re-download'}
          </div>
        </div>
        <button style={h.refreshBtn} onClick={() => load(true)} disabled={refreshing} title="Refresh">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: refreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.6s linear' }}>
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>

      {/* Filter tabs */}
      {items.length > 0 && (
        <div style={h.filterRow}>
          {[
            { key: 'all', label: `All (${items.length})` },
            { key: 'carousel', label: `🖼 Carousels (${carouselCount})` },
            { key: 'reel', label: `🎬 Reels (${reelCount})` },
          ].map(tab => (
            <button
              key={tab.key}
              style={{ ...h.filterTab, ...(filter === tab.key ? h.filterTabActive : {}) }}
              onClick={() => setFilter(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div style={h.scroll}>

        {/* Blob not configured banner */}
        {blobNote && (
          <div style={h.setupBanner}>
            <div style={h.setupTitle}>⚙ Cloud Storage Not Configured</div>
            <div style={h.setupText}>
              To enable cloud history:{'\n\n'}
              1. Go to your <strong style={{ color: '#93c5fd' }}>Vercel Dashboard</strong> → Storage → Create Blob Store{'\n'}
              2. Link the Blob Store to your VisualClaw project{'\n'}
              3. Copy the <code style={{ color: '#a78bfa', fontSize: 11 }}>BLOB_READ_WRITE_TOKEN</code> to your project environment variables{'\n'}
              4. Redeploy the project — cloud history will work automatically
            </div>
          </div>
        )}

        {error && <div style={h.errorBox}>{error}</div>}

        {/* Loading skeletons */}
        {loading && (
          <div style={h.grid}>
            {[0,1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && !blobNote && items.length === 0 && (
          <div style={h.empty}>
            <div style={h.emptyIcon}>☁️</div>
            <div style={h.emptyTitle}>No saved items yet</div>
            <div style={h.emptySub}>
              Generate a carousel and tap <strong style={{ color: '#a78bfa' }}>☁️ Save</strong> to store slides to the cloud.{'\n'}
              Generate a reel and tap <strong style={{ color: '#a78bfa' }}>☁️ Save to Cloud</strong> to store the video.
            </div>
          </div>
        )}

        {/* Empty filter state */}
        {!loading && items.length > 0 && filteredItems.length === 0 && (
          <div style={h.empty}>
            <div style={h.emptyIcon}>{filter === 'reel' ? '🎬' : '🖼'}</div>
            <div style={h.emptyTitle}>No {filter}s saved yet</div>
          </div>
        )}

        {/* History grid */}
        {!loading && filteredItems.length > 0 && (
          <div style={h.grid}>
            {filteredItems.map((item, idx) => {
              const color = PLATFORM_COLORS[item.platform] || '#38bdf8'
              const isReel = item.type === 'reel'
              const thumbUrl = item.thumbnailUrl || null
              return (
                <button
                  key={item.id}
                  style={{
                    ...h.card,
                    animation: `cardEntrance 0.35s cubic-bezier(0.16,1,0.3,1) ${idx * 45}ms both`,
                    borderTop: `2.5px solid ${isReel ? '#a855f7' : color}`,
                  }}
                  onClick={() => setExpanded(item)}>
                  {/* Thumbnail */}
                  {thumbUrl
                    ? <img src={thumbUrl} alt="" style={h.cardThumb} />
                    : <div style={{ ...h.cardThumb, background: isReel ? 'rgba(168,85,247,0.1)' : `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                        {isReel ? '🎬' : (PLATFORM_ICONS[item.platform] || '🖼')}
                      </div>
                  }
                  {/* Reel badge overlay */}
                  {isReel && (
                    <div style={h.reelBadge}>🎬</div>
                  )}
                  <div style={h.cardBody}>
                    <div style={h.cardPlatform}>
                      <span style={{ ...h.platformDot, background: isReel ? '#a855f7' : color }} />
                      <span style={{ ...h.cardPlatformName, color: isReel ? '#c084fc' : color }}>
                        {isReel ? 'Reel' : item.platform}
                      </span>
                    </div>
                    <div style={h.cardEvent}>{(item.eventName || 'TPC 2026').slice(0, 28)}</div>
                    <div style={h.cardMeta}>
                      {isReel
                        ? `Video · ${formatDate(item.createdAt)}`
                        : `${item.slideCount || '?'} slides · ${formatDate(item.createdAt)}`
                      }
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
        <div style={{ height: 24 }} />
      </div>

      {expanded && (
        <DetailSheet
          item={expanded}
          onClose={() => setExpanded(null)}
          onDelete={deleteItem}
        />
      )}
    </div>
  )
}

/* ── Styles ──────────────────────────────────── */
const h = {
  root: {
    display: 'flex', flexDirection: 'column', height: '100%',
    background: 'transparent',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '16px 16px 10px',
  },
  headerLeft: { flex: 1 },
  title: {
    fontSize: 20, fontWeight: 800, color: '#f1f5f9',
    letterSpacing: -0.3,
  },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 3 },
  refreshBtn: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginTop: 4, flexShrink: 0,
  },
  filterRow: {
    display: 'flex', gap: 6, padding: '0 16px 10px', overflowX: 'auto', scrollbarWidth: 'none',
  },
  filterTab: {
    padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.07)',
    color: '#475569', whiteSpace: 'nowrap', cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  filterTabActive: {
    background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)',
    color: '#a78bfa',
  },
  scroll: { flex: 1, overflowY: 'auto', padding: '0 14px', scrollbarWidth: 'none' },
  grid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
    paddingTop: 8,
  },
  card: {
    background: 'rgba(10,14,28,0.7)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    cursor: 'pointer', textAlign: 'left',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    position: 'relative',
  },
  cardThumb: { width: '100%', aspectRatio: '4/5', objectFit: 'cover', display: 'block' },
  reelBadge: {
    position: 'absolute', top: 8, right: 8,
    background: 'rgba(0,0,0,0.6)', borderRadius: 8,
    padding: '2px 6px', fontSize: 13,
    backdropFilter: 'blur(4px)',
  },
  cardBody: { padding: '10px 10px 12px' },
  cardPlatform: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 },
  platformDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  cardPlatformName: { fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' },
  cardEvent: { fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 4, lineHeight: 1.3 },
  cardMeta: { fontSize: 10, color: '#475569' },
  setupBanner: {
    margin: '8px 0 12px', padding: '14px 16px',
    background: 'rgba(29,78,216,0.1)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: 14,
  },
  setupTitle: { fontSize: 13, fontWeight: 800, color: '#93c5fd', marginBottom: 8 },
  setupText: { fontSize: 12, color: '#64748b', lineHeight: 1.8, whiteSpace: 'pre-line' },
  errorBox: {
    margin: '8px 0 12px', padding: '10px 14px',
    background: 'rgba(69,10,10,0.7)', color: '#fca5a5',
    borderRadius: 12, fontSize: 13, border: '1px solid rgba(239,68,68,0.2)',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '60px 24px', gap: 12,
  },
  emptyIcon: { fontSize: 48, filter: 'grayscale(30%) opacity(0.5)' },
  emptyTitle: { fontSize: 17, fontWeight: 700, color: '#475569' },
  emptySub: { fontSize: 13, color: '#334155', textAlign: 'center', lineHeight: 1.7, whiteSpace: 'pre-line' },
}

const ds = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(3,4,12,0.75)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-end',
    animation: 'fadeInScale 0.2s ease both',
  },
  sheet: {
    width: '100%', maxHeight: '90vh', overflowY: 'auto',
    background: 'rgba(8,10,24,0.98)',
    borderRadius: '24px 24px 0 0',
    border: '1px solid rgba(255,255,255,0.08)',
    borderBottom: 'none',
    paddingBottom: 'env(safe-area-inset-bottom)',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
    animation: 'slideUpPanel 0.3s cubic-bezier(0.16,1,0.3,1) both',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    background: 'rgba(255,255,255,0.15)',
    margin: '12px auto 0',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '16px 20px 12px', gap: 12,
  },
  platformBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
    textTransform: 'uppercase', padding: '3px 10px',
    borderRadius: 20,
  },
  typeBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 700, padding: '3px 10px',
    borderRadius: 20,
  },
  title: { fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginBottom: 3 },
  meta: { fontSize: 12, color: '#475569' },
  closeBtn: {
    width: 30, height: 30, borderRadius: '50%',
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(255,255,255,0.07)',
    color: '#64748b', fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  reelVideo: {
    width: '100%', borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.07)',
    background: '#000',
    maxHeight: 340,
  },
  slidesRow: {
    display: 'flex', gap: 10, padding: '0 20px 16px',
    overflowX: 'auto', scrollbarWidth: 'none',
  },
  slideWrap: { position: 'relative', flexShrink: 0, borderRadius: 10, overflow: 'hidden' },
  slideThumb: {
    width: 110, height: 138, objectFit: 'cover',
    display: 'block', flexShrink: 0, borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.07)',
  },
  slideNum: {
    position: 'absolute', bottom: 5, left: 6,
    fontSize: 10, fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
  },
  captionBox: { padding: '0 20px 14px' },
  captionLabel: {
    fontSize: 10, fontWeight: 800, color: '#475569',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
  },
  captionText: {
    fontSize: 13, color: '#94a3b8', lineHeight: 1.7,
    display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
    overflow: 'hidden', margin: 0,
  },
  actions: { display: 'flex', gap: 8, padding: '4px 20px 20px', flexWrap: 'wrap' },
  actionBtn: {
    flex: 1, padding: '13px 10px', borderRadius: 14,
    color: '#fff', fontSize: 13, fontWeight: 700,
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    minWidth: 100,
  },
}
