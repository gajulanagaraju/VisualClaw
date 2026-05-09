import { useRef, useState, useCallback, useEffect } from 'react'
import CarouselCreator from './CarouselCreator.jsx'
import SocialFeed from './SocialFeed.jsx'

/* ── Quick Prompts ───────────────────────────── */
const QUICK_PROMPTS = [
  { label: '👁 What is this?',  text: 'What is this? Tell me the most useful thing about it.' },
  { label: '📋 Read sign',      text: 'Read and translate this sign or text for me.' },
  { label: '🍽 What food?',     text: 'What food or dish is this? Is it must-try in Philippines?' },
  { label: '📍 Where am I?',    text: 'Based on what you see, where am I? What is this place?' },
  { label: '💰 Magkano?',       text: 'Read the price or label. How much is this? Is it a good deal?' },
  { label: '🏆 Award event',    text: 'This is from my Top Performance Conference award event. Read and explain what you see.' },
  { label: '👔 Outfit check',   text: "I'm about to wear this outfit. Does it work for my conference at Shangri-La Boracay? Give honest advice." },
  { label: '🤝 Who is this?',   text: "Read this person's badge or name tag. What role or title? How should I approach them at the conference?" },
  { label: '🗣 Convo help',     text: 'I am networking at Top Performance Conference 2026. What is a good conversation opener based on what you see?' },
  { label: '📸 Photo spot',     text: 'Is this a good background for a professional LinkedIn photo? What angle works best?' },
]

/* ── Helpers ─────────────────────────────────── */
function resizeImage(dataUrl, maxW = 1024) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const s = Math.min(1, maxW / img.width)
      const c = document.createElement('canvas')
      c.width = img.width * s; c.height = img.height * s
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', 0.82))
    }
    img.src = dataUrl
  })
}

function speak(text, onEnd) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.93
  if (onEnd) u.onend = onEnd
  speechSynthesis.speak(u)
}

/* ── Viewfinder Brackets ─────────────────────── */
function Brackets() {
  const b = { position: 'absolute', width: 28, height: 28, animation: 'bracketPulse 2s ease-in-out infinite' }
  const c = 'rgba(56,189,248,0.9)'
  const w = 3
  return (
    <>
      {/* TL */}
      <div style={{ ...b, top: 18, left: 18, borderTop: `${w}px solid ${c}`, borderLeft: `${w}px solid ${c}`, borderRadius: '3px 0 0 0' }} />
      {/* TR */}
      <div style={{ ...b, top: 18, right: 18, borderTop: `${w}px solid ${c}`, borderRight: `${w}px solid ${c}`, borderRadius: '0 3px 0 0' }} />
      {/* BL */}
      <div style={{ ...b, bottom: 18, left: 18, borderBottom: `${w}px solid ${c}`, borderLeft: `${w}px solid ${c}`, borderRadius: '0 0 0 3px' }} />
      {/* BR */}
      <div style={{ ...b, bottom: 18, right: 18, borderBottom: `${w}px solid ${c}`, borderRight: `${w}px solid ${c}`, borderRadius: '0 0 3px 0' }} />
      {/* Scan line */}
      <div style={{
        position: 'absolute', left: 18, right: 18, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.6), transparent)',
        animation: 'scanLine 3s linear infinite',
        pointerEvents: 'none',
      }} />
    </>
  )
}

