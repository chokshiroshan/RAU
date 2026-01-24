# AGENTS.md

Guidance for agentic coding agents working in RAU.

## Project Overview

RAU is a macOS launcher (Spotlight alternative) built with Electron + React. It provides unified search for applications, browser tabs, and files via Fuse.js fuzzy matching.

**Tech Stack**: Electron 39, React 19, Vite 7, Tailwind CSS 4, Fuse.js 7

## Development Commands

```bash
# Build and run (REQUIRED: build before start - Electron loads from dist/)
npm run build          # Build React frontend to dist/
npm start              # Run the Electron app
npm run dev            # Build + run in one command

# Development (frontend only)
npm run dev:vite       # Vite dev server (HMR for frontend iteration)

# Testing (Node.js built-in test runner)
npm test               # tests/search.test.js
npm run test:tabs      # tests/tabFetcher.test.js
npm run test:unified   # tests/unifiedSearch.test.js
npm run test:all       # All: node --test tests/*.test.js

# Single test file:
node --test tests/unifiedSearch.test.js

# Single test case (use --test-name-pattern):
node --test --test-name-pattern="Can detect math" tests/unifiedSearch.test.js

# Distribution
npm run dist:mac       # Build distributable macOS app
```

## Architecture

**Process Separation** (Electron IPC):
- **Main Process** (`electron/`): Node.js runtime, system access, IPC handlers
- **Renderer Process** (`src/`): React UI, communicates via `ipcRenderer.invoke()`
- **Preload** (`electron/main-process/preload.js`): Secure bridge with context isolation

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
import { safeInvoke } from './utils/ipc' // Use safeInvoke for IPC calls

// ✅ Backend (Electron main process)
const { app, BrowserWindow } = require('electron')
const { execFile } = require('child_process')
const logger = require('./main-process/logger')
const { success, error } = require('../shared/utils/ipcResponse')
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
execFile('mdfind', ['-name', sanitizedQuery], { timeout: 1000 }, (err, stdout) => {
  if (err) {
    logger.error('[Handler] Operation failed:', err)
    return resolve(error(err)) // Use error() helper
  }
  // Process results...
})

// ✅ Async error handling (Frontend)
const results = await safeInvoke('search-unified', query, filters)
if (results) {
  // Process results
}
```

### File and Function Naming
- Use camelCase for variables and functions
- Use PascalCase for React components and classes
- Use descriptive names with context (e.g., `searchUnified`, `validateAppPath`)
- File names should match their main export: `SearchBar.jsx`, `unifiedSearchService.js`

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
- Main process services in `electron/main-process/services/`
- React components in `src/components/`
- Frontend services in `src/services/`
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