---
name: macos-applescript-development
description: Provides patterns, templates, and best practices for developing AppleScript integration with macOS browsers and applications. Use when adding support for new browsers, fixing AppleScript-related tab fetching or activation issues, optimizing AppleScript performance, implementing macOS-specific application control features, or debugging AppleScript permission or execution issues.
# macOS AppleScript Development Skill

## Purpose
Provides patterns, templates, and best practices for developing AppleScript integration with macOS browsers and applications in ContextSearch.

## When to Use
- Adding support for new browsers in ContextSearch
- Fixing AppleScript-related tab fetching or activation issues
- Optimizing AppleScript performance for browsers with many tabs
- Implementing macOS-specific application control features
- Debugging AppleScript permission or execution issues

## Key Patterns

### 1. Standard Browser Tab Enumeration Pattern

**AppleScript Template**:
```applescript
-- Browser Tab Enumeration Script
-- Returns: title|||url|||windowIndex|||tabIndex,tab2...

tell application "BrowserName"
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

**JavaScript Integration**:
```javascript
function executeTabEnumerationScript(browserName, scriptPath) {
  return new Promise((resolve) => {
    execFile('osascript', [scriptPath], { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        logger.error(`[AppleScript] ${browserName} failed:`, error.message)
        resolve([])
        return
      }
      
      // Parse standardized output format
      const results = stdout
        .split(', ')
        .filter(item => item.includes('|||'))
        .map(item => {
          const [title, url, windowIndex, tabIndex] = item.split('|||')
          return {
            title: title.trim(),
            url: url.trim(),
            windowIndex: parseInt(windowIndex, 10),
            tabIndex: parseInt(tabIndex, 10),
            browser: browserName
          }
        })
        .filter(item => item.title && item.url)
      
      resolve(results)
    })
  })
}
```

### 2. Safe Tab Activation Pattern

**AppleScript Template**:
```applescript
-- Tab Activation Script
-- Parameters: windowIndex, tabIndex, verificationURL

on run argv
    set windowIndex to item 1 of argv
    set tabIndex to item 2 of argv
    set verificationURL to item 3 of argv
    
    tell application "BrowserName"
        activate
        
        -- Bring window to front
        set index of window windowIndex to 1
        
        -- Activate specific tab
        set current tab of window 1 to tab tabIndex of window windowIndex
        
        -- Verify URL for security
        delay 0.5
        set currentURL to URL of current tab of window 1
        
        if currentURL is not verificationURL then
            error "URL verification failed"
        end if
    end tell
end run
```

**JavaScript Integration**:
```javascript
function activateTab(browserName, windowIndex, tabIndex, expectedURL) {
  const activationScript = path.join(__dirname, 'scripts', `${browserName.toLowerCase()}-activate.applescript`)
  
  return new Promise((resolve) => {
    execFile('osascript', [
      activationScript,
      windowIndex.toString(),
      tabIndex.toString(),
      expectedURL
    ], { timeout: 10000 }, (error) => {
      if (error) {
        logger.error(`[AppleScript] ${browserName} activation failed:`, error.message)
        resolve(false)
        return
      }
      
      logger.log(`[AppleScript] ${browserName} tab activated successfully`)
      resolve(true)
    })
  })
}
```

### 3. Error Handling and Retry Pattern

```javascript
async function activateTabWithRetry(tab, maxRetries = 3) {
  const { browser, windowIndex, tabIndex, url } = tab
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const success = await activateTab(browser, windowIndex, tabIndex, url)
      if (success) return true
      
      logger.warn(`[TabFetcher] ${browser} activation attempt ${attempt} failed`)
      
      // Exponential backoff
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)))
      }
    } catch (error) {
      logger.error(`[TabFetcher] ${browser} activation error:`, error)
    }
  }
  
  return false
}
```

## Common Pitfalls and Solutions

### Pitfall 1: AppleScript Permission Errors
**Problem**: Scripts fail with "not allowed" or "access denied" errors.

**Solution**:
```javascript
function checkBrowserPermissions(browserName) {
  return new Promise((resolve) => {
    execFile('osascript', ['-e', `tell application "${browserName}" to get name`], (error) => {
      const hasPermission = !error
      if (!hasPermission) {
        logger.warn(`[Permissions] ${browserName} needs Accessibility permission`)
      }
      resolve(hasPermission)
    })
  })
}

// Guide user to enable permissions
function showPermissionInstructions(browserName) {
  const instructions = `
To enable ${browserName} integration:

1. Open System Preferences → Security & Privacy → Privacy
2. Click "Accessibility" in the left sidebar
3. Click the lock icon to make changes
4. Add ContextSearch to the allowed applications
5. Restart ContextSearch
  `
  
  // Show instructions in UI or dialog
  showUserMessage('Permission Required', instructions)
}
```

### Pitfall 2: Browser Process Name Issues
**Problem**: Scripts fail because browser process name doesn't match application name.

**Solution**:
```javascript
const BROWSER_PROCESS_MAP = {
  'Safari': 'Safari',
  'Google Chrome': 'Google Chrome',
  'Chrome': 'Google Chrome',
  'Brave Browser': 'Brave Browser',
  'Brave': 'Brave Browser',
  'Arc': 'Arc',
  'Comet': 'Comet',
  'Microsoft Edge': 'Microsoft Edge'
}

