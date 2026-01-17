# API Reference

This document describes the IPC API and service interfaces used throughout RAU. Understanding these interfaces is crucial for extending functionality or debugging issues.

## 🔌 IPC Channel Reference

### Overview

RAU uses a request/response pattern for all IPC communication. The renderer process sends requests via `window.electronAPI.invoke()` and the main process responds via handlers.

**Channel Convention**: All channels are defined in `src/constants/ipc.js` for centralized management.

### Search/Data Channels

#### `GET_APPS`
Get all installed applications.

**Request**: None (empty parameters)
```javascript
const apps = await electronAPI.invoke('get-apps')
```

**Response**: Array of app objects
```javascript
[
  {
    name: "Safari",
    path: "/Applications/Safari.app",
    icon: "data:image/png;base64,..." // null if not loaded
  }
]
```

**Handler**: `actionHandler.getApps()`

**Caching**: 10-minute TTL in main process

---

#### `GET_APP_ICON`
Get the icon for a specific application.

**Request**: App path string
```javascript
const icon = await electronAPI.invoke('get-app-icon', "/Applications/Safari.app")
```

**Response**: Base64 PNG string or null
```javascript
"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." // or null
```

**Handler**: `actionHandler.getAppIcon()`

**Caching**: LRU cache of 100 icons

---

#### `GET_TABS`
Get all browser tabs from configured browsers.

**Request**: None (uses settings to determine browsers)
```javascript
const tabs = await electronAPI.invoke('get-tabs')
```

**Response**: Array of tab objects
```javascript
[
  {
    title: "YouTube",
    url: "https://www.youtube.com/",
    browser: "Safari",
    windowIndex: 1,
    tabIndex: 1
  }
]
```

**Handler**: `actionHandler.getTabs()`

**Caching**: 10-second stale-while-revalidate cache

---

#### `SEARCH_FILES`
Search files by name using macOS Spotlight.

**Request**: Search query object
```javascript
const results = await electronAPI.invoke('search-files', {
  query: "package.json",
  limit: 20
})
```

**Response**: Array of file objects
```javascript
[
  {
    name: "package.json",
    path: "/Users/user/project/package.json",
    type: "file"
  }
]
```

**Handler**: `searchHandler.searchFiles()`

---

### Action Channels

#### `OPEN_APP`
Launch an application.

**Request**: App path string
```javascript
const result = await electronAPI.invoke('open-app', "/Applications/Safari.app")
```

**Response**: Success object
```javascript
{
  success: true,
  error: null // or error message
}
```

**Handler**: `actionHandler.openApp()`

**Validation**: Path validation via `validateAppPath()`

---

#### `OPEN_FILE`
Open a file with the default application.

**Request**: File path string
```javascript
const result = await electronAPI.invoke('open-file', "/Users/user/file.txt")
```

**Response**: Success object
```javascript
{
  success: true,
  error: null // or error message
}
```

**Handler**: `actionHandler.openFile()`

**Validation**: Path validation + existence check

---

#### `ACTIVATE_TAB`
Switch to a specific browser tab.

**Request**: Tab object
```javascript
const result = await electronAPI.invoke('activate-tab', {
  browser: "Safari",
  windowIndex: 1,
  tabIndex: 2,
  url: "https://example.com"
})
```

**Response**: Success object
```javascript
{
  success: true,
  error: null // or error message
}
```

**Handler**: `actionHandler.activateTab()`

**Validation**: Tab index validation + URL verification

---

#### `OPEN_URL`
Open a URL in the default browser.

**Request**: URL string
```javascript
const result = await electronAPI.invoke('open-url', "https://github.com")
```

**Response**: Success object
```javascript
{
  success: true,
  error: null // or error message
}
```

**Handler**: `actionHandler.openUrl()`

**Validation**: URL protocol validation

---

#### `EXECUTE_COMMAND`
Execute a system command.

**Request**: Command string
```javascript
const result = await electronAPI.invoke('execute-command', "sleep")
```

**Response**: Success object
```javascript
{
  success: true,
  error: null // or error message
}
```

**Handler**: `systemHandler.executeCommand()`

**Commands**: sleep, lock, restart, shutdown, logout, trash

---

### Settings Channels

#### `GET_SETTINGS`
Get current application settings.

**Request**: None
```javascript
const settings = await electronAPI.invoke('get-settings')
```

**Response**: Settings object
```javascript
{
  searchApps: true,
  searchTabs: true,
  searchFiles: false,
  searchCommands: true,
  selectedApps: ["Safari", "Google Chrome"],
  onboardingComplete: true
}
```

**Handler**: `actionHandler.getSettings()`

---

#### `SAVE_SETTINGS`
Update application settings.

**Request**: Settings object
```javascript
const result = await electronAPI.invoke('save-settings', {
  searchFiles: true,
  selectedApps: ["Safari", "Chrome"]
})
```

**Response**: Success object
```javascript
{
  success: true,
  error: null // or error message
}
```

**Handler**: `actionHandler.saveSettings()`

**Validation**: Settings object validation

---

### Window Channels

#### `RESIZE_WINDOW`
Resize the main window.

**Request**: Dimensions object
```javascript
await electronAPI.invoke('resize-window', {
  width: 700,
  height: 400
})
```

**Response**: None

**Handler**: `windowHandler.resizeWindow()`

---

#### `HIDE_WINDOW`
Hide the main window.

**Request**: None
```javascript
electronAPI.send('hide-window') // Note: send, not invoke
```

**Response**: None

**Handler**: `windowHandler.hideWindow()`

---

## 🎨 Renderer Service APIs

### Main Services

#### `unifiedSearch.js`

**`searchUnified(query, filters)`**
Main search function that orchestrates all search types.

