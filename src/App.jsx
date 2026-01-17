import React, { useState, useEffect, useCallback, useRef } from 'react'
import SearchBar from './components/SearchBar'
import ResultsList from './components/ResultsList'
import Onboarding from './components/Onboarding'
import Settings from './components/Settings'
import { searchUnified } from './services/unifiedSearch'
import { ipcRenderer } from './services/electron'
import { getHistory, addToHistory } from './services/historyService'
import { organizeResults } from './utils/resultOrganizer'
import { logger } from './utils/logger'

const ONBOARDING_KEY = 'rau-onboarding-complete'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  // Filter states - must be declared before any early returns
  const [filters, setFilters] = useState({
    apps: true,
    files: true,
    tabs: true,
    commands: true
  })
  const searchTimeoutRef = useRef(null)
  const inputRef = useRef(null)
  const resultsContainerRef = useRef(null)
  const hasQuery = query.trim().length > 0
  const [isExiting, setIsExiting] = useState(false)
  const [windowHeight, setWindowHeight] = useState(62) // Collapsed by default
  const [showSettings, setShowSettings] = useState(false)

  // Keep window fully expanded during onboarding so content isn't clipped
  useEffect(() => {
    if (!showOnboarding || !ipcRenderer) return
    ipcRenderer.invoke('resize-window', 700).catch(err => {
      logger.error('App', 'Failed to resize window for onboarding', err)
    })
  }, [showOnboarding])

  // Focus input when window is shown
  useEffect(() => {
    const handleWindowShown = () => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
      // Show history when window opens with empty query
      setShowHistory(true)
    }

    if (ipcRenderer) {
      ipcRenderer.on('window-shown', handleWindowShown)
      // Debug: confirm React mounted inside Electron
      ipcRenderer.send('renderer-ready')
    } else {
      logger.warn('App', 'ipcRenderer unavailable; UI will render but searches will not work.')
    }

    // Focus on initial load
    if (inputRef.current) {
      inputRef.current.focus()
    }

    return () => {
      if (ipcRenderer) {
        ipcRenderer.removeListener('window-shown', handleWindowShown)
      }
    }
  }, [])

  // Debounced search
  const performSearch = useCallback(async (searchQuery, activeFilters) => {
    if (!searchQuery || searchQuery.trim() === '') {
      setResults([])
      setSelectedIndex(0)
      return
    }

    setIsLoading(true)
    try {
      const searchResults = await searchUnified(searchQuery, activeFilters)
      const organizedResults = organizeResults(searchResults)
      setResults(organizedResults)
      setSelectedIndex(0)
    } catch (error) {
      logger.error('App', 'Search error', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle query change with debounce (150ms - faster response)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query, filters)
    }, 150)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, filters, performSearch])

  // Close settings when query changes
  useEffect(() => {
    if (hasQuery && showSettings) {
      setShowSettings(false)
    }
  }, [hasQuery, showSettings])

  // Dynamic window height calculation - use fixed heights to avoid race conditions
  useEffect(() => {
    if (showOnboarding) return

    // Simple fixed heights: collapsed or expanded
    const COLLAPSED_HEIGHT = 92 // Search bar + padding + buffer
    const EXPANDED_HEIGHT = 700 // Fixed height when showing results or settings

    const hasResults = hasQuery && (isLoading || results.length > 0)
    const needsExpanded = hasResults || showSettings
    const newHeight = needsExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT

    setWindowHeight(newHeight)

    // Update Electron window size
    if (ipcRenderer) {
      ipcRenderer.invoke('resize-window', newHeight).catch(err => {
        logger.error('App', 'Failed to resize window', err)
      })
    }
  }, [results.length, hasQuery, isLoading, showOnboarding, showSettings])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => {
          const safePrev = isNaN(prev) || prev === undefined ? 0 : prev
          if (results.length === 0) return 0
          const nextIndex = Math.min(safePrev + 1, results.length - 1)
          logger.debug('Nav', 'ArrowDown', { from: safePrev, to: nextIndex, totalResults: results.length, resultType: results[nextIndex]?.type })
          return nextIndex
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => {
          const safePrev = isNaN(prev) || prev === undefined ? 0 : prev
          if (results.length === 0) return 0
          const nextIndex = Math.max(safePrev - 1, 0)
          logger.debug('Nav', 'ArrowUp', { from: safePrev, to: nextIndex, totalResults: results.length, resultType: results[nextIndex]?.type })
          return nextIndex
        })
        break
      case 'Enter':
        e.preventDefault()
        if (results.length > 0 && results[selectedIndex]) {
          const result = results[selectedIndex]

          // Handle calculator result - copy to clipboard
          if (result.type === 'calculator') {
            navigator.clipboard.writeText(String(result.result)).catch(err => {
              logger.error('App', 'Failed to copy to clipboard', err)
            })
            if (ipcRenderer) ipcRenderer.send('hide-window')
            return
          }

          // Handle system command
          if (result.type === 'command') {
            if (ipcRenderer) {
              ipcRenderer.invoke('execute-command', result.action).catch(err => {
                logger.error('App', 'Failed to execute command', err)
              })
            }
            return
          }

          // Handle web search
          if (result.type === 'web-search') {
            if (ipcRenderer) {
              ipcRenderer.invoke('open-url', result.url).catch(err => {
                logger.error('App', 'Failed to open URL', err)
              })
            }
            return
          }

          // Record to history (except calculators, commands, web-search)
          addToHistory(result)

          // Handle app, file, tab, and history selection
          if (result.type === 'app' || result.type === 'history-app') {
            if (ipcRenderer) {
              ipcRenderer.invoke('open-app', result.path).catch(err => {
                logger.error('App', 'Failed to open app', err)
              })
            }
          } else if (result.type === 'tab' || result.type === 'history-tab' || result.type === 'window') {
            if (ipcRenderer) {
              ipcRenderer.invoke('activate-tab', result).catch(err => {
                logger.error('App', 'Failed to activate tab', err)
              })
            }
          } else {
            if (ipcRenderer) {
              ipcRenderer.invoke('open-file', result.path).catch(err => {
                logger.error('App', 'Failed to open file', err)
              })
            }
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        // Trigger exit animation before hiding
        setIsExiting(true)
        setTimeout(() => {
          if (ipcRenderer) ipcRenderer.send('hide-window')
          setIsExiting(false)
        }, 150) // Match --duration-exit
        break
      default:
        break
    }
  }, [results, selectedIndex])

  // Handle result click - using invoke for proper response handling
  const handleResultClick = useCallback((index) => {
    if (results[index]) {
      const result = results[index]
      // Handle app, file, and tab selection
      if (result.type === 'app') {
        if (ipcRenderer) {
          ipcRenderer.invoke('open-app', result.path).catch(err => {
            logger.error('App', 'Failed to open app', err)
          })
        }
      } else if (result.type === 'tab' || result.type === 'window') {
        if (ipcRenderer) {
          ipcRenderer.invoke('activate-tab', result).catch(err => {
            logger.error('App', 'Failed to activate tab', err)
          })
        }
      } else {
        if (ipcRenderer) {
          ipcRenderer.invoke('open-file', result.path).catch(err => {
            logger.error('App', 'Failed to open file', err)
          })
        }
      }
    }
  }, [results])

  // Toggle filter
  const toggleFilter = useCallback((key) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }))
    if (inputRef.current) inputRef.current.focus()
  }, [])

  // Handle onboarding completion
  const handleOnboardingComplete = useCallback(() => {
    // Persist to localStorage
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setShowOnboarding(false)
    // Focus the search input after onboarding
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)
  }, [])

  // Show onboarding if first run
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <div
      className={`app-container ${isExiting ? 'exiting' : ''}`}
      onKeyDownCapture={handleKeyDown}
    >
      <div className="search-window">
        {/* Top Row: Search Pill + Filter Bubbles */}
        <div className={`search-row ${hasQuery ? 'has-query' : ''}`}>
          <SearchBar
            ref={inputRef}
            value={query}
            onChange={setQuery}
            isLoading={isLoading}
            hasResults={hasQuery && results.length > 0}
          />

          <div className={`filter-bubbles ${hasQuery ? 'hidden' : ''}`}>
            <button
              className={`filter-bubble ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
          </div>
        </div>

        {/* Inline Settings Panel - replaces results when open */}
        {showSettings && (
          <div className="results-container">
            <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
          </div>
        )}

        {/* Detached Results List - hidden when settings is open */}
        {!showSettings && hasQuery && (isLoading || results.length > 0) && (
          <div className="results-container" ref={resultsContainerRef}>
            <ResultsList
              results={results}
              selectedIndex={selectedIndex}
              onSelect={handleResultClick}
              onHover={setSelectedIndex}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
