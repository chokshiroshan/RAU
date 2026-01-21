/**
 * RAU - Main Process Entry Point
 *
 * A fast, elegant launcher for macOS.
 * This file serves as the coordinator for all main process modules.
 */

const { app, BrowserWindow } = require('electron')
const { execFile } = require('child_process')
const { prewarmTabs } = require('./main-process/services/tabFetcher')
const { getSettings } = require('./main-process/config')
let Sentry = null
try {
  Sentry = require('@sentry/electron/main')
} catch {
  Sentry = null
}
const logger = require('./main-process/logger')
const { registerHandlers } = require('./main-process/handlers')

// Import modules
const {
  windowManager,
  appMenu,
  hotkeyManager,
  settingsWindow,
  errorHandler,
} = require('./main-process/modules')

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================

/**
 * Wire up module dependencies (avoiding circular imports)
 */
function initializeModules() {
  // Window manager needs to notify handlers when window is ready
  windowManager.setOnWindowReady(registerHandlers)

  // App menu needs to know how to open settings
  appMenu.setOpenSettingsCallback(settingsWindow.openSettingsWindow)

  // Settings window needs access to main window
  settingsWindow.setGetMainWindowCallback(windowManager.getMainWindow)

  // Hotkey manager needs to know how to toggle window
  hotkeyManager.setToggleCallback(windowManager.toggleWindow)

  // Error handler needs recovery functions
  errorHandler.setCreateWindowCallback(windowManager.createWindow)
  errorHandler.setRegisterHandlersCallback(registerHandlers)
}

/**
 * Pre-warm the apps cache on startup for faster first search
 */
function preWarmAppsCache() {
  execFile('mdfind', ['kMDItemKind == "Application"'], { timeout: 1000 }, (error, stdout) => {
    if (error) {
      logger.error('[Cache] Failed to pre-warm apps cache:', error)
      return
    }

    const appPaths = stdout
      .split('\n')
      .filter(line => line.trim() !== '')

    logger.log(`[Cache] Pre-warmed ${appPaths.length} applications`)
  })
}

function initializeTelemetry() {
  const settings = getSettings()
  const dsn = process.env.SENTRY_DSN
  if (settings.telemetryEnabled && dsn && Sentry) {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    })
    logger.log('[Telemetry] Sentry initialized')
  }
}

// ============================================================================
// APP LIFECYCLE
// ============================================================================

app.whenReady().then(() => {
  logger.log('[App] RAU starting...')

  // macOS: Use regular policy so menu bar appears
  if (process.platform === 'darwin') {
    app.setActivationPolicy('regular')
    if (app.dock && typeof app.dock.hide === 'function') {
      app.dock.hide()
    }
  }

  // Initialize module dependencies
  initializeModules()

  // Initialize telemetry (opt-in)
  initializeTelemetry()

  // Set up global error handlers
  errorHandler.setupGlobalErrorHandlers()

  // Create the application menu
  appMenu.createAppMenu()

  // Create window (hidden) and register hotkey
  windowManager.createWindow().catch(err => logger.error('[App] Failed to create window:', err))
  hotkeyManager.registerHotkey()

  // Pre-warm caches for faster first search
  preWarmAppsCache()
  prewarmTabs()

  // Watch for display changes
  windowManager.setupDisplayListeners()
})

app.on('window-all-closed', () => {
  // On macOS, keep running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createWindow().catch(err => logger.error('[App] Failed to create window on activate:', err))
  }
})

app.on('will-quit', () => {
  hotkeyManager.unregisterAll()
})
