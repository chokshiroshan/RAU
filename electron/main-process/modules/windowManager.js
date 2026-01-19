/**
 * Window Manager Module
 * Handles main window creation, positioning, and lifecycle
 */

const { app, BrowserWindow, screen } = require('electron')
const path = require('path')
const logger = require('../logger')
const { WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_HEIGHT_COLLAPSED, WINDOW_TOP_OFFSET } = require('../constants')
const { getSettings } = require('../config')

// Window state
let mainWindow = null
let windowReadyPromise = null
let toggleInProgress = false

// Callback for registering handlers after window creation
let onWindowReady = null

/**
 * Set callback for when window is ready (used to register IPC handlers)
 * @param {Function} callback - Function to call with window reference
 */
function setOnWindowReady(callback) {
  onWindowReady = callback
}

/**
 * Get the main window reference
 * @returns {BrowserWindow|null}
 */
function getMainWindow() {
  return mainWindow
}

/**
 * Reposition window to the active screen (where cursor is)
 * @returns {boolean} True if repositioning succeeded
 */
function repositionWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false
  }

  const cursorPosition = screen.getCursorScreenPoint()
  const activeDisplay = screen.getDisplayNearestPoint(cursorPosition)
  const { width, height } = activeDisplay.workAreaSize
  const { x: displayX, y: displayY } = activeDisplay.workArea
  const { height: screenHeight, y: screenY } = activeDisplay.bounds

  // Get user preference for window position
  const settings = getSettings()
  const position = settings.windowPosition || 'center'
  
  // Estimate expanded height for centering calculations
  const EXPANDED_HEIGHT_ESTIMATE = 700

  let x, y

  if (position === 'top') {
    // Spotlight style: Top center (15% down)
    x = Math.round(displayX + (width - WINDOW_WIDTH) / 2)
    y = Math.round(displayY + (height * 0.15))
  } else {
    // Default: Center screen (visually pleasing center based on expanded height)
    x = Math.round(displayX + (width - WINDOW_WIDTH) / 2)
    y = Math.round(screenY + (screenHeight - EXPANDED_HEIGHT_ESTIMATE) / 2)
  }

  mainWindow.setPosition(x, y)
  return true
}

/**
 * Create the main launcher window
 * @returns {Promise<BrowserWindow>} Promise that resolves when window is ready
 */
function createWindow() {
  // If already creating, return existing promise
  if (windowReadyPromise) {
    return windowReadyPromise
  }

  windowReadyPromise = new Promise((resolve, reject) => {
    // Get cursor position to determine which screen to show on
    const cursorPosition = screen.getCursorScreenPoint()
    const activeDisplay = screen.getDisplayNearestPoint(cursorPosition)
    const { width, height } = activeDisplay.workAreaSize
    const { x: displayX, y: displayY } = activeDisplay.workArea
    const { height: screenHeight, y: screenY } = activeDisplay.bounds

    // Get user preference for window position
    const settings = getSettings()
    const position = settings.windowPosition || 'center'
    
    // Estimate expanded height for centering calculations
    const EXPANDED_HEIGHT_ESTIMATE = 850

    let x, y

    if (position === 'top') {
      // Spotlight style: Top center (15% down)
      x = Math.round(displayX + (width - WINDOW_WIDTH) / 2)
      y = Math.round(displayY + (height * 0.15))
    } else {
      // Default: Center screen (visually pleasing center based on expanded height)
      // Use screen bounds (ignoring dock/menu bar) for true visual center
      x = Math.round(displayX + (width - WINDOW_WIDTH) / 2)
      y = Math.round(screenY + (screenHeight - EXPANDED_HEIGHT_ESTIMATE) / 2)
    }

    // Transparent frameless window - content floats with its own background
    mainWindow = new BrowserWindow({
      width: WINDOW_WIDTH,
      height: WINDOW_HEIGHT_COLLAPSED,
      x,
      y,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      show: false,
      fullscreenable: false,
      acceptFirstMouse: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
      },
    })

    // macOS-specific: appear on all desktop spaces
    if (process.platform === 'darwin') {
      mainWindow.setFullScreenable(false)
      mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

      try {
        mainWindow.setAlwaysOnTop(true, 'pop-up-menu')
      } catch (e) {
        mainWindow.setAlwaysOnTop(true, 'floating')
      }
    }

    // Surface renderer errors in main process logs
    mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      logger.log(`[Renderer][${level}] ${message} (${sourceId}:${line})`)
    })

    // Handle render process crash - recreate window
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
      logger.error('[Renderer] Process crashed:', details)
      mainWindow = null
      windowReadyPromise = null
      setTimeout(() => {
        createWindow().then(win => {
          if (onWindowReady) onWindowReady(win)
        }).catch(err => logger.error('Failed to recreate window:', err))
      }, 1000)
    })

    if (onWindowReady) onWindowReady(mainWindow)

    // Load the app
    const htmlPath = path.join(__dirname, '../../..', 'dist/index.html')
    mainWindow.loadFile(htmlPath).then(() => {
      logger.log('[Window] Content loaded')
    }).catch(err => {
      logger.error('[Window] Failed to load:', err)
      reject(err)
    })

    // Resolve promise when window is ready to show
    mainWindow.once('ready-to-show', () => {
      logger.log('[Window] Ready to show')
      resolve(mainWindow)
    })

    // Handle load errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      logger.error('[Window] Failed to load:', errorCode, errorDescription)
      reject(new Error(`Failed to load: ${errorDescription}`))
    })

    // Hide window when it loses focus (but not if settings window is open)
    // 300ms delay prevents race condition with focus transfer on hotkey activation
    let blurTimeout
    const settingsWindow = require('./settingsWindow')
    const windowHandler = require('../handlers/windowHandler')
    mainWindow.on('blur', () => {
      logger.log('[Window] BLUR event fired')
      if (blurTimeout) {
        logger.log('[Window] BLUR - clearing existing timeout')
        clearTimeout(blurTimeout)
      }
      blurTimeout = setTimeout(() => {
        logger.log('[Window] BLUR timeout fired (300ms elapsed)')
        // Don't hide if user has a query entered (still searching)
        if (windowHandler.getHasQuery()) {
          logger.log('[Window] BLUR - user has query, NOT hiding')
          return
        }
        // Don't hide if search is in progress
        if (windowHandler.isSearchActive()) {
          logger.log('[Window] BLUR - search active, NOT hiding')
          return
        }
        // Don't hide if settings window is open and focused
        const sw = settingsWindow.getSettingsWindow()
        if (sw && !sw.isDestroyed() && sw.isFocused()) {
          logger.log('[Window] BLUR - settings window focused, NOT hiding')
          return
        }
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
          logger.log('[Window] BLUR - hiding window now')
          mainWindow.hide()
        } else {
          logger.log('[Window] BLUR - window already hidden/destroyed, skipping hide')
        }
      }, 300)
    })
    
    mainWindow.on('focus', () => {
      logger.log('[Window] FOCUS event fired')
      if (blurTimeout) {
        logger.log('[Window] FOCUS - canceling blur timeout')
        clearTimeout(blurTimeout)
        blurTimeout = null
      }
    })

    // Clean up on close
    mainWindow.on('closed', () => {
      logger.log('[Window] Closed, cleaning up')
      mainWindow = null
      windowReadyPromise = null
    })

    // Enable dev tools in development
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  })

  return windowReadyPromise
}

