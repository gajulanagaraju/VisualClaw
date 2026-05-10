import { useState, useRef, useCallback } from 'react'
import { dataUrlsToFiles, webShare, canShareFiles, copyToClipboard, downloadImages, openInstagram, openLinkedIn, openFacebook, openWhatsApp } from './shareUtils.js'
import { loadConnections } from './SocialSettings.jsx'

/* ── Compress image for storage ──────────────── */
async function compressForStorage(dataUrl, maxWidth = 600) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * ratio)
      c.height = Math.round(img.height * ratio)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', 0.82))
    }
    img.src = dataUrl
  })
}

async function makeThumbnail(dataUrl, maxWidth = 200) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * ratio)
      c.height = Math.round(img.height * ratio)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', 0.78))
    }
    img.src = dataUrl
  })
}

/* ── Reel video creation ─────────────────────── */
async function supportsMP4Encoding() {
  try {
    if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return false
    const result = await VideoEncoder.isConfigSupported({
      codec: 'avc1.4D401F', width: 720, height: 900, bitrate: 3_000_000, framerate: 30,
    })
    return !!result.supported
  } catch { return false }
}

function canRecord() {
  try {
    if (typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') return true
    if (typeof MediaRecorder === 'undefined') return false
    const c = document.createElement('canvas')
    if (typeof c.captureStream !== 'function') return false
    return ['video/webm;codecs=vp9', 'video/webm'].some(t => MediaRecorder.isTypeSupported(t))
  } catch { return false }
}

async function createReelVideoMP4(slides, mediaItems, platform, onProgress) {
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer')
  const dims = { linkedin: [720, 900], instagram: [720, 900], facebook: [720, 720], whatsapp: [720, 1280] }
  const [W, H] = dims[platform] || [720, 900]

  const FPS        = 30
  const FRAME_MS   = 1000 / FPS
  const SLIDE_FRAMES = Math.round(2.8 * FPS)
  const FADE_FRAMES  = Math.round(0.45 * FPS)

  // Pre-load all slides as Images (thumbnails for crossfade targets)
  const images = await Promise.all(slides.map(url =>
    new Promise((res, rej) => {
      const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = url
    })
  ))

  const target  = new ArrayBufferTarget()
  const muxer   = new Muxer({ target, video: { codec: 'avc', width: W, height: H }, fastStart: 'in-memory' })
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error:  e => { throw e },
  })
  encoder.configure({ codec: 'avc1.4D401F', width: W, height: H, bitrate: 3_000_000, framerate: FPS })

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  const drawCentered = (src, zoom = 1) => {
    const srcW = src.videoWidth || src.naturalWidth || src.width || W
    const srcH = src.videoHeight || src.naturalHeight || src.height || H
    const scale = Math.max(W / srcW, H / srcH) * zoom
    const dw = srcW * scale, dh = srcH * scale
    ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh)
  }

  const encodeFrame = (totalFrame) => {
    const ts  = Math.round((totalFrame / FPS) * 1_000_000)
    const dur = Math.round(1_000_000 / FPS)
    const vf  = new VideoFrame(canvas, { timestamp: ts, duration: dur })
    encoder.encode(vf, { keyFrame: totalFrame % (FPS * 2) === 0 })
    vf.close()
  }

  let totalFrame = 0

  for (let i = 0; i < images.length; i++) {
    onProgress?.(i + 1, images.length)
    const media = mediaItems?.[i]
    const next  = images[i + 1] || null

    if (media?.isVideo && media.videoSrc) {
      /* ── Video clip: play in real-time, capture at 30 fps ── */
      const videoEl = document.createElement('video')
      videoEl.muted = true
      videoEl.playsInline = true
      videoEl.preload = 'auto'
      videoEl.src = media.videoSrc

      await new Promise((res, rej) => {
        const start = async () => {
          try {
            await videoEl.play()
            const clipFrames = Math.round(Math.min(media.duration || 5, 10) * FPS)
            for (let f = 0; f < clipFrames; f++) {
              const t0 = performance.now()
              ctx.clearRect(0, 0, W, H)
              drawCentered(videoEl)
              if (next && f >= clipFrames - FADE_FRAMES) {
                ctx.globalAlpha = Math.min((f - (clipFrames - FADE_FRAMES)) / FADE_FRAMES, 1)
                drawCentered(next, 1)
                ctx.globalAlpha = 1
              }
              encodeFrame(totalFrame++)
              while (encoder.encodeQueueSize > 10) await new Promise(r => setTimeout(r, 5))
              const wait = FRAME_MS - (performance.now() - t0)
              if (wait > 0) await new Promise(r => setTimeout(r, wait))
            }
            videoEl.pause()
            res()
          } catch (e) { rej(e) }
        }
        if (videoEl.readyState >= 3) { start() }
        else { videoEl.oncanplay = start; videoEl.onerror = rej }
      })

    } else {
      /* ── Photo slide: Ken Burns frame-by-frame ── */
      const img = images[i]
      for (let f = 0; f < SLIDE_FRAMES; f++) {
        const progress = f / SLIDE_FRAMES
        const zoom = i % 2 === 0 ? 1 + 0.055 * progress : 1.055 - 0.055 * progress
        ctx.clearRect(0, 0, W, H)
        drawCentered(img, zoom)
        if (next && f >= SLIDE_FRAMES - FADE_FRAMES) {
          ctx.globalAlpha = Math.min((f - (SLIDE_FRAMES - FADE_FRAMES)) / FADE_FRAMES, 1)
          drawCentered(next, 1)
          ctx.globalAlpha = 1
        }
        encodeFrame(totalFrame++)
        if (f % 15 === 0) await new Promise(r => setTimeout(r, 0))
      }
    }
  }

  // ~700ms hold on last frame
  const holdFrames = Math.round(0.7 * FPS)
  for (let f = 0; f < holdFrames; f++) encodeFrame(totalFrame++)

  await encoder.flush()
  muxer.finalize()
  return { blob: new Blob([target.buffer], { type: 'video/mp4' }), mimeType: 'video/mp4' }
}

