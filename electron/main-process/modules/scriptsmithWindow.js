/**
 * Scriptsmith Window Module
 * Handles Scriptsmith window creation and management (multi-instance)
 */

const { BrowserWindow, screen } = require('electron')
const path = require('path')
const { SCRIPTSMITH_WINDOW_WIDTH, SCRIPTSMITH_WINDOW_HEIGHT } = require('../constants')
const logger = require('../logger')

// Keep strong refs so windows aren't GC'd
const scriptsmithWindows = new Set()

// Reference to main window getter (set externally to avoid circular deps)
let getMainWindowCallback = null

/**
 * Set the callback for getting the main window reference
 * @param {Function} callback - Function that returns the main window
 */
function setGetMainWindowCallback(callback) {
  getMainWindowCallback = callback
}

function getCenteredBounds(width, height) {
  const cursorPosition = screen.getCursorScreenPoint()
  const activeDisplay = screen.getDisplayNearestPoint(cursorPosition)
  const { width: screenWidth, height: screenHeight } = activeDisplay.workAreaSize
  const { x: displayX, y: displayY } = activeDisplay.workArea

  const x = Math.round(displayX + (screenWidth - width) / 2)
  const y = Math.round(displayY + (screenHeight - height) / 2)

  return { x, y, width, height }
}

/**
 * Open a new Scriptsmith window (always creates a new instance)
 * @param {string} initialPrompt
 * @returns {BrowserWindow}
 */
function openScriptsmithWindow(initialPrompt = '') {
  const mainWindow = getMainWindowCallback ? getMainWindowCallback() : null
  const prompt = typeof initialPrompt === 'string' ? initialPrompt.slice(0, 5000) : ''

  const bounds = getCenteredBounds(SCRIPTSMITH_WINDOW_WIDTH, SCRIPTSMITH_WINDOW_HEIGHT)

  const win = new BrowserWindow({
    ...bounds,
    title: 'Scriptsmith',
    resizable: true,
    fullscreenable: false,
    show: false,
    modal: false,
    // Intentionally NOT parented to the launcher window.
    // If we set `parent`, hiding the launcher can also hide this window on macOS.
    parent: undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '../preload.js')
    }
  })

  scriptsmithWindows.add(win)

  const htmlPath = path.join(__dirname, '../../..', 'dist/scriptsmith.html')
  win.loadFile(htmlPath, { query: { prompt } }).catch(err => {
    logger.error('[ScriptsmithWindow] Failed to load Scriptsmith UI:', err)
  })

  win.webContents.on('will-navigate', (event, url) => {
    logger.warn('[ScriptsmithWindow] Blocked navigation to:', url)
    event.preventDefault()
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    logger.warn('[ScriptsmithWindow] Blocked window open to:', url)
    return { action: 'deny' }
  })

  win.once('ready-to-show', () => {
    win.show()
    win.focus()
  })

  win.on('closed', () => {
    scriptsmithWindows.delete(win)
  })

  return win
}

module.exports = {
  openScriptsmithWindow,
  setGetMainWindowCallback,
}

