import { useState, useRef, useCallback } from 'react'

const PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn', icon: 'in', color: '#0A66C2', desc: '5-8 slides · Professional' },
  { key: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C', desc: '6-10 slides · Visual' },
  { key: 'facebook', label: 'Facebook', icon: 'f', color: '#1877F2', desc: '4-6 slides · Personal' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#25D366', desc: '3-5 slides · Simple' },
]

function resizeForCarousel(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const maxDim = 1080
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        resolve({
          dataUrl,
          base64: dataUrl.split(',')[1],
          mimeType: 'image/jpeg',
          name: file.name,
          width: canvas.width,
          height: canvas.height,
        })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function copied(text, setCopied) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  })
}

function SlidePreview({ slide, photo, index }) {
  return (
    <div style={ss.slideCard}>
      <div style={ss.slideNum}>Slide {index + 1}</div>
      <img src={photo.dataUrl} alt={slide.slideTitle} style={ss.slideThumb} />
      {slide.privacyFlag && (
        <div style={ss.privacyFlag}>⚠️ Privacy review suggested</div>
      )}
      <div style={ss.slideTitle}>{slide.slideTitle}</div>
      <div style={ss.slideCaption}>{slide.slideCaption}</div>
    </div>
  )
}

export default function CarouselCreator() {
  const [photos, setPhotos] = useState([])
  const [platform, setPlatform] = useState('linkedin')
  const [eventName, setEventName] = useState('Top Performance Conference 2026, Boracay Philippines')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [captionCopied, setCaptionCopied] = useState(false)
  const [hashtagCopied, setHashtagCopied] = useState(false)
  const fileInputRef = useRef(null)

  const handleFiles = useCallback(async (files) => {
    const arr = Array.from(files).slice(0, 10)
    const processed = await Promise.all(arr.map(resizeForCarousel))
    setPhotos(prev => [...prev, ...processed].slice(0, 10))
    setResult(null)
  }, [])

  const onFileChange = (e) => handleFiles(e.target.files)

  const removePhoto = (i) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== i))
    setResult(null)
  }

  const generate = async () => {
    if (photos.length === 0) return
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
      setError(e.message || 'Generation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const downloadCaptions = () => {
    if (!result) return
    const lines = [
      `# ${eventName}`,
      `# Platform: ${platform.toUpperCase()}`,
      `# Theme: ${result.postTheme || ''}`,
      '',
      '## Full Caption',
      result.fullCaption,
      '',
      '## Hashtags',
      result.hashtags,
      '',
      '## Slide Captions',
      ...(result.slides || []).map((sl, i) =>
        `\nSlide ${i + 1}: ${sl.slideTitle}\n${sl.slideCaption}`
      ),
    ].join('\n')

    const blob = new Blob([lines], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${platform}_carousel_captions.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const orderedPhotos = result?.slideOrder?.map(i => photos[i]) || photos
  const slides = result?.slides || []

  return (
    <div style={ss.root}>
      <div style={ss.header}>
        <div style={ss.title}>🎠 Carousel Creator</div>
        <div style={ss.subtitle}>Turn your photos into polished posts</div>
      </div>

      <div style={ss.scroll}>
        {/* Photo upload zone */}
        <div
          style={ss.uploadZone}
          onClick={() => fileInputRef.current?.click()}
        >
          {photos.length === 0 ? (
            <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
              <div style={ss.uploadText}>Tap to select photos</div>
              <div style={ss.uploadSub}>Up to 10 photos · JPG, PNG, HEIC</div>
            </>
          ) : (
            <div style={ss.thumbRow}>
              {photos.map((p, i) => (
                <div key={i} style={ss.thumbWrap}>
                  <img src={p.dataUrl} alt="" style={ss.thumb} />
                  <button style={ss.removeBtn} onClick={(e) => { e.stopPropagation(); removePhoto(i) }}>✕</button>
                </div>
              ))}
              {photos.length < 10 && (
                <div style={ss.addMore}>
                  <span style={{ fontSize: 24 }}>+</span>
                  <span style={{ fontSize: 11 }}>Add more</span>
                </div>
              )}
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={onFileChange}
        />

        {/* Google Photos note */}
        <div style={ss.googleNote}>
          <span style={{ fontSize: 14 }}>📁</span>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            To use Google Photos: open your album, download photos, then upload above
          </span>
        </div>

        {/* Platform selector */}
        <div style={ss.section}>
          <div style={ss.sectionLabel}>Platform</div>
          <div style={ss.platformGrid}>
            {PLATFORMS.map(p => (
              <button
                key={p.key}
                style={{
                  ...ss.platformBtn,
                  ...(platform === p.key ? { borderColor: p.color, background: p.color + '22' } : {}),
                }}
                onClick={() => { setPlatform(p.key); setResult(null) }}
              >
                <span style={{ fontSize: 16 }}>{p.icon}</span>
                <span style={ss.platformName}>{p.label}</span>
                <span style={ss.platformDesc}>{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Event name */}
        <div style={ss.section}>
          <div style={ss.sectionLabel}>Event / Context</div>
          <input
            style={ss.input}
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            placeholder="Event name or context..."
          />
        </div>

        {/* Generate button */}
        {photos.length > 0 && !loading && !result && (
          <button style={ss.generateBtn} onClick={generate}>
            ✨ Generate {platform.charAt(0).toUpperCase() + platform.slice(1)} Carousel
          </button>
        )}

        {/* Loading */}
        {loading && (
          <div style={ss.loadingBox}>
            <div style={ss.spinner} />
            <div style={{ color: '#94a3b8', marginTop: 12, fontSize: 14 }}>
              VisualClaw is crafting your carousel...
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div style={ss.errorBox}>{error}</div>}

        {/* Results */}
        {result && (
          <div style={ss.results}>
            {result.postTheme && (
              <div style={ss.theme}>
                🎯 Theme: <em>{result.postTheme}</em>
              </div>
            )}

            {/* Slide previews */}
            <div style={ss.sectionLabel}>Slides ({slides.length})</div>
            <div style={ss.slidesScroll}>
              {slides.map((slide, i) => (
                <SlidePreview
                  key={i}
                  index={i}
                  slide={slide}
                  photo={orderedPhotos[i] || photos[slide.photoIndex] || photos[0]}
                />
              ))}
            </div>

            {/* Full caption */}
            <div style={ss.sectionLabel}>Full Caption</div>
            <div style={ss.captionBox}>
              <pre style={ss.captionText}>{result.fullCaption}</pre>
              <button style={ss.copyBtn} onClick={() => copied(result.fullCaption, setCaptionCopied)}>
                {captionCopied ? '✓ Copied!' : '📋 Copy Caption'}
              </button>
            </div>

            {/* Hashtags */}
            {result.hashtags && (
              <>
                <div style={ss.sectionLabel}>Hashtags</div>
                <div style={ss.captionBox}>
                  <pre style={{ ...ss.captionText, color: '#60a5fa' }}>{result.hashtags}</pre>
                  <button style={ss.copyBtn} onClick={() => copied(result.hashtags, setHashtagCopied)}>
                    {hashtagCopied ? '✓ Copied!' : '# Copy Hashtags'}
                  </button>
                </div>
              </>
            )}

            {/* Actions */}
            <div style={ss.actionRow}>
              <button style={ss.downloadBtn} onClick={downloadCaptions}>
                ⬇ Download Captions.txt
              </button>
              <button style={ss.resetBtn} onClick={() => { setResult(null); setPhotos([]) }}>
                🔄 New Carousel
              </button>
            </div>
          </div>
        )}

        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}

const ss = {
  root: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { padding: '12px 16px 8px', flexShrink: 0 },
  title: { fontSize: 20, fontWeight: 700 },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  scroll: { flex: 1, overflowY: 'auto', padding: '0 12px', scrollbarWidth: 'none' },
  uploadZone: {
    border: '2px dashed #334155', borderRadius: 14,
    padding: 20, marginBottom: 10, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: 100, background: '#111827',
  },
  uploadText: { fontSize: 16, fontWeight: 600, color: '#e2e8f0' },
  uploadSub: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  thumbRow: {
    display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-start', width: '100%',
  },
  thumbWrap: { position: 'relative', width: 72, height: 72 },
  thumb: { width: 72, height: 72, objectFit: 'cover', borderRadius: 8 },
  removeBtn: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: '50%',
    background: '#ef4444', color: '#fff', fontSize: 10, lineHeight: '20px', textAlign: 'center',
  },
  addMore: {
    width: 72, height: 72, borderRadius: 8,
    border: '2px dashed #475569', display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    color: '#64748b',
  },
  googleNote: {
    display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px',
    background: '#111827', borderRadius: 10, marginBottom: 12,
    border: '1px solid #1f2937',
  },
  section: { marginBottom: 14 },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  platformGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  platformBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    padding: '10px 12px', borderRadius: 12, background: '#111827',
    border: '2px solid #1f2937', cursor: 'pointer', gap: 2,
  },
  platformName: { fontSize: 13, fontWeight: 600, color: '#e2e8f0' },
  platformDesc: { fontSize: 10, color: '#6b7280' },
  input: {
    width: '100%', padding: '10px 14px',
    background: '#111827', color: '#fff', borderRadius: 10,
    border: '1px solid #334155', fontSize: 14, boxSizing: 'border-box',
  },
  generateBtn: {
    width: '100%', padding: '14px', borderRadius: 12,
    background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
    color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 12,
  },
  loadingBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: 30, background: '#111827', borderRadius: 12, marginBottom: 12,
  },
  spinner: {
    width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #7c3aed', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorBox: {
    padding: '10px 14px', background: '#450a0a', color: '#fca5a5',
    borderRadius: 10, marginBottom: 12, fontSize: 13,
  },
  results: { paddingTop: 4 },
  theme: {
    padding: '10px 14px', background: '#111827', borderRadius: 10,
    fontSize: 13, color: '#94a3b8', marginBottom: 12,
    fontStyle: 'normal',
  },
  slidesScroll: {
    display: 'flex', gap: 10, overflowX: 'auto',
    paddingBottom: 10, marginBottom: 12, scrollbarWidth: 'none',
  },
  slideCard: {
    flexShrink: 0, width: 160,
    background: '#111827', borderRadius: 12, overflow: 'hidden',
    border: '1px solid #1f2937',
  },
  slideNum: {
    fontSize: 10, color: '#6b7280', fontWeight: 700,
    padding: '6px 10px 0', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  slideThumb: { width: '100%', height: 130, objectFit: 'cover' },
  privacyFlag: {
    fontSize: 10, color: '#fbbf24', background: '#1c1407',
    padding: '3px 8px',
  },
  slideTitle: {
    fontSize: 12, fontWeight: 700, color: '#e2e8f0',
    padding: '6px 10px 2px', lineHeight: 1.3,
  },
  slideCaption: {
    fontSize: 11, color: '#94a3b8', padding: '0 10px 10px',
    lineHeight: 1.4,
  },
  captionBox: {
    background: '#111827', borderRadius: 12, padding: 14,
    border: '1px solid #1f2937', marginBottom: 12, position: 'relative',
  },
  captionText: {
    fontSize: 13, color: '#e2e8f0', lineHeight: 1.6,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    fontFamily: 'inherit', margin: 0, paddingBottom: 36,
  },
  copyBtn: {
    position: 'absolute', bottom: 10, right: 10,
    padding: '6px 12px', background: '#1d4ed8', color: '#fff',
    borderRadius: 8, fontSize: 12, fontWeight: 600,
  },
  actionRow: { display: 'flex', gap: 10, marginTop: 4 },
  downloadBtn: {
    flex: 1, padding: '12px', borderRadius: 12,
    background: '#065f46', color: '#fff', fontSize: 14, fontWeight: 600,
  },
  resetBtn: {
    flex: 1, padding: '12px', borderRadius: 12,
    background: '#374151', color: '#fff', fontSize: 14, fontWeight: 600,
  },
}
