import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import { ipcRenderer } from './services/electron'
import * as Sentry from '@sentry/electron/renderer'

if (ipcRenderer) {
  const dsn = import.meta?.env?.VITE_SENTRY_DSN
  ipcRenderer.invoke('get-settings').then((settings) => {
    if (settings?.telemetryEnabled && dsn) {
      Sentry.init({
        dsn,
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
      })
    }
  }).catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
