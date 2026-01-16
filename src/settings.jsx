import React from 'react'
import ReactDOM from 'react-dom/client'
import StandaloneSettings from './components/StandaloneSettings'
import './index.css'

// Entry point for the standalone settings window
ReactDOM.createRoot(document.getElementById('settings-root')).render(
  <React.StrictMode>
    <StandaloneSettings onClose={() => window.close()} />
  </React.StrictMode>
)
