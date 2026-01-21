const { execFile } = require('child_process')
const path = require('path')

const logger = require('../logger')

function safeLog(...args) {
  logger.log('[WindowIndexer]', ...args)
}

function safeWarn(...args) {
  logger.warn('[WindowIndexer]', ...args)
}

function safeError(...args) {
  logger.error('[WindowIndexer]', ...args)
}

const CACHE_CONFIG = {
  browsers: { duration: 10000, maxSize: 1000 },
  terminals: { duration: 5000, maxSize: 100 },
  editors: { duration: 30000, maxSize: 500 },
  productivity: { duration: 60000, maxSize: 200 },
  system: { duration: 120000, maxSize: 50 },
  universal: { duration: 15000, maxSize: 2000 },
}

const APP_CAPABILITIES = {
  'Safari': { category: 'browsers', tabs: true, documents: false, paths: true },
  'Google Chrome': { category: 'browsers', tabs: true, documents: false, paths: true },
  'Brave Browser': { category: 'browsers', tabs: true, documents: false, paths: true },
  'Arc': { category: 'browsers', tabs: true, documents: false, paths: true },
  'Comet': { category: 'browsers', tabs: true, documents: false, paths: true },

  'Terminal': { category: 'terminals', tabs: true, documents: false, paths: true },
  'iTerm2': { category: 'terminals', tabs: true, documents: false, paths: true },

  'VS Code': { category: 'editors', tabs: true, documents: true, paths: true },
  'Visual Studio Code': { category: 'editors', tabs: true, documents: true, paths: true },
  'Sublime Text': { category: 'editors', tabs: true, documents: true, paths: true },
  'TextEdit': { category: 'editors', tabs: false, documents: true, paths: true },

  'Pages': { category: 'productivity', tabs: false, documents: true, paths: true },
  'Keynote': { category: 'productivity', tabs: false, documents: true, paths: true },
  'Numbers': { category: 'productivity', tabs: false, documents: true, paths: true },
  'Preview': { category: 'productivity', tabs: true, documents: true, paths: true },

  'Finder': { category: 'system', tabs: true, documents: false, paths: true },
  'System Preferences': { category: 'system', tabs: false, documents: false, paths: false },
  'Activity Monitor': { category: 'system', tabs: false, documents: false, paths: false },
}

let windowCache = null
let cacheTimestamp = 0
let cacheKey = null
let pendingFetch = null
let lastPermissionError = null

function executeWindowDiscoveryScript() {
  return new Promise((resolve) => {
    const script = `
      const se = Application('System Events')
      const processes = se.applicationProcesses.whose({ backgroundOnly: false })
      const results = []
      for (let i = 0; i < processes.length; i++) {
        const p = processes[i]
        const appName = p.name()
        let pid = null
        try { pid = p.unixId() } catch (e) { pid = null }
        let windows = []
        try { windows = p.windows() } catch (e) { windows = [] }
        for (let j = 0; j < windows.length; j++) {
          const w = windows[j]
          let title = ''
          try { title = w.name() } catch (e) { title = '' }
          if (title && title.length > 0) {
            results.push({ appName, title, pid })
          }
        }
      }
      JSON.stringify(results)
    `

    execFile('osascript', ['-l', 'JavaScript', '-e', script], { timeout: 5000, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const message = error.message || ''
        if (message.includes('Not authorized') || message.includes('not allowed to send Apple events')) {
          lastPermissionError = message
          safeWarn('Accessibility/Automation permission missing for window discovery')
        } else {
          safeError('Window discovery error:', error.message)
        }
        resolve([])
        return
      }

      if (stderr) {
        safeWarn('Window discovery stderr:', stderr)
      }

      try {
        const parsed = JSON.parse(stdout || '[]')
        const windows = parsed
          .filter(entry => entry.appName && entry.title && entry.appName !== 'Window Server' && entry.appName !== 'loginwindow')
          .map((entry, index) => {
            const capability = getAppCapability(entry.appName)
            return {
              title: entry.title,
              appName: entry.appName,
              windowId: index + 1,
              pid: entry.pid || null,
              bounds: null,
              layer: 0,
              type: capability.tabs ? 'window' : 'window',
              category: capability.category,
              capability,
            }
          })

        lastPermissionError = null
        safeLog(`Discovered ${windows.length} windows from ${new Set(windows.map(w => w.appName)).size} apps`)
        resolve(windows)
      } catch (parseError) {
        safeError('Window discovery parse error:', parseError)
        resolve([])
      }
    })
  })
}

