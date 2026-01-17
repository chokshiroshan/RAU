const { execFile } = require('child_process')
const path = require('path')
const fs = require('fs')
const { 
  getSystemWindows,
  clearCache: clearWindowCache,
  getAppCapability,
  supportsTabs,
  supportsDocuments,
  APP_CAPABILITIES
} = require('./windowIndexer')

// Cache configuration - 10 seconds cache for faster repeated searches
const CACHE_DURATION = 10000 // 10 seconds (since fetching 200+ tabs takes time)
let tabCache = null
let cacheTimestamp = 0
let tabCacheKey = null
let pendingFetch = null // Mutex to prevent concurrent fetches
let pendingFetchKey = null

// Safe logging helper to prevent EPIPE/EIO crashes
// These errors happen asynchronously when stdout/stderr streams close
const stdoutWritable = { value: true }
const stderrWritable = { value: true }

// Mark streams as unwritable on error
if (process.stdout) {
  process.stdout.on('error', () => { stdoutWritable.value = false })
}
if (process.stderr) {
  process.stderr.on('error', () => { stderrWritable.value = false })
}

/**
 * Safe console.log wrapper that prevents EPIPE crashes
 * @param {...any} args - Values to log
 */
function safeLog(...args) {
  if (stdoutWritable.value) {
    try {
      console.log(...args)
    } catch {
      stdoutWritable.value = false
    }
  }
}

/**
 * Safe console.error wrapper that prevents EPIPE crashes
 * @param {...any} args - Values to log
 */
function safeError(...args) {
  if (stderrWritable.value) {
    try {
      console.error(...args)
    } catch {
      stderrWritable.value = false
    }
  }
}

/**
 * Escape a string for use in AppleScript
 * Escapes backslashes, double quotes, single quotes, newlines, and carriage returns
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for AppleScript
 */
function escapeAppleScriptString(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/\\/g, '\\\\')    // Escape backslashes first
    .replace(/"/g, '\\"')      // Escape double quotes
    .replace(/'/g, "\\'")      // Escape single quotes
    .replace(/\n/g, '\\n')     // Escape newlines
    .replace(/\r/g, '\\r')     // Escape carriage returns
    .replace(/\t/g, '\\t')     // Escape tabs
}

/**
 * Validate that a value is a positive integer
 * @param {any} value - Value to validate
 * @returns {number|null} The number if valid, null otherwise
 */
function validatePositiveInt(value) {
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 1) return null
  return num
}

/**
 * Execute AppleScript file and return parsed result
 * @param {string} scriptPath - Path to .applescript file
 * @returns {Promise<Array>} Parsed tab data
 */
function executeAppleScript(scriptPath) {
  return new Promise((resolve) => {
    // Use 30s timeout to handle browsers with many tabs (e.g., 200+ Comet tabs)
    execFile('osascript', [scriptPath], { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        // Log the specific error for debugging
        safeError(`[TabFetcher] Script error for ${scriptPath}:`, error.message)
        if (stderr) {
          safeError(`[TabFetcher] stderr: ${stderr}`)
        }
        resolve([])
        return
      }

      if (stderr) {
        safeError(`[TabFetcher] Script stderr for ${scriptPath}: ${stderr}`)
        resolve([])
        return
      }

      // Parse AppleScript output
      // Format: title|||url|||windowIndex|||tabIndex, title|||url|||windowIndex|||tabIndex, ...
      try {
        const output = stdout.trim()
        if (!output) {
          resolve([])
          return
        }

        // Split by comma (each tab is separated by comma)
        const tabEntries = output.split(',').map(s => s.trim())
        const tabs = []

        tabEntries.forEach(entry => {
          // Split each entry by ||| delimiter
          const parts = entry.split('|||').map(s => s.trim())

          if (parts.length === 4) {
            const title = parts[0]
            const url = parts[1]
            const windowIndex = parseInt(parts[2], 10)
            const tabIndex = parseInt(parts[3], 10)

            // Skip invalid entries
            if (!isNaN(windowIndex) && !isNaN(tabIndex) && title && url) {
              tabs.push({
                title,
                url,
                windowIndex,
                tabIndex,
              })
            }
          }
        })

        resolve(tabs)
      } catch (parseError) {
        safeError('Error parsing AppleScript output:', parseError)
        safeError('Raw output:', stdout.substring(0, 500))
        resolve([])
      }
    })
  })
}

