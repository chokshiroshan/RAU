/**
 * Action-related IPC handlers
 * Handles opening apps, files, tabs, and URLs
 */

const path = require('path')
const fs = require('fs')
const { shell } = require('electron')
const { execFile } = require('child_process')
const {
  validateFilePath,
  validateAppPath,
  validateUrlProtocol,
} = require('../../../shared/validation/validators')
const { extractIconWithTimeout } = require('../services/iconExtractor')
const { getAllTabs, activateTab } = require('../../../src/services/tabFetcher')
const { getSettings, saveSettings } = require('../config')
const logger = require('../logger')

// Cache state (will be moved to service layer in next refactor)
let appsCache = null
let appsCacheTimestamp = 0
const iconCache = new Map()
let mainWindow = null

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
    return await getAllTabs()
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
    const success = await activateTab(tab)
    if (success && mainWindow && !mainWindow.isDestroyed()) {
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
    execFile('mdfind', ['kMDItemKind == "Application"'], { timeout: 1000 }, (error, stdout) => {
      if (error) {
        logger.error('[ActionHandler] mdfind error for apps:', error)
        // Return stale cache if available, otherwise empty
        resolve(appsCache || [])
        return
      }

      const appPaths = stdout
        .split('\n')
        .filter(line => line.trim() !== '')

      const apps = appPaths.map(appPath => ({
        name: path.basename(appPath, '.app'),
        path: appPath,
        icon: null,
      }))

      // Update cache
      appsCache = apps
      appsCacheTimestamp = now
      logger.log(`[ActionHandler] Cached ${apps.length} applications`)
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

module.exports = {
  setMainWindow,
  openFile,
  getTabs,
  activateTab: activateTabHandler,
  getApps,
  getAppIcon,
  openApp,
  openUrl,
  getSettings: getSettingsHandler,
  saveSettings: saveSettingsHandler,
}
