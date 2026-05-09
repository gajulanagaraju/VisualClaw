// Convert rendered dataURL images to File objects for Web Share API
export async function dataUrlsToFiles(dataUrls) {
  return Promise.all(
    dataUrls.map(async (dataUrl, i) => {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      return new File([blob], `tpc2026_slide_${String(i + 1).padStart(2, '0')}.jpg`, { type: 'image/jpeg' })
    })
  )
}

// Check if Web Share API supports files (native share sheet on mobile)
export function canShareFiles() {
  if (!navigator.canShare) return false
  try {
    return navigator.canShare({ files: [new File([''], 'test.jpg', { type: 'image/jpeg' })] })
  } catch { return false }
}

// Core Web Share — opens native share sheet
export async function webShare(files, caption, title) {
  if (!navigator.share) return false
  try {
    if (files.length > 0 && canShareFiles()) {
      await navigator.share({ files, text: caption, title })
    } else {
      await navigator.share({ text: caption, title })
    }
    return true
  } catch (e) {
    if (e.name === 'AbortError') return true  // user dismissed — not an error
    return false
  }
}

// Copy text to clipboard
export async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); return true }
  catch { return false }
}

// Trigger file downloads (saves to camera roll on mobile)
export function downloadImages(dataUrls, platform) {
  dataUrls.forEach((dataUrl, i) => {
    setTimeout(() => {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `tpc2026_${platform}_slide_${String(i + 1).padStart(2, '0')}.jpg`
      a.click()
    }, i * 350)
  })
}

// Platform-specific openers
export function openInstagram() {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) {
    window.location.href = 'instagram://'
    setTimeout(() => window.open('https://www.instagram.com', '_blank'), 1200)
  } else if (/Android/.test(ua)) {
    window.location.href = 'intent://instagram.com/#Intent;scheme=https;package=com.instagram.android;end'
  } else {
    window.open('https://www.instagram.com', '_blank')
  }
}

export function openLinkedIn() {
  window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank')
}

export function openFacebook() {
  const ua = navigator.userAgent
  if (/Android/.test(ua)) {
    window.location.href = 'fb://composer'
    setTimeout(() => window.open('https://www.facebook.com', '_blank'), 1200)
  } else {
    window.open('https://www.facebook.com', '_blank')
  }
}

export function openWhatsApp(caption) {
  window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, '_blank')
}
