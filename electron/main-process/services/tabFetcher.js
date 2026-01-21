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

const logger = require('../logger')
const windowHandler = require('../handlers/windowHandler')

function safeLog(...args) {
  logger.log('[TabFetcher]', ...args)
}

function safeError(...args) {
  logger.error('[TabFetcher]', ...args)
}

function escapeAppleScriptString(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

function validatePositiveInt(value) {
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 1) return null
  return num
}

function getScriptsPath(...parts) {
  return path.join(__dirname, '../../..', 'src', 'scripts', ...parts)
}

function executeAppleScript(scriptPath) {
  return new Promise((resolve) => {
    execFile('osascript', [scriptPath], { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        safeError(`[TabFetcher] Script error for ${scriptPath}:`, error.message)
        if (stderr) safeError(`[TabFetcher] stderr: ${stderr}`)
        resolve([])
        return
      }

      if (stderr) {
        safeError(`[TabFetcher] Script stderr for ${scriptPath}: ${stderr}`)
        resolve([])
        return
      }

      try {
        const output = stdout.trim()
        if (!output) {
          resolve([])
          return
        }

        const tabEntries = output.split(',').map(s => s.trim())
        const tabs = []

        tabEntries.forEach(entry => {
          const parts = entry.split('|||').map(s => s.trim())
          if (parts.length === 4) {
            const title = parts[0]
            const url = parts[1]
            const windowIndex = parseInt(parts[2], 10)
            const tabIndex = parseInt(parts[3], 10)

            if (!isNaN(windowIndex) && !isNaN(tabIndex) && title && url) {
              tabs.push({ title, url, windowIndex, tabIndex })
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

async function getSafariTabs() {
  const scriptPath = getScriptsPath('safari.applescript')
  const tabs = await executeAppleScript(scriptPath)
  safeLog(`[TabFetcher] Safari: found ${tabs.length} tabs`)
  return tabs.map(tab => ({ ...tab, browser: 'Safari' }))
}

async function getChromeTabs() {
  const scriptPath = getScriptsPath('chrome.applescript')
  const tabs = await executeAppleScript(scriptPath)
  safeLog(`[TabFetcher] Chrome: found ${tabs.length} tabs`)
  return tabs.map(tab => ({ ...tab, browser: 'Chrome' }))
}

async function getBraveTabs() {
  const scriptPath = getScriptsPath('brave.applescript')
  const tabs = await executeAppleScript(scriptPath)
  safeLog(`[TabFetcher] Brave: found ${tabs.length} tabs`)
  return tabs.map(tab => ({ ...tab, browser: 'Brave' }))
}

async function getCometTabs() {
  const scriptPath = getScriptsPath('comet.applescript')
  const tabs = await executeAppleScript(scriptPath)
  safeLog(`[TabFetcher] Comet: found ${tabs.length} tabs`)
  return tabs.map(tab => ({ ...tab, browser: 'Comet' }))
}

async function getTerminalTabs() {
  const scriptPath = getScriptsPath('terminal.applescript')
  const tabs = await executeAppleScript(scriptPath)
  safeLog(`[TabFetcher] Terminal: found ${tabs.length} tabs`)
  return tabs.map(tab => ({ ...tab, browser: 'Terminal', type: 'tab' }))
}

async function getArcTabs() {
  const scriptPath = getScriptsPath('arc.applescript')
  const tabs = await executeAppleScript(scriptPath)
  safeLog(`[TabFetcher] Arc: found ${tabs.length} tabs`)
  return tabs.map(tab => ({ ...tab, browser: 'Arc' }))
}

const DEDICATED_BROWSER_APPS = new Set([
  'safari', 'google chrome', 'chrome', 'brave browser', 'brave', 'comet', 'arc', 'terminal'
])

async function getUniversalWindows(selectedApps = [], skipApps = new Set()) {
  try {
    const systemWindows = await getSystemWindows({ selectedApps })

    const enhancedWindows = await Promise.all(
      systemWindows.map(async (window) => {
        const normalizedAppName = normalizeAppName(window.appName)

        if (skipApps.has(normalizedAppName)) {
          return null
        }

        const capability = getAppCapability(window.appName)

        if (capability.tabs) {
          try {
            const detailedData = await getAppSpecificData(window.appName, selectedApps)
            if (detailedData && detailedData.length > 0) {
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

        return {
          ...window,
          type: capability.documents ? 'document' : 'window',
          capability,
        }
      })
    )

    const flattenedWindows = enhancedWindows.flat().filter(Boolean)

    safeLog(`[TabFetcher] Enhanced universal windows: found ${flattenedWindows.length} items from ${new Set(flattenedWindows.map(w => w.appName)).size} apps`)
    return flattenedWindows

  } catch (error) {
    safeError('[TabFetcher] Enhanced universal windows error:', error)
    return []
  }
}

async function getAppSpecificData(appName, selectedApps = []) {
  if (!isAppSelected(appName, selectedApps)) return []

  const capability = getAppCapability(appName)
  let scriptPath = null

  if (capability.category === 'browsers' || capability.category === 'terminals') {
    scriptPath = getDedicatedScriptPath(appName)
  } else if (capability.category === 'editors') {
    scriptPath = getScriptsPath('templates', 'ide-tabs.applescript')
  } else if (capability.category === 'productivity') {
    scriptPath = getScriptsPath('templates', 'document-app.applescript')
  }

  if (!scriptPath) return []
  return executeCustomScript(scriptPath, appName)
}

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
  return scriptName ? getScriptsPath(scriptName) : null
}

function executeCustomScript(scriptPath, appName) {
  return new Promise((resolve) => {
    fs.readFile(scriptPath, 'utf8', (readError, scriptTemplate) => {
      if (readError) {
        safeError(`[TabFetcher] Could not read script template ${scriptPath}:`, readError)
        resolve([])
        return
      }

      const script = scriptTemplate.replace(/APP_NAME/g, appName)
      const tempScriptPath = path.join(__dirname, `temp_${appName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.applescript`)
      fs.writeFile(tempScriptPath, script, 'utf8', (writeError) => {
        if (writeError) {
          safeError(`[TabFetcher] Could not write temp script:`, writeError)
          resolve([])
          return
        }

        execFile('osascript', [tempScriptPath], { timeout: 15000 }, (execError, stdout, stderr) => {
          fs.unlink(tempScriptPath, (unlinkErr) => {
            if (unlinkErr) safeLog(`[TabFetcher] Failed to cleanup temp file: ${tempScriptPath}`)
          })

          if (execError) {
            safeError(`[TabFetcher] Script execution error for ${appName}:`, execError.message)
            if (stderr) safeError(`[TabFetcher] stderr: ${stderr}`)
            resolve([])
            return
          }

          if (stderr) {
            safeError(`[TabFetcher] Script stderr for ${appName}: ${stderr}`)
            resolve([])
            return
          }

          try {
            const output = stdout.trim()
            if (!output) {
              resolve([])
              return
            }

            const entries = output.split(',').map(s => s.trim())
            const results = []

            entries.forEach(entry => {
              const parts = entry.split('|||').map(s => s.trim())
              if (parts.length >= 4) {
                const [title, url, windowIndex, tabIndex, returnedAppName] = parts
                if (!title || !windowIndex || !tabIndex) return
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

async function refreshTabs(options = {}) {
  const { selectedApps = [] } = options
  const selectionKey = buildSelectionKey(selectedApps)

  if (pendingFetch && pendingFetchKey === selectionKey) return pendingFetch

  pendingFetchKey = selectionKey
  pendingFetch = (async () => {
    try {
      const shouldFetch = (appName) => isAppSelected(appName, selectedApps)

      const dedicatedFetchedApps = new Set()
      if (shouldFetch('Safari')) dedicatedFetchedApps.add('safari')
      if (shouldFetch('Google Chrome') || shouldFetch('Chrome')) {
        dedicatedFetchedApps.add('google chrome')
        dedicatedFetchedApps.add('chrome')
      }
      if (shouldFetch('Brave Browser') || shouldFetch('Brave')) {
        dedicatedFetchedApps.add('brave browser')
        dedicatedFetchedApps.add('brave')
      }
      if (shouldFetch('Comet')) dedicatedFetchedApps.add('comet')
      if (shouldFetch('Arc')) dedicatedFetchedApps.add('arc')
      if (shouldFetch('Terminal')) dedicatedFetchedApps.add('terminal')

      const [safariTabs, chromeTabs, braveTabs, cometTabs, arcTabs, terminalTabs, enhancedWindows] = await Promise.all([
        shouldFetch('Safari') ? getSafariTabs() : Promise.resolve([]),
        shouldFetch('Google Chrome') || shouldFetch('Chrome') ? getChromeTabs() : Promise.resolve([]),
        shouldFetch('Brave Browser') || shouldFetch('Brave') ? getBraveTabs() : Promise.resolve([]),
        shouldFetch('Comet') ? getCometTabs() : Promise.resolve([]),
        shouldFetch('Arc') ? getArcTabs() : Promise.resolve([]),
        shouldFetch('Terminal') ? getTerminalTabs() : Promise.resolve([]),
        getUniversalWindows(selectedApps, dedicatedFetchedApps),
      ])

      const allTabs = [...safariTabs, ...chromeTabs, ...braveTabs, ...cometTabs, ...arcTabs, ...terminalTabs, ...enhancedWindows]
      const deduplicatedTabs = deduplicateTabs(allTabs)

      tabCache = deduplicatedTabs
      cacheTimestamp = Date.now()
      tabCacheKey = selectionKey
      safeLog(`[TabFetcher] Cache updated: ${deduplicatedTabs.length} items from ${new Set(deduplicatedTabs.map(t => t.browser || t.appName)).size} apps`)

      return deduplicatedTabs
    } catch (error) {
      safeError('[TabFetcher] Error fetching tabs:', error)
      return []
    } finally {
      pendingFetch = null
      pendingFetchKey = null
    }
  })()

  return pendingFetch
}

function deduplicateTabs(tabs) {
  const seen = new Set()
  const deduplicated = []

  for (const tab of tabs) {
    const appName = tab.browser || tab.appName
    const key = `${appName}|${tab.title}|${tab.windowIndex || 1}|${tab.tabIndex || 1}`
    if (!seen.has(key)) {
      seen.add(key)
      deduplicated.push(tab)
    }
  }

  return deduplicated
}

async function getAllTabs(options = {}) {
  const { selectedApps = [] } = options
  const selectionKey = buildSelectionKey(selectedApps)
  const now = Date.now()

  if (tabCache && tabCache.length > 0 && tabCacheKey === selectionKey) {
    if ((now - cacheTimestamp) > CACHE_DURATION) {
      const userHasQuery = windowHandler.getHasQuery()
      if (userHasQuery) {
        safeLog('[TabFetcher] Cache stale but user typing, skipping background refresh')
      } else if (!pendingFetch || pendingFetchKey !== selectionKey) {
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

  if (pendingFetch && pendingFetchKey === selectionKey) {
    return pendingFetch
  }

  safeLog('[TabFetcher] No cache, fetching synchronously...')
  return refreshTabs(options)
}

function clearCache() {
  tabCache = null
  cacheTimestamp = 0
  tabCacheKey = null
  clearWindowCache()
}

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

function normalizeAppName(name) {
  return String(name || '').trim().toLowerCase()
}

function buildSelectionKey(selectedApps) {
  if (!Array.isArray(selectedApps) || selectedApps.length === 0) return 'all'
  return selectedApps
    .map(normalizeAppName)
    .filter(Boolean)
    .sort()
    .join('|')
}

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

async function resolveTabFromFreshFetch(target, options = {}) {
  const tabs = await refreshTabs(options)
  return findMatchingTab(target, tabs)
}

async function activateTab(tab) {
  const { browser } = tab
  const windowIndex = validatePositiveInt(tab.windowIndex)
  const tabIndex = validatePositiveInt(tab.tabIndex)

  if (windowIndex === null || tabIndex === null) {
    safeError(`[TabFetcher] Invalid window/tab index: window=${tab.windowIndex}, tab=${tab.tabIndex}`)
    return false
  }

  safeLog(`[TabFetcher] Activating ${browser} tab: window ${windowIndex}, tab ${tabIndex}`)

  const targetUrl = escapeAppleScriptString(tab.url || '')
  let script = ''

  switch (browser) {
    case 'Safari':
      script = `
        tell application "Safari"
          activate
          delay 0.3
          try
            tell window ${windowIndex} to set current tab to tab ${tabIndex}
            set index of window ${windowIndex} to 1
            delay 0.1
          end try
        end tell
      `
      break
    case 'Terminal':
      script = `
        tell application "Terminal"
          activate
          delay 0.3
          try
            set selected tab of window ${windowIndex} to tab ${tabIndex}
            set index of window ${windowIndex} to 1
            delay 0.1
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
      let appName = 'Google Chrome'
      if (browser === 'Brave' || browser === 'Brave Browser') appName = 'Brave Browser'
      if (browser === 'Comet') appName = 'Comet'
      if (browser === 'Arc') appName = 'Arc'

      script = `
        tell application "${appName}"
          activate
          delay 0.3
          set targetUrl to "${targetUrl}"
          set found to false

          try
            if targetUrl is not "" then
               set t to tab ${tabIndex} of window ${windowIndex}
               if URL of t is targetUrl then
                  set active tab index of window ${windowIndex} to ${tabIndex}
                  set index of window ${windowIndex} to 1
                  delay 0.1
                  return "success"
               end if
            else
               set active tab index of window ${windowIndex} to ${tabIndex}
               set index of window ${windowIndex} to 1
               delay 0.1
               return "success"
            end if
          end try

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
                  delay 0.1
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
      const safeBrowserName = escapeAppleScriptString(browser)
      if (tab.type === 'window') {
        const targetWindow = validatePositiveInt(tab.windowIndex) || 1
        script = `
          tell application "${safeBrowserName}" to activate
          delay 0.3
          tell application "System Events"
            tell process "${safeBrowserName}"
              set frontmost to true
              try
                perform action "AXRaise" of window ${targetWindow}
              end try
            end tell
          end tell
          delay 0.1
        `
      } else {
        script = `
          tell application "${safeBrowserName}" to activate
          delay 0.3
        `
      }
  }

  return new Promise((resolve) => {
    execFile('osascript', ['-e', script], { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        safeError(`[TabFetcher] Activation error for ${browser}:`, error.message)
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
    getAllTabs().catch(err => safeError('[TabFetcher] Pre-warm error:', err))
  },
  clearCache,
  resolveTabFromFreshFetch,
  findMatchingTab,
  isAppSelected,
  getSystemWindows: require('./windowIndexer').getSystemWindows,
  getEnhancedApps: require('./windowIndexer').getEnhancedApps,
  supportsTabs,
  supportsDocuments,
  getAppCapability,
  APP_CAPABILITIES,
}