/**
 * Toggle window visibility (show/hide)
 * Uses mutex to prevent race condition from rapid hotkey presses
 */
async function toggleWindow() {
  logger.log('[Toggle] toggleWindow() called')
  // Prevent concurrent toggle attempts
  if (toggleInProgress) {
    logger.log('[Toggle] Already in progress, ignoring')
    return
  }

  toggleInProgress = true
  logger.log('[Toggle] Starting toggle operation')

  try {
    // If window doesn't exist or was destroyed, create it
    if (!mainWindow || mainWindow.isDestroyed()) {
      logger.log('[Toggle] Window null/destroyed, creating new window')
      await createWindow()

      if (mainWindow && !mainWindow.isDestroyed()) {
        logger.log('[Toggle] New window created, showing')
        repositionWindow()
        mainWindow.show()
        mainWindow.focus()
        app.focus({ steal: true })
        setTimeout(() => repositionWindow(), 0)

        if (mainWindow.webContents && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('window-shown')
          logger.log('[Toggle] Sent window-shown to renderer')
        }
      }
      return
    }

    // Toggle visibility
    const wasVisible = mainWindow.isVisible()
    logger.log(`[Toggle] Window exists, wasVisible=${wasVisible}`)
    
    if (wasVisible) {
      logger.log('[Toggle] HIDING window via toggle')
      mainWindow.hide()
    } else {
      logger.log('[Toggle] SHOWING window via toggle')
      repositionWindow()
      mainWindow.show()
      mainWindow.focus()
      app.focus({ steal: true })
      setTimeout(() => repositionWindow(), 0)

      if (mainWindow.webContents && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('window-shown')
        logger.log('[Toggle] Sent window-shown to renderer')
      }
    }
  } catch (error) {
    logger.error('[Toggle] Error:', error)
    mainWindow = null
    windowReadyPromise = null
  } finally {
    toggleInProgress = false
    logger.log('[Toggle] Toggle operation complete')
  }
}

/**
 * Set up display change listeners
 */
function setupDisplayListeners() {
  screen.on('display-metrics-changed', () => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      repositionWindow()
    }
  })
  screen.on('display-added', () => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      repositionWindow()
    }
  })
  screen.on('display-removed', () => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      repositionWindow()
    }
  })
}

module.exports = {
  createWindow,
  getMainWindow,
  repositionWindow,
  toggleWindow,
  setOnWindowReady,
  setupDisplayListeners,
}