/* ── Camera View ─────────────────────────────── */
function CameraView() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')
  const [cameraOn, setCameraOn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [capturedThumb, setCapturedThumb] = useState(null)
  const [error, setError] = useState('')
  const [ripple, setRipple] = useState(false)

  const startCamera = async (mode = facingMode) => {
    if (stream) stream.getTracks().forEach(t => t.stop())
    setError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      videoRef.current.srcObject = s
      setStream(s)
      setCameraOn(true)
    } catch {
      setError('Camera access denied. Please allow camera in browser settings.')
    }
  }

  const flipCamera = async () => {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    await startCamera(next)
  }

  const capture = useCallback(async (promptOverride) => {
    if (!stream || loading) return
    setRipple(true)
    setTimeout(() => setRipple(false), 700)

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)

    const raw = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedThumb(raw)
    const resized = await resizeImage(raw, 1024)
    const base64 = resized.split(',')[1]

    setLoading(true)
    setResponse('')
    setError('')
    setPanelOpen(false)

    const q = promptOverride || question || 'What do you see? Give me the most useful information.'
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg', question: q }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResponse(data.answer)
      setPanelOpen(true)
      setSpeaking(true)
      speak(data.answer, () => setSpeaking(false))
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }, [stream, loading, question])

  useEffect(() => {
    return () => { stream?.getTracks().forEach(t => t.stop()); speechSynthesis.cancel() }
  }, [stream])

  return (
    <>
      {/* Camera area */}
      <div style={cv.cameraArea}>
        <video ref={videoRef} autoPlay playsInline muted style={cv.video} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {!cameraOn && (
          <div style={cv.startOverlay}>
            <div style={cv.startCard}>
              <div style={cv.orb} />
              <div style={cv.startIcon}>👁</div>
              <div style={cv.startTitle}>VisualClaw</div>
              <div style={cv.startTag}>Top Performance Conference 2026</div>
              <div style={cv.startSub}>Boracay · Manila · Philippines</div>
              <button style={cv.startBtn} onClick={() => startCamera()}>
                <span>Activate Camera</span>
              </button>
            </div>
          </div>
        )}

        {cameraOn && !loading && <Brackets />}

        {cameraOn && (
          <div style={cv.topControls}>
            <button style={cv.iconBtn} onClick={flipCamera}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
            </button>
            <button style={cv.iconBtn} onClick={() => { stream?.getTracks().forEach(t => t.stop()); setStream(null); setCameraOn(false) }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        {loading && (
          <div style={cv.loadingOverlay}>
            <div style={cv.cube} />
            <div style={cv.loadingText}>Analyzing with VisualClaw...</div>
          </div>
        )}
      </div>

      {/* Quick chips */}
      {cameraOn && !loading && (
        <div style={cv.quickRow}>
          {QUICK_PROMPTS.map(p => (
            <button key={p.text} style={cv.chip}
              onClick={() => { setQuestion(p.text); setTimeout(() => capture(p.text), 50) }}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Input + capture */}
      {cameraOn && (
        <div style={cv.inputRow}>
          <input style={cv.input} placeholder="Ask anything..." value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && capture()} />
          <div style={cv.captureBtnWrap}>
            {ripple && <div style={cv.rippleRing} />}
            <button style={{ ...cv.captureBtn, opacity: loading ? 0.5 : 1 }}
              onClick={() => capture()} disabled={loading}>
              <div style={cv.captureInner} />
            </button>
          </div>
        </div>
      )}

      {error && <div style={cv.errorBox}>{error}</div>}

      {/* Response panel */}
      {panelOpen && response && (
        <div style={cv.panel}>
          <div style={cv.panelGlow} />
          <div style={cv.panelHeader}>
            <div style={cv.panelBadge}>👁 VisualClaw</div>
            <button style={cv.closeBtn} onClick={() => setPanelOpen(false)}>✕</button>
          </div>
          {capturedThumb && <img src={capturedThumb} alt="" style={cv.thumb} />}
          <p style={cv.responseText}>{response}</p>
          <div style={cv.panelActions}>
            {speaking
              ? <button style={{ ...cv.actBtn, background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}
                  onClick={() => { speechSynthesis.cancel(); setSpeaking(false) }}>⏹ Stop</button>
              : <button style={{ ...cv.actBtn, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}
                  onClick={() => { setSpeaking(true); speak(response, () => setSpeaking(false)) }}>🔊 Speak Again</button>
            }
            <button style={{ ...cv.actBtn, background: 'linear-gradient(135deg,#1d4ed8,#1e40af)' }}
              onClick={() => { setPanelOpen(false); setQuestion('') }}>
              📸 New Capture
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Tab Bar ─────────────────────────────────── */
const TABS = [
  { key: 'camera',   icon: '📸', label: 'Camera' },
  { key: 'carousel', icon: '🎠', label: 'Carousel' },
  { key: 'feed',     icon: '📡', label: 'Feed' },
]
const TAB_ORDER = ['camera', 'carousel', 'feed']

export default function App() {
  const [activeTab, setActiveTab] = useState('camera')
  const [animDir, setAnimDir] = useState('right')
  const [animKey, setAnimKey] = useState(0)
  const prevIdx = useRef(0)

  const switchTab = (key) => {
    if (key === activeTab) return
    const nextIdx = TAB_ORDER.indexOf(key)
    setAnimDir(nextIdx > prevIdx.current ? 'right' : 'left')
    prevIdx.current = nextIdx
    setActiveTab(key)
    setAnimKey(k => k + 1)
  }

  const enterAnim = {
    animation: `${animDir === 'right' ? 'tabEnterRight' : 'tabEnterLeft'} 0.38s cubic-bezier(0.16,1,0.3,1) forwards`,
  }

  return (
    <div style={app.root}>
      {/* Header */}
      <div style={app.header}>
        <div style={app.logoWrap}>
          <div style={app.logoDot} />
          <span style={app.logo}>VisualClaw</span>
        </div>
        <div style={app.headerRight}>
          <span style={app.badge}>🇵🇭 TPC 2026</span>
        </div>
      </div>

      {/* Content with 3D tab transition */}
      <div style={app.content}>
        <div key={animKey} style={{ ...app.page, ...enterAnim }}>
          {activeTab === 'camera'   && <CameraView />}
          {activeTab === 'carousel' && <CarouselCreator />}
          {activeTab === 'feed'     && <SocialFeed />}
        </div>
      </div>

      {/* Tab bar */}
      <div style={app.tabBar}>
        <div style={app.tabBarInner}>
          {TABS.map(tab => {
            const active = activeTab === tab.key
            return (
              <button key={tab.key} style={app.tab} onClick={() => switchTab(tab.key)}>
                <div style={{ ...app.tabIcon, ...(active ? app.tabIconActive : {}) }}>
                  {tab.icon}
                </div>
                <span style={{ ...app.tabLabel, ...(active ? app.tabLabelActive : {}) }}>
                  {tab.label}
                </span>
                {active && <div style={app.tabIndicator} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Styles ──────────────────────────────────── */

const app = {
  root: {
    position: 'fixed', inset: 0,
    background: '#05060f',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 18px',
    background: 'rgba(5,6,15,0.92)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    zIndex: 50, flexShrink: 0,
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  logoDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#38bdf8',
    boxShadow: '0 0 8px rgba(56,189,248,0.8)',
    animation: 'pulseRing 2s ease-in-out infinite',
  },
  logo: { fontSize: 18, fontWeight: 800, letterSpacing: 0.5, color: '#f8fafc' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  badge: {
    fontSize: 11, background: 'rgba(29,78,216,0.4)',
    border: '1px solid rgba(59,130,246,0.4)',
    padding: '3px 10px', borderRadius: 20, fontWeight: 600,
    color: '#93c5fd',
  },
  content: {
    flex: 1, overflow: 'hidden', position: 'relative',
    transformStyle: 'preserve-3d',
  },
  page: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    transformOrigin: 'center center',
  },
  tabBar: {
    flexShrink: 0,
    background: 'rgba(5,6,15,0.95)',
    backdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  tabBarInner: {
    display: 'flex', maxWidth: 480, margin: '0 auto',
  },
  tab: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '8px 0 6px', background: 'transparent',
    position: 'relative', gap: 2,
    transition: 'transform 0.15s ease',
  },
  tabIcon: {
    fontSize: 22,
    transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), filter 0.25s ease',
    filter: 'grayscale(30%) brightness(0.7)',
  },
  tabIconActive: {
    transform: 'translateY(-3px) scale(1.15)',
    filter: 'grayscale(0%) brightness(1.1) drop-shadow(0 0 6px rgba(56,189,248,0.6))',
  },
  tabLabel: {
    fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: 0.3,
    transition: 'color 0.2s ease',
  },
  tabLabelActive: { color: '#38bdf8' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: '50%',
    transform: 'translateX(-50%)',
    width: 20, height: 2,
    background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
    borderRadius: 1,
    boxShadow: '0 0 8px rgba(56,189,248,0.6)',
  },
}

const cv = {
  cameraArea: {
    flex: 1, position: 'relative', overflow: 'hidden',
    background: '#08090f',
  },
  video: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  startOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 40%, rgba(29,78,216,0.15) 0%, rgba(5,6,15,0.97) 70%)',
  },
  startCard: { textAlign: 'center', padding: '24px 32px', position: 'relative' },
  orb: {
    position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
    width: 120, height: 120, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  startIcon: { fontSize: 52, marginBottom: 12, filter: 'drop-shadow(0 0 16px rgba(56,189,248,0.6))' },
  startTitle: { fontSize: 34, fontWeight: 900, marginBottom: 6, letterSpacing: -0.5 },
  startTag: { fontSize: 13, color: '#38bdf8', marginBottom: 4, fontWeight: 600, letterSpacing: 0.5 },
  startSub: { fontSize: 13, color: '#64748b', marginBottom: 28 },
  startBtn: {
    padding: '13px 36px',
    background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
    color: '#fff', borderRadius: 50,
    fontSize: 16, fontWeight: 700, letterSpacing: 0.3,
    boxShadow: '0 0 30px rgba(124,58,237,0.4), 0 4px 20px rgba(0,0,0,0.4)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    animation: 'glowPulse 3s ease-in-out infinite',
  },
  topControls: {
    position: 'absolute', top: 14, right: 14,
    display: 'flex', gap: 8, zIndex: 10,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: '50%',
    background: 'rgba(5,6,15,0.7)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.2s ease, transform 0.2s ease',
  },
  loadingOverlay: {
    position: 'absolute', inset: 0,
    background: 'rgba(5,6,15,0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
  },
  cube: {
    width: 36, height: 36,
    border: '3px solid rgba(56,189,248,0.2)',
    borderTop: '3px solid #38bdf8',
    borderRight: '3px solid #818cf8',
    borderRadius: 8,
    animation: 'spin3D 1.2s ease-in-out infinite',
    boxShadow: '0 0 20px rgba(56,189,248,0.3)',
  },
  loadingText: {
    marginTop: 14, color: '#94a3b8', fontSize: 14, fontWeight: 500,
    letterSpacing: 0.3,
  },
  quickRow: {
    display: 'flex', gap: 8, padding: '8px 14px',
    overflowX: 'auto', flexShrink: 0,
    background: 'rgba(5,6,15,0.8)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    scrollbarWidth: 'none',
  },
  chip: {
    padding: '6px 13px', borderRadius: 20,
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#cbd5e1', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0,
    transition: 'all 0.18s ease',
    backdropFilter: 'blur(8px)',
  },
  inputRow: {
    display: 'flex', gap: 10, padding: '10px 14px',
    background: 'rgba(5,6,15,0.9)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    flexShrink: 0, alignItems: 'center',
  },
  input: {
    flex: 1, padding: '11px 16px',
    background: 'rgba(15,20,40,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#f1f5f9', borderRadius: 50, fontSize: 14,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  captureBtnWrap: { position: 'relative', flexShrink: 0 },
  rippleRing: {
    position: 'absolute', inset: -8,
    borderRadius: '50%',
    border: '2px solid rgba(56,189,248,0.6)',
    animation: 'captureRipple 0.7s ease-out forwards',
    pointerEvents: 'none',
  },
  captureBtn: {
    width: 52, height: 52, borderRadius: '50%',
    background: 'linear-gradient(135deg, #059669, #065f46)',
    border: '2px solid rgba(16,185,129,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 20px rgba(16,185,129,0.3)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  captureInner: {
    width: 28, height: 28, borderRadius: '50%',
    background: 'rgba(255,255,255,0.9)',
  },
  errorBox: {
    margin: '0 14px 8px', padding: '10px 16px',
    background: 'rgba(69,10,10,0.8)', color: '#fca5a5',
    borderRadius: 12, fontSize: 13,
    border: '1px solid rgba(239,68,68,0.2)',
    backdropFilter: 'blur(8px)',
  },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'rgba(10,12,25,0.97)',
    backdropFilter: 'blur(24px)',
    borderRadius: '24px 24px 0 0',
    padding: '18px 18px 36px',
    maxHeight: '58%', overflowY: 'auto', zIndex: 30,
    border: '1px solid rgba(255,255,255,0.06)',
    borderBottom: 'none',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.6), 0 -1px 0 rgba(56,189,248,0.15)',
    animation: 'slideUpPanel 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
  },
  panelGlow: {
    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: 60, height: 3, borderRadius: 2,
    background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.6), transparent)',
  },
  panelHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  panelBadge: {
    fontSize: 12, color: '#38bdf8', fontWeight: 700,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  closeBtn: {
    background: 'rgba(51,65,85,0.8)', color: '#94a3b8',
    width: 28, height: 28, borderRadius: '50%', fontSize: 12,
    border: '1px solid rgba(255,255,255,0.08)',
  },
  thumb: {
    width: '100%', borderRadius: 16, marginBottom: 14,
    maxHeight: 160, objectFit: 'cover',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  },
  responseText: {
    fontSize: 17, lineHeight: 1.7, color: '#e2e8f0',
    marginBottom: 16, fontWeight: 400,
  },
  panelActions: { display: 'flex', gap: 10 },
  actBtn: {
    flex: 1, padding: '12px 0', borderRadius: 14,
    color: '#fff', fontSize: 14, fontWeight: 700,
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    transition: 'transform 0.15s ease',
    letterSpacing: 0.3,
  },
}
