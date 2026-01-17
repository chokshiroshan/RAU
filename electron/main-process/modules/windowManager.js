/**
 * Window Manager Module
 * Handles main window creation, positioning, and lifecycle
 */

const { app, BrowserWindow, screen } = require('electron')
const path = require('path')
const logger = require('../logger')
const { WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_TOP_OFFSET } = require('../constants')

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
  const { width } = activeDisplay.workAreaSize

  const x = Math.round(activeDisplay.workArea.x + (width - WINDOW_WIDTH) / 2)
  const y = Math.round(activeDisplay.workArea.y + WINDOW_TOP_OFFSET)

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
    const { width } = activeDisplay.workAreaSize

    const x = Math.round(activeDisplay.workArea.x + (width - WINDOW_WIDTH) / 2)
    const y = Math.round(activeDisplay.workArea.y + WINDOW_TOP_OFFSET)

    // Transparent frameless window - content floats with its own background
    mainWindow = new BrowserWindow({
      width: WINDOW_WIDTH,
      height: WINDOW_HEIGHT,
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
      if (onWindowReady) onWindowReady(mainWindow)
      resolve(mainWindow)
    })

    // Handle load errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      logger.error('[Window] Failed to load:', errorCode, errorDescription)
      reject(new Error(`Failed to load: ${errorDescription}`))
    })

    // Hide window when it loses focus
    let blurTimeout
    mainWindow.on('blur', () => {
      if (blurTimeout) clearTimeout(blurTimeout)
      blurTimeout = setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
          mainWindow.hide()
        }
      }, 100)
    })

    // Clean up on close
    mainWindow.on('closed', () => {
      logger.log('[Window] Closed, cleaning up')
      mainWindow = null
      windowReadyPromise = null
    })
  })

  return windowReadyPromise
}

/**
 * Toggle window visibility (show/hide)
 * Uses mutex to prevent race condition from rapid hotkey presses
 */
async function toggleWindow() {
  // Prevent concurrent toggle attempts
  if (toggleInProgress) {
    logger.log('[Toggle] Already in progress, ignoring')
    return
  }

  toggleInProgress = true

  try {
    // If window doesn't exist or was destroyed, create it
    if (!mainWindow || mainWindow.isDestroyed()) {
      logger.log('[Toggle] Creating new window')
      await createWindow()

      if (mainWindow && !mainWindow.isDestroyed()) {
        repositionWindow()
        mainWindow.show()
        app.focus({ steal: true })
        setTimeout(() => repositionWindow(), 0)

        if (mainWindow.webContents && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('window-shown')
        }
      }
      return
    }

    // Toggle visibility
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      repositionWindow()
      mainWindow.show()
      app.focus({ steal: true })
      setTimeout(() => repositionWindow(), 0)

      if (mainWindow.webContents && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('window-shown')
      }
    }
  } catch (error) {
    logger.error('[Toggle] Error:', error)
    mainWindow = null
    windowReadyPromise = null
  } finally {
    toggleInProgress = false
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
