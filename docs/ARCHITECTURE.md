# ContextSearch Architecture

This document provides a deep dive into the system design, architecture patterns, and technical implementation of ContextSearch.

## 🏗️ System Overview

ContextSearch is a macOS desktop application built with Electron + React that provides unified search across applications, browser tabs, and files. It's designed as a Spotlight alternative with enhanced speed and features.

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │    │  Electron Main   │    │   macOS APIs    │
│  (Renderer)     │◄──►│   Process       │◄──►│  (mdfind, etc.) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Search UI      │    │   IPC Bridge    │    │  Browser APIs   │
│  Components     │    │  & Handlers     │    │ (AppleScript)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Key Architectural Decisions

1. **Process Isolation**: Security-first design with strict separation between renderer and main process
2. **IPC Communication**: Request/response pattern with comprehensive validation
3. **Parallel Search**: All search types execute concurrently for maximum speed
4. **Intelligent Caching**: Multi-layer caching with appropriate TTL values
5. **Universal Search**: Single search interface for multiple data sources

## 🎯 Component Architecture

### React Renderer Process (`src/`)

#### Core Components
```
src/components/
├── App.jsx              # Main application container and state management
├── SearchBar.jsx        # Search input with loading states
├── ResultsList.jsx       # Virtualized results display
├── Onboarding.jsx       # First-run experience flow
└── ErrorBoundary.jsx    # React error boundary with recovery
```

#### Component Patterns

**State Management**: Local React state with hooks
```jsx
const App = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Debounced search with useCallback
  const performSearch = useCallback(
    debounce(async (searchQuery) => {
      if (searchQuery.trim().length < 2) {
        setResults([])
        return
      }
      
      setIsLoading(true)
      const searchResults = await searchUnified(searchQuery, filters)
      setResults(searchResults)
      setIsLoading(false)
    }, 150),
    []
  )
}
```

**Virtualized Lists**: Performance optimization for large result sets
```jsx
const ResultsList = ({ results, selectedIndex, onSelect }) => {
  const visibleResults = useMemo(() => {
    const start = Math.max(0, selectedIndex - 10)
    const end = Math.min(results.length, selectedIndex + 15)
    return results.slice(start, end)
  }, [results, selectedIndex])
  
  return (
    <div className="results-container">
      {visibleResults.map((result, index) => (
        <ResultItem key={result.id} result={result} />
      ))}
    </div>
  )
}
```

### Service Layer (`src/services/`)

#### Search Services Architecture

```
unifiedSearch.js (Orchestrator)
├── appSearch.js     → mdfind → application results
├── tabFetcher.js    → AppleScript → browser tabs
├── fileSearch.js    → mdfind → file results
└── commandSearch.js → local → system commands
```

**Orchestrator Pattern**:
```javascript
export async function searchUnified(query, filters) {
  // 1. Validate and preprocess query
  if (!isValidQuery(query)) return []
  
  // 2. Check for special cases (math, commands)
  const specialResult = handleSpecialQueries(query)
  if (specialResult) return [specialResult]
  
  // 3. Execute parallel searches
  const searchPromises = [
    searchApps(query),
    searchTabs(query),
    searchFiles(query),
    searchCommands(query)
  ].filter(Boolean)
  
  const results = await Promise.all(searchPromises)
  
  // 4. Combine and rank results
  return combineAndRankResults(results.flat())
}
```

## 🔌 IPC Communication Architecture

### Security Model

```
Renderer Process           Preload Script          Main Process
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│ window.     │◄────────►│ contextBridge │◄────────►│ ipcMain     │
│ electronAPI │         │ API exposure │         │ handlers    │
└─────────────┘         └──────────────┘         └─────────────┘
     ▲                       ▲                       ▲
     │                       │                       │
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ React       │    │ Validation  │    │ System      │
│ Components │    │ & Security  │    │ Operations  │
└─────────────┘    └──────────────┘    └─────────────┘
```

### Channel Organization

All IPC channels are centralized in `src/constants/ipc.js`:

```javascript
export const IPC_CHANNELS = {
  // Search/Data Channels
  SEARCH_FILES: 'search-files',
  GET_APPS: 'get-apps',
  GET_TABS: 'get-tabs',
  GET_APP_ICON: 'get-app-icon',
  
  // Action Channels
  OPEN_APP: 'open-app',
  OPEN_FILE: 'open-file',
  ACTIVATE_TAB: 'activate-tab',
  OPEN_URL: 'open-url',
  
  // Settings Channels
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  
  // Window Channels
  RESIZE_WINDOW: 'resize-window',
  HIDE_WINDOW: 'hide-window',
  WINDOW_SHOWN: 'window-shown'
}
```

### Handler Pattern

