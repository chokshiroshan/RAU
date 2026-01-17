# AGENTS.md

This file provides guidance to agentic coding agents working with the RAU codebase.

## Project Overview

RAU is a macOS launcher (Spotlight alternative) built with Electron + React that provides unified search for applications, browser tabs, and files.

## Development Commands

```bash
# Build and run (REQUIRED: build before start - Electron loads from dist/)
npm run build          # Build React frontend to dist/
npm start              # Run the Electron app

# Development
npm run dev            # Build and run in one command
npm run dev:vite       # Vite dev server only (frontend iteration)

# Testing
npm test               # Core search tests (tests/search.test.js)
npm run test:tabs      # Tab fetcher tests (tests/tabFetcher.test.js)
npm run test:unified   # Unified search tests (tests/unifiedSearch.test.js)
npm run test:all       # All tests: node --test tests/*.test.js

# Single test file execution:
node --test tests/unifiedSearch.test.js

# Distribution
npm run dist:mac       # Build distributable macOS app
```

## Code Style Guidelines

### Import Style
- Use ES6 imports for React components and frontend modules
- Use CommonJS require() for Electron main process modules
- Import React hooks and utilities before local components
- Group imports: external libraries → internal services → local components

```javascript
// ✅ Frontend (React components)
import React, { useState, useCallback } from 'react'
import SearchBar from './components/SearchBar'
import { searchUnified } from './services/unifiedSearch'

// ✅ Backend (Electron main process)
const { app, BrowserWindow } = require('electron')
const { execFile } = require('child_process')
const logger = require('./main-process/logger')
```

### Error Handling
- Always validate IPC input using validators from `shared/validation/validators.js`
- Use execFile() instead of exec() for security
- Handle all async operations with try/catch or .catch()
- Use safe logger from `electron/main-process/logger.js` instead of console

```javascript
// ✅ Input validation
const validation = validateSearchQuery(query)
if (!validation.valid) {
  return []
}

// ✅ Safe process execution
execFile('mdfind', ['-name', sanitizedQuery], { timeout: 1000 }, (error, stdout) => {
  if (error) {
    logger.error('[Handler] Operation failed:', error)
    return resolve([])
  }
  // Process results...
})

// ✅ Async error handling
try {
  const results = await searchUnified(query, filters)
  return results
} catch (error) {
  logger.error('[Service] Search failed:', error)
  return []
}
```

### File and Function Naming
- Use camelCase for variables and functions
- Use PascalCase for React components and classes
- Use descriptive names with context (e.g., `searchUnified`, `validateAppPath`)
- File names should match their main export: `SearchBar.jsx`, `unifiedSearch.js`

### Component Structure
- Use React.forwardRef for components that need ref forwarding
- Set displayName for better debugging
- Keep components focused and relatively small
- Use useCallback for event handlers to prevent unnecessary re-renders

```javascript
const SearchBar = forwardRef(({ value, onChange, isLoading }, ref) => {
  return (
    <div className="search-bar">
      <input ref={ref} value={value} onChange={onChange} />
      {isLoading && <LoadingIndicator />}
    </div>
  )
})

SearchBar.displayName = 'SearchBar'
export default SearchBar
```

### Code Organization
- Main process modules in `electron/main-process/modules/`
- IPC handlers in `electron/main-process/handlers/`
- React components in `src/components/`
- Services in `src/services/`
- Shared utilities in `shared/`
- Tests in `tests/` matching service names

### Security Requirements
- Never use `exec()` - always use `execFile()` with argument arrays
- Validate all IPC input with validators from `shared/validation/validators.js`
- Escape AppleScript strings using `escapeAppleScriptString()` in tabFetcher.js
- Use context isolation with preload scripts

### Logging Convention
- Use structured logging with prefixes: `[Window]`, `[IPC]`, `[TabFetcher]`, `[UnifiedSearch]`
- Log at appropriate levels: `log()` for info, `error()` for errors, `warn()` for warnings
- Include context in log messages (operation, inputs, results)

### Testing
- Use Node.js built-in test runner with `test`, `describe`, `assert`
- Mock IPC and external dependencies
- Test both happy paths and error cases
- Keep tests focused and readable

```javascript
const { test, describe, mock, beforeEach } = require('node:test')
const assert = require('node:assert')

describe('Service Function', () => {
  test('should handle valid input', async () => {
    const result = await serviceFunction(validInput)
    assert.ok(result.success)
  })
})
```

### AppleScript Integration
- Scripts in `src/scripts/*.applescript` follow output format:
  ```
  title|||url|||windowIndex|||tabIndex, title|||url|||windowIndex|||tabIndex, ...
  ```
- Escape all user-provided strings before AppleScript execution
- Handle timeouts and errors gracefully

### Performance Guidelines
- Cache expensive operations (apps, tabs) with appropriate TTL
- Use Promise.all() for parallel async operations
- Implement timeouts for external process calls
- Limit result sets to prevent UI lag