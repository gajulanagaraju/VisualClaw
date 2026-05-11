import { useState, useEffect } from 'react'

const PLATFORMS = [
  {
    key: 'instagram', label: 'Instagram', icon: '◎', color: '#E1306C',
    placeholder: '@yourhandle',
    field: 'instagram',
    deepLink: () => {
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) return 'instagram://'
      if (/Android/.test(navigator.userAgent)) return 'intent://instagram.com/#Intent;scheme=https;package=com.instagram.android;end'
      return 'https://www.instagram.com'
    },
    hint: 'On phone: native share sheet → pick Instagram. Falls back to save + open app.',
  },
  {
    key: 'linkedin', label: 'LinkedIn', icon: 'in', color: '#0A66C2',
    placeholder: 'Your LinkedIn name',
    field: 'linkedin',
    deepLink: () => 'https://www.linkedin.com/feed/?shareActive=true',
    hint: 'On phone: native share sheet → pick LinkedIn. Falls back to save + open app.',
  },
  {
    key: 'facebook', label: 'Facebook', icon: 'f', color: '#1877F2',
    placeholder: 'Your Facebook name',
    field: 'facebook',
    deepLink: () => {
      if (/Android/.test(navigator.userAgent)) return 'fb://composer'
      return 'https://www.facebook.com'
    },
    hint: 'Shares via Web Share API or opens Facebook',
  },
  {
    key: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#25D366',
    placeholder: '+country code number or leave blank',
    field: 'whatsapp',
    deepLink: (text) => `https://wa.me/?text=${encodeURIComponent(text || '')}`,
    hint: 'Opens WhatsApp with caption pre-filled',
  },
]

export const STORAGE_KEY = 'vc_social_connections'

export function loadConnections() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}

export function saveConnections(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export default function SocialSettings({ onClose }) {
  const [connections, setConnections] = useState({})
  const [saved, setSaved] = useState(false)

  useEffect(() => { setConnections(loadConnections()) }, [])

  const set = (field, value) => setConnections(prev => ({ ...prev, [field]: value }))

  const save = () => {
    saveConnections(connections)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 1000)
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.sheet}>
        {/* Handle bar */}
        <div style={s.handle} />

        <div style={s.header}>
          <div style={s.title}>Social Connections</div>
          <div style={s.subtitle}>Stored locally on your device · never sent to server</div>
        </div>

        <div style={s.list}>
          {PLATFORMS.map(p => (
            <div key={p.key} style={s.row}>
              <div style={{ ...s.platformIcon, background: `${p.color}18`, border: `1px solid ${p.color}30`, color: p.color }}>
                {p.icon}
              </div>
              <div style={s.rowRight}>
                <div style={s.rowLabel}>{p.label}</div>
                <input
                  style={s.input}
                  placeholder={p.placeholder}
                  value={connections[p.field] || ''}
                  onChange={e => set(p.field, e.target.value)}
                />
                <div style={s.hint}>{p.hint}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={s.footer}>
          <button style={s.saveBtn} onClick={save}>
            {saved ? '✓ Saved!' : 'Save Connections'}
          </button>
          <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
        </div>

        <div style={s.note}>
          📲 On your phone, tapping “Instagram” or “LinkedIn” in the Carousel Creator will open the <strong>native share sheet</strong> (if supported) so you can pick the app and post directly. If the share sheet is unavailable, slides are saved to your device and the app opens automatically — step-by-step instructions appear on screen.
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(3,4,12,0.7)', backdropFilter: 'blur(8px)',
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
  header: { padding: '16px 20px 12px' },
  title: { fontSize: 19, fontWeight: 800 },
  subtitle: { fontSize: 12, color: '#475569', marginTop: 3 },
  list: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 2 },
  row: {
    display: 'flex', gap: 12, padding: '12px 4px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    alignItems: 'flex-start',
  },
  platformIcon: {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 800, marginTop: 2,
  },
  rowRight: { flex: 1 },
  rowLabel: { fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 },
  input: {
    width: '100%', padding: '9px 13px',
    background: 'rgba(15,20,40,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#f1f5f9', borderRadius: 10, fontSize: 13,
    boxSizing: 'border-box', marginBottom: 4,
  },
  hint: { fontSize: 11, color: '#475569', lineHeight: 1.4 },
  footer: { display: 'flex', gap: 10, padding: '16px 20px 12px' },
  saveBtn: {
    flex: 1, padding: '13px', borderRadius: 14,
    background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
    color: '#fff', fontSize: 15, fontWeight: 800,
    boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
  },
  cancelBtn: {
    padding: '13px 20px', borderRadius: 14,
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(255,255,255,0.07)',
    color: '#94a3b8', fontSize: 15, fontWeight: 700,
  },
  note: {
    margin: '0 20px 20px', padding: '10px 14px',
    background: 'rgba(29,78,216,0.1)',
    border: '1px solid rgba(59,130,246,0.15)',
    borderRadius: 12, fontSize: 12, color: '#93c5fd', lineHeight: 1.6,
  },
}