/**
 * Get all tabs from Safari
 * @returns {Promise<Array>} Array of Safari tabs
 */
async function getSafariTabs() {
  const scriptPath = path.join(__dirname, '../scripts/safari.applescript')
  const tabs = await executeAppleScript(scriptPath)

  safeLog(`[TabFetcher] Safari: found ${tabs.length} tabs`)

  return tabs.map(tab => ({
    ...tab,
    browser: 'Safari',
  }))
}

/**
 * Get all tabs from Chrome
 * @returns {Promise<Array>} Array of Chrome tabs
 */
async function getChromeTabs() {
  const scriptPath = path.join(__dirname, '../scripts/chrome.applescript')
  const tabs = await executeAppleScript(scriptPath)

  safeLog(`[TabFetcher] Chrome: found ${tabs.length} tabs`)

  return tabs.map(tab => ({
    ...tab,
    browser: 'Chrome',
  }))
}

/**
 * Get all tabs from Brave
 * @returns {Promise<Array>} Array of Brave tabs
 */
async function getBraveTabs() {
  const scriptPath = path.join(__dirname, '../scripts/brave.applescript')
  const tabs = await executeAppleScript(scriptPath)

  safeLog(`[TabFetcher] Brave: found ${tabs.length} tabs`)

  return tabs.map(tab => ({
    ...tab,
    browser: 'Brave',
  }))
}

/**
 * Get all tabs from Comet
 * @returns {Promise<Array>} Array of Comet tabs
 */
async function getCometTabs() {
  const scriptPath = path.join(__dirname, '../scripts/comet.applescript')
  const tabs = await executeAppleScript(scriptPath)

  safeLog(`[TabFetcher] Comet: found ${tabs.length} tabs`)

  return tabs.map(tab => ({
    ...tab,
    browser: 'Comet',
  }))
}

/**
 * Get all tabs from Terminal
 * @returns {Promise<Array>} Array of Terminal tabs
 */
async function getTerminalTabs() {
  const scriptPath = path.join(__dirname, '../scripts/terminal.applescript')
  const tabs = await executeAppleScript(scriptPath)

  safeLog(`[TabFetcher] Terminal: found ${tabs.length} tabs`)

  return tabs.map(tab => ({
    ...tab,
    browser: 'Terminal',
    type: 'tab'
  }))
}

/**
 * Get all tabs from Arc
 * @returns {Promise<Array>} Array of Arc tabs
 */
async function getArcTabs() {
  const scriptPath = path.join(__dirname, '../scripts/arc.applescript')
  const tabs = await executeAppleScript(scriptPath)

  safeLog(`[TabFetcher] Arc: found ${tabs.length} tabs`)

  return tabs.map(tab => ({
    ...tab,
    browser: 'Arc',
  }))
}

/**
 * Get enhanced windows from ALL visible applications using native window discovery
 * Combines fast Core Graphics enumeration with app-specific tab/document discovery
 * @returns {Promise<Array>} Array of enhanced window objects
 */