function getBrowserProcessName(browserName) {
  return BROWSER_PROCESS_MAP[browserName] || browserName
}
```

### Pitfall 3: Timeouts with Large Tab Counts
**Problem**: Browsers with 200+ tabs cause script timeouts.

**Solution**:
```javascript
function getTabEnumerationTimeout(browserName, estimatedTabCount) {
  // Base timeout plus scaling for tab count
  const baseTimeout = 10000 // 10 seconds
  const perTabTimeout = 50 // 50ms per tab
  const maxTimeout = 60000 // Maximum 60 seconds
  
  return Math.min(baseTimeout + (estimatedTabCount * perTabTimeout), maxTimeout)
}

// Adaptive timeout based on previous results
async function getTabsWithAdaptiveTimeout(browserName) {
  const previousTabCount = getCachedTabCount(browserName)
  const timeout = getTabEnumerationTimeout(browserName, previousTabCount || 100)
  
  return await executeTabEnumerationScript(browserName, timeout)
}
```

### Pitfall 4: URL and Title Extraction Issues
**Problem**: Special characters in URLs or titles break script output parsing.

**Solution**:
```applescript
-- Safe string handling in AppleScript
repeat with j from 1 to tabCount
    set t to tab j of w
    set tabTitle to title of t
    set tabURL to URL of t
    
    -- Handle empty/missing values
    if tabTitle is missing value then set tabTitle to ""
    if tabURL is missing value then set tabURL to ""
    
    -- Escape problematic characters
    set cleanTitle to my replaceText(tabTitle, "|", "PIPE")
    set cleanURL to my replaceText(tabURL, "|", "PIPE")
    
    set tabInfo to cleanTitle & "|||" & cleanURL & "|||" & i & "|||" & j
    
    if length of tabList > 0 then
        set tabList to tabList & ", " & tabInfo
    else
        set tabList to tabInfo
    end if
end repeat

-- Helper function to replace text
on replaceText(sourceText, findText, replaceWith)
    set AppleScript's text item delimiters to findText
    set textItems to text items of sourceText
    set AppleScript's text item delimiters to ""
    set result to replaceWith
    
    repeat with item in textItems
        if result is not "" then set result to result & replaceWith
        set result to result & item
    end repeat
    
    return result
end replaceText
```

## Performance Optimization Patterns

### 1. Parallel Script Execution
```javascript
async function getAllTabsFromBrowsers(browserList) {
  const browserPromises = browserList.map(async (browser) => {
    const scriptPath = getScriptPath(browser)
    return {
      browser,
      tabs: await executeTabEnumerationScript(browser, scriptPath)
    }
  })
  
  const results = await Promise.all(browserPromises)
  
  return results.flatMap(({ browser, tabs }) => 
    tabs.map(tab => ({ ...tab, browser }))
  )
}
```

### 2. Incremental Tab Loading
```javascript
async function getTabsIncrementally(browserName, batchSize = 50) {
  const allTabs = []
  let batchIndex = 0
  
  while (true) {
    const batch = await getTabBatch(browserName, batchIndex, batchSize)
    if (batch.length === 0) break
    
    allTabs.push(...batch)
    batchIndex += batchSize
    
    // Yield control to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  
  return allTabs
}
```

## Testing and Debugging

### Manual Script Testing
```bash
# Test Safari tab enumeration
osascript src/scripts/safari.applescript

# Test with parameters
osascript src/scripts/chrome-activate.applescript "1" "2" "https://example.com"

# Check script syntax
osascript -l AppleScript -e 'tell application "Safari" to get name'
```

### Debug Logging in AppleScript
```applescript
-- Add debug logging to AppleScript
on debugLog(message)
    -- Write to debug file (for development)
    try
        set filePath to (path to desktop as string) & "contextsearch-debug.txt"
        set fileRef to open for access file filePath with write permission
        write (current date) & " - " & message & return to fileRef
        close access fileRef
    end try
end debugLog

-- Usage in script
debugLog("Starting tab enumeration for " & (count of windows) & " windows")
```

## Security Considerations

### 1. Input Sanitization
```javascript
function sanitizeForAppleScript(input) {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\|/g, 'PIPE') // Replace our delimiter
}
```

### 2. URL Validation
```javascript
function validateTabURL(url) {
  if (!url || typeof url !== 'string') return false
  
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
```

## When to Use This Skill
You need this skill when working on:
- Browser tab integration features
- AppleScript automation for macOS applications
- Permission handling for system integration
- Performance optimization of browser communication
- Debugging macOS-specific integration issues

## Related Files
- `src/scripts/*.applescript` - Browser automation scripts
- `src/services/tabFetcher.js` - Tab management service
- `electron/main-process/handlers/actionHandler.js` - IPC handlers
- `docs/TROUBLESHOOTING.md` - Common permission and script issues