**Parameters**:
- `query` (string): Search query
- `filters` (object, optional): `{ apps, files, tabs, commands }`

**Returns**: Promise<Array> - Search results

```javascript
const results = await searchUnified("github", {
  apps: true,
  tabs: true,
  files: false,
  commands: true
})
```

**Result Object**:
```javascript
{
  id: "unique-id",
  type: "app" | "tab" | "file" | "command" | "calculator" | "web",
  name: "Display Name",
  title: "Optional Title", // for tabs
  url: "Optional URL",   // for tabs/web
  path: "Optional Path", // for files/apps
  priority: 10,          // for ranking
  score: 0.1            // Fuse.js score
}
```

---

#### `tabFetcher.js`

**`getAllTabs(options)`**
Get all browser tabs with filtering options.

**Parameters**:
- `options` (object): `{ selectedApps: [], forceRefresh: boolean }`

**Returns**: Promise<Array> - Tab objects

---

#### `appSearch.js`

**`getAllApps()`**
Get all installed applications.

**Returns**: Promise<Array> - App objects

---

#### `fileSearch.js`

**`searchFiles(query)`**
Search files by name.

**Parameters**:
- `query` (string): Search query

**Returns**: Promise<Array> - File objects

---

## 🔒 Validation APIs

### Input Validators

Located in `shared/validation/validators.js`

#### `validateAppPath(path)`
Validate application bundle paths.

**Valid**: Path ends with `.app`, no traversal, exists on system
**Invalid**: Missing, wrong extension, traversal patterns

---

#### `validateFilePath(path)`
Validate file paths.

**Valid**: Absolute path, no traversal, exists
**Invalid**: Relative paths, traversal, non-existent

---

#### `validateUrlProtocol(url)`
Validate URL protocols for safety.

**Allowed**: `http:`, `https:`, `file:`, `mailto:`
**Blocked**: `javascript:`, `data:`, other dangerous protocols

---

#### `validatePositiveInt(value)`
Validate positive integers for indices.

**Valid**: Positive integer string/number
**Invalid**: Negative, zero, non-numeric

---

## 🔧 Configuration Constants

### Main Process Constants
File: `electron/main-process/constants.js`

```javascript
export const WINDOW_CONFIG = {
  WIDTH: 700,
  HEIGHT: 600,
  TOP_OFFSET: 80,
  MIN_HEIGHT: 100,
  MAX_HEIGHT: 800
}

export const TIMEOUTS = {
  MDFIND: 10000,        // 10 seconds
  APPLESCRIPT: 30000,    // 30 seconds
  ICON_EXTRACTION: 10000  // 10 seconds
}

export const CACHE_TTL = {
  APPS: 600000,         // 10 minutes
  TABS: 10000,          // 10 seconds
  ICON_CACHE_SIZE: 100
}
```

### Renderer Constants
File: `src/constants/config.js`

```javascript
export const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  DEBOUNCE_MS: 150,
  MAX_RESULTS: 20,
  THRESHOLD: 0.2
}

export const RESULT_PRIORITIES = {
  CALCULATOR: 10,
  COMMANDS: 8,
  APPS: 6,
  TABS: 4,
  FILES: 2,
  WEB: 0
}
```

---

## 🔍 Browser Integration API

### AppleScript Output Format

All browser scripts return comma-separated values:

**Format**: `title|||url|||windowIndex|||tabIndex`

**Example**:
```
GitHub|||https://github.com|||1|||1, YouTube|||https://youtube.com|||1|||2
```

### Supported Browsers

| Browser | Script File | Process Name | Aliases |
|----------|-------------|--------------|----------|
| Safari | `safari.applescript` | Safari | safari |
| Chrome | `chrome.applescript` | Google Chrome | chrome, google chrome |
| Brave | `brave.applescript` | Brave Browser | brave, brave browser |
| Arc | `arc.applescript` | Arc | arc |
| Comet | `comet.applescript` | Comet | comet |
| Terminal | `terminal.applescript` | Terminal | terminal |

### Browser Activation Pattern

Tab activation uses three-step AppleScript:

1. **Activate Application**
2. **Bring Window to Front**
3. **Select Specific Tab**

## 🚨 Error Handling

### Response Format

All async operations return standardized responses:

```javascript
// Success Response
{
  success: true,
  data: resultObject,
  error: null
}

// Error Response
{
  success: false,
  data: null,
  error: "Human-readable error message"
}
```

### Error Types

1. **Validation Errors**: Input validation failures
2. **Permission Errors**: macOS permission issues
3. **Timeout Errors**: Operation exceeded timeout
4. **System Errors**: OS-level failures
5. **Network Errors**: External service failures

---

## 🔌 Extension Points

### Adding New Search Categories

1. **Create Service**: `src/services/newSearch.js`
2. **Add to Orchestrator**: Update `unifiedSearch.js`
3. **Add IPC Handler**: Create handler in `electron/main-process/handlers/`
4. **Add Channel**: Update `src/constants/ipc.js`
5. **Update Settings**: Add toggle in config

### Adding New Browser Support

1. **Create AppleScript**: `src/scripts/newbrowser.applescript`
2. **Update Tab Fetcher**: Add fetch function in `tabFetcher.js`
3. **Add Constants**: Update browser names and aliases
4. **Add Activation**: Create activation script
5. **Update Settings**: Add to browser selection UI

### Adding New System Commands

1. **Update Command List**: Add to `commandSearch.js`
2. **Add Handler**: Update `systemHandler.js`
3. **Add Validation**: Create validator if needed
4. **Update Documentation**: Add to API docs

---

This API reference provides the foundation for extending RAU functionality while maintaining consistency and security.