async function getUniversalWindows(selectedApps = []) {
  try {
    // Get fast window enumeration using Core Graphics
    const systemWindows = await getSystemWindows({ selectedApps })
    
    // Enhance with app-specific data where possible
    const enhancedWindows = await Promise.all(
      systemWindows.map(async (window) => {
        const capability = getAppCapability(window.appName)
        
        // If app supports tabs, try to get detailed tab information
        if (capability.tabs) {
          try {
            const detailedData = await getAppSpecificData(window.appName, selectedApps)
            if (detailedData && detailedData.length > 0) {
              // Merge system window data with detailed app data
              return detailedData.map(detail => ({
                ...window,
                ...detail,
                type: 'tab',
                capability,
              }))
            }
          } catch (error) {
            safeLog(`[TabFetcher] No detailed data for ${window.appName}:`, error.message)
          }
        }
        
        // Return basic window info for non-tab apps
        return {
          ...window,
          type: capability.documents ? 'document' : 'window',
          capability,
        }
      })
    )
    
    // Flatten the results (some apps return multiple tabs/windows)
    const flattenedWindows = enhancedWindows.flat()
    
    safeLog(`[TabFetcher] Enhanced universal windows: found ${flattenedWindows.length} items from ${new Set(flattenedWindows.map(w => w.appName)).size} apps`)
    return flattenedWindows
    
  } catch (error) {
    safeError('[TabFetcher] Enhanced universal windows error:', error)
    return []
  }
}

/**
 * Get app-specific tab/document data using generated AppleScripts
 * @param {string} appName - Application name
 * @param {Array} selectedApps - Selected apps list
 * @returns {Promise<Array>} Array of detailed app data
 */
async function getAppSpecificData(appName, selectedApps = []) {
  if (!isAppSelected(appName, selectedApps)) {
    return []
  }
  
  const capability = getAppCapability(appName)
  let scriptPath = null
  
  // Determine which template to use based on app capability
  if (capability.category === 'browsers' || capability.category === 'terminals') {
    // Use existing dedicated AppleScripts for browsers and terminals
    scriptPath = getDedicatedScriptPath(appName)
  } else if (capability.category === 'editors') {
    scriptPath = path.join(__dirname, '../scripts/templates/ide-tabs.applescript')
  } else if (capability.category === 'productivity') {
    scriptPath = path.join(__dirname, '../scripts/templates/document-app.applescript')
  }
  
  if (!scriptPath) {
    return []
  }
  
  return executeCustomScript(scriptPath, appName)
}

/**
 * Get path to dedicated AppleScript for an app
 * @param {string} appName - Application name
 * @returns {string|null} Path to dedicated script or null
 */
function getDedicatedScriptPath(appName) {
  const scriptMap = {
    'Safari': 'safari.applescript',
    'Google Chrome': 'chrome.applescript',
    'Brave Browser': 'brave.applescript',
    'Arc': 'arc.applescript',
    'Comet': 'comet.applescript',
    'Terminal': 'terminal.applescript',
  }
  
  const scriptName = scriptMap[appName]
  return scriptName ? path.join(__dirname, '../scripts', scriptName) : null
}

/**
 * Execute custom script with app name substitution
 * @param {string} scriptPath - Path to AppleScript template
 * @param {string} appName - Application name to substitute
 * @returns {Promise<Array>} Parsed tab results
 */
