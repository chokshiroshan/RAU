# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
npm run test:all       # All tests: node --test tests/*.test.js

# Distribution
npm run dist:mac       # Build distributable macOS app
```

## Architecture

### Process Model
- **Main Process** (`electron/main.js`): Window management, global hotkey (Cmd+Shift+Space), IPC handlers
- **Renderer Process** (`src/`): React UI with search interface
- **Preload** (`electron/main-process/preload.js`): Secure IPC bridge with `contextIsolation: true`

### Key Data Flows

**Search Flow:**
1. User types in SearchBar → debounced query
2. `search-unified` IPC call triggers `unifiedSearchService.js` in Main Process
3. Service orchestrates parallel searches: apps, tabs, files, commands
4. Results combined and ranked with Fuse.js in Main Process

**Tab Fetching Flow:**
1. `tabFetcher.js` (Main Process) executes AppleScripts in `src/scripts/*.applescript`
2. Scripts enumerate browser tabs (Safari, Chrome, Brave, Arc, Comet, Terminal)
3. Results cached with SWR pattern (10s cache, background refresh)
4. Universal window discovery via `windowIndexer.js` for non-browser apps

**IPC Handler Registration:**
- All handlers registered in `electron/main-process/handlers/index.js`
- Handlers: `searchHandler`, `actionHandler`, `systemHandler`, `windowHandler`, `unifiedSearchHandler`

### Main Process Modules (`electron/main-process/modules/`)
- `windowManager.js`: Frameless window, multi-monitor positioning
- `hotkeyManager.js`: Global Cmd+Shift+Space registration
- `settingsWindow.js`: Settings panel management
- `errorHandler.js`: Global error recovery

### Main Process Services (`electron/main-process/services/`)
- `unifiedSearchService.js`: Main search orchestrator with Fuse.js
- `tabFetcher.js`: Browser tab discovery via AppleScript
- `iconExtractor.js`: App icon extraction
- `shortcutsService.js`: Shortcuts management
- `pluginService.js`: Plugin management

### Renderer Services (`src/services/`)
- `electron.js`: IPC wrapper
- `historyService.js`: Search history management

## Security Requirements

1. **Never use `exec()`** - Always `execFile()` with argument arrays
2. **Validate all IPC input** - Use validators from `shared/validation/validators.js`:
   - `validateFilePath()`, `validateAppPath()`, `validatePositiveInt()`, `validateUrlProtocol()`
3. **Escape AppleScript strings** - Use `escapeAppleScriptString()` in tabFetcher.js
4. **Context isolation** - Renderer has no direct Node.js access

## AppleScript Integration

Browser tab scripts follow this output format:
```
title|||url|||windowIndex|||tabIndex, title|||url|||windowIndex|||tabIndex, ...
```

Adding a new browser:
1. Create script in `src/scripts/[browser].applescript`
2. Add fetch function in `tabFetcher.js` (e.g., `getSafariTabs()`)
3. Add to `refreshTabs()` parallel fetch array
4. Add activation case in `activateTab()` switch statement

## Caching Strategy

- **Apps**: Pre-warmed on startup via `mdfind`
- **Tabs**: 10-second SWR cache with background refresh
- **Icons**: LRU cache (100 items) in iconExtractor.js

## Debugging

```bash
DEBUG=1 npm start    # Enable verbose logging
```

Log prefixes: `[Window]`, `[IPC]`, `[TabFetcher]`, `[UnifiedSearch]`
