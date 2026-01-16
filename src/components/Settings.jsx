import React, { useState, useEffect, useCallback } from 'react'
import { ipcRenderer } from '../services/electron'

function Settings({ isOpen, onClose }) {
  const [settings, setSettings] = useState({
    searchApps: true,
    searchTabs: true,
    searchFiles: true
  })
  // Delay showing the backdrop to allow window resize to complete
  const [showBackdrop, setShowBackdrop] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      const currentSettings = await ipcRenderer.invoke('get-settings')
      setSettings(currentSettings)
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }, [])

  // Handle showing/hiding the backdrop with delay
  useEffect(() => {
    if (isOpen) {
      // Load settings and show backdrop after a short delay for window resize
      loadSettings()
      const timer = setTimeout(() => {
        setShowBackdrop(true)
      }, 50) // 50ms delay for window resize to complete
      return () => clearTimeout(timer)
    } else {
      setShowBackdrop(false)
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
      console.error('Error saving settings:', error)
      // Revert on error
      setSettings(settings)
    }
  }

  if (!isOpen) {
    return null
  }

  // Don't render backdrop until window has resized
  if (!showBackdrop) {
    return null
  }

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button className="settings-close-button" onClick={onClose}>
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
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="settings-content">
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
    </div>
  )
}

export default Settings
