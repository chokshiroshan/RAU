import React, { useEffect, useRef, useState, memo } from 'react'
import { ipcRenderer } from '../services/electron'
import { logger } from '../utils/logger'

const pendingIconRequests = new Set()

const BROWSER_PATHS = {
  'Safari': '/Applications/Safari.app',
  'Google Chrome': '/Applications/Google Chrome.app',
  'Chrome': '/Applications/Google Chrome.app',
  'Arc': '/Applications/Arc.app',
  'Brave Browser': '/Applications/Brave Browser.app',
  'Brave': '/Applications/Brave Browser.app',
  'Firefox': '/Applications/Firefox.app',
  'Microsoft Edge': '/Applications/Microsoft Edge.app',
  'Edge': '/Applications/Microsoft Edge.app',
  'Orion': '/Applications/Orion.app',
  'Vivaldi': '/Applications/Vivaldi.app'
}

function ResultsList({ results, selectedIndex, onSelect, onHover }) {
  const listRef = useRef(null)
  const [icons, setIcons] = useState(new Map())

  useEffect(() => {
    const listEl = listRef.current
    if (!listEl) return

    const rafId = requestAnimationFrame(() => {
      const selectedEl = listEl.querySelector('.result-item.selected')
      if (!selectedEl) return

      selectedEl.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      })
    })

    return () => cancelAnimationFrame(rafId)
  }, [selectedIndex])

  useEffect(() => {
    let isCancelled = false
    const BATCH_SIZE = 5

    const loadAppIcons = async () => {
      if (!ipcRenderer) return

      // Identify items needing icons: Apps and Group Headers
      const resultsToProcess = results.filter(result => {
        // Case 1: App result without icon
        if (result.type === 'app' && !result.icon && !icons.has(result.path) && !pendingIconRequests.has(result.path)) {
          return true
        }
        // Case 2: Group Header (Browser) without icon
        if (result._isGroupStart && !icons.has(result._groupName) && !pendingIconRequests.has(result._groupName)) {
          return true
        }
        return false
      })

      for (let i = 0; i < resultsToProcess.length; i += BATCH_SIZE) {
        if (isCancelled) return

        const batch = resultsToProcess.slice(i, i + BATCH_SIZE)

        await Promise.all(batch.map(async (result) => {
          if (isCancelled) return

          // Determine path and key
          let path = result.path
          let key = result.path

          if (result._isGroupStart) {
            // Map group name to browser path
            path = BROWSER_PATHS[result._groupName] || `/Applications/${result._groupName}.app`
            key = result._groupName
          }

          if (!path) return // Should not happen for apps, might for unknown groups

          pendingIconRequests.add(key)

          try {
            const icon = await ipcRenderer.invoke('get-app-icon', path)
            if (icon && !isCancelled) {
              setIcons(prev => new Map(prev).set(key, icon))
            }
          } catch (error) {
            // Silent fail for icons
          } finally {
            pendingIconRequests.delete(key)
          }
        }))
      }
    }

    loadAppIcons()

    return () => {
      isCancelled = true
    }
  }, [results])

  if (results.length === 0) {
    return null
  }

  const resultsWithIcons = results.map(result => {
    // Attach icon to App
    if (result.type === 'app' && icons.has(result.path)) {
      return { ...result, icon: icons.get(result.path) }
    }
    // Attach icon to Group Header
    if (result._isGroupStart && icons.has(result._groupName)) {
      return { ...result, _groupIcon: icons.get(result._groupName) }
    }
    return result
  })

  return (
    <div className="results-list" ref={listRef}>
      {resultsWithIcons.map((item, index) => {
        const isSelected = index === selectedIndex

        if (!item._isGroupStart && !item._groupName) {
          return (
            <div
              key={item.path || item.id || item.url || index}
              className={`result-item app-result ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(index)}
              onMouseEnter={() => onHover(index)}
            >
              <div className="result-icon">
                {item.icon ? (
                  <img src={item.icon} alt={item.name} className="app-icon-img" />
                ) : (
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
                    {item.type === 'command' ? (
                      <>
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </>
                    ) : item.type === 'scriptsmith-trigger' ? (
                      <>
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </>
                    ) : item.type === 'shortcut' ? (
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    ) : item.type === 'plugin' ? (
                      <path d="M20.5 14.5a2.5 2.5 0 0 0-4.5 0 2.5 2.5 0 0 1-2.5 2.5h-1a2.5 2.5 0 0 1 0-5h1a2.5 2.5 0 0 0 0-5h-5a2.5 2.5 0 0 0 0 5v1a2.5 2.5 0 0 1-2.5 2.5 2.5 2.5 0 0 0 0 4.5v1a2.5 2.5 0 0 1 2.5 2.5h5a2.5 2.5 0 0 1 0-5h-1a2.5 2.5 0 0 0-2.5-2.5" />
                    ) : item.type === 'file' ? (
                      <>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </>
                    ) : (
                      <>
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </>
                    )}
                  </svg>
                )}
              </div>
              <div className="result-content">
                <div className="result-name">
                  {item.name}
                  {item.type === 'shortcut' && <span className="result-badge">Shortcut</span>}
                  {item.type === 'plugin' && <span className="result-badge">Plugin</span>}
                  {item.type === 'scriptsmith-trigger' && <span className="result-badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe' }}>AI Gen</span>}
                </div>
                {item.type === 'app' && <div className="result-path">{item.path}</div>}
                {item.description && <div className="result-path">{item.description}</div>}
              </div>
            </div>
          )
        }

        return (
          <React.Fragment key={`${item._groupName}-${item.name}-${index}`}>
            {item._isGroupStart && (
              <div className="group-header">
                <span className="group-icon">
                  {item._groupIcon ? (
                    <img src={item._groupIcon} alt="" className="group-app-icon-img" />
                  ) : item._groupName === 'Files' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  ) : (
                    <span className="icon-fallback">📂</span>
                  )}
                </span>
                <span className="group-name">{item._groupName}</span>
                <span className="group-count">{item._groupItemCount}</span>
              </div>
            )}

            <div
              className={`result-item group-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(index)}
              onMouseEnter={() => onHover(index)}
            >
              <div className="result-icon">
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
                  {item.type === 'file' ? (
                    <>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </>
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </>
                  )}
                </svg>
              </div>
              <div className="result-content">
                <div className="result-name">
                  {item.name}
                  {item.browser && <span className="result-browser-badge">{item.browser}</span>}
                </div>
                <div className="result-path">{item.type === 'file' ? item.path : item.url}</div>
              </div>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

ResultsList.displayName = 'ResultsList'

export default memo(ResultsList)
