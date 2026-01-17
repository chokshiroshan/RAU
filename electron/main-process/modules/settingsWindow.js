/**
 * Settings Window Module
 * Handles the settings/preferences window creation and management
 */

const { BrowserWindow } = require('electron')
const path = require('path')
const { SETTINGS_WINDOW_WIDTH, SETTINGS_WINDOW_HEIGHT } = require('../constants')

// Settings window state
let settingsWindow = null

// Reference to main window getter (set externally to avoid circular deps)
let getMainWindowCallback = null

/**
 * Set the callback for getting the main window reference
 * @param {Function} callback - Function that returns the main window
 */
function setGetMainWindowCallback(callback) {
  getMainWindowCallback = callback
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

  const mainWindow = getMainWindowCallback ? getMainWindowCallback() : null

  settingsWindow = new BrowserWindow({
    width: SETTINGS_WINDOW_WIDTH,
    height: SETTINGS_WINDOW_HEIGHT,
    title: 'Preferences',
    resizable: false,
    fullscreenable: false,
    show: false,
    modal: false,
    parent: mainWindow || undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js')
    }
  })

  const htmlPath = path.join(__dirname, '../../..', 'dist/settings.html')
  settingsWindow.loadFile(htmlPath)

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show()
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

/**
 * Get the settings window reference
 * @returns {BrowserWindow|null}
 */
function getSettingsWindow() {
  return settingsWindow
}

/**
 * Close the settings window if open
 */
function closeSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close()
    settingsWindow = null
  }
}

module.exports = {
  openSettingsWindow,
  getSettingsWindow,
  closeSettingsWindow,
  setGetMainWindowCallback,
}
