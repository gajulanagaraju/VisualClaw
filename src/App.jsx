import { useRef, useState, useCallback, useEffect, Suspense, lazy } from 'react'
import CarouselCreator from './CarouselCreator.jsx'
import SocialFeed from './SocialFeed.jsx'

const QUICK_PROMPTS = [
  { label: '👁 What is this?', text: 'What is this? Tell me the most useful thing about it.' },
  { label: '📋 Read sign', text: 'Read and translate this sign or text for me.' },
  { label: '🍽 What food?', text: 'What food or dish is this? Is it must-try in Philippines?' },
  { label: '📍 Where am I?', text: 'Based on what you see, where am I? What is this place?' },
  { label: '💰 Magkano?', text: 'Read the price or label. How much is this? Is it a good deal?' },
  { label: '🏆 Award event', text: 'This is from my Top Performance Conference award event. Read and explain what you see.' },
  { label: '👔 Outfit check', text: "I'm about to wear this outfit. Does it work for my conference at Shangri-La Boracay? Give honest advice." },
  { label: '🤝 Who is this?', text: "Read this person's badge or name tag. What role or title do they have? How should I approach them at the conference?" },
  { label: '🗣 Convo help', text: 'I am in a networking situation at the Top Performance Conference. What is a good conversation opener or topic based on what you see?' },
  { label: '📸 Photo spot', text: 'Is this a good background for a professional LinkedIn or conference photo? What angle works best?' },
]

function resizeImage(dataUrl, maxWidth = 1024) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.src = dataUrl
  })
}

