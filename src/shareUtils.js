// ── Device detection helpers ──────────────────────────────────────────────────
export const isIOS     = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
export const isAndroid = () => /Android/.test(navigator.userAgent)
export const isMobile  = () => isIOS() || isAndroid()

// ── Convert rendered dataURL images to File objects ───────────────────────────
export async function dataUrlsToFiles(dataUrls) {
  return Promise.all(
    dataUrls.map(async (dataUrl, i) => {
      const res  = await fetch(dataUrl)
      const blob = await res.blob()
      return new File([blob], `tpc2026_slide_${String(i + 1).padStart(2, '0')}.jpg`, { type: 'image/jpeg' })
    })
  )
}

// ── Check if Web Share API supports file sharing ──────────────────────────────
export function canShareFiles() {
  if (!navigator.canShare) return false
  try {
    return navigator.canShare({ files: [new File([''], 'test.jpg', { type: 'image/jpeg' })] })
  } catch { return false }
}

// ── Core Web Share — opens native OS share sheet ──────────────────────────────
// Returns: 'shared' | 'text-only' | 'failed'
export async function webShare(files, caption, title) {
  if (!navigator.share) return 'failed'
  try {
    if (files.length > 0 && canShareFiles()) {
      await navigator.share({ files, text: caption, title })
      return 'shared'
    } else {
      await navigator.share({ text: caption, title })
      return 'text-only'
    }
  } catch (e) {
    if (e.name === 'AbortError') return 'aborted'  // user dismissed — not an error
    return 'failed'
  }
}

// ── Copy text to clipboard ────────────────────────────────────────────────────
export async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); return true }
  catch { return false }
}

