import React, { useState, useEffect, useCallback, useRef } from 'react'
import SearchBar from './components/SearchBar'
import ResultsList from './components/ResultsList'
import Onboarding from './components/Onboarding'
import { searchUnified } from './services/unifiedSearch'
import { ipcRenderer } from './services/electron'
import { getHistory, addToHistory } from './services/historyService'

const ONBOARDING_KEY = 'context-search-onboarding-complete'

// ⚠️ DEBUG: Set to true to reset onboarding on next load
const DEBUG_RESET_ONBOARDING = false
if (DEBUG_RESET_ONBOARDING) {
  localStorage.removeItem(ONBOARDING_KEY)
}

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem(ONBOARDING_KEY)
  })
  const searchTimeoutRef = useRef(null)
  const inputRef = useRef(null)
  const hasQuery = query.trim().length > 0

  // No more IPC resize calls needed - window is fixed size
  // CSS handles content sizing and animations

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
      console.warn('[Renderer] ipcRenderer unavailable; UI will render but searches will not work.')
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
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.trim() === '') {
      setResults([])
      setSelectedIndex(0)
      return
    }

    setIsLoading(true)
    try {
      const searchResults = await searchUnified(searchQuery)
      setResults(searchResults)
      setSelectedIndex(0)
    } catch (error) {
      console.error('Search error:', error)
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
      performSearch(query)
    }, 150)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, performSearch])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results.length > 0 && results[selectedIndex]) {
          const result = results[selectedIndex]

          // Handle calculator result - copy to clipboard
          if (result.type === 'calculator') {
            navigator.clipboard.writeText(String(result.result)).catch(err => {
              console.error('Failed to copy to clipboard:', err)
            })
            if (ipcRenderer) ipcRenderer.send('hide-window')
            return
          }

          // Handle system command
          if (result.type === 'command') {
            if (ipcRenderer) {
              ipcRenderer.invoke('execute-command', result.action).catch(err => {
                console.error('Failed to execute command:', err)
              })
            }
            return
          }

          // Handle web search
          if (result.type === 'web-search') {
            if (ipcRenderer) {
              ipcRenderer.invoke('open-url', result.url).catch(err => {
                console.error('Failed to open URL:', err)
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
                console.error('Failed to open app:', err)
              })
            }
          } else if (result.type === 'tab' || result.type === 'history-tab') {
            if (ipcRenderer) {
              ipcRenderer.invoke('activate-tab', result).catch(err => {
                console.error('Failed to activate tab:', err)
              })
            }
          } else {
            if (ipcRenderer) {
              ipcRenderer.invoke('open-file', result.path).catch(err => {
                console.error('Failed to open file:', err)
              })
            }
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        // Hide the window
        if (ipcRenderer) ipcRenderer.send('hide-window')
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
            console.error('Failed to open app:', err)
          })
        }
      } else if (result.type === 'tab') {
        if (ipcRenderer) {
          ipcRenderer.invoke('activate-tab', result).catch(err => {
            console.error('Failed to activate tab:', err)
          })
        }
      } else {
        if (ipcRenderer) {
          ipcRenderer.invoke('open-file', result.path).catch(err => {
            console.error('Failed to open file:', err)
          })
        }
      }
    }
  }, [results])

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
      className="app-container"
      onKeyDown={handleKeyDown}
    >
      <div className="search-window">
        <SearchBar
          ref={inputRef}
          value={query}
          onChange={setQuery}
          isLoading={isLoading}
          hasResults={hasQuery && results.length > 0}
        />
        {hasQuery && (
          <ResultsList
            results={results}
            selectedIndex={selectedIndex}
            onSelect={handleResultClick}
            onHover={setSelectedIndex}
          />
        )}
      </div>
    </div>
  )
}

export default App