function executeCustomScript(scriptPath, appName) {
  return new Promise((resolve) => {
    // Read script template
    fs.readFile(scriptPath, 'utf8', (readError, scriptTemplate) => {
      if (readError) {
        safeError(`[TabFetcher] Could not read script template ${scriptPath}:`, readError)
        resolve([])
        return
      }
      
      // Substitute APP_NAME placeholder
      const script = scriptTemplate.replace(/APP_NAME/g, appName)
      
      // Write temporary script file
      const tempScriptPath = path.join(__dirname, `../scripts/temp_${appName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.applescript`)
      fs.writeFile(tempScriptPath, script, 'utf8', (writeError) => {
        if (writeError) {
          safeError(`[TabFetcher] Could not write temp script:`, writeError)
          resolve([])
          return
        }
        
        // Execute the temporary script
        execFile('osascript', [tempScriptPath], { timeout: 15000 }, (execError, stdout, stderr) => {
          // Clean up temp file
          fs.unlink(tempScriptPath, () => {}) // Async cleanup, ignore errors
          
          if (execError) {
            safeError(`[TabFetcher] Script execution error for ${appName}:`, execError.message)
            if (stderr) {
              safeError(`[TabFetcher] stderr: ${stderr}`)
            }
            resolve([])
            return
          }
          
          if (stderr) {
            safeError(`[TabFetcher] Script stderr for ${appName}: ${stderr}`)
            resolve([])
            return
          }
          
          // Parse the output
          try {
            const output = stdout.trim()
            if (!output) {
              resolve([])
              return
            }
            
            // Parse enhanced output format: title|||url|||windowIndex|||tabIndex|||appName
            const entries = output.split(',').map(s => s.trim())
            const results = []
            
            entries.forEach(entry => {
              const parts = entry.split('|||').map(s => s.trim())
              if (parts.length >= 4) {
                const [title, url, windowIndex, tabIndex, returnedAppName] = parts
                
                // Skip invalid entries
                if (!title || !windowIndex || !tabIndex) {
                  return
                }
                
                results.push({
                  title,
                  url: url || '',
                  windowIndex: parseInt(windowIndex, 10),
                  tabIndex: parseInt(tabIndex, 10),
                  browser: returnedAppName || appName,
                  name: title,
                })
              }
            })
            
            resolve(results)
          } catch (parseError) {
            safeError(`[TabFetcher] Parse error for ${appName}:`, parseError)
            safeError('Raw output:', stdout.substring(0, 500))
            resolve([])
          }
        })
      })
    })
  })
}

/**
 * Refresh tabs from all sources and update cache
 * @returns {Promise<Array>}
 */
async function refreshTabs(options = {}) {
  const { selectedApps = [] } = options
  const selectionKey = buildSelectionKey(selectedApps)

  // If already fetching, return the existing promise to prevent stampedes
  if (pendingFetch && pendingFetchKey === selectionKey) return pendingFetch

  pendingFetchKey = selectionKey
  pendingFetch = (async () => {
    try {
      const shouldFetch = (appName) => isAppSelected(appName, selectedApps)

      // Fetch tabs from dedicated browsers AND enhanced universal windows in parallel
      const [safariTabs, chromeTabs, braveTabs, cometTabs, arcTabs, terminalTabs, enhancedWindows] = await Promise.all([
        shouldFetch('Safari') ? getSafariTabs() : Promise.resolve([]),
        shouldFetch('Google Chrome') || shouldFetch('Chrome') ? getChromeTabs() : Promise.resolve([]),
        shouldFetch('Brave Browser') || shouldFetch('Brave') ? getBraveTabs() : Promise.resolve([]),
        shouldFetch('Comet') ? getCometTabs() : Promise.resolve([]),
        shouldFetch('Arc') ? getArcTabs() : Promise.resolve([]),
        shouldFetch('Terminal') ? getTerminalTabs() : Promise.resolve([]),
        getUniversalWindows(selectedApps),
      ])

      // Combine all tabs, windows, and documents
      const allTabs = [...safariTabs, ...chromeTabs, ...braveTabs, ...cometTabs, ...arcTabs, ...terminalTabs, ...enhancedWindows]

      // Deduplicate and prioritize (dedicated browser scripts take priority over universal)
      const deduplicatedTabs = deduplicateTabs(allTabs)

      // Update cache
      tabCache = deduplicatedTabs
      cacheTimestamp = Date.now()
      tabCacheKey = selectionKey
      safeLog(`[TabFetcher] Cache updated: ${deduplicatedTabs.length} items from ${new Set(deduplicatedTabs.map(t => t.browser || t.appName)).size} apps`)

      return deduplicatedTabs
    } catch (error) {
      safeError('[TabFetcher] Error fetching tabs:', error)
      // On error, return empty but don't clear old cache (better to show stale than nothing)
      return []
    } finally {
      // Clear the pending promise so future calls can start fresh
      pendingFetch = null
      pendingFetchKey = null
    }
  })()

  return pendingFetch
}

