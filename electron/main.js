const { app, BrowserWindow, globalShortcut, dialog, Menu } = require('electron')
const path = require('path')
const { execFile } = require('child_process')
const { prewarmTabs } = require('../src/services/tabFetcher')
const logger = require('./main-process/logger')
const { registerHandlers } = require('./main-process/handlers')

// ============================================================================
// WINDOW MANAGEMENT
// ============================================================================

let mainWindow = null
let settingsWindow = null
let windowReadyPromise = null // Promise that resolves when window is ready
let toggleInProgress = false // Mutex to prevent race conditions in toggleWindow

/**
 * Reposition window to the active screen (where cursor is)
 * @returns {boolean} True if repositioning succeeded
 */
function repositionWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false
  }

  const { screen } = require('electron')
  const cursorPosition = screen.getCursorScreenPoint()
  const activeDisplay = screen.getDisplayNearestPoint(cursorPosition)
  const { width } = activeDisplay.workAreaSize

  const WINDOW_WIDTH = 700
  const WINDOW_TOP_OFFSET = 80

  const x = Math.round(activeDisplay.workArea.x + (width - WINDOW_WIDTH) / 2)
  const y = Math.round(activeDisplay.workArea.y + WINDOW_TOP_OFFSET)

  mainWindow.setPosition(x, y)
  // Don't reset size - let dynamic resizing handle height
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

  const WINDOW_WIDTH = 700
  const WINDOW_HEIGHT = 700
  const WINDOW_TOP_OFFSET = 80

  windowReadyPromise = new Promise((resolve, reject) => {
    const { screen } = require('electron')

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
      transparent: true,  // Transparent window - content provides its own background
      hasShadow: false,   // Content adds shadow via CSS
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      show: false,
      fullscreenable: false,
      acceptFirstMouse: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'main-process/preload.js'),
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
      // Clean up and recreate
      mainWindow = null
      windowReadyPromise = null
      setTimeout(() => {
        createWindow().then(win => {
          registerHandlers(win)
        }).catch(err => logger.error('Failed to recreate window:', err))
      }, 1000)
    })

    // Load the app
    const htmlPath = path.join(__dirname, '../dist/index.html')
    mainWindow.loadFile(htmlPath).then(() => {
      logger.log('[Window] Content loaded')
    }).catch(err => {
      logger.error('[Window] Failed to load:', err)
      reject(err)
    })

    // Resolve promise when window is ready to show
    mainWindow.once('ready-to-show', () => {
      logger.log('[Window] Ready to show')
      // Register IPC handlers now that window is ready
      registerHandlers(mainWindow)
      resolve(mainWindow)
    })

    // Handle load errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      logger.error('[Window] Failed to load:', errorCode, errorDescription)
      reject(new Error(`Failed to load: ${errorDescription}`))
    })

    // Hide window when it loses focus (clicking outside, switching apps)
    // Add slight delay to prevent accidental closes during rapid interactions
    let blurTimeout
    mainWindow.on('blur', () => {
      if (blurTimeout) clearTimeout(blurTimeout)
      blurTimeout = setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
          mainWindow.hide()
        }
      }, 100) // 100ms delay - prevents accidental closes
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

      // Window is now ready, position and show
      if (mainWindow && !mainWindow.isDestroyed()) {
        repositionWindow()
        mainWindow.show()
        // Ensure the app becomes active so menu bar appears
        app.focus({ steal: true })

        // Some macOS setups adjust position after show; re-apply
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
      // Ensure the app becomes active so menu bar appears
      app.focus({ steal: true })
      setTimeout(() => repositionWindow(), 0)

      if (mainWindow.webContents && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('window-shown')
      }
    }
  } catch (error) {
    logger.error('[Toggle] Error:', error)
    // Clean state on error
    mainWindow = null
    windowReadyPromise = null
  } finally {
    toggleInProgress = false
  }
}

/**
 * Create and set the native macOS application menu
 */
function createAppMenu() {
  const template = [
    {
      label: 'ContextSearch',
      submenu: [
        {
          label: 'Preferences...',
          accelerator: 'Command+,',
          click: () => {
            openSettingsWindow()
          }
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About ContextSearch',
          click: () => {
            dialog.showMessageBox({
              title: 'About ContextSearch',
              message: 'ContextSearch',
              detail: 'A fast, elegant launcher for macOS\n\nVersion 1.0.0'
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

/**
 * Open the settings/preferences window
 */
function openSettingsWindow() {
  // Prevent multiple settings windows
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 450,
    height: 400,
    title: 'Preferences',
    resizable: false,
    fullscreenable: false,
    show: false,
    modal: false,
    parent: mainWindow || undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'main-process/preload.js')
    }
  })

  const htmlPath = path.join(__dirname, '../dist/settings.html')
  settingsWindow.loadFile(htmlPath)

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show()
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

// ============================================================================
// HOTKEY REGISTRATION
// ============================================================================

function registerHotkey() {
  const ret = globalShortcut.register('CommandOrControl+Shift+Space', () => {
    logger.log('[Hotkey] Cmd+Shift+Space triggered')
    toggleWindow().catch(err => logger.error('[Hotkey] Error:', err))
  })

  if (!ret) {
    logger.error('[Hotkey] Failed to register Cmd+Shift+Space')
  } else {
    logger.log('[Hotkey] Registered: Cmd+Shift+Space')
  }
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
    // Cache is now managed by actionHandler, this just triggers population
  })
}

// ============================================================================
// APP LIFECYCLE
// ============================================================================

app.whenReady().then(() => {
  logger.log('[App] ContextSearch starting...')

  // macOS: Use regular policy so menu bar appears
  // 'accessory' policy hides the menu bar
  if (process.platform === 'darwin') {
    app.setActivationPolicy('regular')
    if (app.dock && typeof app.dock.hide === 'function') {
      app.dock.hide()
    }
  }

  // Create the application menu
  createAppMenu()

  // Create window (hidden) and register hotkey
  createWindow().catch(err => logger.error('[App] Failed to create window:', err))
  registerHotkey()

  // Pre-warm apps cache in background for faster first search
  preWarmAppsCache()
  // Pre-warm tabs cache (especially important for users with many tabs)
  prewarmTabs()

  // Watch for display changes
  const { screen } = require('electron')
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
})

app.on('window-all-closed', () => {
  // On macOS, keep running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch(err => logger.error('[App] Failed to create window on activate:', err))
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Show error dialog and attempt graceful recovery
function handleFatalError(type, error) {
  logger.error(`[FATAL] ${type}:`, error)

  // Show user-facing dialog
  dialog.showErrorBox(
    'ContextSearch Error',
    `An unexpected error occurred:\n\n${error.message}\n\nThe app will attempt to recover.`
  )

  // Attempt recovery: recreate window
  if (type === 'Renderer crash') {
    mainWindow = null
    windowReadyPromise = null
    createWindow().then(win => {
      registerHandlers(win)
    }).catch(() => {
      // If recovery fails, quit
      app.quit()
    })
  } else {
    // For other fatal errors, quit cleanly
    app.quit()
  }
}

// Global error handlers
process.on('uncaughtException', (error) => {
  handleFatalError('Uncaught exception', error)
})

process.on('unhandledRejection', (reason, _promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason))
  handleFatalError('Unhandled rejection', error)
})
