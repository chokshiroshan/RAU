---
name: react-search-interface
description: Provides patterns, templates, and best practices for building high-performance React search interfaces with keyboard navigation, virtualization, and accessibility support. Use when building search result components, implementing keyboard navigation, optimizing search interface performance, or creating accessible search interfaces.
---

# React Search Interface Skill

## Purpose
Provides patterns, templates, and best practices for building high-performance React search interfaces with keyboard navigation, virtualization, and accessibility support.

## When to Use
- Building search result components with virtualization
- Implementing keyboard navigation and shortcuts
- Optimizing search interface performance
- Creating accessible search interfaces
- Managing search state and user interactions

## Key Patterns

### 1. Search Component Architecture

**Main Search Container**:
```jsx
// src/components/SearchInterface.jsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useDebounce } from '../hooks/useDebounce'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { useVirtualizedList } from '../hooks/useVirtualizedList'

const SearchInterface = ({ onResultSelect, onQueryChange }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState({ apps: true, tabs: true, files: true })

  // Refs for DOM manipulation
  const searchInputRef = useRef(null)
  const resultsContainerRef = useRef(null)

  // Debounced search to prevent excessive API calls
  const debouncedQuery = useDebounce(query, 150)

  // Virtualized list for performance with large result sets
  const {
    virtualItems,
    totalHeight,
    scrollToItem,
    getItemProps
  } = useVirtualizedList({
    items: results,
    itemHeight: 48,
    overscan: 5,
    selectedIndex
  })

  // Keyboard navigation hook
  useKeyboardNavigation({
    items: results,
    selectedIndex,
    onSelect: (index) => {
      setSelectedIndex(index)
      if (results[index]) {
        onResultSelect(results[index])
      }
    },
    onEscape: () => {
      setQuery('')
      setResults([])
      searchInputRef.current?.focus()
    }
  })

  // Search function with error handling
  const performSearch = useCallback(async (searchQuery) => {
    if (searchQuery.trim().length < 2) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const searchResults = await window.electronAPI.searchUnified(searchQuery, filters)
      setResults(searchResults.slice(0, 20)) // Limit results
      setSelectedIndex(0) // Reset selection
    } catch (error) {
      console.error('[SearchInterface] Search failed:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  // Trigger search when query changes
  useEffect(() => {
    performSearch(debouncedQuery)
  }, [debouncedQuery, performSearch])

  // Input change handler
  const handleQueryChange = useCallback((event) => {
    const value = event.target.value
    setQuery(value)
    onQueryChange?.(value)
  }, [onQueryChange])

  // Result selection handler
  const handleResultSelect = useCallback((result, index) => {
    setSelectedIndex(index)
    onResultSelect?.(result)
  }, [onResultSelect])

  // Memoized result item component
  const ResultItem = useMemo(() => {
    return React.memo(({ item, index, style, isSelected }) => {
      const typeIcon = getResultTypeIcon(item.type)
      const handleClick = () => handleResultSelect(item, index)

      return (
        <div
          className={`search-result-item ${isSelected ? 'selected' : ''}`}
          style={style}
          onClick={handleClick}
          role="option"
          aria-selected={isSelected}
          data-result-type={item.type}
        >
          <div className="result-icon">{typeIcon}</div>
          <div className="result-content">
            <div className="result-name">{item.name}</div>
            {item.title && (
              <div className="result-detail">{item.title}</div>
            )}
            {item.url && (
              <div className="result-url">{formatUrl(item.url)}</div>
            )}
          </div>
          <div className="result-type">{item.type}</div>
        </div>
      )
    })
  }, [handleResultSelect])

  return (
    <div className="search-interface">
      <SearchInput
        ref={searchInputRef}
        value={query}
        onChange={handleQueryChange}
        isLoading={isLoading}
        placeholder="Search apps, tabs, files..."
      />

      {results.length > 0 && (
        <div
          ref={resultsContainerRef}
          className="search-results-container"
          role="listbox"
          aria-label="Search results"
          aria-activedescendant={`result-${selectedIndex}`}
        >
          <div
            style={{ height: `${totalHeight}px`, position: 'relative' }}
          >
            {virtualItems.map((virtualItem) => (
              <ResultItem
                key={virtualItem.key}
                item={virtualItem.data}
                index={virtualItem.index}
                style={getItemProps(virtualItem).style}
                isSelected={virtualItem.index === selectedIndex}
              />
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !isLoading && query.length >= 2 && (
        <EmptyState query={query} />
      )}
    </div>
  )
}

export default React.memo(SearchInterface)
```