async function createReelVideoWebM(slides, mediaItems, platform, onProgress) {
  const dims = { linkedin: [720, 900], instagram: [720, 900], facebook: [720, 720], whatsapp: [720, 1280] }
  const [W, H] = dims[platform] || [720, 900]

  const canvas   = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx      = canvas.getContext('2d')
  const mimeType = ['video/webm;codecs=vp9', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm'
  const stream   = canvas.captureStream(30)
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3_000_000 })
  const chunks   = []
  recorder.ondataavailable = e => e.data.size > 0 && chunks.push(e.data)
  recorder.start(200)

  const SLIDE_MS = 2800
  const FADE_MS  = 450

  const images = await Promise.all(slides.map(url =>
    new Promise((res, rej) => {
      const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = url
    })
  ))

  const drawCentered = (src, zoom = 1) => {
    const srcW = src.videoWidth || src.naturalWidth || src.width || W
    const srcH = src.videoHeight || src.naturalHeight || src.height || H
    const scale = Math.max(W / srcW, H / srcH) * zoom
    const dw = srcW * scale, dh = srcH * scale
    ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh)
  }

  for (let i = 0; i < images.length; i++) {
    onProgress?.(i + 1, images.length)
    const media = mediaItems?.[i]
    const next  = images[i + 1] || null

    if (media?.isVideo && media.videoSrc) {
      /* ── Video clip: play in real-time, MediaRecorder captures it ── */
      const videoEl = document.createElement('video')
      videoEl.muted = true
      videoEl.playsInline = true
      videoEl.preload = 'auto'
      videoEl.src = media.videoSrc

      await new Promise((res, rej) => {
        const start = async () => {
          try {
            const clipMs = Math.min(media.duration || 5, 10) * 1000
            await videoEl.play()
            const t0 = performance.now()
            await new Promise(innerRes => {
              const frame = () => {
                const elapsed = performance.now() - t0
                if (elapsed >= clipMs) { videoEl.pause(); innerRes(); return }
                ctx.clearRect(0, 0, W, H)
                drawCentered(videoEl)
                if (next && elapsed > clipMs - FADE_MS) {
                  ctx.globalAlpha = Math.min((elapsed - (clipMs - FADE_MS)) / FADE_MS, 1)
                  drawCentered(next, 1)
                  ctx.globalAlpha = 1
                }
                requestAnimationFrame(frame)
              }
              requestAnimationFrame(frame)
            })
            res()
          } catch (e) { rej(e) }
        }
        if (videoEl.readyState >= 3) { start() }
        else { videoEl.oncanplay = start; videoEl.onerror = rej }
      })

    } else {
      /* ── Photo slide: Ken Burns via rAF ── */
      const img = images[i]
      const t0  = performance.now()
      await new Promise(resolve => {
        const frame = () => {
          const elapsed  = performance.now() - t0
          const progress = Math.min(elapsed / SLIDE_MS, 1)
          const zoom     = i % 2 === 0 ? 1 + 0.055 * progress : 1.055 - 0.055 * progress
          ctx.clearRect(0, 0, W, H)
          drawCentered(img, zoom)
          if (next && elapsed > SLIDE_MS - FADE_MS) {
            ctx.globalAlpha = Math.min((elapsed - (SLIDE_MS - FADE_MS)) / FADE_MS, 1)
            drawCentered(next, 1)
            ctx.globalAlpha = 1
          }
          progress < 1 ? requestAnimationFrame(frame) : resolve()
        }
        requestAnimationFrame(frame)
      })
    }
  }

  await new Promise(r => setTimeout(r, 700))
  recorder.stop()
  return new Promise(resolve => {
    recorder.onstop = () => resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType })
  })
}

async function createReelVideo(slides, mediaItems, platform, onProgress) {
  if (await supportsMP4Encoding()) {
    return createReelVideoMP4(slides, mediaItems, platform, onProgress)
  }
  return createReelVideoWebM(slides, mediaItems, platform, onProgress)
}

const PLATFORMS = [
  { key: 'linkedin',  label: 'LinkedIn',  icon: 'in', color: '#0A66C2', desc: '5–8 slides · Professional', w: 1080, h: 1350 },
  { key: 'instagram', label: 'Instagram', icon: '◎',  color: '#E1306C', desc: '6–10 slides · Visual',       w: 1080, h: 1350 },
  { key: 'facebook',  label: 'Facebook',  icon: 'f',  color: '#1877F2', desc: '4–6 slides · Square',        w: 1080, h: 1080 },
  { key: 'whatsapp',  label: 'WhatsApp',  icon: '💬', color: '#25D366', desc: '3–5 slides · Story',         w: 1080, h: 1920 },
]

