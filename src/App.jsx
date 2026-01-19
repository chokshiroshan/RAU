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
  const searchIdRef = useRef(0)
  const inputRef = useRef(null)
  const resultsContainerRef = useRef(null)
  const settingsButtonRef = useRef(null)
  const hasQuery = query.trim().length > 0
  const [isExiting, setIsExiting] = useState(false)
  const [windowHeight, setWindowHeight] = useState(62) // Collapsed by default
  const [showSettings, setShowSettings] = useState(false)
  const [appSettings, setAppSettings] = useState({})
  
  // Navigation mode tracking: prevents mouse hover from changing selection during keyboard navigation
  const isKeyboardNavigatingRef = useRef(false)
  const lastMousePositionRef = useRef({ x: 0, y: 0 })

  const loadSettings = useCallback(async () => {
    if (!ipcRenderer) return
    try {
      const settings = await ipcRenderer.invoke('get-settings')
      setAppSettings(settings)
      
      // Apply theme
      const theme = settings.theme || 'system'
      document.documentElement.classList.remove('theme-light', 'theme-dark')
      if (theme !== 'system') {
        document.documentElement.classList.add(`theme-${theme}`)
      }
    } catch (err) {
      logger.error('App', 'Failed to load settings', err)
    }
  }, [])

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Reload settings when settings panel closes
  useEffect(() => {
    if (!showSettings) {
      loadSettings()
    }
  }, [showSettings, loadSettings])

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

  // Debounced search - pass cached settings to avoid IPC overhead per keystroke
  const performSearch = useCallback(async (searchQuery, activeFilters, settings) => {
    if (!searchQuery || searchQuery.trim() === '') {
      setResults([])
      setSelectedIndex(0)
      return
    }

    const currentSearchId = ++searchIdRef.current
    setIsLoading(true)
    try {
      const searchResults = await searchUnified(searchQuery, activeFilters, settings)
      if (searchIdRef.current !== currentSearchId) return
      const organizedResults = organizeResults(searchResults)
      setResults(organizedResults)
      setSelectedIndex(0)
    } catch (error) {
      if (searchIdRef.current !== currentSearchId) return
      logger.error('App', 'Search error', error)
      setResults([])
    } finally {
      if (searchIdRef.current === currentSearchId) {
        setIsLoading(false)
      }
    }
  }, [])

  // Handle query change with debounce (150ms - faster response)
  // Pass appSettings to avoid IPC overhead on every keystroke
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query, filters, appSettings)
    }, 150)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, filters, appSettings, performSearch])

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
    // Increased heights to prevent clipping of shadows and hover animations
    const COLLAPSED_HEIGHT = 160 // Search bar + large padding
    const EXPANDED_HEIGHT = 850 // Results/Settings + large padding

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
    // 1. Global Type-to-Search
    // If user types a character and is NOT focused on an input, switch to search
    const isChar = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey // Shift is fine for capitals, but usually e.key captures char
    // Actually e.key handles capitals correctly. We want to avoid shortcuts.
    const isModifier = e.ctrlKey || e.metaKey || e.altKey
    
    const activeEl = document.activeElement
    const isInputFocused = activeEl && (
      activeEl.tagName === 'INPUT' || 
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.isContentEditable
    )

    // If typing a regular character outside of an input field
    if (e.key.length === 1 && !isModifier && !isInputFocused) {
        // If settings open, close it
        if (showSettings) setShowSettings(false)
        
        // Focus search bar
        inputRef.current?.focus()
        
        // We don't preventDefault() so the character is typed into the input
        return
    }

    // If settings are open, let default behavior happen (scrolling)
    // Only capture Escape to close
    if (showSettings) {
        if (e.key === 'Escape') {
            e.preventDefault()
            setShowSettings(false)
        }
        return
    }

    // 2. Region Navigation (Arrow Right/Left)
    if (e.key === 'ArrowRight') {
        // Move focus to filter bubbles if not already there
        if (activeEl !== settingsButtonRef.current) {
            // If in input, only hijack if empty. If typing, allow default (cursor move).
            if (isInputFocused && query.length > 0) {
                return
            }
            e.preventDefault()
            settingsButtonRef.current?.focus()
            return
        }
    }

    if (e.key === 'ArrowLeft') {
        // Move focus back to search input
        if (activeEl === settingsButtonRef.current) {
            e.preventDefault()
            inputRef.current?.focus()
            return
        }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        isKeyboardNavigatingRef.current = true
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
        isKeyboardNavigatingRef.current = true
        setSelectedIndex(prev => {
          const safePrev = isNaN(prev) || prev === undefined ? 0 : prev
          if (results.length === 0) return 0
          const nextIndex = Math.max(safePrev - 1, 0)
          logger.debug('Nav', 'ArrowUp', { from: safePrev, to: nextIndex, totalResults: results.length, resultType: results[nextIndex]?.type })
          return nextIndex
        })
        break
      case 'Enter':
        // If settings button is focused, allow default action (click) and return
        if (document.activeElement === settingsButtonRef.current) {
            return
        }

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

  // Handle mouse movement in results list - re-enables hover selection after keyboard navigation
  const handleResultsMouseMove = useCallback((e) => {
    const { clientX, clientY } = e
    const { x: lastX, y: lastY } = lastMousePositionRef.current
    
    // Only switch to mouse mode if mouse actually moved (not just element scrolled under cursor)
    if (clientX !== lastX || clientY !== lastY) {
      lastMousePositionRef.current = { x: clientX, y: clientY }
      isKeyboardNavigatingRef.current = false
    }
  }, [])

  // Handle hover selection - only works when not in keyboard navigation mode
  const handleResultHover = useCallback((index) => {
    if (!isKeyboardNavigatingRef.current) {
      setSelectedIndex(index)
    }
  }, [])

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
              ref={settingsButtonRef}
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
          <div className="results-container" ref={resultsContainerRef} onMouseMove={handleResultsMouseMove}>
            <ResultsList
              results={results}
              selectedIndex={selectedIndex}
              onSelect={handleResultClick}
              onHover={handleResultHover}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
