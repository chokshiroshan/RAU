import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ipcRenderer } from '../services/electron'
import { logger } from '../utils/logger'

const CAPABILITIES = [
  {
    id: 'system',
    name: 'System Controls',
    icon: '⚙️',
    description: 'Control system settings and preferences',
    examples: [
      { label: 'Toggle Dark Mode', prompt: 'Toggle system dark mode on or off' },
      { label: 'Adjust Volume', prompt: 'Set system volume to 50%' },
      { label: 'Empty Trash', prompt: 'Empty the trash with confirmation dialog' },
      { label: 'Show Notification', prompt: 'Display a notification with title "Reminder" and message "Time for a break"' }
    ]
  },
  {
    id: 'windows',
    name: 'Window Management',
    icon: '🪟',
    description: 'Arrange and control application windows',
    examples: [
      { label: 'Tile Windows', prompt: 'Arrange the two frontmost windows side by side' },
      { label: 'Center Window', prompt: 'Center the frontmost window on screen' },
      { label: 'Maximize Window', prompt: 'Maximize the current window to fill the screen' },
      { label: 'Hide All Windows', prompt: 'Hide all application windows except Finder' }
    ]
  },
  {
    id: 'browsers',
    name: 'Browser Automation',
    icon: '🌐',
    description: 'Control Safari, Chrome, and other browsers',
    examples: [
      { label: 'Open URL', prompt: 'Open https://github.com in Safari' },
      { label: 'Get Current URL', prompt: 'Copy the URL of the current Safari tab to clipboard' },
      { label: 'Close Duplicate Tabs', prompt: 'Close duplicate tabs in Chrome' },
      { label: 'Open Top Sites', prompt: 'Open my top 5 bookmarked sites in new tabs' }
    ]
  },
  {
    id: 'apps',
    name: 'App Control',
    icon: '📱',
    description: 'Launch, quit, and control applications',
    examples: [
      { label: 'Launch App', prompt: 'Open Spotify and start playing my Liked Songs' },
      { label: 'Quit All Apps', prompt: 'Quit all running applications except Finder' },
      { label: 'Switch to App', prompt: 'Bring Visual Studio Code to the front' },
      { label: 'Restart App', prompt: 'Quit and relaunch Slack' }
    ]
  },
  {
    id: 'files',
    name: 'Finder & Files',
    icon: '📁',
    description: 'File operations and Finder control',
    examples: [
      { label: 'New Finder Window', prompt: 'Open a new Finder window at Documents folder' },
      { label: 'Screenshot', prompt: 'Take a screenshot of the selected area and save to Desktop' },
      { label: 'Create Folder', prompt: 'Create a new folder called "Project" on Desktop' },
      { label: 'Open Recent', prompt: 'Open the most recently modified file in Downloads' }
    ]
  },
  {
    id: 'productivity',
    name: 'Productivity',
    icon: '✅',
    description: 'Calendar, Reminders, Notes, and Mail',
    examples: [
      { label: 'Create Reminder', prompt: 'Create a reminder "Buy groceries" for tomorrow at 5pm' },
      { label: 'New Calendar Event', prompt: 'Create a meeting "Team Standup" for tomorrow 10am to 10:30am' },
      { label: 'Quick Note', prompt: 'Create a new note in Notes app with title "Ideas"' },
      { label: 'Check Mail', prompt: 'Check for new mail and show notification if there are unread messages' }
    ]
  },
  {
    id: 'media',
    name: 'Media & Music',
    icon: '🎵',
    description: 'Control Music, Spotify, and media playback',
    examples: [
      { label: 'Play/Pause', prompt: 'Toggle play/pause in Spotify' },
      { label: 'Next Track', prompt: 'Skip to the next track in Music app' },
      { label: 'Now Playing', prompt: 'Show notification with currently playing song info' },
      { label: 'Set Playlist', prompt: 'Play my "Focus" playlist in Spotify' }
    ]
  }
];

