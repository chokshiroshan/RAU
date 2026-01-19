/**
 * Action-related IPC handlers
 * Handles opening apps, files, tabs, and URLs
 */

const path = require('path')
const fs = require('fs')
const { shell } = require('electron')
const { execFile } = require('child_process')
const { MDFIND_TIMEOUT_MS } = require('../constants')
const {
  validateFilePath,
  validateAppPath,
  validateUrlProtocol,
  sanitizeMdfindQuery,
} = require('../../../shared/validation/validators')
const { extractIconWithTimeout } = require('../services/iconExtractor')
const { getAllTabs, activateTabWithRetry } = require('../../../src/services/tabFetcher')
const { getSettings, saveSettings } = require('../config')
const logger = require('../logger')

// Cache state (will be moved to service layer in next refactor)
let appsCache = null
let appsCacheTimestamp = 0
const iconCache = new Map()
let mainWindow = null

/**
 * Check if an app is runnable (exclude non-runnable system services)
 * @param {string} appPath - Path to the app bundle
 * @returns {boolean} True if the app is runnable
 */
function isRunnableApp(appPath) {
  // Specific important system apps to include (even in CoreServices)
  const systemAppsToInclude = [
    'Finder.app',
    'System Preferences.app',
    'System Settings.app',
    'Activity Monitor.app',
    'Terminal.app',
    'Console.app',
    'Disk Utility.app',
    'Safari.app',
    'Mail.app',
    'Calendar.app',
    'Contacts.app',
    'Notes.app',
    'Reminders.app',
    'Photos.app',
    'Music.app',
    'TV.app',
    'Podcasts.app',
    'FaceTime.app',
    'Messages.app',
    'Maps.app',
    'Weather.app',
    'Stocks.app',
    'Home.app',
    'News.app',
    'Voice Memos.app',
    'Calculator.app',
    'Preview.app',
    'TextEdit.app',
    'QuickTime Player.app',
    'Image Capture.app',
    'ColorSync Utility.app',
    'Digital Color Meter.app',
    'Grapher.app',
    'Keychain Access.app',
    'Script Editor.app',
    'System Information.app',
    'AirPort Utility.app',
    'Bluetooth File Exchange.app',
    'Migration Assistant.app',
    'Boot Camp Assistant.app',
  ]

  // Check if this is a specific system app we want to include
  for (const app of systemAppsToInclude) {
    if (appPath.includes('/' + app)) {
      return true
    }
  }

  const appName = path.basename(appPath, '.app').toLowerCase()
  const excludeKeywords = [
    'helper', 'service', 'daemon', 'agent', 'plugin', 'updater',
    'installer', 'uninstaller', 'crashreporter', 'renderer', 'gpu process'
  ]

  const matchedKeyword = excludeKeywords.find(keyword => appName.includes(keyword))
  if (matchedKeyword) {
    logger.log(`[ActionHandler] Filtered out: "${appName}" (matched: ${matchedKeyword})`)
    return false
  }

  // Exclude apps nested inside other app bundles (Helpers, Frameworks, etc.)
  if (appPath.match(/\.app\/Contents\//)) {
    return false
  }

  const excludePatterns = [
    '/System/Library/CoreServices/',
    '/System/Library/PrivateFrameworks/',
    '/System/Library/Services/',
    '/System/Library/Assistant/',
    '/usr/libexec/',
    '/Library/Application Support/',
    '/Library/Printers/',
    '/Library/QuickLook/',
    '/Library/Spotlight/',
    '/Library/Caches/',
    '/Library/Frameworks/',
  ]

  // Include patterns for legitimate apps
  const includePatterns = [
    '/Applications/',
    '/System/Applications/',
    '/Users/',
  ]

  // Check if path matches any exclude pattern
  for (const pattern of excludePatterns) {
    if (appPath.includes(pattern)) {
      return false
    }
  }

  // Check if path matches any include pattern
  for (const pattern of includePatterns) {
    if (appPath.includes(pattern)) {
      return true
    }
  }

  // Default to false for unknown locations
  return false
}

/**
 * Set the main window reference
 */
function setMainWindow(window) {
  mainWindow = window
}

/**
 * Open file with default application
 */
async function openFile(_event, filePath) {
  // Validate file path
  const validation = validateFilePath(filePath)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const validatedPath = validation.value

  // Check if the file exists
  if (!fs.existsSync(validatedPath)) {
    return { success: false, error: 'File not found' }
  }

  return new Promise((resolve) => {
    execFile('open', [validatedPath], { timeout: 5000 }, (error) => {
      if (error) {
        logger.error('[ActionHandler] Error opening file:', error)
        if (error.killed) {
          resolve({ success: false, error: 'Timed out opening file' })
        } else {
          resolve({ success: false, error: error.message })
        }
      } else {
        if (mainWindow && !mainWindow.isDestroyed()) {
          logger.log('[ActionHandler] HIDING window after opening file:', validatedPath)
          mainWindow.hide()
        }
        resolve({ success: true })
      }
    })
  })
}

/**
 * Get all tabs from all browsers
 */
async function getTabs() {
  try {
    const settings = getSettings()
    return await getAllTabs({ selectedApps: settings.selectedApps })
  } catch (error) {
    logger.error('[ActionHandler] Error getting tabs:', error)
    return []
  }
}

/**
 * Activate a specific tab
 */
async function activateTabHandler(_event, tab) {
  try {
    const settings = getSettings()
    const success = await activateTabWithRetry(tab, { selectedApps: settings.selectedApps })
    if (success && mainWindow && !mainWindow.isDestroyed()) {
      logger.log('[ActionHandler] HIDING window after activating tab:', tab.title || tab.name)
      mainWindow.hide()
    }
    return { success }
  } catch (error) {
    logger.error('[ActionHandler] Error activating tab:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all applications (with cache)
 */
async function getApps() {
  const now = Date.now()
  const APPS_CACHE_TTL_MS = 600000 // 10 minutes

  // Return cached if fresh
  if (appsCache && (now - appsCacheTimestamp) < APPS_CACHE_TTL_MS) {
    logger.log(`[ActionHandler] Returning cached apps: ${appsCache.length}`)
    return appsCache
  }

  // Fetch fresh apps
  return new Promise((resolve) => {
    execFile('mdfind', ['kMDItemKind == "Application"'], { timeout: MDFIND_TIMEOUT_MS }, (error, stdout) => {
      if (error) {
        if (error.signal === 'SIGTERM' && error.killed) {
          logger.warn(`[ActionHandler] mdfind timed out for apps (> ${MDFIND_TIMEOUT_MS}ms)`)
        } else {
          logger.error('[ActionHandler] mdfind error for apps:', error)
        }
        // Return stale cache if available, otherwise empty
        resolve(appsCache || [])
        return
      }

      const appPaths = stdout
        .split('\n')
        .filter(line => line.trim() !== '')

      // Filter out non-runnable system apps
      const runnableAppPaths = appPaths.filter(appPath => isRunnableApp(appPath))
      const filteredCount = appPaths.length - runnableAppPaths.length

      const apps = runnableAppPaths.map(appPath => ({
        name: path.basename(appPath, '.app'),
        path: appPath,
        icon: null,
      }))

      // Update cache
      appsCache = apps
      appsCacheTimestamp = now
      logger.log(`[ActionHandler] Cached ${apps.length} applications (filtered out ${filteredCount} non-runnable apps)`)
      resolve(apps)
    })
  })
}

/**
 * Get app icon (with caching)
 */
async function getAppIcon(_event, appPath) {
  // Validate app path
  const validation = validateAppPath(appPath)
  if (!validation.valid) {
    return null
  }

  const validatedPath = validation.value

  if (iconCache.has(validatedPath)) {
    return iconCache.get(validatedPath)
  }

  try {
    const icon = await extractIconWithTimeout(validatedPath, 10000)
    if (icon) {
      // LRU eviction
      if (iconCache.size >= 100) {
        const firstKey = iconCache.keys().next().value
        iconCache.delete(firstKey)
      }
      iconCache.set(validatedPath, icon)
    }
    return icon || null
  } catch (error) {
    logger.error('[ActionHandler] Error extracting icon:', error)
    return null
  }
}

/**
 * Get app icon by name (searches for app path then extracts icon)
 */
async function getAppIconByName(_event, appName) {
  if (!appName || typeof appName !== 'string') {
    return null
  }

  // First, try to find the app path from the cached apps
  if (appsCache) {
    const app = appsCache.find(a =>
      a.name.toLowerCase() === appName.toLowerCase() ||
      a.path.toLowerCase().includes(appName.toLowerCase() + '.app')
    )
    if (app) {
      return await getAppIcon(null, app.path)
    }
  }

  // If not in cache, search for the app
  return new Promise((resolve) => {
    const searchName = sanitizeMdfindQuery(appName.replace(/\.app$/, ''))
    execFile('mdfind', [`kMDItemKind == "Application" && kMDItemDisplayName == "${searchName}"`],
      { timeout: 2000 },
      (error, stdout) => {
        if (error || !stdout) {
          logger.log('[ActionHandler] App not found:', appName)
          resolve(null)
          return
        }

        const appPaths = stdout.split('\n').filter(line => line.trim() !== '')
        if (appPaths.length === 0) {
          resolve(null)
          return
        }

        const appPath = appPaths[0]
        resolve(getAppIcon(null, appPath))
      }
    )
  })
}

/**
 * Open application
 */
async function openApp(_event, appPath) {
  // Validate app path
  const validation = validateAppPath(appPath)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const validatedPath = validation.value

  // Check if the app bundle exists
  if (!fs.existsSync(validatedPath)) {
    return { success: false, error: 'Application not found' }
  }

  return new Promise((resolve) => {
    execFile('open', [validatedPath], { timeout: 5000 }, (error) => {
      if (error) {
        logger.error('[ActionHandler] Error opening app:', error)
        if (error.killed) {
          resolve({ success: false, error: 'Timed out opening application' })
        } else {
          resolve({ success: false, error: error.message })
        }
      } else {
        if (mainWindow && !mainWindow.isDestroyed()) {
          logger.log('[ActionHandler] HIDING window after opening app:', validatedPath)
          mainWindow.hide()
        }
        resolve({ success: true })
      }
    })
  })
}

/**
 * Open URL in default browser
 */
async function openUrl(_event, url) {
  // Validate URL protocol
  const validation = validateUrlProtocol(url)
  if (!validation.valid) {
    logger.warn('[ActionHandler] Blocked URL:', validation.error)
    return { success: false, error: validation.error }
  }

  try {
    await shell.openExternal(validation.value)
    if (mainWindow && !mainWindow.isDestroyed()) {
      logger.log('[ActionHandler] HIDING window after opening URL:', validation.value)
      mainWindow.hide()
    }
    return { success: true }
  } catch (error) {
    logger.error('[ActionHandler] Error opening URL:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get settings
 */
function getSettingsHandler() {
  return getSettings()
}

/**
 * Save settings
 */
function saveSettingsHandler(_event, settings) {
  return saveSettings(settings)
}

function clearAppsCache() {
  appsCache = null
  appsCacheTimestamp = 0
  logger.log('[ActionHandler] Apps cache cleared')
}

module.exports = {
  setMainWindow,
  openFile,
  getTabs,
  activateTab: activateTabHandler,
  getApps,
  getAppIcon,
  getAppIconByName,
  openApp,
  openUrl,
  getSettings: getSettingsHandler,
  saveSettings: saveSettingsHandler,
  clearAppsCache,
}