### 2. Virtualized List Hook

**Custom Hook for Virtualization**:
```jsx
// src/hooks/useVirtualizedList.js
import { useMemo, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

export const useVirtualizedList = ({
  items,
  itemHeight = 48,
  overscan = 5,
  selectedIndex = 0,
  containerRef
}) => {
  const parentRef = containerRef || useRef(null)

  // Virtualizer configuration
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
    scrollToIndex: selectedIndex
  })

  // Scroll to selected item when selection changes
  const scrollToItem = useCallback((index) => {
    if (index >= 0 && index < items.length) {
      virtualizer.scrollToIndex(index, {
        align: 'auto',
        behavior: 'smooth'
      })
    }
  }, [virtualizer, items.length])

  // Get props for virtualized item
  const getItemProps = useCallback((virtualItem) => ({
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: `${virtualItem.size}px`,
      transform: `translateY(${virtualItem.start}px)`
    }
  }), [])

  // Memoized virtual items
  const virtualItems = useMemo(() => {
    return virtualizer.getVirtualItems().map(virtualItem => ({
      ...virtualItem,
      key: `${items[virtualItem.index]?.type || 'unknown'}-${virtualItem.index}`,
      data: items[virtualItem.index]
    }))
  }, [virtualizer, items])

  // Auto-scroll to selected item
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < items.length) {
      scrollToItem(selectedIndex)
    }
  }, [selectedIndex, items.length, scrollToItem])

  return {
    virtualItems,
    totalHeight: virtualizer.getTotalSize(),
    scrollToItem,
    getItemProps,
    parentRef
  }
}
```

### 3. Keyboard Navigation Hook

**Comprehensive Keyboard Navigation**:
```jsx
// src/hooks/useKeyboardNavigation.js
import { useCallback, useEffect } from 'react'

export const useKeyboardNavigation = ({
  items,
  selectedIndex,
  onSelect,
  onEscape,
  onSubmit,
  containerRef
}) => {
  const handleKeyDown = useCallback((event) => {
    // Don't handle keyboard events when user is typing in input
    if (event.target.tagName === 'INPUT' && event.key !== 'Escape') {
      return
    }

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        onSelect(Math.max(0, selectedIndex - 1))
        break

      case 'ArrowDown':
        event.preventDefault()
        onSelect(Math.min(items.length - 1, selectedIndex + 1))
        break

      case 'Home':
        event.preventDefault()
        onSelect(0)
        break

      case 'End':
        event.preventDefault()
        onSelect(items.length - 1)
        break

      case 'Enter':
        event.preventDefault()
        if (items[selectedIndex]) {
          onSubmit?.(items[selectedIndex])
        }
        break

      case 'Escape':
        event.preventDefault()
        onEscape?.()
        break

      case 'PageUp':
        event.preventDefault()
        onSelect(Math.max(0, selectedIndex - 10))
        break

      case 'PageDown':
        event.preventDefault()
        onSelect(Math.min(items.length - 1, selectedIndex + 10))
        break

      case 'Tab':
        event.preventDefault()
        // Cycle through results
        const nextIndex = (selectedIndex + 1) % items.length
        onSelect(nextIndex)
        break
    }
  }, [items, selectedIndex, onSelect, onEscape, onSubmit])

  // Global keyboard event listener
  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      // Only handle if search interface is focused
      if (containerRef.current?.contains(document.activeElement)) {
        handleKeyDown(event)
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleKeyDown, containerRef])

  // Keyboard shortcuts help
  const keyboardShortcuts = {
    '↑/↓': 'Navigate results',
    'Enter': 'Select result',
    'Escape': 'Clear search',
    'Home/End': 'First/Last result',
    'PageUp/Down': 'Jump 10 results',
    'Tab': 'Cycle results'
  }

  return {
    keyboardShortcuts,
    handleKeyDown
  }
}
```

