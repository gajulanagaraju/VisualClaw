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
  const [slides, setSlides] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!item?.slidesUrl) { setLoading(false); return }
    fetch(item.slidesUrl)
      .then(r => r.json())
      .then(data => { setSlides(data.slides || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [item?.slidesUrl])

  const downloadAll = () => {
    if (!slides?.length) return
    slides.forEach((dataUrl, i) => {
      setTimeout(() => {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `vc_history_${item.platform}_slide_${String(i + 1).padStart(2, '0')}.jpg`
        a.click()
      }, i * 350)
    })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); setTimeout(() => setDeleteConfirm(false), 3500); return }
    setDeleting(true)
    await onDelete(item.id)
  }

  const color = PLATFORM_COLORS[item.platform] || '#38bdf8'

  return (
    <div style={ds.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={ds.sheet}>
        <div style={ds.handle} />

        <div style={ds.header}>
          <div>
            <div style={{ ...ds.platformBadge, background: `${color}20`, color }}>
              {PLATFORM_ICONS[item.platform] || '◆'} {item.platform}
            </div>
            <div style={ds.title}>{item.eventName || 'TPC 2026'}</div>
            <div style={ds.meta}>{formatDate(item.createdAt)} · {item.slideCount} slides</div>
          </div>
          <button style={ds.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Slides scroll */}
        <div style={ds.slidesRow}>
          {loading
            ? [0,1,2,3].map(i => <div key={i} style={{ ...ds.slideThumb, background: 'rgba(30,41,59,0.5)' }} className="skeleton" />)
            : (slides || []).map((url, i) => (
              <div key={i} style={ds.slideWrap}>
                <img src={url} alt={`Slide ${i+1}`} style={ds.slideThumb} />
                <div style={ds.slideNum}>{i + 1}</div>
              </div>
            ))
          }
        </div>

        {/* Caption */}
        {item.caption && (
          <div style={ds.captionBox}>
            <div style={ds.captionLabel}>Caption</div>
            <p style={ds.captionText}>{item.caption}</p>
          </div>
        )}

        {/* Actions */}
        <div style={ds.actions}>
          <button
            style={{ ...ds.actionBtn, background: 'linear-gradient(135deg,#065f46,#047857)' }}
            onClick={downloadAll}
            disabled={!slides?.length || loading}>
            ⬇ Download Slides
          </button>
          <button
            style={{ ...ds.actionBtn, background: deleting ? 'rgba(30,41,59,0.5)' : deleteConfirm ? '#dc2626' : 'rgba(69,10,10,0.7)', border: '1px solid rgba(239,68,68,0.3)', transition: 'background 0.25s' }}
            onClick={confirmDelete}
            disabled={deleting}>
            {deleting ? '⏳ Deleting...' : deleteConfirm ? '⚠ Confirm Delete' : '🗑 Delete'}
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

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError('')
    try {
      const r = await fetch('/api/history-list')
      const data = await r.json()
      if (data.note === 'blob_not_configured') { setBlobNote(true); setItems([]) }
      else { setItems(data.items || []) }
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

  return (
    <div style={h.root}>
      <div style={h.header}>
        <div style={h.headerLeft}>
          <div style={h.title}>🗂 History</div>
          <div style={h.subtitle}>Saved carousels on server · tap to re-download</div>
        </div>
        <button style={h.refreshBtn} onClick={() => load(true)} disabled={refreshing}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: refreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.6s linear' }}>
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>

      <div style={h.scroll}>

        {/* Blob not configured banner */}
        {blobNote && (
          <div style={h.setupBanner}>
            <div style={h.setupTitle}>⚙ Blob Storage Not Configured</div>
            <div style={h.setupText}>
              To save history to the server:{'\n'}
              1. Vercel Dashboard → Storage → Create Blob Store{'\n'}
              2. Link it to your VisualClaw project{'\n'}
              3. Redeploy — history will work automatically
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
            <div style={h.emptyIcon}>🗂</div>
            <div style={h.emptyTitle}>No saved carousels yet</div>
            <div style={h.emptySub}>Generate a carousel and tap "Save to History" to store it here</div>
          </div>
        )}

        {/* History grid */}
        {!loading && items.length > 0 && (
          <div style={h.grid}>
            {items.map((item, idx) => {
              const color = PLATFORM_COLORS[item.platform] || '#38bdf8'
              return (
                <button
                  key={item.id}
                  style={{
                    ...h.card,
                    animation: `cardEntrance 0.35s cubic-bezier(0.16,1,0.3,1) ${idx * 45}ms both`,
                    borderTop: `2.5px solid ${color}`,
                  }}
                  onClick={() => setExpanded(item)}>

                  {/* Thumbnail */}
                  {item.thumbnail
                    ? <img src={item.thumbnail} alt="" style={h.cardThumb} />
                    : <div style={{ ...h.cardThumb, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                        {PLATFORM_ICONS[item.platform] || '🖼'}
                      </div>
                  }

                  <div style={h.cardBody}>
                    <div style={h.cardPlatform}>
                      <span style={{ ...h.platformDot, background: color }} />
                      <span style={{ ...h.cardPlatformName, color }}>{item.platform}</span>
                    </div>
                    <div style={h.cardEvent}>{(item.eventName || 'TPC 2026').slice(0, 28)}</div>
                    <div style={h.cardMeta}>{item.slideCount} slides · {formatDate(item.createdAt)}</div>
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
  root: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#05060f' },
  header: {
    padding: '12px 18px 8px', flexShrink: 0,
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerLeft: {},
  title: { fontSize: 20, fontWeight: 800, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 3 },
  refreshBtn: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
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
  },
  cardThumb: { width: '100%', aspectRatio: '4/5', objectFit: 'cover', display: 'block' },
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
  setupText: { fontSize: 12, color: '#64748b', lineHeight: 1.7, whiteSpace: 'pre-line' },
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
  emptySub: { fontSize: 13, color: '#334155', textAlign: 'center', lineHeight: 1.6 },
}

const ds = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(3,4,12,0.75)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-end',
    animation: 'fadeInScale 0.2s ease both',
  },
  sheet: {
    width: '100%', maxHeight: '88vh', overflowY: 'auto',
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
    padding: '16px 20px 12px',
  },
  platformBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
    textTransform: 'uppercase', padding: '3px 10px',
    borderRadius: 20, marginBottom: 6,
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
  actions: { display: 'flex', gap: 10, padding: '4px 20px 20px' },
  actionBtn: {
    flex: 1, padding: '13px 10px', borderRadius: 14,
    color: '#fff', fontSize: 14, fontWeight: 700,
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },
}