function getAppCategory(appName) {
  const capability = APP_CAPABILITIES[appName]
  return capability ? capability.category : 'universal'
}

function getAppCapability(appName) {
  return APP_CAPABILITIES[appName] || {
    category: 'universal',
    tabs: false,
    documents: false,
    paths: false
  }
}

function filterWindows(windows, selectedApps = []) {
  if (!Array.isArray(selectedApps) || selectedApps.length === 0) {
    return windows.filter(window => {
      return window.title &&
        window.title !== '' &&
        window.layer >= 0 &&
        !window.title.startsWith('Untitled') &&
        window.appName !== 'Window Server'
    })
  }

  const selectedSet = new Set(selectedApps.map(name => name.toLowerCase()))
  return windows.filter(window => {
    const appNameLower = window.appName.toLowerCase()
    if (selectedSet.has(appNameLower)) return true
    if (appNameLower === 'google chrome' && selectedSet.has('chrome')) return true
    if (appNameLower === 'brave browser' && selectedSet.has('brave')) return true
    if (appNameLower === 'visual studio code' && selectedSet.has('vs code')) return true
    return false
  })
}

async function getSystemWindows(options = {}) {
  const { selectedApps = [] } = options
  const selectionKey = buildSelectionKey(selectedApps)
  const now = Date.now()

  const cacheConfig = determineCacheConfig(selectedApps)

  if (windowCache &&
    windowCache.length > 0 &&
    cacheKey === selectionKey &&
    (now - cacheTimestamp) < cacheConfig.duration) {
    safeLog('Returning cached windows (instant)')
    return windowCache
  }

  if (pendingFetch && cacheKey === selectionKey) {
    return pendingFetch
  }

  pendingFetch = (async () => {
    try {
      safeLog('Discovering system windows...')
      const rawWindows = await executeWindowDiscoveryScript()

      const filteredWindows = filterWindows(rawWindows, selectedApps)
      const enhancedWindows = filteredWindows.map(window => ({
        ...window,
        capability: getAppCapability(window.appName),
        url: '',
        windowIndex: 1,
        tabIndex: 1,
        browser: window.appName,
        name: window.title,
      }))

      windowCache = enhancedWindows
      cacheTimestamp = now
      cacheKey = selectionKey

      safeLog(`Discovered ${enhancedWindows.length} windows from ${new Set(enhancedWindows.map(w => w.appName)).size} apps`)
      return enhancedWindows
    } catch (error) {
      safeError('Error discovering windows:', error)
      return windowCache || []
    } finally {
      pendingFetch = null
    }
  })()

  return pendingFetch
}

function determineCacheConfig(selectedApps) {
  if (!Array.isArray(selectedApps) || selectedApps.length === 0) {
    return CACHE_CONFIG.universal
  }

  let minDuration = CACHE_CONFIG.universal.duration
  selectedApps.forEach(appName => {
    const capability = APP_CAPABILITIES[appName]
    if (capability) {
      const config = CACHE_CONFIG[capability.category]
      if (config && config.duration < minDuration) {
        minDuration = config.duration
      }
    }
  })

  return { duration: minDuration, maxSize: CACHE_CONFIG.universal.maxSize }
}

function buildSelectionKey(selectedApps) {
  if (!Array.isArray(selectedApps) || selectedApps.length === 0) return 'all'
  return selectedApps
    .map(name => name.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|')
}

function clearCache() {
  windowCache = null
  cacheTimestamp = 0
  cacheKey = null
  safeLog('Cache cleared')
}

function getEnhancedApps() {
  return Object.keys(APP_CAPABILITIES).map(appName => ({
    name: appName,
    ...APP_CAPABILITIES[appName]
  }))
}

function supportsTabs(appName) {
  const capability = APP_CAPABILITIES[appName]
  return capability ? capability.tabs : false
}

function supportsDocuments(appName) {
  const capability = APP_CAPABILITIES[appName]
  return capability ? capability.documents : false
}

module.exports = {
  getSystemWindows,
  clearCache,
  getPermissionStatus: () => ({ granted: !lastPermissionError, error: lastPermissionError }),
  getEnhancedApps,
  supportsTabs,
  supportsDocuments,
  getAppCapability,
  getAppCategory,
  CACHE_CONFIG,
  APP_CAPABILITIES,
}