/* ── Canvas text wrapping ────────────────────── */
function wrapText(ctx, text, maxW) {
  const words = (text || '').split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w
    if (ctx.measureText(test).width <= maxW) { cur = test }
    else { if (cur) lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines
}

/* ── Render one slide to canvas ──────────────── */
function renderSlide({ photo, slide, index, total, platform, eventName, isCover }) {
  return new Promise(resolve => {
    const P = PLATFORMS.find(p => p.key === platform) || PLATFORMS[0]
    const W = P.w, H = P.h

    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')

    const img = new Image()
    img.onload = () => {
      /* 1 ── Photo (cover-fill) */
      const scale = Math.max(W / img.width, H / img.height)
      const dw = img.width * scale, dh = img.height * scale
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)

      /* 2 ── Bottom gradient overlay */
      const g = ctx.createLinearGradient(0, H * (isCover ? 0.1 : 0.28), 0, H)
      g.addColorStop(0, 'rgba(3,4,12,0)')
      g.addColorStop(isCover ? 0.4 : 0.46, 'rgba(3,4,12,0.62)')
      g.addColorStop(1, 'rgba(3,4,12,0.97)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)

      /* 3 ── Top vignette */
      const gt = ctx.createLinearGradient(0, 0, 0, H * 0.22)
      gt.addColorStop(0, 'rgba(3,4,12,0.55)')
      gt.addColorStop(1, 'rgba(3,4,12,0)')
      ctx.fillStyle = gt; ctx.fillRect(0, 0, W, H * 0.22)

      /* 4 ── Slide counter pill (top-right) */
      const countTxt = `${String(index + 1).padStart(2,'0')} · ${String(total).padStart(2,'0')}`
      const pillW = 130, pillH = 48, pillX = W - pillW - 44, pillY = 40
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(pillX, pillY, pillW, pillH, 24)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.font = `600 24px system-ui, -apple-system, sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.textAlign = 'center'
      ctx.fillText(countTxt, pillX + pillW / 2, pillY + 32)
      ctx.restore()

      if (isCover) {
        /* ── COVER SLIDE ── centered hero layout */
        // Accent glow circle
        const radGrad = ctx.createRadialGradient(W/2, H*0.5, 0, W/2, H*0.5, W*0.6)
        radGrad.addColorStop(0, 'rgba(56,189,248,0.08)')
        radGrad.addColorStop(1, 'rgba(56,189,248,0)')
        ctx.fillStyle = radGrad; ctx.fillRect(0, 0, W, H)

        // Horizontal accent line
        const lineY = H * 0.52
        ctx.fillStyle = 'rgba(56,189,248,0.9)'
        ctx.fillRect(W * 0.35, lineY, W * 0.3, 3)

        // Title — large, centered
        const tSize = Math.round(W * 0.075)
        ctx.font = `900 ${tSize}px system-ui, -apple-system, sans-serif`
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.shadowBlur = 24; ctx.shadowColor = 'rgba(0,0,0,0.9)'
        const titleLines = wrapText(ctx, slide.slideTitle || '', W * 0.82)
        let ty = lineY + tSize * 1.1
        titleLines.slice(0, 3).forEach(ln => {
          ctx.fillText(ln, W / 2, ty); ty += tSize * 1.18
        })

        // Caption
        ctx.shadowBlur = 0
        ctx.font = `400 ${Math.round(W * 0.036)}px system-ui, -apple-system, sans-serif`
        ctx.fillStyle = 'rgba(186,230,253,0.9)'
        const capLines = wrapText(ctx, slide.slideCaption || '', W * 0.72)
        capLines.slice(0, 2).forEach(ln => {
          ctx.fillText(ln, W / 2, ty + 10); ty += Math.round(W * 0.036) * 1.5
        })

        // Event tag
        ctx.font = `700 ${Math.round(W * 0.026)}px system-ui, -apple-system, sans-serif`
        ctx.fillStyle = 'rgba(56,189,248,0.85)'
        ctx.fillText('✦  ' + (eventName || 'TOP PERFORMANCE CONFERENCE 2026').toUpperCase(), W / 2, H - 60)

      } else {
        /* ── REGULAR SLIDE ── bottom-left layout */
        const PAD = 52
        const accentColor = '#38bdf8'

        // Vertical accent bar
        const textBlockTop = H * 0.62
        ctx.fillStyle = accentColor
        ctx.fillRect(PAD, textBlockTop, 5, Math.round(H * 0.12))

        // Title
        const tSize = Math.round(W * 0.065)
        ctx.font = `800 ${tSize}px system-ui, -apple-system, sans-serif`
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'left'
        ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(0,0,0,0.9)'
        const titleLines = wrapText(ctx, slide.slideTitle || '', W - PAD * 2 - 20)
        let ty = textBlockTop + 8
        titleLines.slice(0, 2).forEach(ln => {
          ctx.fillText(ln, PAD + 22, ty + tSize); ty += tSize * 1.18
        })

        // Caption
        ctx.shadowBlur = 0
        const cSize = Math.round(W * 0.034)
        ctx.font = `400 ${cSize}px system-ui, -apple-system, sans-serif`
        ctx.fillStyle = 'rgba(203,213,225,0.88)'
        const capLines = wrapText(ctx, slide.slideCaption || '', W - PAD * 2)
        capLines.slice(0, 2).forEach(ln => {
          ctx.fillText(ln, PAD + 22, ty + cSize + 8); ty += cSize * 1.5
        })

        // Bottom event tag row
        // Dot separator
        ctx.fillStyle = 'rgba(56,189,248,0.6)'
        ctx.beginPath(); ctx.arc(PAD, H - 52, 4, 0, Math.PI * 2); ctx.fill()

        ctx.font = `600 ${Math.round(W * 0.026)}px system-ui, -apple-system, sans-serif`
        ctx.fillStyle = 'rgba(148,163,184,0.8)'
        const shortName = (eventName || 'Top Performance Conference 2026').slice(0, 38)
        ctx.fillText(shortName.toUpperCase(), PAD + 18, H - 42)
      }

      resolve(canvas.toDataURL('image/jpeg', 0.93))
    }
    img.onerror = () => resolve(photo?.dataUrl || '')
    img.src = photo?.dataUrl || ''
  })
}

/* ── Resize uploaded photos ──────────────────── */
async function prepPhoto(file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const maxDim = 1200
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale; canvas.height = img.height * scale
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
        resolve({ dataUrl, base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', name: file.name })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

/* ── Extract thumbnail + metadata from video ─── */
async function prepVideo(file) {
  const videoSrc = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.5, video.duration * 0.1)
    }
    video.onseeked = () => {
      const vw = video.videoWidth || 640
      const vh = video.videoHeight || 480
      const scale = Math.min(1, 1200 / Math.max(vw, vh))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(vw * scale)
      canvas.height = Math.round(vh * scale)
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
      resolve({
        dataUrl,                          // thumbnail shown in grid + used for carousel slide design
        base64: dataUrl.split(',')[1],    // thumbnail sent to AI for analysis
        mimeType: 'image/jpeg',
        name: file.name,
        isVideo: true,
        videoSrc,                         // blob URL used for reel playback
        duration: video.duration,
      })
    }
    video.onerror = () => reject(new Error('Video load failed'))
    video.src = videoSrc
  })
}

function copyText(text, setDone) {
  navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 2200) })
}

/* ── Slide preview card ──────────────────────── */
function RenderedSlide({ dataUrl, index, onDownload }) {
  return (
    <div style={{
      ...ss.slideCard,
      animation: `cardEntrance 0.38s cubic-bezier(0.16,1,0.3,1) ${index * 55}ms both`,
    }}>
      <img src={dataUrl} alt={`Slide ${index + 1}`} style={ss.slideImg} />
      <button style={ss.dlSlideBtn} onClick={() => onDownload(dataUrl, index)}>
        ⬇
      </button>
    </div>
  )
}

/* ── Share Panel ─────────────────────────────── */
const SHARE_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: '◎', color: '#E1306C' },
  { key: 'linkedin',  label: 'LinkedIn',  icon: 'in', color: '#0A66C2' },
  { key: 'facebook',  label: 'Facebook',  icon: 'f',  color: '#1877F2' },
  { key: 'whatsapp',  label: 'WhatsApp',  icon: '💬', color: '#25D366' },
]

function SharePanel({ rendered, caption, platform }) {
  const [shareState, setShareState] = useState({}) // { platform: 'sharing'|'done'|'error' }
  const [instruction, setInstruction] = useState(null)

  const setStatus = (key, status) => setShareState(prev => ({ ...prev, [key]: status }))

  const doShare = async (target) => {
    setStatus(target, 'sharing')
    setInstruction(null)

    try {
      const files = await dataUrlsToFiles(rendered)

      if (target === 'whatsapp') {
        // WhatsApp: share text via wa.me, download images separately
        await copyToClipboard(caption)
        downloadImages(rendered, 'whatsapp')
        setTimeout(() => openWhatsApp(caption), 800)
        setStatus(target, 'done')
        setInstruction({ platform: target, text: 'Images saved to device. Caption pre-filled in WhatsApp. Attach the saved images.' })
        return
      }

      // Try Web Share API (native share sheet — works on iOS/Android)
      const shared = await webShare(files, caption, 'TPC 2026 Carousel')
      if (shared) {
        setStatus(target, 'done')
        return
      }

      // Fallback: download images + copy caption + open app
      await copyToClipboard(caption)
      downloadImages(rendered, target)

      if (target === 'instagram') {
        setInstruction({ platform: 'instagram', text: 'Photos saved to your device. Caption copied! Open Instagram → New Post → select the saved slides in order.' })
        setTimeout(openInstagram, 600)
      } else if (target === 'linkedin') {
        setInstruction({ platform: 'linkedin', text: 'Photos saved. Caption copied! LinkedIn is opening — create a post and upload the slides.' })
        setTimeout(openLinkedIn, 600)
      } else if (target === 'facebook') {
        setInstruction({ platform: 'facebook', text: 'Photos saved. Caption copied! Facebook is opening — create a post and upload the slides.' })
        setTimeout(openFacebook, 600)
      }
      setStatus(target, 'done')
    } catch (e) {
      setStatus(target, 'error')
      console.error('Share error:', e)
    }
  }

  return (
    <div style={sp.panel}>
      <div style={sp.title}>
        <span style={sp.titleDot} />
        Share to Social Media
      </div>
      <div style={sp.grid}>
        {SHARE_PLATFORMS.map(p => {
          const state = shareState[p.key]
          return (
            <button key={p.key}
              style={{ ...sp.shareBtn, borderColor: `${p.color}40`, ...(state === 'done' ? { background: `${p.color}18` } : {}) }}
              onClick={() => doShare(p.key)}
              disabled={state === 'sharing'}>
              <span style={{ ...sp.shareBtnIcon, color: p.color, background: `${p.color}15` }}>
                {state === 'sharing' ? '⏳' : state === 'done' ? '✓' : p.icon}
              </span>
              <span style={sp.shareBtnLabel}>{p.label}</span>
            </button>
          )
        })}
      </div>

      {instruction && (
        <div style={sp.instruction}>
          <div style={sp.instrText}>{instruction.text}</div>
        </div>
      )}

      {canShareFiles()
        ? <div style={sp.webShareNote}>📱 Native share sheet available — tap a platform above</div>
        : <div style={sp.webShareNote}>💾 Images will save to your device · caption auto-copied · app will open</div>
      }
    </div>
  )
}

/* ── Main component ──────────────────────────── */
export default function CarouselCreator() {
  const [photos, setPhotos]         = useState([])
  const [platform, setPlatform]     = useState('linkedin')
  const [eventName, setEventName]   = useState('Top Performance Conference 2026, Boracay')
  const [generating, setGenerating] = useState(false)
  const [rendering, setRendering]   = useState(false)
  const [result, setResult]         = useState(null)
  const [rendered, setRendered]     = useState([])
  const [error, setError]           = useState('')
  const [captionCopied, setCaptionCopied] = useState(false)
  const [hashtagCopied, setHashtagCopied] = useState(false)
  // Reel state
  const [reelPhase, setReelPhase]   = useState(null) // null | 'creating' | 'done' | 'error'
  const [reelProgress, setReelProgress] = useState({ cur: 0, total: 0 })
  const [reelUrl, setReelUrl]       = useState(null)
  const [reelMime, setReelMime]     = useState('video/mp4')
  // Save-to-history state
  const [savePhase, setSavePhase]   = useState(null) // null | 'saving' | 'saved' | 'error'
  // Ordered media parallel to rendered[] — tells reel which slots are videos
  const [orderedMedia, setOrderedMedia] = useState([])
  const fileRef = useRef(null)

  const handleFiles = useCallback(async files => {
    const arr = Array.from(files).slice(0, 10)
    const processed = await Promise.all(
      arr.map(f => f.type.startsWith('video/') ? prepVideo(f) : prepPhoto(f))
    )
    setPhotos(prev => [...prev, ...processed].slice(0, 10))
    setResult(null); setRendered([]); setOrderedMedia([])
  }, [])

  const generate = async () => {
    if (!photos.length) return
    setGenerating(true); setError(''); setResult(null); setRendered([]); setOrderedMedia([])
    try {
      const res = await fetch('/api/create-carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: photos.map(p => ({ base64: p.base64, mimeType: p.mimeType, name: p.name })),
          platform, eventName,
        }),
      })
      const data = await res.json()
      if (data.error && !data.slides) throw new Error(data.error)
      setResult(data)

      // Immediately render slides to canvas
      setRendering(true)
      const orderedPhotos = data.slideOrder?.map(i => photos[i]) || photos
      const renderedImgs = await Promise.all(
        (data.slides || []).map((slide, i) =>
          renderSlide({
            photo: orderedPhotos[i] || photos[slide.photoIndex] || photos[0],
            slide, index: i, total: data.slides.length,
            platform, eventName,
            isCover: i === (data.coverSlideIndex ?? 0),
          })
        )
      )
      setRendered(renderedImgs)
      setOrderedMedia(orderedPhotos)
    } catch (e) {
      setError(e.message || 'Generation failed. Try again.')
    } finally {
      setGenerating(false); setRendering(false)
    }
  }

  const downloadSlide = (dataUrl, index) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `tpc2026_${platform}_slide_${String(index + 1).padStart(2, '0')}.jpg`
    a.click()
  }

  const downloadAll = () => {
    rendered.forEach((dataUrl, i) => {
      setTimeout(() => downloadSlide(dataUrl, i), i * 350)
    })
  }

  const downloadCaptions = () => {
    if (!result) return
    const text = [
      `# ${platform.toUpperCase()} Captions — ${eventName}`,
      result.postTheme ? `# Theme: ${result.postTheme}` : '',
      '', '## Full Caption', result.fullCaption,
      '', '## Hashtags', result.hashtags,
      '', '## Slide Captions',
      ...(result.slides || []).map((sl, i) => `\nSlide ${i+1}: ${sl.slideTitle}\n${sl.slideCaption}`),
    ].filter(Boolean).join('\n')
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })),
      download: `tpc2026_${platform}_captions.txt`,
    })
    a.click()
  }

  const createReel = async () => {
    if (!rendered.length) return
    setReelPhase('creating')
    setReelUrl(null)
    try {
      const { blob, mimeType } = await createReelVideo(
        rendered, orderedMedia, platform,
        (cur, total) => setReelProgress({ cur, total })
      )
      const url = URL.createObjectURL(blob)
      setReelUrl(url)
      setReelMime(mimeType)
      setReelPhase('done')
    } catch (e) {
      console.error('Reel error:', e)
      setReelPhase('error')
    }
  }

  const downloadReel = () => {
    if (!reelUrl) return
    const ext = reelMime.includes('webm') ? 'webm' : 'mp4'
    const a = document.createElement('a')
    a.href = reelUrl
    a.download = `tpc2026_${platform}_reel.${ext}`
    a.click()
  }

  const saveToHistory = async () => {
    if (!rendered.length || !result) return
    setSavePhase('saving')
    try {
      const thumbnail = await makeThumbnail(rendered[0], 200)
      const compressed = await Promise.all(rendered.map(url => compressForStorage(url, 600)))
      const res = await fetch('/api/history-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform, eventName,
          caption: result.fullCaption || '',
          hashtags: result.hashtags || '',
          slides: compressed,
          thumbnail,
          createdAt: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Save failed')
      setSavePhase('saved')
      setTimeout(() => setSavePhase(null), 3000)
    } catch (e) {
      console.error('Save error:', e)
      setSavePhase('error')
      setTimeout(() => setSavePhase(null), 3000)
    }
  }

  const activePlatform = PLATFORMS.find(p => p.key === platform) || PLATFORMS[0]
  const isLoading = generating || rendering

  return (
    <div style={ss.root}>
      <div style={ss.header}>
        <div style={ss.title}>🎠 Carousel Creator</div>
        <div style={ss.subtitle}>Designed slides with text overlays · ready to post</div>
      </div>

      <div style={ss.scroll}>
        {/* Upload zone */}
        <div style={ss.uploadZone} onClick={() => fileRef.current?.click()}>
          {photos.length === 0 ? (
            <div style={ss.uploadEmpty}>
              <div style={ss.uploadOrb} />
              <div style={{ fontSize: 36, marginBottom: 8 }}>🖼</div>
              <div style={ss.uploadText}>Tap to add photos</div>
              <div style={ss.uploadSub}>Mix photos + short videos · up to 10 items</div>
            </div>
          ) : (
            <div style={ss.thumbGrid}>
              {photos.map((p, i) => (
                <div key={i} style={ss.thumbWrap}>
                  <img src={p.dataUrl} alt="" style={ss.thumb} />
                  {p.isVideo && <div style={ss.thumbPlayBadge}>▶</div>}
                  <button style={ss.removeBtn} onClick={e => { e.stopPropagation(); setPhotos(prev => prev.filter((_,j)=>j!==i)); setResult(null); setRendered([]); setOrderedMedia([]) }}>✕</button>
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
        <input ref={fileRef} type="file" accept="image/*,video/mp4,video/quicktime,video/webm" multiple
          style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />

        <div style={ss.tip}>
          <span>📁</span>
          <span>Google Photos: download album photos → upload above</span>
        </div>

        {/* Platform */}
        <div style={ss.section}>
          <div style={ss.sLabel}>Platform</div>
          <div style={ss.platformGrid}>
            {PLATFORMS.map(p => (
              <button key={p.key}
                style={{ ...ss.platformBtn, ...(platform === p.key ? { borderColor: p.color, background: `${p.color}18`, boxShadow: `0 0 20px ${p.color}18` } : {}) }}
                onClick={() => { setPlatform(p.key); setRendered([]); setOrderedMedia([]) }}>
                <span style={{ fontSize: 18, color: platform === p.key ? p.color : '#64748b' }}>{p.icon}</span>
                <span style={{ ...ss.pName, color: platform === p.key ? '#f1f5f9' : '#94a3b8' }}>{p.label}</span>
                <span style={ss.pDesc}>{p.desc}</span>
                <span style={{ ...ss.pDim, color: platform === p.key ? `${p.color}bb` : '#334155' }}>{p.w}×{p.h}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Event name */}
        <div style={ss.section}>
          <div style={ss.sLabel}>Event Name <span style={{ color: '#475569', fontWeight: 400 }}>(appears on slides)</span></div>
          <input style={ss.input} value={eventName}
            onChange={e => setEventName(e.target.value)}
            placeholder="Event name shown on every slide..." />
        </div>

        {/* Generate button */}
        {photos.length > 0 && !isLoading && (
          <button style={{ ...ss.genBtn, background: `linear-gradient(135deg, ${activePlatform.color}, #7c3aed)` }} onClick={generate}>
            ✨ Generate {activePlatform.label} Carousel
          </button>
        )}

        {/* Loading states */}
        {generating && (
          <div style={ss.loadBox}>
            <div style={ss.loadCube} />
            <div style={ss.loadTitle}>VisualClaw is analyzing your photos...</div>
            <div style={ss.loadSub}>Selecting best order · Writing captions · Planning layouts</div>
          </div>
        )}
        {rendering && !generating && (
          <div style={ss.loadBox}>
            <div style={{ ...ss.loadCube, borderTopColor: '#a78bfa', borderRightColor: '#38bdf8' }} />
            <div style={ss.loadTitle}>Rendering slides with text overlays...</div>
            <div style={ss.loadSub}>Designing {result?.slides?.length || 0} slides at {activePlatform.w}×{activePlatform.h}px</div>
          </div>
        )}

        {error && <div style={ss.errorBox}>{error}</div>}

        {/* Rendered slides */}
        {rendered.length > 0 && (
          <div style={{ animation: 'fadeInScale 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>

            {result?.postTheme && (
              <div style={ss.themeBadge}>
                <span style={{ color: activePlatform.color }}>◆</span> {result.postTheme}
              </div>
            )}

            {/* Slide images */}
            <div style={{ ...ss.sLabel, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <span>Designed Slides ({rendered.length})</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={ss.dlAllBtn} onClick={downloadAll}>⬇ JPGs</button>
                {/* Save to history */}
                <button
                  style={{
                    ...ss.dlAllBtn,
                    background: savePhase === 'saved' ? 'rgba(16,185,129,0.2)' : savePhase === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.15)',
                    border: `1px solid ${savePhase === 'saved' ? 'rgba(16,185,129,0.4)' : savePhase === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(124,58,237,0.3)'}`,
                    color: savePhase === 'saved' ? '#34d399' : savePhase === 'error' ? '#fca5a5' : '#a78bfa',
                  }}
                  onClick={saveToHistory}
                  disabled={savePhase === 'saving' || savePhase === 'saved'}>
                  {savePhase === 'saving' ? '⏳' : savePhase === 'saved' ? '✓ Saved' : savePhase === 'error' ? '✕ Failed' : '💾 Save'}
                </button>
              </div>
            </div>

            <div style={ss.slidesRow}>
              {rendered.map((dataUrl, i) => (
                <RenderedSlide key={i} dataUrl={dataUrl} index={i}
                  onDownload={downloadSlide} />
              ))}
            </div>

            {/* Caption */}
            <div style={ss.sLabel}>Full Caption</div>
            <div style={ss.captionCard}>
              <pre style={ss.captionText}>{result.fullCaption}</pre>
              <button style={{ ...ss.copyBtn, background: activePlatform.color }}
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

            {/* Share panel */}
            <SharePanel rendered={rendered} caption={result?.fullCaption || ''} platform={platform} />

            {/* Reel creator */}
            <div style={ss.reelBox}>
              <div style={ss.reelHeader}>
                <div>
                  <div style={ss.reelTitle}>🎬 Create Reel</div>
                  <div style={ss.reelSub}>H.264 MP4 · photos get Ken Burns · videos play as-is · iPhone & Instagram ready</div>
                </div>
              </div>

              {reelPhase === null && canRecord() && (
                <button
                  style={{ ...ss.genBtn, background: 'linear-gradient(135deg,#7c3aed,#1d4ed8)', marginBottom: 0, padding: '12px' }}
                  onClick={createReel}>
                  ▶ Generate Reel
                </button>
              )}

              {reelPhase === null && !canRecord() && (
                <div style={ss.reelUnsupported}>
                  MediaRecorder not supported on this browser. Download the JPGs and use Instagram/CapCut to combine into a reel.
                </div>
              )}

              {reelPhase === 'creating' && (
                <div style={ss.reelProgress}>
                  <div style={ss.loadCube} />
                  <div style={{ marginTop: 10, color: '#a78bfa', fontSize: 13, fontWeight: 600 }}>
                    Rendering slide {reelProgress.cur} of {reelProgress.total}...
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Ken Burns effect · crossfades · encoding video</div>
                  <div style={ss.reelBar}>
                    <div style={{ ...ss.reelBarFill, width: `${reelProgress.total ? (reelProgress.cur / reelProgress.total) * 100 : 0}%` }} />
                  </div>
                </div>
              )}

              {reelPhase === 'done' && reelUrl && (
                <div>
                  <video
                    src={reelUrl}
                    controls
                    loop
                    playsInline
                    style={ss.reelPreview}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button style={{ ...ss.genBtn, background: 'linear-gradient(135deg,#065f46,#047857)', flex: 1, padding: '11px', marginBottom: 0 }} onClick={downloadReel}>
                      ⬇ Download Reel
                    </button>
                    <button style={{ ...ss.genBtn, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.07)', color: '#94a3b8', flex: 0, padding: '11px 16px', marginBottom: 0 }} onClick={() => { setReelPhase(null); setReelUrl(null) }}>
                      ↺
                    </button>
                  </div>
                </div>
              )}

              {reelPhase === 'error' && (
                <div style={ss.reelUnsupported}>
                  Reel creation failed. Try with fewer slides or use a shorter event name.
                  <button style={{ marginLeft: 10, color: '#a78bfa', fontSize: 12 }} onClick={() => setReelPhase(null)}>Retry</button>
                </div>
              )}
            </div>

            <div style={ss.actionRow}>
              <button style={ss.dlBtn} onClick={downloadCaptions}>⬇ Captions .txt</button>
              <button style={ss.resetBtn} onClick={() => { setResult(null); setRendered([]); setPhotos([]); setOrderedMedia([]) }}>
                🔄 New Carousel
              </button>
            </div>

            <div style={ss.howToPost}>
              <div style={ss.howToTitle}>How to post</div>
              {platform === 'linkedin' && (
                <div style={ss.howToText}>LinkedIn → Start a post → Upload all JPGs in order → Paste caption → Post</div>
              )}
              {platform === 'instagram' && (
                <div style={ss.howToText}>Instagram → New Post → tap + for multiple → select slides in order → paste caption</div>
              )}
              {platform === 'facebook' && (
                <div style={ss.howToText}>Facebook → Create post → Photo/Video → select all slides → paste caption</div>
              )}
              {platform === 'whatsapp' && (
                <div style={ss.howToText}>WhatsApp → Status or chat → attach images in order → paste message</div>
              )}
            </div>
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>
    </div>
  )
}

/* ── Styles ──────────────────────────────────── */
const ss = {
  root: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#05060f' },
  header: { padding: '12px 18px 6px', flexShrink: 0 },
  title: { fontSize: 20, fontWeight: 800, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 3 },
  scroll: { flex: 1, overflowY: 'auto', padding: '0 14px', scrollbarWidth: 'none' },
  uploadZone: {
    border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: 18, marginBottom: 10,
    background: 'rgba(10,14,28,0.6)', cursor: 'pointer', overflow: 'hidden', minHeight: 110,
  },
  uploadEmpty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, position: 'relative' },
  uploadOrb: {
    position: 'absolute', width: 80, height: 80, borderRadius: '50%', top: 10,
    background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
  },
  uploadText: { fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 },
  uploadSub: { fontSize: 12, color: '#475569', textAlign: 'center' },
  thumbGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, padding: 14 },
  thumbWrap: { position: 'relative', width: 72, height: 72, borderRadius: 10, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%', objectFit: 'cover' },
  removeBtn: {
    position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%',
    background: 'rgba(239,68,68,0.9)', color: '#fff', fontSize: 9, lineHeight: '18px', textAlign: 'center', fontWeight: 800,
  },
  thumbNum: { position: 'absolute', bottom: 2, left: 4, fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 700 },
  thumbPlayBadge: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    fontSize: 18, color: '#fff', pointerEvents: 'none',
    textShadow: '0 1px 6px rgba(0,0,0,0.9)',
    background: 'rgba(0,0,0,0.38)', borderRadius: '50%',
    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
    paddingLeft: 2,
  },
  addMore: {
    width: 72, height: 72, borderRadius: 10, border: '1.5px dashed rgba(255,255,255,0.1)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
    background: 'rgba(15,20,40,0.5)',
  },
  tip: {
    display: 'flex', gap: 8, alignItems: 'center', padding: '7px 12px', marginBottom: 14,
    background: 'rgba(10,14,28,0.5)', border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 10, fontSize: 11, color: '#64748b',
  },
  section: { marginBottom: 14 },
  sLabel: {
    fontSize: 10, fontWeight: 800, color: '#475569',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
  },
  platformGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  platformBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 14px',
    borderRadius: 14, background: 'rgba(10,14,28,0.6)', border: '1.5px solid rgba(255,255,255,0.07)',
    cursor: 'pointer', gap: 2, transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
  },
  pName: { fontSize: 13, fontWeight: 700, transition: 'color 0.2s' },
  pDesc: { fontSize: 10, color: '#475569' },
  pDim: { fontSize: 9, fontWeight: 600, letterSpacing: 0.5 },
  input: {
    width: '100%', padding: '11px 16px', background: 'rgba(10,14,28,0.6)',
    border: '1.5px solid rgba(255,255,255,0.07)', color: '#f1f5f9',
    borderRadius: 12, fontSize: 14, boxSizing: 'border-box',
  },
  genBtn: {
    width: '100%', padding: '14px', borderRadius: 50, color: '#fff',
    fontSize: 16, fontWeight: 800, letterSpacing: 0.3, marginBottom: 14,
    boxShadow: '0 4px 24px rgba(124,58,237,0.3)',
  },
  loadBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32,
    background: 'rgba(10,14,28,0.6)', borderRadius: 16, marginBottom: 14,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  loadCube: {
    width: 36, height: 36, border: '3px solid rgba(56,189,248,0.15)',
    borderTop: '3px solid #38bdf8', borderRight: '3px solid #818cf8', borderRadius: 8,
    animation: 'spin3D 1.2s ease-in-out infinite', boxShadow: '0 0 24px rgba(56,189,248,0.25)',
  },
  loadTitle: { color: '#e2e8f0', marginTop: 14, fontSize: 14, fontWeight: 600 },
  loadSub: { color: '#475569', fontSize: 11, marginTop: 4, textAlign: 'center' },
  errorBox: {
    padding: '10px 16px', marginBottom: 14, background: 'rgba(69,10,10,0.7)', color: '#fca5a5',
    borderRadius: 12, fontSize: 13, border: '1px solid rgba(239,68,68,0.2)',
  },
  themeBadge: {
    padding: '10px 14px', marginBottom: 14, background: 'rgba(10,14,28,0.6)',
    border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, fontSize: 13, color: '#94a3b8',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  dlAllBtn: {
    padding: '4px 12px', borderRadius: 20, background: 'rgba(16,185,129,0.15)',
    border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: 11, fontWeight: 700,
  },
  slidesRow: {
    display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10, marginBottom: 14,
    scrollbarWidth: 'none',
  },
  slideCard: {
    flexShrink: 0, position: 'relative', borderRadius: 14, overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  slideImg: { width: 148, height: 186, objectFit: 'cover', display: 'block' },
  dlSlideBtn: {
    position: 'absolute', bottom: 6, right: 6,
    width: 30, height: 30, borderRadius: '50%',
    background: 'rgba(5,6,15,0.8)', color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.15)',
    fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  captionCard: {
    background: 'rgba(10,14,28,0.6)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14, padding: 14, marginBottom: 14, position: 'relative',
  },
  captionText: {
    fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap',
    wordBreak: 'break-word', fontFamily: 'inherit', margin: 0, paddingBottom: 38,
  },
  copyBtn: {
    position: 'absolute', bottom: 10, right: 10, padding: '6px 14px',
    color: '#fff', borderRadius: 10, fontSize: 12, fontWeight: 700,
  },
  actionRow: { display: 'flex', gap: 10, marginBottom: 12 },
  dlBtn: {
    flex: 1, padding: '12px', borderRadius: 14,
    background: 'linear-gradient(135deg, #065f46, #047857)', color: '#fff',
    fontSize: 14, fontWeight: 700, boxShadow: '0 4px 16px rgba(16,185,129,0.2)',
  },
  resetBtn: {
    flex: 1, padding: '12px', borderRadius: 14,
    background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.07)',
    color: '#94a3b8', fontSize: 14, fontWeight: 700,
  },
  howToPost: {
    padding: '12px 16px', background: 'rgba(10,14,28,0.5)',
    border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 10,
  },
  howToTitle: { fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  howToText: { fontSize: 12, color: '#64748b', lineHeight: 1.6 },
  reelBox: {
    background: 'rgba(10,14,28,0.7)',
    border: '1px solid rgba(124,58,237,0.2)',
    borderRadius: 18, padding: '14px 16px',
    marginBottom: 14,
  },
  reelHeader: { marginBottom: 12 },
  reelTitle: { fontSize: 15, fontWeight: 800, color: '#e2e8f0', marginBottom: 3 },
  reelSub: { fontSize: 11, color: '#475569' },
  reelProgress: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '16px 0 8px',
  },
  reelBar: {
    width: '100%', height: 4, borderRadius: 2,
    background: 'rgba(124,58,237,0.15)',
    marginTop: 12, overflow: 'hidden',
  },
  reelBarFill: {
    height: '100%', borderRadius: 2,
    background: 'linear-gradient(90deg, #7c3aed, #38bdf8)',
    transition: 'width 0.4s ease',
  },
  reelPreview: {
    width: '100%', borderRadius: 14, display: 'block',
    background: '#000', maxHeight: 280, objectFit: 'contain',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  reelUnsupported: {
    padding: '10px 12px', borderRadius: 10,
    background: 'rgba(30,41,59,0.5)',
    border: '1px solid rgba(255,255,255,0.05)',
    fontSize: 12, color: '#64748b', lineHeight: 1.6,
  },
}

/* ── Share Panel Styles ──────────────────────── */
const sp = {
  panel: {
    background: 'rgba(10,14,28,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 18, padding: '14px 16px 12px',
    marginBottom: 14,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  title: {
    fontSize: 12, fontWeight: 800, color: '#94a3b8',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
  },
  titleDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: '#38bdf8',
    boxShadow: '0 0 6px rgba(56,189,248,0.8)',
    flexShrink: 0,
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 },
  shareBtn: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', borderRadius: 14,
    background: 'rgba(15,20,40,0.6)',
    border: '1.5px solid rgba(255,255,255,0.06)',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
  },
  shareBtnIcon: {
    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 800,
  },
  shareBtnLabel: { fontSize: 13, fontWeight: 700, color: '#e2e8f0' },
  instruction: {
    padding: '10px 12px', marginBottom: 8,
    background: 'rgba(29,78,216,0.12)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: 12,
    animation: 'fadeInScale 0.3s ease both',
  },
  instrText: { fontSize: 12, color: '#93c5fd', lineHeight: 1.6 },
  webShareNote: { fontSize: 11, color: '#475569', textAlign: 'center' },
}
