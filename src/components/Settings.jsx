import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ipcRenderer } from '../services/electron'
import { logger } from '../utils/logger'

function Settings({ isOpen, onClose }) {
  const [settings, setSettings] = useState({
    searchApps: true,
    searchTabs: true,
    searchFiles: true,
    fileExclusions: []
  })
  
  // Bang management state
  const [newBangKey, setNewBangKey] = useState('')
  const [newBangName, setNewBangName] = useState('')
  const [newBangUrl, setNewBangUrl] = useState('')
  // Exclusion state
  const [newExclusion, setNewExclusion] = useState('')
  
  const contentRef = useRef(null)

  // Robust keyboard navigation
  const handleNavigation = useCallback((e) => {
    // Only handle navigation keys
    if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return

    // Find all focusable elements within the settings content
    // We filter out hidden ones and ensure a logical order
    const selector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusables = Array.from(contentRef.current.querySelectorAll(selector))
    
    const currentIndex = focusables.indexOf(document.activeElement)
    let nextIndex = 0

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      nextIndex = currentIndex < focusables.length - 1 ? currentIndex + 1 : 0
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      nextIndex = currentIndex > 0 ? currentIndex - 1 : focusables.length - 1
    }

    focusables[nextIndex]?.focus()
    focusables[nextIndex]?.scrollIntoView({ block: 'nearest' })
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const currentSettings = await ipcRenderer.invoke('get-settings')
      setSettings(currentSettings)
    } catch (error) {
      logger.error('Settings', 'Error loading settings', error)
    }
  }, [])

  // Load settings when opened
  useEffect(() => {
    if (isOpen) {
      loadSettings()
      // Focus content for keyboard scrolling
      // Small timeout to ensure render
      setTimeout(() => {
        if (contentRef.current) {
            contentRef.current.focus()
        }
      }, 50)
    }
  }, [isOpen, loadSettings])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleToggle = async (key) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key]
    }

    setSettings(newSettings)

    try {
      await ipcRenderer.invoke('save-settings', newSettings)
    } catch (error) {
      logger.error('Settings', 'Error saving settings', error)
      // Revert on error
      setSettings(settings)
    }
  }

  const handleSelectChange = async (key, value) => {
    const newSettings = {
      ...settings,
      [key]: value
    }

    setSettings(newSettings)

    try {
      await ipcRenderer.invoke('save-settings', newSettings)
    } catch (error) {
      logger.error('Settings', 'Error saving settings', error)
      setSettings(settings)
    }
  }

  const handleAddExclusion = async (e) => {
    e.preventDefault()
    if (!newExclusion.trim()) return

    const currentExclusions = settings.fileExclusions || []
    if (currentExclusions.includes(newExclusion.trim())) {
        setNewExclusion('')
        return
    }

    const updatedExclusions = [...currentExclusions, newExclusion.trim()]
    const newSettings = { ...settings, fileExclusions: updatedExclusions }
    
    setSettings(newSettings)
    setNewExclusion('')
    
    try {
        await ipcRenderer.invoke('save-settings', newSettings)
    } catch (error) {
        logger.error('Settings', 'Error saving exclusion', error)
        setSettings(settings)
    }
  }

  const handleRemoveExclusion = async (exclusionToRemove) => {
    const currentExclusions = settings.fileExclusions || []
    const updatedExclusions = currentExclusions.filter(ex => ex !== exclusionToRemove)
    const newSettings = { ...settings, fileExclusions: updatedExclusions }

    setSettings(newSettings)

    try {
        await ipcRenderer.invoke('save-settings', newSettings)
    } catch (error) {
        logger.error('Settings', 'Error removing exclusion', error)
        setSettings(settings)
    }
  }

  const handleAddBang = async (e) => {
    e.preventDefault()
    if (!newBangKey.trim() || !newBangName.trim() || !newBangUrl.trim()) return

    const key = newBangKey.trim().toLowerCase()
    const currentBangs = settings.webBangs || {}
    
    const updatedBangs = {
        ...currentBangs,
        [key]: {
            name: newBangName.trim(),
            url: newBangUrl.trim(),
            icon: '🌐'
        }
    }

    const newSettings = { ...settings, webBangs: updatedBangs }
    setSettings(newSettings)
    
    // Reset form
    setNewBangKey('')
    setNewBangName('')
    setNewBangUrl('')

    try {
        await ipcRenderer.invoke('save-settings', newSettings)
    } catch (error) {
        logger.error('Settings', 'Error saving bang', error)
        setSettings(settings)
    }
  }

  const handleRemoveBang = async (keyToRemove) => {
    const currentBangs = settings.webBangs || {}
    const updatedBangs = { ...currentBangs }
    delete updatedBangs[keyToRemove]
    
    const newSettings = { ...settings, webBangs: updatedBangs }
    setSettings(newSettings)

    try {
        await ipcRenderer.invoke('save-settings', newSettings)
    } catch (error) {
        logger.error('Settings', 'Error removing bang', error)
        setSettings(settings)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="settings-inline">
      <div className="settings-header-inline">
        <h2 className="settings-title">Preferences</h2>
        <button className="settings-close-button" onClick={onClose}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div 
        className="settings-content-inline" 
        ref={contentRef}
        tabIndex="-1" 
        style={{ outline: 'none' }}
        onKeyDown={handleNavigation}
      >
        <div className="settings-section">
          <h3 className="settings-section-title">Appearance</h3>

          <div className="settings-item">
            <div className="settings-item-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="settings-item-icon"
              >
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
              <div>
                <div className="settings-item-label">Theme</div>
                <div className="settings-item-description">Choose app appearance</div>
              </div>
            </div>
            <select
              className="settings-select"
              value={settings.theme || 'system'}
              onChange={(e) => handleSelectChange('theme', e.target.value)}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="settings-item">
            <div className="settings-item-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="settings-item-icon"
              >
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" />
                <line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" />
                <line x1="15" y1="20" x2="15" y2="23" />
                <line x1="20" y1="9" x2="23" y2="9" />
                <line x1="20" y1="14" x2="23" y2="14" />
                <line x1="1" y1="9" x2="4" y2="9" />
                <line x1="1" y1="14" x2="4" y2="14" />
              </svg>
              <div>
                <div className="settings-item-label">Window Position</div>
                <div className="settings-item-description">Where the window appears</div>
              </div>
            </div>
            <select
              className="settings-select"
              value={settings.windowPosition || 'center'}
              onChange={(e) => handleSelectChange('windowPosition', e.target.value)}
            >
              <option value="center">Center Screen</option>
              <option value="top">Top Center</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Search Tuning</h3>
          
          <div className="settings-item" style={{ display: 'block' }}>
            <div className="settings-item-info" style={{ marginBottom: '0.75rem' }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="settings-item-icon"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              <div>
                <div className="settings-item-label">Ignored Paths</div>
                <div className="settings-item-description">Exclude folders from file search</div>
              </div>
            </div>
            
            <form onSubmit={handleAddExclusion} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                    type="text"
                    value={newExclusion}
                    onChange={(e) => setNewExclusion(e.target.value)}
                    placeholder="e.g. **/node_modules"
                    className="settings-input"
                    style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-default)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8125rem',
                        outline: 'none'
                    }}
                />
                <button
                    type="submit"
                    className="settings-button-primary"
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        background: 'var(--accent)',
                        color: 'white',
                        border: 'none',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        cursor: 'pointer'
                    }}
                >
                    Add
                </button>
            </form>

            <div className="settings-exclusions-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(settings.fileExclusions || []).map((exclusion) => (
                    <div
                        key={exclusion}
                        className="settings-exclusion-tag"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            padding: '0.25rem 0.5rem 0.25rem 0.75rem',
                            borderRadius: '1rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <span>{exclusion}</span>
                        <button
                            onClick={() => handleRemoveExclusion(exclusion)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-tertiary)',
                                cursor: 'pointer',
                                padding: 0
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
          </div>

          <div className="settings-item" style={{ display: 'block' }}>
            <div className="settings-item-info" style={{ marginBottom: '0.75rem' }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="settings-item-icon"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <div>
                <div className="settings-item-label">Web Bangs</div>
                <div className="settings-item-description">Custom search shortcuts (e.g. 'g query')</div>
              </div>
            </div>
            
            <form onSubmit={handleAddBang} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                    type="text"
                    value={newBangKey}
                    onChange={(e) => setNewBangKey(e.target.value)}
                    placeholder="Key (e.g. npm)"
                    className="settings-input"
                    style={{
                        width: '5rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-default)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8125rem',
                        outline: 'none'
                    }}
                />
                <input
                    type="text"
                    value={newBangName}
                    onChange={(e) => setNewBangName(e.target.value)}
                    placeholder="Name"
                    className="settings-input"
                    style={{
                        width: '7rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-default)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8125rem',
                        outline: 'none'
                    }}
                />
                <input
                    type="text"
                    value={newBangUrl}
                    onChange={(e) => setNewBangUrl(e.target.value)}
                    placeholder="URL (use ...search?q=)"
                    className="settings-input"
                    style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-default)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8125rem',
                        outline: 'none'
                    }}
                />
                <button
                    type="submit"
                    className="settings-button-primary"
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        background: 'var(--accent)',
                        color: 'white',
                        border: 'none',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        cursor: 'pointer'
                    }}
                >
                    Add
                </button>
            </form>

            <div className="settings-bangs-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '10rem', overflowY: 'auto' }}>
                {Object.entries(settings.webBangs || {}).map(([key, bang]) => (
                    <div
                        key={key}
                        className="settings-bang-item"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem',
                            borderRadius: '0.5rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '0.8125rem',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <span style={{ 
                            fontWeight: 600, 
                            color: 'var(--accent)', 
                            background: 'rgba(59, 130, 246, 0.1)', 
                            padding: '0.125rem 0.375rem', 
                            borderRadius: '0.25rem',
                            minWidth: '2rem',
                            textAlign: 'center'
                        }}>
                            {key}
                        </span>
                        <span style={{ fontWeight: 500, minWidth: '5rem' }}>{bang.name}</span>
                        <span style={{ flex: 1, color: 'var(--text-tertiary)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {bang.url}
                        </span>
                        <button
                            onClick={() => handleRemoveBang(key)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-tertiary)',
                                cursor: 'pointer',
                                padding: '0.25rem'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Search Categories</h3>

          <div className="settings-item">
            <div className="settings-item-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="settings-item-icon"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <div>
                <div className="settings-item-label">Applications</div>
                <div className="settings-item-description">Search installed macOS applications</div>
              </div>
            </div>
            <button
              className={`settings-toggle ${settings.searchApps ? 'active' : ''}`}
              onClick={() => handleToggle('searchApps')}
              aria-label="Toggle application search"
            >
              <span className="settings-toggle-slider" />
            </button>
          </div>

          <div className="settings-item">
            <div className="settings-item-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="settings-item-icon"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <div>
                <div className="settings-item-label">Browser Tabs</div>
                <div className="settings-item-description">Search open browser tabs</div>
              </div>
            </div>
            <button
              className={`settings-toggle ${settings.searchTabs ? 'active' : ''}`}
              onClick={() => handleToggle('searchTabs')}
              aria-label="Toggle browser tabs search"
            >
              <span className="settings-toggle-slider" />
            </button>
          </div>

          <div className="settings-item">
            <div className="settings-item-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="settings-item-icon"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <div>
                <div className="settings-item-label">Files</div>
                <div className="settings-item-description">Search files on your computer</div>
              </div>
            </div>
            <button
              className={`settings-toggle ${settings.searchFiles ? 'active' : ''}`}
              onClick={() => handleToggle('searchFiles')}
              aria-label="Toggle files search"
            >
              <span className="settings-toggle-slider" />
            </button>
          </div>
        </div>

        <div className="settings-info">
          <p className="settings-info-text">
            Search priority: Applications &gt; Browser Tabs &gt; Files
          </p>
        </div>
      </div>
    </div>
  )
}

export default Settings
