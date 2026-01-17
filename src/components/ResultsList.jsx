import React, { useEffect, useRef, useState } from 'react'
import { ipcRenderer } from '../services/electron'
import { logger } from '../utils/logger'

const pendingIconRequests = new Set()

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

      const resultsToProcess = results.filter(result =>
        result.type === 'app' &&
        !result.icon &&
        !icons.has(result.path) &&
        !pendingIconRequests.has(result.path)
      )

      for (let i = 0; i < resultsToProcess.length; i += BATCH_SIZE) {
        if (isCancelled) return

        const batch = resultsToProcess.slice(i, i + BATCH_SIZE)

        await Promise.all(batch.map(async (result) => {
          if (isCancelled) return

          pendingIconRequests.add(result.path)

          try {
            const icon = await ipcRenderer.invoke('get-app-icon', result.path)
            if (icon && !isCancelled) {
              setIcons(prev => new Map(prev).set(result.path, icon))
            }
          } catch (error) {
            logger.error('ResultsList', 'Error loading app icon', error)
          } finally {
            pendingIconRequests.delete(result.path)
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

  const resultsWithIcons = results.map(result =>
    result.type === 'app' && icons.has(result.path)
      ? { ...result, icon: icons.get(result.path) }
      : result
  )

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
                <div className="result-name">{item.name}</div>
                {item.type === 'app' && <div className="result-path">{item.path}</div>}
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
                                <img src={item._groupIcon} alt="" />
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
                          <circle cx="12" cy="12" r="10" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                    </div>
                    <div className="result-content">
                        <div className="result-name">
                            {item.name}
                            <span className="result-browser-badge">{item.browser}</span>
                        </div>
                        <div className="result-path">{item.url}</div>
                    </div>
                </div>
            </React.Fragment>
        )
      })}
    </div>
  )
}

export default ResultsList