**Main Process Handler**:
```javascript
// electron/main-process/handlers/actionHandler.js
async function openApp(_event, appPath) {
  // 1. Validate input
  const validation = validateAppPath(appPath)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }
  
  // 2. Execute system operation safely
  return new Promise((resolve) => {
    execFile('open', [validation.value], { timeout: 5000 }, (error) => {
      if (error) {
        resolve({ success: false, error: error.message })
      } else {
        resolve({ success: true })
      }
    })
  })
}
```

**Renderer Process Service**:
```javascript
// src/services/appSearch.js
export async function getAllApps() {
  if (!ipcRenderer) return []
  
  try {
    return await ipcRenderer.invoke(IPC_CHANNELS.GET_APPS)
  } catch (error) {
    console.error('[AppSearch] Error:', error)
    return []
  }
}
```

## 🍎 macOS Integration

### Window Management

**Multi-Space Support**:
```javascript
// Appear on all desktop spaces
app.setActivationPolicy('accessory')
mainWindow.setVisibleOnAllWorkspaces(true, { 
  visibleOnFullScreen: true 
})
```

**Multi-Monitor Positioning**:
```javascript
function repositionWindow() {
  const cursorPosition = screen.getCursorScreenPoint()
  const activeDisplay = screen.getDisplayNearestPoint(cursorPosition)
  
  const x = Math.round(
    activeDisplay.workArea.x + (activeDisplay.workArea.width - WINDOW_WIDTH) / 2
  )
  const y = Math.round(activeDisplay.workArea.y + WINDOW_TOP_OFFSET)
  
  mainWindow.setPosition(x, y)
}
```

### Browser Integration via AppleScript

**Tab Enumeration Pattern**:
```applescript
-- src/scripts/safari.applescript
tell application "Safari"
    set tabList to ""
    set winCount to count of windows
    
    repeat with i from 1 to winCount
        set w to window i
        set tabCount to count of tabs of w
        
        repeat with j from 1 to tabCount
            set t to tab j of w
            set tabInfo to title of t & "|||" & URL of t & "|||" & i & "|||" & j
            
            if length of tabList > 0 then
                set tabList to tabList & ", " & tabInfo
            else
                set tabList to tabInfo
            end if
        end repeat
    end repeat
    
    return tabList
end tell
```

**Tab Activation Pattern**:
```applescript
-- Activate specific tab in specific window
tell application "Safari"
    activate
    set index of window windowIndex to 1
    set current tab of window 1 to tab tabIndex of window windowIndex
end tell
```

### System Search Integration

**File Search via mdfind**:
```javascript
// src/services/fileSearch.js
async function searchFiles(query) {
  const results = await new Promise((resolve) => {
    execFile('mdfind', [
      '-onlyin', '~',
      '-name', `*${query}*`,
      'kMDItemKind == "document" || kMDItemKind == "image" || kMDItemKind == "text"'
    ], { timeout: 10000 }, (error, stdout) => {
      if (error) {
        resolve([])
        return
      }
      
      const files = stdout
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(path => ({ path, type: 'file' }))
      
      resolve(files)
    })
  })
  
  return results
}
```

## 🔍 Search Algorithm Architecture

### Fuzzy Search Configuration

**Fuse.js Setup**:
```javascript
const fuseOptions = {
  keys: [
    { name: 'name', weight: 3.0 },    // App name (highest priority)
    { name: 'title', weight: 2.0 },   // Tab title
    { name: 'url', weight: 1.5 },     // Tab URL
    { name: 'path', weight: 1.0 },    // File path
  ],
  threshold: 0.2,              // Stricter threshold
  distance: 50,                  // Tighter matching
  includeScore: true,
  shouldSort: true,
  minMatchCharLength: 2,        // Require 2+ characters
  ignoreLocation: true,
}
```

### Multi-Source Result Ranking

**Priority System**:
```javascript
const resultPriorities = {
  calculator: 10,    // Math results (highest)
  commands: 8,        // System commands
  apps: 6,           // Applications
  tabs: 4,            // Browser tabs
  files: 2,           // Files (lowest)
  web: 0              // Web search fallback
}

function rankResults(results) {
  return results.sort((a, b) => {
    const priorityDiff = resultPriorities[b.type] - resultPriorities[a.type]
    if (priorityDiff !== 0) return priorityDiff
    
    // Same type: use Fuse.js score
    return (a.score || 0) - (b.score || 0)
  })
}
```

## 🚀 Performance Architecture

### Caching Strategy

**Multi-Layer Caching**:
```javascript
// 1. Application Cache (Main Process)
let appsCache = null
let appsCacheTimestamp = 0
const APPS_CACHE_TTL = 600000 // 10 minutes

// 2. Tab Cache (Service Layer)
let tabCache = null
let cacheTimestamp = 0
const TABS_CACHE_TTL = 10000 // 10 seconds

// 3. Icon Cache (LRU)
const iconCache = new Map()
const MAX_ICON_CACHE = 100
```

