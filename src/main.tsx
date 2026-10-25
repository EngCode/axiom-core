import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getCurrentWindow } from '@tauri-apps/api/window'

import App from './App'
import { isTauri } from './lib/tauri'
import { QuickCaptureApp } from './pages/quick-capture'
import './index.css'

/**
 * The same bundle powers two windows: the main app and the quick-capture panel.
 * In the desktop app the Tauri window label decides; in a browser `?capture=1`
 * is used for development.
 */
function isCaptureWindow(): boolean {
  if (isTauri()) {
    try {
      return getCurrentWindow().label === 'capture'
    } catch {
      return false
    }
  }
  return new URLSearchParams(window.location.search).has('capture')
}

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root was not found')

createRoot(container).render(
  <StrictMode>{isCaptureWindow() ? <QuickCaptureApp /> : <App />}</StrictMode>,
)
