import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ipcRenderer } from '../services/electron'

// Track in-flight icon requests to prevent duplicates (shared across instances)
const pendingIconRequests = new Set()

function ResultsList({ results, selectedIndex, onSelect, onHover }) {
  const listRef = useRef(null)
  const selectedRef = useRef(null)
  const [icons, setIcons] = useState(new Map())

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [selectedIndex])

  // Load icons for app results on-demand with deduplication and batch loading
  useEffect(() => {
    let isCancelled = false
    const BATCH_SIZE = 5

    const loadAppIcons = async () => {
      if (!ipcRenderer) return

      // Filter results that need icons and aren't already being fetched
      const resultsToProcess = results.filter(result =>
        result.type === 'app' &&
        !result.icon &&
        !icons.has(result.path) &&
        !pendingIconRequests.has(result.path)
      )

      // Process in batches to limit concurrent requests
      for (let i = 0; i < resultsToProcess.length; i += BATCH_SIZE) {
        if (isCancelled) return // Stop if results changed

        const batch = resultsToProcess.slice(i, i + BATCH_SIZE)

        await Promise.all(batch.map(async (result) => {
          if (isCancelled) return // Check again before each request

          // Mark this path as being fetched
          pendingIconRequests.add(result.path)

          try {
            const icon = await ipcRenderer.invoke('get-app-icon', result.path)
            if (icon && !isCancelled) {
              setIcons(prev => new Map(prev).set(result.path, icon))
            }
          } catch (error) {
            console.error('[ResultsList] Error loading app icon:', error)
          } finally {
            // Remove from pending set regardless of success/failure
            pendingIconRequests.delete(result.path)
          }
        }))
      }
    }

    loadAppIcons()

    // Cleanup: mark as cancelled when results change or component unmounts
    return () => {
      isCancelled = true
    }
  }, [results])

  // Don't render anything if no results (like Spotlight)
  if (results.length === 0) {
    return null
  }

  return (
    <div className="results-list" ref={listRef}>
      {results.map((result, index) => (
        <div
          key={result.type === 'tab' ? result.url : result.type === 'app' ? result.path : result.type === 'command' ? result.id : result.type === 'web-search' ? 'web-search' : result.path}
          ref={index === selectedIndex ? selectedRef : null}
          className={`result-item ${index === selectedIndex ? 'selected' : ''} ${result.type}-result`}
          onClick={() => onSelect(index)}
          onMouseEnter={() => onHover(index)}
        >
          <div className="result-icon">
            {result.type === 'command' ? (
              // Command emoji icon
              <span className="command-icon">{result.icon}</span>
            ) : result.type === 'web-search' ? (
              // Web search icon
              <span className="web-search-icon">{result.icon || '🔍'}</span>
            ) : result.type === 'calculator' ? (
              // Calculator icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: '#10B981' }}
              >
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="8" y1="10" x2="8" y2="10.01" />
                <line x1="12" y1="10" x2="12" y2="10.01" />
                <line x1="16" y1="10" x2="16" y2="10.01" />
                <line x1="8" y1="14" x2="8" y2="14.01" />
                <line x1="12" y1="14" x2="12" y2="14.01" />
                <line x1="16" y1="14" x2="16" y2="14.01" />
                <line x1="8" y1="18" x2="8" y2="18.01" />
                <line x1="12" y1="18" x2="16" y2="18" />
              </svg>
            ) : result.type === 'app' ? (
              // App icon
              (icons.get(result.path) || result.icon) ? (
                <img src={icons.get(result.path) || result.icon} alt={result.name} className="app-icon-img" />
              ) : (
                // Fallback app icon while loading
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              )
            ) : result.type === 'tab' ? (
              // Globe icon for tabs
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            ) : (
              // File icon for files
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            )}
          </div>
          <div className="result-content">
            <div className="result-name">
              {result.name}
              {result.type === 'tab' && (
                <span className="result-browser-badge">{result.browser}</span>
              )}
            </div>
            {result.type !== 'app' && (
              <div className="result-path">
                {result.type === 'tab' ? result.url : result.path}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ResultsList