/**
 * Deduplicate tabs, prioritizing dedicated scripts over universal discovery
 * @param {Array} tabs - Array of tab objects to deduplicate
 * @returns {Array} Deduplicated array of tabs
 */
function deduplicateTabs(tabs) {
  const seen = new Set()
  const deduplicated = []
  
  for (const tab of tabs) {
    // Create unique key: appName + title + windowIndex + tabIndex
    const appName = tab.browser || tab.appName
    const key = `${appName}|${tab.title}|${tab.windowIndex || 1}|${tab.tabIndex || 1}`
    
    if (!seen.has(key)) {
      seen.add(key)
      deduplicated.push(tab)
    }
  }
  
  return deduplicated
}

/**
 * Get all tabs from all browsers with Stale-While-Revalidate caching
 * Returns cache INSTANTLY if available, then refreshes in background
 * @returns {Promise<Array>} Array of all tabs from all browsers
 */
async function getAllTabs(options = {}) {
  const { selectedApps = [] } = options
  const selectionKey = buildSelectionKey(selectedApps)
  const now = Date.now()

  // SWR: Return cached results INSTANTLY if they exist
  if (tabCache && tabCache.length > 0 && tabCacheKey === selectionKey) {
    // If cache is stale, trigger background refresh
    if ((now - cacheTimestamp) > CACHE_DURATION) {
      if (!pendingFetch || pendingFetchKey !== selectionKey) {
        safeLog('[TabFetcher] Cache stale, triggering background refresh')
        refreshTabs(options).catch(err => safeError('[TabFetcher] Bg refresh error:', err))
      }
    }
    safeLog('[TabFetcher] Returning cached tabs (instant)')
    return tabCache
  }

  if (tabCacheKey && tabCacheKey !== selectionKey) {
    clearCache()
  }

  // No cache available? Must wait for fetch
  if (pendingFetch && pendingFetchKey === selectionKey) {
    return pendingFetch
  }

  safeLog('[TabFetcher] No cache, fetching synchronously...')
  return refreshTabs(options)
}

/**
 * Clear the tab cache (useful for testing or manual refresh)
 */
function clearCache() {
  tabCache = null
  cacheTimestamp = 0
  tabCacheKey = null
  // Also clear the window indexer cache
  clearWindowCache()
}

/**
 * Get browser name aliases for matching
 * @param {string} browser - Browser name
 * @returns {Array<string>} Array of aliases including the original name
 */
function getBrowserAliases(browser) {
  if (!browser) return []
  switch (browser) {
    case 'Google Chrome':
      return ['Chrome', 'Google Chrome']
    case 'Brave Browser':
      return ['Brave', 'Brave Browser']
    default:
      return [browser]
  }
}

/**
 * Normalize URL for comparison (trim, parse, remove trailing slash)
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  if (!url) return ''
  const trimmed = String(url).trim()
  if (!trimmed) return ''
  try {
    const parsed = new URL(trimmed)
    let normalized = parsed.href
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  } catch {
    if (trimmed.length > 1 && trimmed.endsWith('/')) {
      return trimmed.slice(0, -1)
    }
    return trimmed
  }
}

/**
 * Find a matching tab in a list using URL, title, or index matching
 * @param {Object} target - Tab to find with browser, url, title, windowIndex, tabIndex
 * @param {Array} tabs - List of tabs to search
 * @returns {Object|null} Matching tab or null
 */
function findMatchingTab(target, tabs) {
  if (!target || !Array.isArray(tabs)) return null

  const browserAliases = getBrowserAliases(target.browser)
  const candidates = tabs.filter(tab => browserAliases.includes(tab.browser))

  if (candidates.length === 0) return null

  if (target.url) {
    const targetUrl = normalizeUrl(target.url)
    const urlMatch = candidates.find(tab => normalizeUrl(tab.url) === targetUrl)
    if (urlMatch) return urlMatch
  }

  if (target.title) {
    const exactTitleMatch = candidates.find(tab => tab.title === target.title)
    if (exactTitleMatch) return exactTitleMatch

    const targetTitle = String(target.title).toLowerCase()
    const caseInsensitiveMatch = candidates.find(tab =>
      String(tab.title || '').toLowerCase() === targetTitle
    )
    if (caseInsensitiveMatch) return caseInsensitiveMatch
  }

  if (target.windowIndex && target.tabIndex) {
    const indexMatch = candidates.find(tab =>
      tab.windowIndex === target.windowIndex && tab.tabIndex === target.tabIndex
    )
    if (indexMatch) return indexMatch
  }

  return null
}

