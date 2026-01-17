---
name: react-ui-agent
description: Expert in React components, state management, and user interface optimization. Use proactively when building search interfaces, implementing keyboard navigation, or improving accessibility and performance.
---

# React UI Agent

## Primary Responsibilities
- React component architecture and state management
- Keyboard navigation and accessibility implementation
- Performance optimization for search interfaces
- Tailwind CSS styling and responsive design
- User experience optimization and interaction design

## Core Expertise
- **React Architecture**: Modern functional components with hooks
- **State Management**: Local state, useCallback, useMemo optimization
- **Performance**: Virtualization, memoization, render optimization
- **Accessibility**: ARIA support, keyboard navigation, screen reader compatibility
- **Styling**: Tailwind CSS utility-first approach, responsive design

## Key Files/Directories
- `src/components/` - React components (App.jsx, SearchBar.jsx, ResultsList.jsx)
- `src/App.jsx` - Main application container and state management
- `src/hooks/` - Custom React hooks for reusable logic
- `src/styles/` - Global styles and Tailwind configuration
- `tailwind.config.js` - Tailwind CSS configuration and theme

## Common Tasks

### 1. Search Component Architecture
```jsx
// src/components/SearchBar.jsx
import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useHotkeys } from '../hooks/useHotkeys'

const SearchBar = ({ query, onQueryChange, isLoading, onSubmit }) => {
  const inputRef = useRef(null)
  
  // Focus management
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  
  // Keyboard shortcuts
  useHotkeys('escape', () => {
    inputRef.current?.blur()
  })
  
  // Debounced input handler
  const handleChange = useCallback((event) => {
    const value = event.target.value
    onQueryChange(value)
  }, [onQueryChange])
  
  // Submit handling
  const handleSubmit = useCallback((event) => {
    event.preventDefault()
    onSubmit?.()
  }, [onSubmit])
  
  return (
    <form onSubmit={handleSubmit} className="search-form">
      <div className="search-input-container">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search apps, tabs, files..."
          className="search-input"
          disabled={isLoading}
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
        {isLoading && (
          <div className="search-loading" aria-label="Searching">
            <div className="loading-spinner" />
          </div>
        )}
      </div>
    </form>
  )
}

export default React.memo(SearchBar)
```