### 4. Search Input Component

**Optimized Search Input**:
```jsx
// src/components/SearchInput.jsx
import React, { forwardRef, useImperativeHandle, useCallback } from 'react'
import { useHotkeys } from '../hooks/useHotkeys'

const SearchInput = forwardRef(({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  placeholder = 'Search...',
  className = '',
  disabled = false,
  autoFocus = true
}, ref) => {
  const inputRef = useRef(null)

  // Expose ref to parent
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    select: () => inputRef.current?.select(),
    input: inputRef.current
  }))

  // Handle input change
  const handleChange = useCallback((event) => {
    onChange?.(event.target.value)
  }, [onChange])

  // Handle form submission
  const handleSubmit = useCallback((event) => {
    event.preventDefault()
    onSubmit?.()
  }, [onSubmit])

  // Keyboard shortcuts
  useHotkeys('escape', () => {
    inputRef.current?.blur()
  }, { enabled: !disabled })

  useHotkeys('cmd+k,cmd+f', () => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, { enabled: !disabled })

  return (
    <form onSubmit={handleSubmit} className={`search-input-form ${className}`}>
      <div className="search-input-container">
        <div className="search-input-icon">
          {isLoading ? (
            <div className="loading-spinner" aria-label="Searching" />
          ) : (
            <SearchIcon aria-hidden="true" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="search-input"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-label={placeholder}
          aria-describedby={isLoading ? 'search-loading' : undefined}
        />

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="search-clear-button"
            aria-label="Clear search"
          >
            <ClearIcon />
          </button>
        )}
      </div>

      {isLoading && (
        <div id="search-loading" className="sr-only">
          Searching, please wait...
        </div>
      )}
    </form>
  )
})

SearchInput.displayName = 'SearchInput'

export default SearchInput
```

### 5. Result Item Component

**Accessible Result Item**:
```jsx
// src/components/ResultItem.jsx
import React, { memo } from 'react'
import { getResultTypeIcon, formatUrl } from '../utils/resultUtils'

const ResultItem = memo(({
  result,
  isSelected,
  index,
  onSelect,
  style,
  className = ''
}) => {
  const handleClick = useCallback(() => {
    onSelect(result, index)
  }, [result, index, onSelect])

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(result, index)
    }
  }, [result, index, onSelect])

  const typeIcon = getResultTypeIcon(result.type)

  return (
    <div
      className={`search-result-item ${isSelected ? 'selected' : ''} ${className}`}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="option"
      aria-selected={isSelected}
      aria-describedby={`result-detail-${index}`}
      tabIndex={isSelected ? 0 : -1}
      data-result-type={result.type}
      data-result-id={result.id}
    >
      <div className="result-icon" aria-hidden="true">
        {typeIcon}
      </div>

      <div className="result-content">
        <div className="result-name">
          {result.name}
        </div>

        {result.title && (
          <div className="result-detail" id={`result-detail-${index}`}>
            {result.title}
          </div>
        )}

        {result.url && (
          <div className="result-url">
            {formatUrl(result.url)}
          </div>
        )}

        {result.path && (
          <div className="result-path">
            {result.path}
          </div>
        )}
      </div>

      <div className="result-meta">
        <div className="result-type" aria-hidden="true">
          {result.type}
        </div>

        {result.score && (
          <div className="result-score" aria-hidden="true">
            {Math.round((1 - result.score) * 100)}%
          </div>
        )}
      </div>
    </div>
  )
})

ResultItem.displayName = 'ResultItem'

export default ResultItem
```

## Performance Optimization Patterns

### 1. Memoization Strategies
```jsx
// Memoize expensive computations
const filteredResults = useMemo(() => {
  return results.filter(result => {
    if (filters.apps && result.type === 'app') return true
    if (filters.tabs && result.type === 'tab') return true
    if (filters.files && result.type === 'file') return true
    return false
  })
}, [results, filters])

// Memoize result item rendering
const MemoizedResultItem = memo(ResultItem, (prevProps, nextProps) => {
  return (
    prevProps.result.id === nextProps.result.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.style === nextProps.style
  )
})
```