/**
 * Normalize app name to lowercase for comparison
 * @param {string} name - App name to normalize
 * @returns {string} Normalized name
 */
function normalizeAppName(name) {
  return String(name || '').trim().toLowerCase()
}

/**
 * Build cache key from selected apps array
 * @param {Array<string>} selectedApps - Array of selected app names
 * @returns {string} Cache key
 */
function buildSelectionKey(selectedApps) {
  if (!Array.isArray(selectedApps) || selectedApps.length === 0) {
    return 'all'
  }
  return selectedApps
    .map(normalizeAppName)
    .filter(Boolean)
    .sort()
    .join('|')
}

/**
 * Check if an app is in the selected list (handles aliases)
 * @param {string} appName - App name to check
 * @param {Array<string>} selectedApps - List of selected app names
 * @returns {boolean} True if selected or list is empty
 */
function isAppSelected(appName, selectedApps) {
  if (!Array.isArray(selectedApps) || selectedApps.length === 0) return true

  const normalizedAppName = normalizeAppName(appName)
  if (!normalizedAppName) return false

  const selectedSet = new Set(selectedApps.map(normalizeAppName).filter(Boolean))
  if (selectedSet.has(normalizedAppName)) return true

  const aliasMap = {
    'chrome': 'google chrome',
    'google chrome': 'chrome',
    'brave': 'brave browser',
    'brave browser': 'brave',
  }
  const alias = aliasMap[normalizedAppName]
  return alias ? selectedSet.has(alias) : false
}

/**
 * Fetch fresh tabs and find a matching one
 * @param {Object} target - Tab to find
 * @param {Object} options - Options including selectedApps
 * @returns {Promise<Object|null>} Matching tab or null
 */
async function resolveTabFromFreshFetch(target, options = {}) {
  const tabs = await refreshTabs(options)
  return findMatchingTab(target, tabs)
}

/**
 * Activate a specific tab in the specified browser
 * @param {Object} tab - Tab object with browser, windowIndex, tabIndex
 * @returns {Promise<boolean>} Success status
 */