function speak(text, onEnd) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.92
  if (onEnd) utt.onend = onEnd
  speechSynthesis.speak(utt)
}

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

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    setCameraOn(false)
  }

  const flipCamera = async () => {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    await startCamera(next)
  }

  const capture = useCallback(async (promptOverride) => {
    if (!stream || loading) return
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

  const handleQuick = (text) => {
    setQuestion(text)
    setTimeout(() => capture(text), 50)
  }

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(t => t.stop())
      speechSynthesis.cancel()
    }
  }, [stream])

  return (
    <>
      <div style={s.cameraArea}>
        <video ref={videoRef} autoPlay playsInline muted style={s.video} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {!cameraOn && (
          <div style={s.startOverlay}>
            <div style={s.startCard}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👁</div>
              <div style={s.startTitle}>VisualClaw</div>
              <div style={s.startSub}>Point. Tap. Know.</div>
              <div style={s.startSub}>Top Performance Conference 2026</div>
              <button style={s.startBtn} onClick={() => startCamera()}>Start Camera</button>
            </div>
          </div>
        )}

        {cameraOn && (
          <div style={s.cameraControls}>
            <button style={s.iconBtn} onClick={flipCamera}>🔄</button>
            <button style={s.iconBtn} onClick={stopCamera}>✕</button>
          </div>
        )}

        {loading && (
          <div style={s.loadingOverlay}>
            <div style={s.spinner} />
            <div style={{ color: '#fff', marginTop: 12, fontSize: 16 }}>Analyzing...</div>
          </div>
        )}
      </div>

      {cameraOn && !loading && (
        <div style={s.quickRow}>
          {QUICK_PROMPTS.map(p => (
            <button key={p.text} style={s.chip} onClick={() => handleQuick(p.text)}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {cameraOn && (
        <div style={s.inputRow}>
          <input
            style={s.input}
            placeholder="Ask anything... (optional)"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && capture()}
          />
          <button
            style={{ ...s.captureBtn, opacity: loading ? 0.6 : 1 }}
            onClick={() => capture()}
            disabled={loading}
          >
            {loading ? '...' : '📸'}
          </button>
        </div>
      )}

      {error && <div style={s.errorBox}>{error}</div>}

      {panelOpen && response && (
        <div style={s.panel}>
          <div style={s.panelHeader}>
            <div style={s.panelTitle}>VisualClaw says</div>
            <button style={s.closeBtn} onClick={() => setPanelOpen(false)}>✕</button>
          </div>
          {capturedThumb && <img src={capturedThumb} alt="captured" style={s.thumb} />}
          <p style={s.responseText}>{response}</p>
          <div style={s.panelActions}>
            {speaking ? (
              <button style={{ ...s.actionBtn, background: '#dc2626' }} onClick={() => { speechSynthesis.cancel(); setSpeaking(false) }}>
                ⏹ Stop
              </button>
            ) : (
              <button style={{ ...s.actionBtn, background: '#7c3aed' }} onClick={() => { setSpeaking(true); speak(response, () => setSpeaking(false)) }}>
                🔊 Speak Again
              </button>
            )}
            <button style={{ ...s.actionBtn, background: '#1d4ed8' }} onClick={() => { setPanelOpen(false); setQuestion('') }}>
              📸 New Capture
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const TABS = [
  { key: 'camera', icon: '📸', label: 'Camera' },
  { key: 'carousel', icon: '🎠', label: 'Carousel' },
  { key: 'feed', icon: '📱', label: 'Feed' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('camera')

  return (
    <div style={s.root}>
      <div style={s.header}>
        <span style={s.logo}>👁 VisualClaw</span>
        <span style={s.badge}>🇵🇭 TPC 2026</span>
      </div>

      <div style={s.content}>
        {activeTab === 'camera' && <CameraView />}
        {activeTab === 'carousel' && <CarouselCreator />}
        {activeTab === 'feed' && <SocialFeed />}
      </div>

      <div style={s.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            style={{ ...s.tab, ...(activeTab === tab.key ? s.tabActive : {}) }}
            onClick={() => setActiveTab(tab.key)}
          >
            <span style={s.tabIcon}>{tab.icon}</span>
            <span style={s.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const s = {
  root: {
    position: 'fixed', inset: 0,
    background: '#0a0a0a',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 16px',
    background: 'rgba(0,0,0,0.9)',
    zIndex: 10, flexShrink: 0,
    borderBottom: '1px solid #1f2937',
  },
  logo: { fontSize: 18, fontWeight: 700, letterSpacing: 1 },
  badge: {
    fontSize: 12, background: '#1d4ed8',
    padding: '3px 10px', borderRadius: 20, fontWeight: 600,
  },
  content: {
    flex: 1, display: 'flex', flexDirection: 'column',
    overflow: 'hidden', position: 'relative',
  },
  tabBar: {
    display: 'flex', borderTop: '1px solid #1f2937',
    background: '#0a0a0a', flexShrink: 0,
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  tab: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '8px 0', background: 'transparent',
    border: 'none', cursor: 'pointer', gap: 2,
  },
  tabActive: { borderTop: '2px solid #2563eb' },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: '#9ca3af', fontWeight: 500 },
  // Camera view styles
  cameraArea: {
    flex: 1, position: 'relative', overflow: 'hidden', background: '#111',
  },
  video: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  startOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.85)',
  },
  startCard: { textAlign: 'center', padding: 32 },
  startTitle: { fontSize: 32, fontWeight: 800, marginBottom: 6 },
  startSub: { fontSize: 15, color: '#9ca3af', marginBottom: 4 },
  startBtn: {
    marginTop: 24, padding: '14px 40px',
    background: '#2563eb', color: '#fff',
    borderRadius: 14, fontSize: 18, fontWeight: 700,
  },
  cameraControls: {
    position: 'absolute', top: 12, right: 12,
    display: 'flex', gap: 8, zIndex: 5,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)', color: '#fff',
    fontSize: 16, border: '1px solid rgba(255,255,255,0.2)',
  },
  loadingOverlay: {
    position: 'absolute', inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  spinner: {
    width: 44, height: 44,
    border: '4px solid rgba(255,255,255,0.2)',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  quickRow: {
    display: 'flex', gap: 8, padding: '8px 12px',
    overflowX: 'auto', flexShrink: 0,
    scrollbarWidth: 'none', background: 'rgba(0,0,0,0.6)',
  },
  chip: {
    padding: '6px 12px', borderRadius: 20,
    background: '#1e293b', color: '#e2e8f0',
    fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0,
    border: '1px solid #334155',
  },
  inputRow: {
    display: 'flex', gap: 8, padding: '8px 12px',
    background: '#0a0a0a', flexShrink: 0, alignItems: 'center',
  },
  input: {
    flex: 1, padding: '10px 14px',
    background: '#1a1a1a', color: '#fff',
    borderRadius: 12, fontSize: 15, border: '1px solid #333',
  },
  captureBtn: {
    width: 52, height: 52, borderRadius: '50%',
    background: '#16a34a', color: '#fff', fontSize: 22, flexShrink: 0,
  },
  errorBox: {
    margin: '0 12px 8px', padding: '10px 14px',
    background: '#450a0a', color: '#fca5a5',
    borderRadius: 10, fontSize: 14,
  },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: '#111827', borderRadius: '20px 20px 0 0',
    padding: '16px 16px 32px',
    maxHeight: '55%', overflowY: 'auto', zIndex: 20,
    boxShadow: '0 -4px 30px rgba(0,0,0,0.6)',
  },
  panelHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  panelTitle: { fontSize: 14, color: '#6b7280', fontWeight: 600, letterSpacing: 0.5 },
  closeBtn: {
    background: '#374151', color: '#9ca3af',
    width: 28, height: 28, borderRadius: '50%', fontSize: 13,
  },
  thumb: {
    width: '100%', borderRadius: 12, marginBottom: 12,
    maxHeight: 140, objectFit: 'cover',
  },
  responseText: { fontSize: 18, lineHeight: 1.65, color: '#f1f5f9', marginBottom: 14 },
  panelActions: { display: 'flex', gap: 10 },
  actionBtn: {
    flex: 1, padding: '11px 0', borderRadius: 12,
    color: '#fff', fontSize: 15, fontWeight: 600,
  },
}