**Stale-While-Revalidate Pattern**:
```javascript
async function getCachedTabs(options = {}) {
  const now = Date.now()
  const isStale = (now - cacheTimestamp) > TABS_CACHE_TTL
  
  if (tabCache && !isStale) {
    return tabCache
  }
  
  // Return stale cache while fetching fresh data
  if (tabCache) {
    refreshTabs(options) // Background refresh
    return tabCache
  }
  
  // No cache: wait for fresh data
  return await refreshTabs(options)
}
```

### Memory Management

**Resource Limits**:
```javascript
// Enforce cache sizes
if (iconCache.size >= MAX_ICON_CACHE) {
  const firstKey = iconCache.keys().next().value
  iconCache.delete(firstKey)
}

// Clean up event listeners
useEffect(() => {
  return () => {
    window.removeEventListener('keydown', handleKeyDown)
    clearInterval(debounceTimer)
  }
}, [])
```

## 🛡️ Security Architecture

### Input Validation Pipeline

```
User Input → Frontend Validation → IPC Transport → Backend Validation → System Execution
```

**Validation Functions**:
```javascript
// shared/validation/validators.js
export function validateAppPath(path) {
  if (!path || typeof path !== 'string') {
    return { valid: false, error: 'Invalid path' }
  }
  
  if (!path.endsWith('.app')) {
    return { valid: false, error: 'Must be an app bundle' }
  }
  
  if (path.includes('..') || path.includes('~')) {
    return { valid: false, error: 'Invalid path traversal' }
  }
  
  return { valid: true, value: path }
}
```

### Secure Execution

**Never Use exec()**:
```javascript
// ❌ DANGEROUS - vulnerable to injection
exec(`open "${userInput}"`)

// ✅ SAFE - arguments as array
execFile('open', [validatedPath], { timeout: 5000 })
```

**AppleScript Escaping**:
```javascript
function escapeAppleScriptString(str) {
  return str
    .replace(/\\/g, '\\\\')      // Escape backslashes
    .replace(/"/g, '\\"')        // Escape double quotes
    .replace(/'/g, "\\'")        // Escape single quotes
    .replace(/\n/g, '\\n')       // Escape newlines
    .replace(/\r/g, '\\r')       // Escape carriage returns
    .replace(/\t/g, '\\t')       // Escape tabs
}
```

## 📊 Data Flow Architecture

### Search Flow Diagram

```
User Types Query
       │
       ▼
   Debounce (150ms)
       │
       ▼
   Query Validation
       │
       ▼
┌─────────────────┐
│  Special Query  │  ← Math, commands, web search
│     Check      │
└─────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│           Parallel Search Execution              │
├─────────────────┬─────────────────┬─────────┤
│   App Search    │   Tab Search    │ File S. │
│ (10min cache)   │ (10s cache)    │ (live)   │
└─────────────────┴─────────────────┴─────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│           Result Combination                  │
│     Fuse.js ranking + Priority sort          │
└─────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│            UI Display                       │
│        Virtualized List                     │
└─────────────────────────────────────────────────┘
```

## 🔧 Configuration Architecture

### Settings Management

**Settings Structure**:
```javascript
const DEFAULT_SETTINGS = {
  searchApps: true,
  searchTabs: true,
  searchFiles: true,
  searchCommands: true,
  selectedApps: [],          // Empty means all apps
  onboardingComplete: false,
  cacheSettings: {
    appsTTL: 600000,        // 10 minutes
    tabsTTL: 10000,         // 10 seconds
    maxIconCache: 100
  },
  uiSettings: {
    maxResults: 20,
    debounceMs: 150,
    windowPosition: 'center'
  }
}
```

**Configuration Persistence**:
```javascript
// electron/main-process/config.js
function saveSettings(settings) {
  const configPath = getConfigPath()
  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings }
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(mergedSettings, null, 2))
    return true
  } catch (error) {
    console.error('[Config] Failed to save settings:', error)
    return false
  }
}
```

## 🚦 Error Handling Architecture

### Multi-Layer Error Handling

```
React Error Boundary
       │
       ▼
Service Layer Error Handling
       │
       ▼
IPC Error Propagation
       │
       ▼
Main Process Recovery
```

**Component Error Boundary**:
```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

**Global Process Handlers**:
```javascript
// electron/main.js
process.on('uncaughtException', (error) => {
  console.error('[Main Process] Uncaught exception:', error)
  handleFatalError('Uncaught exception', error)
})

process.on('unhandledRejection', (reason, _promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason))
  handleFatalError('Unhandled rejection', error)
})
```

---

This architecture provides a solid foundation for building a fast, secure, and maintainable macOS search application. The modular design allows for easy extension and the security-first approach ensures safe operation.