function ScriptsmithModal({ isOpen, onClose, initialPrompt = '', standalone = false }) {
  const [prompt, setPrompt] = useState(initialPrompt)
  const [activeTab, setActiveTab] = useState('create')
  const [generatedScript, setGeneratedScript] = useState('')
  const [metadata, setMetadata] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  
  const promptInputRef = useRef(null)
  const codeRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setPrompt(initialPrompt)
      setGeneratedScript('')
      setMetadata(null)
      setError('')
      setSaveStatus('')
      
      ipcRenderer.invoke('scriptsmith-has-api-key')
        .then(setHasApiKey)
        .catch((err) => {
          logger.warn('Scriptsmith', 'Failed to check API key status', err)
          setHasApiKey(false)
        })
      
      setTimeout(() => promptInputRef.current?.focus(), 50)
    }
  }, [isOpen, initialPrompt])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return
    
    setIsGenerating(true)
    setError('')
    setGeneratedScript('')
    setMetadata(null)
    setSaveStatus('')
    
    try {
      const result = await ipcRenderer.invoke('scriptsmith-generate', prompt.trim())
      
      if (result.success) {
        setGeneratedScript(result.script)
        setMetadata(result.metadata)
      } else {
        setError(result.error || 'Failed to generate script')
      }
    } catch (err) {
      logger.error('Scriptsmith', 'Generation failed', err)
      setError(err.message || 'Failed to generate script')
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, isGenerating])

  const handleSave = useCallback(async () => {
    if (!generatedScript || isSaving) return
    
    setIsSaving(true)
    setSaveStatus('')
    
    try {
      const result = await ipcRenderer.invoke('scriptsmith-save', generatedScript)
      
      if (result.success) {
        setSaveStatus(`Saved as ${result.filename}`)
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setSaveStatus(`Error: ${result.error}`)
      }
    } catch (err) {
      logger.error('Scriptsmith', 'Save failed', err)
      setSaveStatus(`Error: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }, [generatedScript, isSaving, onClose])

  const handleCopy = useCallback(() => {
    if (generatedScript) {
      navigator.clipboard.writeText(generatedScript)
      setSaveStatus('Copied to clipboard')
      setTimeout(() => setSaveStatus(''), 2000)
    }
  }, [generatedScript])


  const handleExampleClick = useCallback((examplePrompt) => {
    setPrompt(examplePrompt)
    setActiveTab('create')
    setTimeout(() => promptInputRef.current?.focus(), 50)
  }, [])

  if (!isOpen) return null

  if (standalone) {
    return (
      <div className="scriptsmith-container">
        <div className="scriptsmith-modal">
          <div className="scriptsmith-header">
            <div className="scriptsmith-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <span>Scriptsmith</span>
            </div>
            <button className="scriptsmith-close" onClick={onClose}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="scriptsmith-tabs">
            <button 
              className={`scriptsmith-tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              Create
            </button>
            <button 
              className={`scriptsmith-tab ${activeTab === 'explore' ? 'active' : ''}`}
              onClick={() => setActiveTab('explore')}
            >
              Explore
            </button>
          </div>

          {activeTab === 'explore' ? (
            <div className="scriptsmith-explore">
              <div className="scriptsmith-explore-header">
                <h2>What can you automate?</h2>
                <p>Click any example to try it</p>
              </div>
              
              <div className="scriptsmith-categories">
                {CAPABILITIES.map(category => (
                  <div key={category.id} className="scriptsmith-category">
                    <div className="scriptsmith-category-header">
                      <span className="scriptsmith-category-icon">{category.icon}</span>
                      <div className="scriptsmith-category-info">
                        <div className="scriptsmith-category-name">{category.name}</div>
                        <div className="scriptsmith-category-desc">{category.description}</div>
                      </div>
                    </div>
                    <div className="scriptsmith-examples">
                      {category.examples.map((example, index) => (
                        <button 
                          key={index} 
                          className="scriptsmith-example"
                          onClick={() => handleExampleClick(example.prompt)}
                        >
                          {example.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            !hasApiKey ? (
            <div className="scriptsmith-no-key">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
              <h3>API Key Required</h3>
              <p>Configure your OpenAI or Anthropic API key in Settings to use Scriptsmith.</p>
              <button className="scriptsmith-settings-btn" onClick={onClose}>
                Go to Settings
              </button>
            </div>
          ) : (
            <>
              <div className="scriptsmith-input-section">
                <label>Describe what you want the script to do:</label>
                <textarea
                  ref={promptInputRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Toggle system dark mode, Open my top 5 most visited websites, Create a new Finder window at Documents..."
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) {
                      e.preventDefault()
                      handleGenerate()
                    }
                  }}
                />
                <button 
                  className="scriptsmith-generate-btn"
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <span className="scriptsmith-spinner" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      Generate Script
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="scriptsmith-error">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              {generatedScript && (
                <div className="scriptsmith-result">
                  {metadata && (
                    <div className="scriptsmith-metadata">
                      <strong>{metadata.name}</strong>
                      <span>{metadata.description}</span>
                    </div>
                  )}
                  
                  <div className="scriptsmith-code-container">
                    <pre ref={codeRef} className="scriptsmith-code">
                      <code>{generatedScript}</code>
                    </pre>
                  </div>

                  <div className="scriptsmith-actions">
                    <button className="scriptsmith-copy-btn" onClick={handleCopy}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy
                    </button>
                    <button 
                      className="scriptsmith-save-btn"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <span className="scriptsmith-spinner" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                          </svg>
                          Save to Plugins
                        </>
                      )}
                    </button>
                  </div>

                  {saveStatus && (
                    <div className={`scriptsmith-status ${saveStatus.startsWith('Error') ? 'error' : 'success'}`}>
                      {saveStatus}
                    </div>
                  )}
                </div>
              )}
            </>
          )
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="scriptsmith-overlay" onClick={onClose}>
      <div className="scriptsmith-modal" onClick={e => e.stopPropagation()}>
        <div className="scriptsmith-header">
          <div className="scriptsmith-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span>Scriptsmith</span>
          </div>
          <button className="scriptsmith-close" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="scriptsmith-tabs">
          <button 
            className={`scriptsmith-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create
          </button>
          <button 
            className={`scriptsmith-tab ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => setActiveTab('explore')}
          >
            Explore
          </button>
        </div>

        {activeTab === 'explore' ? (
          <div className="scriptsmith-explore">
            <div className="scriptsmith-explore-header">
              <h2>What can you automate?</h2>
              <p>Click any example to try it</p>
            </div>
            
            <div className="scriptsmith-categories">
              {CAPABILITIES.map(category => (
                <div key={category.id} className="scriptsmith-category">
                  <div className="scriptsmith-category-header">
                    <span className="scriptsmith-category-icon">{category.icon}</span>
                    <div className="scriptsmith-category-info">
                      <div className="scriptsmith-category-name">{category.name}</div>
                      <div className="scriptsmith-category-desc">{category.description}</div>
                    </div>
                  </div>
                  <div className="scriptsmith-examples">
                    {category.examples.map((example, index) => (
                      <button 
                        key={index} 
                        className="scriptsmith-example"
                        onClick={() => handleExampleClick(example.prompt)}
                      >
                        {example.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !hasApiKey ? (
          <div className="scriptsmith-no-key">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            <h3>API Key Required</h3>
            <p>Configure your OpenAI or Anthropic API key in Settings to use Scriptsmith.</p>
            <button className="scriptsmith-settings-btn" onClick={onClose}>
              Go to Settings
            </button>
          </div>
        ) : (
          <>
            <div className="scriptsmith-input-section">
              <label>Describe what you want the script to do:</label>
              <textarea
                ref={promptInputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Toggle system dark mode, Open my top 5 most visited websites, Create a new Finder window at Documents..."
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.metaKey) {
                    e.preventDefault()
                    handleGenerate()
                  }
                }}
              />
              <button 
                className="scriptsmith-generate-btn"
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <span className="scriptsmith-spinner" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Generate Script
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="scriptsmith-error">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {generatedScript && (
              <div className="scriptsmith-result">
                {metadata && (
                  <div className="scriptsmith-metadata">
                    <strong>{metadata.name}</strong>
                    <span>{metadata.description}</span>
                  </div>
                )}
                
                <div className="scriptsmith-code-container">
                  <pre ref={codeRef} className="scriptsmith-code">
                    <code>{generatedScript}</code>
                  </pre>
                </div>

                <div className="scriptsmith-actions">
                  <button className="scriptsmith-copy-btn" onClick={handleCopy}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </button>
                  <button 
                    className="scriptsmith-save-btn"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <span className="scriptsmith-spinner" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                        Save to Plugins
                      </>
                    )}
                  </button>
                </div>

                {saveStatus && (
                  <div className={`scriptsmith-status ${saveStatus.startsWith('Error') ? 'error' : 'success'}`}>
                    {saveStatus}
                  </div>
                )}
              </div>
            )}
          </>
        )
        )}
      </div>
    </div>
  )
}


ScriptsmithModal.displayName = 'ScriptsmithModal'

export default ScriptsmithModal
