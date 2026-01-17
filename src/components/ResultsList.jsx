import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { ipcRenderer } from '../services/electron'
import ResultGroup from './ResultGroup'

// Track in-flight icon requests to prevent duplicates (shared across instances)
const pendingIconRequests = new Set()

function ResultsList({ results, selectedIndex, onSelect, onHover }) {
  const listRef = useRef(null)
  const [icons, setIcons] = useState(new Map())
  const [appIcons, setAppIcons] = useState(new Map())

  // Separate app results and group tab/window results by application
  const { appResults, groupedTabWindowResults } = useMemo(() => {
    const groups = {}
    const apps = []
    const seenItems = new Set()

    results.forEach(result => {
      // Separate app results
      if (result.type === 'app') {
        // Deduplicate apps
        const appKey = result.path
        if (!seenItems.has(appKey)) {
          seenItems.add(appKey)
          apps.push(result)
        }
        return
      }

      // Create unique key for tab/window deduplication
      const itemKey = `${result.type}-${result.title || result.name || result.url}-${result.appName || result.browser}-${result.windowIndex || ''}-${result.tabIndex || ''}`

      // Skip duplicate tabs/windows
      if (seenItems.has(itemKey)) {
        return
      }
      seenItems.add(itemKey)

      const appName = result.appName || result.browser || result.name || 'Other'
      const category = result.capability?.category || null

      if (!groups[appName]) {
        groups[appName] = {
          appName,
          category,
          items: [],
          icon: null
        }
      }

      groups[appName].items.push(result)
    })

    // Convert to array and sort by best score in group
    const sortedGroups = Object.values(groups).sort((a, b) => {
      const aBestScore = Math.min(...a.items.map(item => item.score || 999))
      const bBestScore = Math.min(...b.items.map(item => item.score || 999))
      return aBestScore - bBestScore
    })

    // Sort apps by score
    const sortedApps = apps.sort((a, b) => (a.score || 999) - (b.score || 999))

    return { appResults: sortedApps, groupedTabWindowResults: sortedGroups }
  }, [results])

  // Calculate flat indices for apps and groups
  const displayData = useMemo(() => {
    const items = []
    let flatIndex = 0

    // Add apps as individual items
    appResults.forEach(app => {
      items.push({
        type: 'app',
        item: app,
        flatIndex,
        groupStartIndex: flatIndex
      })
      flatIndex++
    })

    // Add grouped tab/window results
    groupedTabWindowResults.forEach(group => {
      const groupStartIndex = flatIndex
      items.push({
        type: 'group',
        group,
        groupStartIndex
      })
      flatIndex += group.items.length
    })

    console.log('[ResultsList] Display data:', {
      appCount: appResults.length,
      groupCount: groupedTabWindowResults.length,
      totalItems: items.length,
      finalFlatIndex: flatIndex,
      currentSelectedIndex: selectedIndex,
      displayData: items.map(item => ({ type: item.type, flatIndex: item.flatIndex, groupStartIndex: item.groupStartIndex }))
    })
    return items
  }, [appResults, groupedTabWindowResults, selectedIndex])

  // Get the selected result from flat index
  const selectedResult = useMemo(() => {
    if (selectedIndex >= 0 && selectedIndex < results.length) {
      return results[selectedIndex]
    }
    return null
  }, [results, selectedIndex])

  // Scroll selected item into view
  useEffect(() => {
    const listEl = listRef.current
    if (!listEl) return

    // Wait for DOM to reflect the new selected state (important for nested group items)
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

  // Update results with icons
  const resultsWithIcons = results.map(result =>
    result.type === 'app' && icons.has(result.path)
      ? { ...result, icon: icons.get(result.path) }
      : result
  )

  return (
    <div className="results-list" ref={listRef}>
      {displayData.map((displayItem, displayIndex) => {
        if (displayItem.type === 'app') {
          // Render individual app result
          const app = displayItem.item
          const index = results.findIndex(r => r === app)
          const appWithIcon = resultsWithIcons[index] || app
          const isSelected = index === selectedIndex

          console.log('[ResultsList] App item:', {
            appName: app.name,
            flatIndex: index,
            groupStartIndex: displayItem.groupStartIndex,
            selectedIndex,
            isSelected
          })

          return (
            <div
              key={app.path}
              className={`result-item app-result ${isSelected ? 'selected' : ''}`}
              style={{ '--stagger-index': displayIndex }}
              onClick={() => onSelect(index)}
              onMouseEnter={() => onHover(index)}
            >
              <div className="result-icon">
                {appWithIcon.icon ? (
                  <img src={appWithIcon.icon} alt={app.name} className="app-icon-img" />
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
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                )}
              </div>
              <div className="result-content">
                <div className="result-name">{app.name}</div>
                <div className="result-path">{app.path}</div>
              </div>
            </div>
          )
        }

        // Render grouped tab/window results
        const group = displayItem.group
        return (
          <ResultGroup
            key={group.appName}
            group={{ ...group, items: group.items.map(item => {
              const index = results.findIndex(r => r === item)
              return resultsWithIcons[index] || item
            }) }}
            selectedIndex={selectedIndex}
            onSelect={onSelect}
            onHover={onHover}
            groupIndex={displayIndex}
            flatIndex={displayItem.groupStartIndex}
          />
        )
      })}
    </div>
  )
}

export default ResultsList
