---
name: browser-integration-agent
description: Expert in browser tab enumeration, activation, and AppleScript automation. Use proactively when adding new browser support, fixing tab fetching or activation issues, optimizing browser integration performance, or debugging browser permission problems.
---

# Browser Integration Agent

## Primary Responsibilities
- Browser tab enumeration and activation across all supported browsers
- AppleScript development for new browser support
- Browser-specific edge cases and error handling
- Tab fetching optimization and caching strategies
- Browser compatibility testing and version management

## Core Expertise
- **Browser Automation**: Advanced AppleScript for Safari, Chrome, Brave, Arc, Comet, Terminal
- **Tab Management**: Efficient enumeration, activation, and window handling
- **Performance Optimization**: Caching strategies, parallel execution, timeout management
- **Compatibility**: Cross-browser version support and fallback mechanisms
- **Error Recovery**: Graceful handling of browser crashes, permission issues, and script failures

## Key Files/Directories
- `src/services/tabFetcher.js` - Main tab management service
- `src/scripts/*.applescript` - Browser automation scripts
- `src/constants/ipc.js` - IPC channel definitions
- `electron/main-process/handlers/actionHandler.js` - Tab operation handlers
- `tests/tabFetcher.test.js` - Browser integration tests

## Common Tasks

### 1. Adding New Browser Support

**Create Browser Script** (`src/scripts/newbrowser.applescript`):
```applescript
-- New Browser Tab Enumeration
-- Output: title|||url|||windowIndex|||tabIndex

on run argv
    set showAllWindows to (count of argv) > 0 and (item 1 of argv) = "all"
    
    tell application "NewBrowserName"
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
        
        if showAllWindows then
            return tabList
        else
            -- Return only frontmost window's tabs
            set frontWindow to front window
            if frontWindow exists then
                set frontTabList to ""
                set frontTabCount to count of tabs of frontWindow
                
                repeat with j from 1 to frontTabCount
                    set t to tab j of frontWindow
                    set tabInfo to title of t & "|||" & URL of t & "|||" & 1 & "|||" & j
                    
                    if length of frontTabList > 0 then
                        set frontTabList to frontTabList & ", " & tabInfo
                    else
                        set frontTabList to tabInfo
                    end if
                end repeat
                
                return frontTabList
            end if
    end tell
end run
```

**Update Tab Fetcher** (`src/services/tabFetcher.js`):
```javascript
// Add new browser to main orchestration
async function refreshTabs(options = {}) {
  const { selectedApps = [] } = options
  const selectionKey = buildSelectionKey(selectedApps)
  
  const [safariTabs, chromeTabs, braveTabs, cometTabs, arcTabs, terminalTabs, newbrowserTabs] = await Promise.all([
    shouldFetch('Safari') ? getSafariTabs() : Promise.resolve([]),
    shouldFetch('Google Chrome') || shouldFetch('Chrome') ? getChromeTabs() : Promise.resolve([]),
    shouldFetch('Brave Browser') || shouldFetch('Brave') ? getBraveTabs() : Promise.resolve([]),
    shouldFetch('Comet') ? getCometTabs() : Promise.resolve([]),
    shouldFetch('Arc') ? getArcTabs() : Promise.resolve([]),
    shouldFetch('Terminal') ? getTerminalTabs() : Promise.resolve([]),
    shouldFetch('NewBrowser') ? getNewBrowserTabs() : Promise.resolve([]),
  ])
  
  const allTabs = [...safariTabs, ...chromeTabs, ...braveTabs, ...cometTabs, ...arcTabs, ...terminalTabs, ...newbrowserTabs]
  
  // Update cache
  tabCache = allTabs
  cacheTimestamp = now
  selectionCacheKey = selectionKey
  
  return allTabs
}

// New browser fetch function
async function getNewBrowserTabs() {
  const scriptPath = path.join(__dirname, '../scripts/newbrowser.applescript')
  
  return new Promise((resolve) => {
    executeAppleScript(scriptPath, 30000).then(tabs => {
      const normalizedTabs = tabs.map(tab => ({
        ...tab,
        browser: 'NewBrowser',
        icon: '/path/to/newbrowser/icon.png' // Add icon path
      }))
      resolve(normalizedTabs)
    }).catch(error => {
      safeError('[TabFetcher] NewBrowser error:', error)
      resolve([])
    })
  })
}
```

### 2. Browser-Specific Optimization