async function activateTab(tab) {
  const { browser } = tab

  // Validate indices to prevent injection
  const windowIndex = validatePositiveInt(tab.windowIndex)
  const tabIndex = validatePositiveInt(tab.tabIndex)

  if (windowIndex === null || tabIndex === null) {
    safeError(`[TabFetcher] Invalid window/tab index: window=${tab.windowIndex}, tab=${tab.tabIndex}`)
    return false
  }

  safeLog(`[TabFetcher] Activating ${browser} tab: window ${windowIndex}, tab ${tabIndex}`)

  // Escape URL to prevent AppleScript injection
  const targetUrl = escapeAppleScriptString(tab.url || '')
  let script = ''

  switch (browser) {
    case 'Safari':
      script = `
        tell application "Safari"
          activate
          try
            tell window ${windowIndex} to set current tab to tab ${tabIndex}
            set index of window ${windowIndex} to 1
          end try
        end tell
      `
      break
    case 'Terminal':
      script = `
        tell application "Terminal"
          activate
          try
            set selected tab of window ${windowIndex} to tab ${tabIndex}
            set index of window ${windowIndex} to 1
          end try
        end tell
      `
      break
    case 'Chrome':
    case 'Google Chrome':
    case 'Brave':
    case 'Brave Browser':
    case 'Comet':
    case 'Arc':
      // Resolve app name
      let appName = 'Google Chrome'
      if (browser === 'Brave' || browser === 'Brave Browser') appName = 'Brave Browser'
      if (browser === 'Comet') appName = 'Comet'
      if (browser === 'Arc') appName = 'Arc'

      script = `
        tell application "${appName}"
          activate
          set targetUrl to "${targetUrl}"
          set found to false
          
          -- 1. Try direct index first (fastest)
          try
            if targetUrl is not "" then
               set t to tab ${tabIndex} of window ${windowIndex}
               if URL of t is targetUrl then
                  set active tab index of window ${windowIndex} to ${tabIndex}
                  set index of window ${windowIndex} to 1
                  return "success"
               end if
            else
               -- No URL to verify, just trust index
               set active tab index of window ${windowIndex} to ${tabIndex}
               set index of window ${windowIndex} to 1
               return "success"
            end if
          end try
          
          -- 2. If direct fail, search all windows (index-based for Comet safety)
          if targetUrl is not "" then
            set winCount to count of windows
            repeat with i from 1 to winCount
              set w to window i
              set tabCount to count of tabs of w
              repeat with j from 1 to tabCount
                set t to tab j of w
                if URL of t is targetUrl then
                  set active tab index of window i to j
                  set index of window i to 1
                  return "success_search"
                end if
              end repeat
            end repeat
          end if
          
          return "failed"
        end tell
      `
      break
    default:
      // Fallback for universal windows - escape browser name to prevent injection
      const safeBrowserName = escapeAppleScriptString(browser)
      if (tab.type === 'window') {
        const targetWindow = validatePositiveInt(tab.windowIndex) || 1
        script = `
          tell application "${safeBrowserName}" to activate
          tell application "System Events"
            tell process "${safeBrowserName}"
              set frontmost to true
              try
                perform action "AXRaise" of window ${targetWindow}
              end try
            end tell
          end tell
        `
      } else {
        script = `tell application "${safeBrowserName}" to activate`
      }
  }

  return new Promise((resolve) => {
    // Use execFile with -e to avoid shell escaping issues with complex scripts
    execFile('osascript', ['-e', script], { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        safeError(`[TabFetcher] Activation error for ${browser}:`, error.message)
        // If searching failed, clear cache as tabs likely changed
        clearCache()
        resolve(false)
        return
      }

      const result = stdout ? stdout.trim() : ''
      if (result === 'failed') {
        safeError(`[TabFetcher] Could not find tab in ${browser}`)
        clearCache()
        resolve(false)
      } else {
        safeLog(`[TabFetcher] Successfully activated ${browser} tab`)
        resolve(true)
      }
    })
  })
}

/**
 * Activate a tab with a refresh+resolve retry on failure
 * @param {Object} tab - Tab object with browser, windowIndex, tabIndex, url/title
 * @returns {Promise<boolean>} Success status
 */
async function activateTabWithRetry(tab, options = {}) {
  const initialSuccess = await activateTab(tab)
  if (initialSuccess) return true

  const resolved = await resolveTabFromFreshFetch(tab, options)
  if (!resolved) return false

  const retryTab = {
    ...tab,
    browser: resolved.browser,
    windowIndex: resolved.windowIndex,
    tabIndex: resolved.tabIndex,
    url: resolved.url || tab.url,
    title: resolved.title || tab.title,
  }

  return activateTab(retryTab)
}

module.exports = {
  getAllTabs,
  activateTab,
  activateTabWithRetry,
  prewarmTabs: () => {
    // Start fetching in background without waiting
    getAllTabs().catch(err => safeError('[TabFetcher] Pre-warm error:', err))
  },
  clearCache,
  resolveTabFromFreshFetch,
  findMatchingTab,
  isAppSelected,
  // Export new universal window functionality
  getSystemWindows: require('./windowIndexer').getSystemWindows,
  getEnhancedApps: require('./windowIndexer').getEnhancedApps,
  supportsTabs,
  supportsDocuments,
  getAppCapability,
  APP_CAPABILITIES,
}