// ── Trigger file downloads (saves to camera roll on mobile) ──────────────────
export function downloadImages(dataUrls, platform) {
  dataUrls.forEach((dataUrl, i) => {
    setTimeout(() => {
      const a = document.createElement('a')
      a.href     = dataUrl
      a.download = `tpc2026_${platform}_slide_${String(i + 1).padStart(2, '0')}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }, i * 400)
  })
}

// ── Download a single image ───────────────────────────────────────────────────
export function downloadSingleImage(dataUrl, filename) {
  const a = document.createElement('a')
  a.href     = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ── Instagram sharing ─────────────────────────────────────────────────────────
// Strategy:
//   1. Try Web Share API with files (works on Android Chrome + iOS Safari in browser)
//   2. If that fails/unavailable: download images + deep-link to Instagram create flow
//
// Returns an object: { method, instructionKey }
//   method: 'webshare' | 'download-deeplink' | 'download-manual'
//   instructionKey: string key for showing the right instruction to the user
export async function shareToInstagram(dataUrls, caption) {
  const files = await dataUrlsToFiles(dataUrls)

  // ── Path 1: Web Share API with files (best path — native share sheet) ──────
  if (canShareFiles()) {
    const result = await webShare(files, caption, 'TPC 2026 Carousel')
    if (result === 'shared' || result === 'aborted') {
      return { method: 'webshare', instructionKey: 'instagram-webshare' }
    }
  }

  // ── Path 2: Download + open Instagram ────────────────────────────────────
  await copyToClipboard(caption)
  downloadImages(dataUrls, 'instagram')

  if (isIOS()) {
    // iOS: download to camera roll, then open Instagram's new post flow
    // instagram://library opens the photo library picker in Instagram
    setTimeout(() => {
      // Try instagram:// deep link first; fall back to universal link
      window.location.href = 'instagram://library?AssetPath=&InstagramCaption='
      setTimeout(() => {
        // Universal link fallback — opens Instagram app on iOS if installed
        window.location.href = 'https://www.instagram.com/create/story'
        setTimeout(() => {
          window.open('https://www.instagram.com', '_blank')
        }, 1500)
      }, 1500)
    }, dataUrls.length * 400 + 600)
    return { method: 'download-deeplink', instructionKey: 'instagram-ios' }
  }

  if (isAndroid()) {
    // Android: download images, then open Instagram via intent
    setTimeout(() => {
      // Try opening Instagram directly via intent
      window.location.href = 'intent://instagram.com/#Intent;scheme=https;package=com.instagram.android;end'
      setTimeout(() => {
        window.open('https://www.instagram.com', '_blank')
      }, 1500)
    }, dataUrls.length * 400 + 600)
    return { method: 'download-deeplink', instructionKey: 'instagram-android' }
  }

  // Desktop fallback
  setTimeout(() => window.open('https://www.instagram.com', '_blank'), 600)
  return { method: 'download-manual', instructionKey: 'instagram-desktop' }
}

// ── LinkedIn sharing ──────────────────────────────────────────────────────────
// Strategy:
//   1. Try Web Share API with files (works on Android Chrome)
//   2. Fallback: copy caption + download images + open LinkedIn post composer
//
// Returns an object: { method, instructionKey }
export async function shareToLinkedIn(dataUrls, caption) {
  const files = await dataUrlsToFiles(dataUrls)

  // ── Path 1: Web Share API with files ─────────────────────────────────────
  if (canShareFiles()) {
    const result = await webShare(files, caption, 'TPC 2026 Carousel')
    if (result === 'shared' || result === 'aborted') {
      return { method: 'webshare', instructionKey: 'linkedin-webshare' }
    }
  }

  // ── Path 2: Copy caption + download + open LinkedIn ──────────────────────
  await copyToClipboard(caption)
  downloadImages(dataUrls, 'linkedin')

  if (isAndroid()) {
    setTimeout(() => {
      // Try LinkedIn app deep link
      window.location.href = 'linkedin://compose'
      setTimeout(() => {
        window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank')
      }, 1500)
    }, dataUrls.length * 400 + 600)
    return { method: 'download-deeplink', instructionKey: 'linkedin-android' }
  }

  if (isIOS()) {
    setTimeout(() => {
      // LinkedIn iOS deep link
      window.location.href = 'linkedin://compose'
      setTimeout(() => {
        window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank')
      }, 1500)
    }, dataUrls.length * 400 + 600)
    return { method: 'download-deeplink', instructionKey: 'linkedin-ios' }
  }

  // Desktop
  setTimeout(() => window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank'), 600)
  return { method: 'download-manual', instructionKey: 'linkedin-desktop' }
}

// ── Facebook sharing ──────────────────────────────────────────────────────────
export async function shareToFacebook(dataUrls, caption) {
  const files = await dataUrlsToFiles(dataUrls)

  if (canShareFiles()) {
    const result = await webShare(files, caption, 'TPC 2026 Carousel')
    if (result === 'shared' || result === 'aborted') {
      return { method: 'webshare', instructionKey: 'facebook-webshare' }
    }
  }

  await copyToClipboard(caption)
  downloadImages(dataUrls, 'facebook')

  if (isAndroid()) {
    setTimeout(() => {
      window.location.href = 'fb://composer'
      setTimeout(() => window.open('https://www.facebook.com', '_blank'), 1500)
    }, dataUrls.length * 400 + 600)
    return { method: 'download-deeplink', instructionKey: 'facebook-android' }
  }

  setTimeout(() => window.open('https://www.facebook.com', '_blank'), 600)
  return { method: 'download-manual', instructionKey: 'facebook-fallback' }
}

// ── WhatsApp sharing ──────────────────────────────────────────────────────────
export async function shareToWhatsApp(dataUrls, caption) {
  const files = await dataUrlsToFiles(dataUrls)

  if (canShareFiles()) {
    const result = await webShare(files, caption, 'TPC 2026 Carousel')
    if (result === 'shared' || result === 'aborted') {
      return { method: 'webshare', instructionKey: 'whatsapp-webshare' }
    }
  }

  await copyToClipboard(caption)
  downloadImages(dataUrls, 'whatsapp')
  setTimeout(() => window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, '_blank'), dataUrls.length * 400 + 600)
  return { method: 'download-deeplink', instructionKey: 'whatsapp-fallback' }
}

// ── Human-readable instructions per instructionKey ────────────────────────────
export const SHARE_INSTRUCTIONS = {
  // Instagram
  'instagram-webshare': {
    icon: '✅',
    title: 'Share sheet opened!',
    steps: ['Select Instagram from the share sheet', 'Choose "Feed" or "Story"', 'Add your caption and post'],
  },
  'instagram-ios': {
    icon: '📲',
    title: 'Images saved — opening Instagram',
    steps: [
      'Images are saving to your Camera Roll',
      'Instagram is opening — tap the + New Post button',
      'Select the saved slides in order (1, 2, 3…)',
      'Paste the caption (already copied to clipboard)',
      'Tap Share!',
    ],
  },
  'instagram-android': {
    icon: '📲',
    title: 'Images saved — opening Instagram',
    steps: [
      'Images are downloading to your phone',
      'Instagram is opening — tap the + button',
      'Go to Gallery and select all saved slides in order',
      'Paste the caption (already copied to clipboard)',
      'Tap Next → Share!',
    ],
  },
  'instagram-desktop': {
    icon: '💾',
    title: 'Images downloaded',
    steps: [
      'Images saved to your Downloads folder',
      'Caption copied to clipboard',
      'Open Instagram.com → Create post → upload the slides',
    ],
  },
  // LinkedIn
  'linkedin-webshare': {
    icon: '✅',
    title: 'Share sheet opened!',
    steps: ['Select LinkedIn from the share sheet', 'Add your caption and post'],
  },
  'linkedin-ios': {
    icon: '📲',
    title: 'Images saved — opening LinkedIn',
    steps: [
      'Images are saving to your Camera Roll',
      'LinkedIn is opening — tap Start a post',
      'Tap the image icon to attach photos',
      'Select all saved slides from your Camera Roll',
      'Paste the caption (already copied to clipboard)',
      'Tap Post!',
    ],
  },
  'linkedin-android': {
    icon: '📲',
    title: 'Images saved — opening LinkedIn',
    steps: [
      'Images are downloading to your phone',
      'LinkedIn is opening — tap Start a post',
      'Tap the image icon and select all saved slides',
      'Paste the caption (already copied to clipboard)',
      'Tap Post!',
    ],
  },
  'linkedin-desktop': {
    icon: '💾',
    title: 'Images downloaded',
    steps: [
      'Images saved to your Downloads folder',
      'Caption copied to clipboard',
      'LinkedIn is opening — click "Start a post" → add photos → paste caption',
    ],
  },
  // Facebook
  'facebook-webshare': {
    icon: '✅',
    title: 'Share sheet opened!',
    steps: ['Select Facebook from the share sheet', 'Add your caption and post'],
  },
  'facebook-android': {
    icon: '📲',
    title: 'Images saved — opening Facebook',
    steps: [
      'Images are downloading to your phone',
      'Facebook is opening — tap Photo/Video',
      'Select all saved slides in order',
      'Paste the caption (already copied to clipboard)',
      'Tap Post!',
    ],
  },
  'facebook-fallback': {
    icon: '💾',
    title: 'Images downloaded',
    steps: [
      'Images saved to your device',
      'Caption copied to clipboard',
      'Open Facebook → Create post → add photos → paste caption',
    ],
  },
  // WhatsApp
  'whatsapp-webshare': {
    icon: '✅',
    title: 'Share sheet opened!',
    steps: ['Select WhatsApp from the share sheet', 'Choose a contact or Status', 'Send!'],
  },
  'whatsapp-fallback': {
    icon: '📲',
    title: 'Images saved — opening WhatsApp',
    steps: [
      'Images are downloading to your phone',
      'WhatsApp is opening with the caption pre-filled',
      'Tap the attachment icon to add the saved images',
      'Send to your contact or Status!',
    ],
  },
}

// ── Legacy compat exports (used in older parts of the app) ────────────────────
export function openInstagram() {
  if (isIOS()) {
    window.location.href = 'instagram://'
    setTimeout(() => window.open('https://www.instagram.com', '_blank'), 1200)
  } else if (isAndroid()) {
    window.location.href = 'intent://instagram.com/#Intent;scheme=https;package=com.instagram.android;end'
  } else {
    window.open('https://www.instagram.com', '_blank')
  }
}

export function openLinkedIn() {
  window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank')
}

export function openFacebook() {
  if (isAndroid()) {
    window.location.href = 'fb://composer'
    setTimeout(() => window.open('https://www.facebook.com', '_blank'), 1200)
  } else {
    window.open('https://www.facebook.com', '_blank')
  }
}

export function openWhatsApp(caption) {
  window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, '_blank')
}
