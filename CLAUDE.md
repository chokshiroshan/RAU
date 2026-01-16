# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ContextSearch

A macOS launcher application (Spotlight alternative) built with Electron + React. Search and open applications, browser tabs, and files from a single unified interface.

## Development Commands

```bash
# Build React frontend to dist/
npm run build

# Build and run in development mode
npm run dev

# Start Vite dev server only (for iterative frontend work)
npm run dev:vite

# Run the built Electron app
npm start

# Run tests
npm test              # Search tests
npm run test:tabs     # Tab fetcher tests
npm run test:all      # All tests
```

**Important:** Always run `npm run build` before `npm start`. The Electron main process loads from `dist/index.html`, not the Vite dev server.

## Architecture Overview

### Electron Main Process (`electron/main.js`)
- Creates frameless, always-on-top window that appears on all macOS desktop spaces
- Registers global hotkey (Cmd+Shift+Space) for toggling
- Manages IPC handlers for all system operations
- Uses `execFile()` (never `exec()`) to prevent shell injection
- **Security:** `contextIsolation: true`, `nodeIntegration: false`

### React Renderer Process (`src/`)
- UI built with React + Tailwind CSS
- Bundled by Vite to `dist/`
- Accesses main process via `contextBridge` API exposed by `preload.js`

### Preload Script (`electron/preload.js`)
- Bridges main process and renderer using `contextBridge`
- Exposes safe, limited API via `window.electronAPI`
- No direct Node.js access in renderer

### Service Layer (`src/services/`)
- `unifiedSearch.js` - Orchestrates fuzzy search across apps, files, and tabs using Fuse.js
- `tabFetcher.js` - Fetches browser tabs via AppleScript (Safari, Chrome, Brave, Comet)
- `fileSearch.js` - File search using macOS `mdfind`
- `appSearch.js` - Application discovery via `mdfind`
- `electron.js` - Bridge for renderer-to-main IPC (wraps `window.electronAPI`)

### Extracted Services (`electron/services/`)
- `iconExtractor.js` - Extracts app icons from .app bundles using `sips`

## Key macOS Integration Points

### Window Behavior
- `app.setActivationPolicy('accessory')` - No Dock icon, background app
- `window.setVisibleOnAllWorkspaces(true)` - Appears on all desktop spaces
- `window.setAlwaysOnTop(true, 'pop-up-menu')` - Spotlight-like positioning
- Window repositions to active screen on each show (multi-monitor support)

### Search Implementation
- `mdfind` for file and app discovery (Spotlight index)
- AppleScript for browser tab enumeration and activation
- Fuse.js for fuzzy search with custom weights (name: 3.0, title: 2.0, url: 1.5, path: 1.0)
- Parallel search across categories with 5-second timeout protection
- Apps cache invalidates after 10 minutes (TTL)

### IPC Communication
- **Main process:** Uses `ipcMain.handle()` for request/response patterns
- **Renderer process:** Uses `window.electronAPI` (exposed via `contextBridge`)
- **Bridge:** `src/services/electron.js` provides backward-compatible `ipcRenderer` wrapper
- Channel names centralized in `src/constants/ipc.js`

## Security Considerations

- **`contextIsolation: true`, `nodeIntegration: false`** - Renderer cannot directly access Node.js APIs
- **Always use `execFile()` instead of `exec()`** - Arguments passed as array, not shell string
- **Escape AppleScript strings** - URLs embedded in AppleScript must have quotes/backslashes escaped
- **Validate indices from AppleScript** - Window and tab indices should be positive integers
- **Preload script only exposes necessary APIs** - No direct `ipcRenderer` access

## Configuration Constants

**Main process** (`electron/constants.js`):
- Window dimensions (700x600, 80px from top)
- Timeouts (mdfind: 10s, icon extraction: 10s, AppleScript: 5s)
- Apps cache TTL (10 minutes)
- Max icon cache size (100)

**Renderer process** (`src/constants/config.js`):
- Search thresholds (Fuse.js scoring)
- Search debounce (150ms)
- Max results (20)

## Error Handling Patterns

- Global error handlers show dialog and attempt recovery or quit cleanly (no zombies)
- Window auto-recovery if render process crashes
- Safe logging in `src/utils/logger.js` prevents EPIPE crashes
- React Error Boundary in `src/components/ErrorBoundary.jsx` catches render errors

## Window Management Pattern

The window is created once and hidden/shown via `toggleWindow()`:

1. **On app launch:** Window created hidden (`ready-to-show` event fires but window stays hidden)
2. **On hotkey press:**
   - If window exists: `show()` / `hide()`
   - If window destroyed: Recreate via `createWindow()` Promise
3. **No polling:** Uses `ready-to-show` event and Promise resolution instead of `setInterval`

## Known Quirks

- Tab activation via AppleScript can fail; app logs errors but continues gracefully
- Icon extraction is slow; icons loaded on-demand with caching
- Some browsers require accessibility permissions for AppleScript tab control
- New apps installed while app is running won't appear until cache expires (10 min)