**Chrome Optimization**:
```javascript
async function getChromeTabs() {
  // Use Chrome DevTools Protocol for faster tab access if available
  try {
    const chromeTabs = await getChromeTabsViaDevTools()
    if (chromeTabs.length > 0) return chromeTabs
  } catch (error) {
    // Fallback to AppleScript
    safeLog('[TabFetcher] DevTools failed, using AppleScript fallback')
  }
  
  // Standard AppleScript approach
  const scriptPath = path.join(__dirname, '../scripts/chrome.applescript')
  return executeAppleScript(scriptPath, 25000) // Chrome with many tabs needs more time
}

async function getChromeTabsViaDevTools() {
  // Implementation for Chrome DevTools Protocol
  // Faster and more reliable than AppleScript
  const tabs = await chrome.debugger.attach({host: 'localhost', port: 9222})
  return tabs.map(tab => ({
    title: tab.title,
    url: tab.url,
    windowIndex: tab.windowId,
    tabIndex: tab.index,
    browser: 'Google Chrome'
  }))
}
```

**Safari Optimization**:
```javascript
async function getSafariTabs() {
  // Safari has better AppleScript performance than Chrome
  const scriptPath = path.join(__dirname, '../scripts/safari.applescript')
  
  return executeAppleScript(scriptPath, 15000) // Safari needs less timeout
}
```

### 3. Tab Activation with Retry Logic

```javascript
async function activateTabWithRetry(tab, options = {}) {
  const { browser, windowIndex, tabIndex, url } = tab
  const maxRetries = options.maxRetries || 3
  const retryDelay = options.retryDelay || 1000
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const success = await activateTabForBrowser(browser, windowIndex, tabIndex, url)
      if (success) {
        safeLog(`[TabFetcher] Successfully activated ${browser} tab:`, tab.title)
        return true
      }
      
      if (attempt < maxRetries) {
        safeLog(`[TabFetcher] ${browser} activation attempt ${attempt} failed, retrying...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
      }
    } catch (error) {
      safeError(`[TabFetcher] ${browser} activation error:`, error)
      if (attempt === maxRetries) throw error
    }
  }
  
  return false
}

async function activateTabForBrowser(browser, windowIndex, tabIndex, expectedURL) {
  const activationScript = path.join(__dirname, '../scripts/${browser.toLowerCase()}-activate.applescript')
  
  return new Promise((resolve) => {
    execFile('osascript', [
      activationScript,
      windowIndex.toString(),
      tabIndex.toString(),
      expectedURL || ''
    ], { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        resolve(false)
        return
      }
      
      // Check for AppleScript success/failure indicators
      if (stderr && stderr.includes('URL verification failed')) {
        resolve(false)
      } else {
        resolve(true)
      }
    })
  })
}
```

### 4. Performance Monitoring

```javascript
// Tab fetching performance metrics
class TabPerformanceMonitor {
  constructor() {
    this.metrics = new Map()
  }
  
  startTiming(browser) {
    this.metrics.set(browser, { startTime: Date.now() })
  }
  
  endTiming(browser, tabCount) {
    const metric = this.metrics.get(browser) || {}
    const endTime = Date.now()
    const duration = endTime - metric.startTime
    
    this.metrics.set(browser, {
      ...metric,
      endTime,
      duration,
      tabCount,
      avgPerTab: duration / Math.max(1, tabCount)
    })
    
    // Log performance issues
    if (duration > 5000) {
      safeLog(`[TabPerformance] ${browser} slow: ${duration}ms for ${tabCount} tabs`)
    }
  }
  
  getReport() {
    const report = {}
    for (const [browser, metric] of this.metrics.entries()) {
      report[browser] = {
        duration: metric.duration,
        tabCount: metric.tabCount,
        avgPerTab: metric.avgPerTab
      }
    }
    return report
  }
}

// Usage in tab fetching
const performanceMonitor = new TabPerformanceMonitor()