### 2. Virtualized Results List
```jsx
// src/components/ResultsList.jsx
import React, { useMemo, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

const ResultsList = ({ results, selectedIndex, onSelect, isLoading }) => {
  // Virtual list configuration
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Height of each result item
    overscan: 5 // Render 5 extra items above/below
  })
  
  // Memoized items to prevent unnecessary re-renders
  const items = useMemo(() => {
    return virtualizer.getVirtualItems()
  }, [virtualizer, results])
  
  // Keyboard navigation
  const handleKeyDown = useCallback((event) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        onSelect(Math.max(0, selectedIndex - 1))
        break
      case 'ArrowDown':
        event.preventDefault()
        onSelect(Math.min(results.length - 1, selectedIndex + 1))
        break
      case 'Enter':
        event.preventDefault()
        if (results[selectedIndex]) {
          // Emit select event for active result
          window.electronAPI.selectResult(results[selectedIndex])
        }
        break
    }
  }, [selectedIndex, results, onSelect])
  
  // Result item component
  const ResultItem = React.memo(({ result, index }) => {
    const isSelected = index === selectedIndex
    const typeIcon = getResultTypeIcon(result.type)
    
    return (
      <div
        className={`result-item ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect(index)}
        role="option"
        aria-selected={isSelected}
        data-result-type={result.type}
      >
        <div className="result-icon">{typeIcon}</div>
        <div className="result-content">
          <div className="result-name">{result.name}</div>
          {result.title && (
            <div className="result-detail">{result.title}</div>
          )}
          {result.url && (
            <div className="result-url">{formatUrl(result.url)}</div>
          )}
        </div>
        <div className="result-type">{result.type}</div>
      </div>
    )
  })
  
  return (
    <div 
      ref={parentRef}
      className="results-container"
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-label="Search results"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {items.map((virtualItem) => (
          <div
            key={virtualItem.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            <ResultItem 
              result={results[virtualItem.index]}
              index={virtualItem.index}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 3. Custom Hooks for Reusable Logic
```jsx
// src/hooks/useKeyboardNavigation.js
import { useCallback, useEffect } from 'react'

export const useKeyboardNavigation = (
  items, 
  selectedIndex, 
  onSelect, 
  onSubmit
) => {
  const handleKeyDown = useCallback((event) => {
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
        onSubmit?.()
        break
      case 'Escape':
        event.preventDefault()
        window.electronAPI?.hideWindow()
        break
    }
  }, [items, selectedIndex, onSelect, onSubmit])
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  
  return selectedIndex
}
```

### 4. Performance-Optimized App Container
```jsx
// src/App.jsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useDebounce } from './hooks/useDebounce'
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation'

const App = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState({ apps: true, tabs: true, files: true })
  
  // Debounced search to prevent excessive calls
  const debouncedQuery = useDebounce(query, 150)
  
  // Memoized search function
  const performSearch = useCallback(async (searchQuery) => {
    if (searchQuery.trim().length < 2) {
      setResults([])
      return
    }
    
    setIsLoading(true)
    try {
      const searchResults = await window.electronAPI.searchUnified(searchQuery, filters)
      setResults(searchResults.slice(0, 20)) // Limit results
      setSelectedIndex(0) // Reset selection
    } catch (error) {
      console.error('[App] Search failed:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [filters])
  
  // Trigger search when query changes
  useEffect(() => {
    performSearch(debouncedQuery)
  }, [debouncedQuery, performSearch])
  
  // Keyboard navigation
  const selectedIndexWithNav = useKeyboardNavigation(
    results, 
    selectedIndex, 
    setSelectedIndex,
    () => {
      if (results[selectedIndex]) {
        window.electronAPI.executeAction(results[selectedIndex])
      }
    }
  )
  
  // Memoized result components to prevent unnecessary re-renders
  const renderedResults = useMemo(() => {
    return results.map((result, index) => (
      <ResultItem 
        key={`${result.type}-${result.id || index}`}
        result={result} 
        index={index}
        isSelected={index === selectedIndexWithNav}
      />
    ))
  }, [results, selectedIndexWithNav])
  
  return (
    <div className="app-container">
      <SearchBar 
        query={query}
        onQueryChange={setQuery}
        isLoading={isLoading}
      />
      {renderedResults.length > 0 && (
        <ResultsList results={renderedResults} />
      )}
      {renderedResults.length === 0 && !isLoading && (
        <EmptyState query={query} />
      )}
    </div>
  )
}
```

## Testing Approach
- Component unit tests with React Testing Library
- Accessibility testing with axe-core
- Performance testing with React Profiler
- Keyboard navigation testing
- Visual regression testing for UI changes

## Integration Notes
- **State Management**: Uses local React state, no external state library
- **Services Integration**: Connects to Electron API via preload script
- **Styling System**: Tailwind CSS with custom configuration
- **Performance**: Virtualization for large lists, memoization for expensive operations

## Accessibility Implementation

### ARIA Support
```jsx
// Accessible results list
const ResultsList = ({ results, selectedIndex, onSelect }) => (
  <div 
    role="listbox"
    aria-label="Search results"
    aria-activedescendant={`result-${selectedIndex}`}
  >
    {results.map((result, index) => (
      <div
        key={result.id}
        id={`result-${index}`}
        role="option"
        aria-selected={index === selectedIndex}
        aria-describedby={`result-detail-${index}`}
        onClick={() => onSelect(index)}
        className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
      >
        {result.name}
        <div id={`result-detail-${index}`} className="sr-only">
          {result.type}: {result.name}
          {result.url && ` - ${result.url}`}
        </div>
      </div>
    ))}
  </div>
)
```

### Keyboard Navigation
```jsx
// Complete keyboard support
const KeyboardShortcuts = {
  'ArrowUp': 'Select previous result',
  'ArrowDown': 'Select next result', 
  'Enter': 'Open selected result',
  'Escape': 'Close search window',
  'Home': 'Select first result',
  'End': 'Select last result',
  'Cmd+F': 'Focus search input',
  'Cmd+,': 'Open settings'
}
```

## Performance Optimization

### Memoization Strategies
```jsx
// Expensive calculations should be memoized
const expensiveFiltering = useMemo(() => {
  return results.filter(result => {
    if (filters.apps && result.type === 'app') return true
    if (filters.tabs && result.type === 'tab') return true
    if (filters.files && result.type === 'file') return true
    return false
  })
}, [results, filters])

// Component memoization for performance
const ResultItem = React.memo(({ result, isSelected }) => {
  // Component only re-renders when props change
}, (prevProps, nextProps) => {
  return (
    prevProps.result.id === nextProps.result.id &&
    prevProps.isSelected === nextProps.isSelected
  )
})
```

### Virtualization Implementation
```jsx
// For large result sets
import { FixedSizeList as List } from 'react-window'

const VirtualizedResults = ({ results }) => (
  <List
    height={400}
    itemCount={results.length}
    itemSize={48}
    itemData={results}
  >
    {({ index, style, data }) => (
      <div style={style}>
        <ResultItem result={data[index]} index={index} />
      </div>
    )}
  </List>
)
```

## Styling Patterns

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a'
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.15s ease-out'
      }
    }
  }
}
```

### Component Styling
```jsx
// Consistent styling patterns
const buttonStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200"
const primaryButton = `${buttonStyles} bg-primary-500 text-white hover:bg-primary-600 focus:ring-2 focus:ring-primary-300`
const secondaryButton = `${buttonStyles} bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-2 focus:ring-gray-400`

const Button = ({ variant = 'primary', children, ...props }) => (
  <button 
    className={variant === 'primary' ? primaryButton : secondaryButton}
    {...props}
  >
    {children}
  </button>
)
```

## When to Use This Agent
- Building new React components
- Optimizing search interface performance
- Implementing keyboard navigation
- Improving accessibility
- Updating styling and responsive design
- Debugging UI performance issues

## Related Documentation
- [Architecture Guide](docs/ARCHITECTURE.md) - Component architecture overview
- [API Reference](docs/API.md) - Service integration documentation
- [Security Guide](docs/SECURITY.md) - Frontend security considerations
- [Contributing Guide](CONTRIBUTING.md) - Development patterns and standards
