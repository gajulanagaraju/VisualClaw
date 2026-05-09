import { useState, useRef, useCallback } from 'react'

const PLATFORMS = [
  { key: 'linkedin',  label: 'LinkedIn',  icon: 'in', color: '#0A66C2', desc: '5–8 slides · Professional' },
  { key: 'instagram', label: 'Instagram', icon: '◎',  color: '#E1306C', desc: '6–10 slides · Visual' },
  { key: 'facebook',  label: 'Facebook',  icon: 'f',  color: '#1877F2', desc: '4–6 slides · Personal' },
  { key: 'whatsapp',  label: 'WhatsApp',  icon: '💬', color: '#25D366', desc: '3–5 slides · Simple' },
]

async function resizeForCarousel(file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const maxDim = 1080
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width  = img.width  * scale
        canvas.height = img.height * scale
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        resolve({ dataUrl, base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', name: file.name })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function copyText(text, setDone) {
  navigator.clipboard.writeText(text).then(() => {
    setDone(true)
    setTimeout(() => setDone(false), 2200)
  })
}

function SlideCard({ slide, photo, index, total }) {
  const offset = index - Math.floor(total / 2)
  return (
    <div style={{
      ...ss.slideCard,
      animation: `cardEntrance 0.4s cubic-bezier(0.16,1,0.3,1) ${index * 60}ms both`,
    }}>
      <div style={ss.slideNum}>Slide {index + 1}</div>
      <div style={ss.slideImgWrap}>
        <img src={photo?.dataUrl} alt="" style={ss.slideImg} />
        {slide.privacyFlag && (
          <div style={ss.privacyBadge}>⚠️ Review</div>
        )}
        <div style={ss.slideImgOverlay} />
      </div>
      <div style={ss.slideMeta}>
        <div style={ss.slideTitle}>{slide.slideTitle}</div>
        <div style={ss.slideCaption}>{slide.slideCaption}</div>
      </div>
    </div>
  )
}

export default function CarouselCreator() {
  const [photos, setPhotos]           = useState([])
  const [platform, setPlatform]       = useState('linkedin')
  const [eventName, setEventName]     = useState('Top Performance Conference 2026, Boracay Philippines')
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState(null)
  const [error, setError]             = useState('')
  const [captionCopied, setCaptionCopied] = useState(false)
  const [hashtagCopied, setHashtagCopied] = useState(false)
  const fileInputRef = useRef(null)

  const handleFiles = useCallback(async files => {
    const arr = Array.from(files).slice(0, 10)
    const processed = await Promise.all(arr.map(resizeForCarousel))
    setPhotos(prev => [...prev, ...processed].slice(0, 10))
    setResult(null)
  }, [])

  const removePhoto = i => {
    setPhotos(prev => prev.filter((_, idx) => idx !== i))
    setResult(null)
  }

  const generate = async () => {
    if (!photos.length) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/create-carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: photos.map(p => ({ base64: p.base64, mimeType: p.mimeType, name: p.name })),
          platform,
          eventName,
        }),
      })
      const data = await res.json()
      if (data.error && !data.slides) throw new Error(data.error)
      setResult(data)
    } catch (e) {
      setError(e.message || 'Generation failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const downloadCaptions = () => {
    if (!result) return
    const text = [
      `# Carousel Captions — ${platform.toUpperCase()}`,
      `# Event: ${eventName}`,
      result.postTheme ? `# Theme: ${result.postTheme}` : '',
      '', '## Full Caption', result.fullCaption,
      '', '## Hashtags', result.hashtags,
      '', '## Slide Captions',
      ...(result.slides || []).map((sl, i) =>
        `\nSlide ${i + 1}: ${sl.slideTitle}\n${sl.slideCaption}`
      ),
    ].filter(Boolean).join('\n')

    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })),
      download: `${platform}_captions_tpc2026.txt`,
    })
    a.click()
  }

  const orderedPhotos = result?.slideOrder?.map(i => photos[i]) || photos
  const slides = result?.slides || []
  const activePlatform = PLATFORMS.find(p => p.key === platform)

  return (
    <div style={ss.root}>
      <div style={ss.header}>
        <div style={ss.title}>🎠 Carousel Creator</div>
        <div style={ss.subtitle}>AI-curated posts from your photos</div>
      </div>

      <div style={ss.scroll}>

        {/* Upload zone */}
        <div style={ss.uploadZone} onClick={() => fileInputRef.current?.click()}>
          {photos.length === 0 ? (
            <div style={ss.uploadEmpty}>
              <div style={ss.uploadOrb} />
              <div style={{ fontSize: 36, marginBottom: 8 }}>🖼</div>
              <div style={ss.uploadText}>Tap to add photos</div>
              <div style={ss.uploadSub}>Up to 10 · JPG, PNG, HEIC from your camera roll</div>
            </div>
          ) : (
            <div style={ss.thumbGrid}>
              {photos.map((p, i) => (
                <div key={i} style={ss.thumbWrap}>
                  <img src={p.dataUrl} alt="" style={ss.thumb} />
                  <button style={ss.removeBtn}
                    onClick={e => { e.stopPropagation(); removePhoto(i) }}>
                    ✕
                  </button>
                  <div style={ss.thumbNum}>{i + 1}</div>
                </div>
              ))}
              {photos.length < 10 && (
                <div style={ss.addMore}>
                  <span style={{ fontSize: 22, color: '#475569' }}>+</span>
                  <span style={{ fontSize: 10, color: '#475569' }}>Add</span>
                </div>
              )}
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple
          style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />

        {/* Google Photos tip */}
        <div style={ss.tip}>
          <span>📁</span>
          <span>Google Photos: download album → upload above</span>
        </div>

        {/* Platform selector */}
        <div style={ss.section}>
          <div style={ss.sLabel}>Platform</div>
          <div style={ss.platformGrid}>
            {PLATFORMS.map(p => (
              <button key={p.key}
                style={{
                  ...ss.platformBtn,
                  ...(platform === p.key ? {
                    borderColor: p.color,
                    background: `${p.color}18`,
                    boxShadow: `0 0 20px ${p.color}20`,
                  } : {}),
                }}
                onClick={() => { setPlatform(p.key); setResult(null) }}>
                <span style={{ fontSize: 18, color: platform === p.key ? p.color : '#64748b' }}>
                  {p.icon}
                </span>
                <span style={{ ...ss.pName, color: platform === p.key ? '#f1f5f9' : '#94a3b8' }}>
                  {p.label}
                </span>
                <span style={ss.pDesc}>{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Event */}
        <div style={ss.section}>
          <div style={ss.sLabel}>Event / Context</div>
          <input style={ss.input} value={eventName}
            onChange={e => setEventName(e.target.value)}
            placeholder="Event name or context..." />
        </div>

        {/* Generate button */}
        {photos.length > 0 && !loading && !result && (
          <button style={{
            ...ss.genBtn,
            background: `linear-gradient(135deg, ${activePlatform?.color || '#1d4ed8'}, #7c3aed)`,
          }} onClick={generate}>
            ✨ Generate {activePlatform?.label} Carousel
          </button>
        )}

        {/* Loading */}
        {loading && (
          <div style={ss.loadBox}>
            <div style={ss.loadCube} />
            <div style={{ color: '#94a3b8', marginTop: 14, fontSize: 14 }}>
              VisualClaw is crafting your carousel...
            </div>
            <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>
              Analyzing {photos.length} photos
            </div>
          </div>
        )}

        {error && <div style={ss.errorBox}>{error}</div>}

        {/* Results */}
        {result && (
          <div style={{ animation: 'fadeInScale 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>
            {result.postTheme && (
              <div style={ss.themeBadge}>
                <span style={{ color: activePlatform?.color || '#38bdf8' }}>◆</span> {result.postTheme}
              </div>
            )}

            <div style={ss.sLabel}>Slides ({slides.length})</div>
            <div style={ss.slidesRow}>
              {slides.map((slide, i) => (
                <SlideCard key={i} index={i} total={slides.length} slide={slide}
                  photo={orderedPhotos[i] || photos[slide.photoIndex] || photos[0]} />
              ))}
            </div>

            <div style={ss.sLabel}>Full Caption</div>
            <div style={ss.captionCard}>
              <pre style={ss.captionText}>{result.fullCaption}</pre>
              <button style={{ ...ss.copyBtn, background: activePlatform?.color || '#1d4ed8' }}
                onClick={() => copyText(result.fullCaption, setCaptionCopied)}>
                {captionCopied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>

            {result.hashtags && (
              <>
                <div style={ss.sLabel}>Hashtags</div>
                <div style={ss.captionCard}>
                  <pre style={{ ...ss.captionText, color: '#60a5fa' }}>{result.hashtags}</pre>
                  <button style={{ ...ss.copyBtn, background: '#1d4ed8' }}
                    onClick={() => copyText(result.hashtags, setHashtagCopied)}>
                    {hashtagCopied ? '✓ Copied!' : '# Copy'}
                  </button>
                </div>
              </>
            )}

            <div style={ss.actionRow}>
              <button style={ss.dlBtn} onClick={downloadCaptions}>⬇ Download .txt</button>
              <button style={ss.resetBtn}
                onClick={() => { setResult(null); setPhotos([]) }}>
                🔄 New Carousel
              </button>
            </div>
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>
    </div>
  )
}

const ss = {
  root: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#05060f' },
  header: { padding: '12px 18px 6px', flexShrink: 0 },
  title: { fontSize: 20, fontWeight: 800, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 3 },
  scroll: { flex: 1, overflowY: 'auto', padding: '0 14px', scrollbarWidth: 'none' },
  uploadZone: {
    border: '1.5px dashed rgba(255,255,255,0.1)',
    borderRadius: 18, marginBottom: 10,
    background: 'rgba(10,14,28,0.6)',
    cursor: 'pointer', overflow: 'hidden',
    minHeight: 110,
    transition: 'border-color 0.2s ease, background 0.2s ease',
  },
  uploadEmpty: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 28, position: 'relative',
  },
  uploadOrb: {
    position: 'absolute', width: 80, height: 80,
    borderRadius: '50%', top: 10,
    background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  uploadText: { fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 },
  uploadSub: { fontSize: 12, color: '#475569', textAlign: 'center' },
  thumbGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, padding: 14 },
  thumbWrap: { position: 'relative', width: 72, height: 72, borderRadius: 10, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%', objectFit: 'cover' },
  removeBtn: {
    position: 'absolute', top: 2, right: 2,
    width: 18, height: 18, borderRadius: '50%',
    background: 'rgba(239,68,68,0.9)', color: '#fff',
    fontSize: 9, lineHeight: '18px', textAlign: 'center', fontWeight: 800,
  },
  thumbNum: {
    position: 'absolute', bottom: 2, left: 4,
    fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 700,
  },
  addMore: {
    width: 72, height: 72, borderRadius: 10,
    border: '1.5px dashed rgba(255,255,255,0.1)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 2,
    background: 'rgba(15,20,40,0.5)',
  },
  tip: {
    display: 'flex', gap: 8, alignItems: 'center',
    padding: '7px 12px', marginBottom: 14,
    background: 'rgba(10,14,28,0.5)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 10, fontSize: 11, color: '#64748b',
  },
  section: { marginBottom: 14 },
  sLabel: {
    fontSize: 10, fontWeight: 800, color: '#475569',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
  },
  platformGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  platformBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    padding: '12px 14px', borderRadius: 14,
    background: 'rgba(10,14,28,0.6)',
    border: '1.5px solid rgba(255,255,255,0.07)',
    cursor: 'pointer', gap: 3,
    transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
  },
  pName: { fontSize: 13, fontWeight: 700, transition: 'color 0.2s' },
  pDesc: { fontSize: 10, color: '#475569' },
  input: {
    width: '100%', padding: '11px 16px',
    background: 'rgba(10,14,28,0.6)',
    border: '1.5px solid rgba(255,255,255,0.07)',
    color: '#f1f5f9', borderRadius: 12, fontSize: 14,
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  },
  genBtn: {
    width: '100%', padding: '14px',
    borderRadius: 50, color: '#fff',
    fontSize: 16, fontWeight: 800,
    letterSpacing: 0.3, marginBottom: 14,
    boxShadow: '0 4px 24px rgba(124,58,237,0.3)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  loadBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: 32, background: 'rgba(10,14,28,0.6)',
    borderRadius: 16, marginBottom: 14,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  loadCube: {
    width: 36, height: 36,
    border: '3px solid rgba(56,189,248,0.15)',
    borderTop: '3px solid #38bdf8', borderRight: '3px solid #818cf8',
    borderRadius: 8,
    animation: 'spin3D 1.2s ease-in-out infinite',
    boxShadow: '0 0 24px rgba(56,189,248,0.25)',
  },
  errorBox: {
    padding: '10px 16px', marginBottom: 14,
    background: 'rgba(69,10,10,0.7)', color: '#fca5a5',
    borderRadius: 12, fontSize: 13,
    border: '1px solid rgba(239,68,68,0.2)',
  },
  themeBadge: {
    padding: '10px 14px', marginBottom: 14,
    background: 'rgba(10,14,28,0.6)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, fontSize: 13, color: '#94a3b8',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  slidesRow: {
    display: 'flex', gap: 10, overflowX: 'auto',
    paddingBottom: 10, marginBottom: 14,
    scrollbarWidth: 'none',
  },
  slideCard: {
    flexShrink: 0, width: 152,
    background: 'rgba(10,14,28,0.9)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
  slideNum: {
    fontSize: 9, color: '#475569', fontWeight: 800,
    padding: '6px 10px 0', letterSpacing: 1, textTransform: 'uppercase',
  },
  slideImgWrap: { position: 'relative', margin: '6px 8px 0', borderRadius: 10, overflow: 'hidden' },
  slideImg: { width: '100%', height: 110, objectFit: 'cover', display: 'block' },
  slideImgOverlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(180deg, transparent 50%, rgba(10,14,28,0.6))',
  },
  privacyBadge: {
    position: 'absolute', top: 4, right: 4,
    fontSize: 9, background: 'rgba(251,191,36,0.9)',
    color: '#000', padding: '2px 6px', borderRadius: 6, fontWeight: 700,
  },
  slideMeta: { padding: '8px 10px 10px' },
  slideTitle: { fontSize: 12, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.3, marginBottom: 3 },
  slideCaption: { fontSize: 10, color: '#64748b', lineHeight: 1.4 },
  captionCard: {
    background: 'rgba(10,14,28,0.6)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14, padding: 14, marginBottom: 14,
    position: 'relative',
  },
  captionText: {
    fontSize: 13, color: '#e2e8f0', lineHeight: 1.7,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    fontFamily: 'inherit', margin: 0, paddingBottom: 38,
  },
  copyBtn: {
    position: 'absolute', bottom: 10, right: 10,
    padding: '6px 14px', color: '#fff', borderRadius: 10,
    fontSize: 12, fontWeight: 700,
    transition: 'transform 0.15s ease',
  },
  actionRow: { display: 'flex', gap: 10, marginBottom: 4 },
  dlBtn: {
    flex: 1, padding: '12px', borderRadius: 14,
    background: 'linear-gradient(135deg, #065f46, #047857)',
    color: '#fff', fontSize: 14, fontWeight: 700,
    boxShadow: '0 4px 16px rgba(16,185,129,0.2)',
  },
  resetBtn: {
    flex: 1, padding: '12px', borderRadius: 14,
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(255,255,255,0.07)',
    color: '#94a3b8', fontSize: 14, fontWeight: 700,
  },
}