async function getChromeTabs() {
  performanceMonitor.startTiming('Chrome')
  
  try {
    const tabs = await getChromeTabsImplementation()
    performanceMonitor.endTiming('Chrome', tabs.length)
    return tabs
  } catch (error) {
    performanceMonitor.endTiming('Chrome', 0)
    throw error
  }
}
```

## Testing Approach

### Browser Compatibility Testing
```javascript
// Test browser detection and script execution
describe('Browser Integration', () => {
  test('should detect running browsers', async () => {
    const runningBrowsers = await detectRunningBrowsers()
    expect(runningBrowsers).toContain('Safari')
    expect(runningBrowsers).toContain('Google Chrome')
  })
  
  test('should fetch tabs from Safari', async () => {
    const tabs = await getSafariTabs()
    expect(Array.isArray(tabs)).toBe(true)
    expect(tabs.every(tab => tab.title && tab.url)).toBe(true)
  })
  
  test('should activate Safari tab', async () => {
    const testTab = {
      browser: 'Safari',
      windowIndex: 1,
      tabIndex: 1,
      url: 'https://example.com'
    }
    
    const success = await activateTab(testTab)
    expect(success).toBe(true)
  })
})
```

### Performance Testing
```javascript
describe('Tab Fetching Performance', () => {
  test('should complete within timeout', async () => {
    const startTime = Date.now()
    await getChromeTabs()
    const duration = Date.now() - startTime
    
    expect(duration).toBeLessThan(30000) // 30 seconds max
  })
  
  test('should handle large tab counts efficiently', async () => {
    // Mock browser with many tabs
    const tabs = await getBrowserTabsWithMockData('Chrome', 200)
    expect(tabs.length).toBeGreaterThan(0)
  })
})
```

## Integration Notes
- **IPC Integration**: Tab operations exposed via `get-tabs` and `activate-tab` channels
- **Settings Integration**: Browser selection stored in `selectedApps` array
- **Caching Integration**: 10-second TTL with stale-while-revalidate pattern
- **Error Handling**: Graceful degradation when browsers are not running

## Common Browser Integration Issues

### 1. Safari Permissions
**Problem**: Safari requires explicit permission for AppleScript access.

**Solutions**:
```javascript
async function checkSafariPermissions() {
  return new Promise((resolve) => {
    execFile('osascript', ['-e', 'tell application "Safari" to get name'], (error) => {
      const hasPermission = !error
      if (!hasPermission) {
        showSafariPermissionDialog()
      }
      resolve(hasPermission)
    })
  })
}

function showSafariPermissionDialog() {
  const message = `
Safari integration requires permission:
1. Open Safari → Safari → Settings
2. Enable "Allow JavaScript from Apple Events"
3. Restart ContextSearch
  `
  // Show user-friendly dialog
  showDialog('Safari Permission Required', message)
}
```

### 2. Chrome Multiple Processes
**Problem**: Chrome runs multiple processes, causing script confusion.

**Solutions**:
```javascript
async function getChromeMainProcess() {
  // Find the main Chrome process (not background workers)
  const chromeProcesses = await getChromeProcesses()
  const mainProcess = chromeProcesses.find(proc => 
    !proc.args.includes('--type=background') && 
    !proc.args.includes('--type=gpu-process') &&
    !proc.args.includes('--type=utility')
  )
  
  return mainProcess
}
```

### 3. Browser Version Compatibility
**Problem**: Different browser versions have different AppleScript support.

**Solutions**:
```javascript
const BROWSER_VERSION_COMPATIBILITY = {
  'Chrome': {
    '90+': { features: ['basic-tabs', 'activation'], timeout: 25000 },
    '100+': { features: ['enhanced-tabs', 'window-management'], timeout: 20000 },
    '110+': { features: ['devtools-protocol'], timeout: 15000 }
  },
  'Safari': {
    '14+': { features: ['basic-tabs', 'activation'], timeout: 15000 },
    '15+': { features: ['enhanced-tabs'], timeout: 12000 }
  }
}

function getBrowserCapabilities(browserName, version) {
  const browserCompat = BROWSER_VERSION_COMPATIBILITY[browserName]
  if (!browserCompat) return { features: [], timeout: 30000 }
  
  for (const [versionRange, config] of Object.entries(browserCompat)) {
    if (isVersionInRange(version, versionRange)) {
      return config
    }
  }
  
  return { features: [], timeout: 30000 } // Default safe config
}
```

## Performance Considerations

### Optimization Strategies
1. **Parallel Execution**: Fetch from all browsers simultaneously
2. **Intelligent Timeouts**: Adjust timeouts based on browser and tab count
3. **Cache Strategy**: 10-second TTL with stale-while-revalidate
4. **Selective Fetching**: Only fetch from selected browsers
5. **Performance Monitoring**: Track fetch times and optimize slow operations

### Memory Management
```javascript
function manageTabMemory(tabs) {
  // Limit tab data storage
  const MAX_TABS_PER_BROWSER = 500
  const MAX_URL_LENGTH = 2048
  
  return tabs.map(tab => ({
    ...tab,
    url: tab.url.length > MAX_URL_LENGTH ? tab.url.substring(0, MAX_URL_LENGTH) : tab.url,
    title: tab.title.length > 256 ? tab.title.substring(0, 256) : tab.title
  })).slice(0, MAX_TABS_PER_BROWSER)
}
```

## When to Use This Agent
Use this agent when working on:
- Adding support for new browsers
- Fixing tab fetching or activation issues
- Optimizing browser integration performance
- Implementing browser-specific features
- Debugging browser permission problems
- Testing browser compatibility across versions

## Related Documentation
- [macOS Integration Agent](.claude/agents/macos-integration-agent.md) - macOS-specific patterns
- [Architecture Guide](docs/ARCHITECTURE.md) - Tab service integration
- [API Reference](docs/API.md) - IPC channel documentation
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Browser permission issues