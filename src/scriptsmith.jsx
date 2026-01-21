import React from 'react'
import ReactDOM from 'react-dom/client'
import ScriptsmithModal from './components/ScriptsmithModal'
import './index.css'

function getInitialPrompt() {
  try {
    return new URLSearchParams(window.location.search).get('prompt') || ''
  } catch {
    return ''
  }
}

// Entry point for the standalone Scriptsmith window
ReactDOM.createRoot(document.getElementById('scriptsmith-root')).render(
  <React.StrictMode>
    <ScriptsmithModal
      isOpen={true}
      onClose={() => window.close()}
      initialPrompt={getInitialPrompt()}
      standalone={true}
    />
  </React.StrictMode>
)