### 2. Debouncing and Throttling
```jsx
// Custom debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttled scroll handler
const useThrottledScroll = (callback, delay = 16) => {
  const lastCall = useRef(0)

  return useCallback((...args) => {
    const now = Date.now()
    if (now - lastCall.current >= delay) {
      lastCall.current = now
      callback(...args)
    }
  }, [callback, delay])
}
```

### 3. Lazy Loading
```jsx
// Lazy load heavy components
const LazyResultsList = React.lazy(() => import('./ResultsList'))

// Use in component with Suspense
<Suspense fallback={<div className="loading">Loading results...</div>}>
  <LazyResultsList results={results} />
</Suspense>
```

## Accessibility Implementation

### 1. ARIA Support
```jsx
// Accessible search results container
const SearchResults = ({ results, selectedIndex, onSelect }) => (
  <div
    role="listbox"
    aria-label="Search results"
    aria-activedescendant={results[selectedIndex] ? `result-${selectedIndex}` : undefined}
    aria-live="polite"
    aria-atomic="false"
  >
    {results.map((result, index) => (
      <div
        key={result.id}
        id={`result-${index}`}
        role="option"
        aria-selected={index === selectedIndex}
        aria-describedby={`result-detail-${index}`}
        tabIndex={index === selectedIndex ? 0 : -1}
      >
        {/* Result content */}
      </div>
    ))}
  </div>
)
```

### 2. Screen Reader Support
```jsx
// Screen reader announcements
const useScreenReaderAnnouncement = () => {
  const announce = useCallback((message) => {
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', 'polite')
    announcement.className = 'sr-only'
    announcement.textContent = message

    document.body.appendChild(announcement)

    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }, [])

  return { announce }
}

// Usage in search component
const { announce } = useScreenReaderAnnouncement()

useEffect(() => {
  if (results.length > 0) {
    announce(`Found ${results.length} results`)
  } else if (query.length >= 2) {
    announce('No results found')
  }
}, [results.length, query])
```

## Common Pitfalls and Solutions

### Pitfall 1: Excessive Re-renders
**Problem**: Components re-render on every keystroke.

**Solution**:
```jsx
// Use React.memo and useCallback properly
const SearchResults = memo(({ results, onSelect }) => {
  const handleSelect = useCallback((result) => {
    onSelect(result)
  }, [onSelect])

  return (
    <div>
      {results.map(result => (
        <ResultItem
          key={result.id}
          result={result}
          onSelect={handleSelect}
        />
      ))}
    </div>
  )
})
```

### Pitfall 2: Poor Virtualization
**Problem**: Virtualization not working with dynamic heights.

**Solution**:
```jsx
// Use dynamic height measurement
const useDynamicVirtualization = (items) => {
  const [itemHeights, setItemHeights] = useState(new Map())

  const measureItem = useCallback((index, height) => {
    setItemHeights(prev => new Map(prev).set(index, height))
  }, [])

  const getItemHeight = useCallback((index) => {
    return itemHeights.get(index) || 48 // Default height
  }, [itemHeights])

  return { measureItem, getItemHeight }
}
```

### Pitfall 3: Accessibility Issues
**Problem**: Keyboard navigation not working properly.

**Solution**:
```jsx
// Ensure proper focus management
const useFocusManagement = (containerRef) => {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (event) => {
      if (event.key === 'Tab') {
        // Manage focus within container
        const focusableElements = container.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [containerRef])
}
```

## When to Use This Skill
Use this skill when building:
- Search result interfaces with large datasets
- Keyboard-navigable components
- Virtualized lists for performance
- Accessible search interfaces
- Real-time search with debouncing
- Complex state management in search UI

## Related Files
- `src/components/SearchInterface.jsx` - Main search component
- `src/components/ResultItem.jsx` - Individual result component
- `src/hooks/useVirtualizedList.js` - Virtualization hook
- `src/hooks/useKeyboardNavigation.js` - Navigation hook
- `src/components/SearchInput.jsx` - Search input component
