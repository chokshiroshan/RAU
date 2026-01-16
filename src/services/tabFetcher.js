const { execFile } = require('child_process')
const path = require('path')
const fs = require('fs')

// Cache configuration - 10 seconds cache for faster repeated searches
const CACHE_DURATION = 10000 // 10 seconds (since fetching 200+ tabs takes time)
let tabCache = null
let cacheTimestamp = 0
let pendingFetch = null // Mutex to prevent concurrent fetches

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

function safeLog(...args) {
  if (stdoutWritable.value) {
    try {
      console.log(...args)
    } catch {
      stdoutWritable.value = false
    }
  }
}

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
 * Get certain windows from ALL visible applications using System Events
 * This catches windows that aren't browser tabs (Comet, Claude, VSCode, etc.)
 * @returns {Promise<Array>} Array of window objects
 */
async function getUniversalWindows() {
  const scriptPath = path.join(__dirname, '../scripts/universal-windows.applescript')

  return new Promise((resolve) => {
    execFile('osascript', [scriptPath], { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        safeError('[TabFetcher] Universal windows error:', error.message)
        resolve([])
        return
      }

      const output = stdout.trim()
      if (!output) {
        resolve([])
        return
      }

      // Parse output: appName|||windowTitle|||windowIndex;;;appName|||windowTitle|||windowIndex
      const windows = []
      const entries = output.split(';;;')

      entries.forEach(entry => {
        const parts = entry.split('|||')
        if (parts.length === 3) {
          const [appName, windowTitle, windowIndex] = parts
          // Skip if already covered by browser tabs (exclude Comet since its script times out with many tabs)
          // Also exclude Terminal since we fetch it explicitly now
          const browserApps = ['Safari', 'Google Chrome', 'Brave Browser', 'Arc', 'Terminal']
          if (!browserApps.includes(appName)) {
            windows.push({
              title: windowTitle,
              name: windowTitle,
              browser: appName,  // Use browser field for app name for consistency
              type: 'window',
              windowIndex: parseInt(windowIndex, 10),
              tabIndex: 1,
            })
          }
        }
      })

      safeLog(`[TabFetcher] Universal windows: found ${windows.length} windows from other apps`)
      resolve(windows)
    })
  })
}

/**
 * Refresh tabs from all sources and update cache
 * @returns {Promise<Array>}
 */
async function refreshTabs() {
  // If already fetching, return the existing promise to prevent stampedes
  if (pendingFetch) return pendingFetch

  pendingFetch = (async () => {
    try {
      // Fetch tabs from all browsers AND universal windows in parallel
      const [safariTabs, chromeTabs, braveTabs, cometTabs, arcTabs, terminalTabs, universalWindows] = await Promise.all([
        getSafariTabs(),
        getChromeTabs(),
        getBraveTabs(),
        getCometTabs(),
        getArcTabs(),
        getTerminalTabs(),
        getUniversalWindows(),
      ])

      // Combine all tabs and windows
      const allTabs = [...safariTabs, ...chromeTabs, ...braveTabs, ...cometTabs, ...arcTabs, ...terminalTabs, ...universalWindows]

      // Update cache
      tabCache = allTabs
      cacheTimestamp = Date.now()
      safeLog(`[TabFetcher] Cache updated: ${allTabs.length} items`)

      return allTabs
    } catch (error) {
      safeError('[TabFetcher] Error fetching tabs:', error)
      // On error, return empty but don't clear old cache (better to show stale than nothing)
      return []
    } finally {
      // Clear the pending promise so future calls can start fresh
      pendingFetch = null
    }
  })()

  return pendingFetch
}

/**
 * Get all tabs from all browsers with Stale-While-Revalidate caching
 * Returns cache INSTANTLY if available, then refreshes in background
 * @returns {Promise<Array>} Array of all tabs from all browsers
 */
async function getAllTabs() {
  const now = Date.now()

  // SWR: Return cached results INSTANTLY if they exist
  if (tabCache && tabCache.length > 0) {
    // If cache is stale, trigger background refresh
    if ((now - cacheTimestamp) > CACHE_DURATION) {
      if (!pendingFetch) {
        safeLog('[TabFetcher] Cache stale, triggering background refresh')
        refreshTabs().catch(err => safeError('[TabFetcher] Bg refresh error:', err))
      }
    }
    safeLog('[TabFetcher] Returning cached tabs (instant)')
    return tabCache
  }

  // No cache available? Must wait for fetch
  if (pendingFetch) {
    return pendingFetch
  }

  safeLog('[TabFetcher] No cache, fetching synchronously...')
  return refreshTabs()
}

/**
 * Clear the tab cache (useful for testing or manual refresh)
 */
function clearCache() {
  tabCache = null
  cacheTimestamp = 0
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
      script = `tell application "${safeBrowserName}" to activate`
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

module.exports = {
  getAllTabs,
  activateTab,
  prewarmTabs: () => {
    // Start fetching in background without waiting
    getAllTabs().catch(err => safeError('[TabFetcher] Pre-warm error:', err))
  },
  clearCache,
}
