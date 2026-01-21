/**
 * IPC Handler Registry
 * Registers all IPC handlers with the main process
 */

const { ipcMain } = require('electron')
const searchHandlers = require('./searchHandler')
const unifiedSearchHandlers = require('./unifiedSearchHandler')
const actionHandlers = require('./actionHandler')
const systemHandlers = require('./systemHandler')
const windowHandlers = require('./windowHandler')
const automationHandlers = require('./automationHandler')
const scriptsmithHandlers = require('./scriptsmithHandler')
const settingsWindow = require('../modules/settingsWindow')
const scriptsmithWindow = require('../modules/scriptsmithWindow')
const logger = require('../logger')

/**
 * Register all IPC handlers
 */
function registerHandlers(mainWindow) {
  // Set window reference for handlers that need it
  windowHandlers.setMainWindow(mainWindow)
  actionHandlers.setMainWindow(mainWindow)
  systemHandlers.setMainWindow(mainWindow)
  settingsWindow.setGetMainWindowCallback(() => mainWindow)
  scriptsmithWindow.setGetMainWindowCallback(() => mainWindow)

  // Search handlers
  ipcMain.handle('search-files', searchHandlers.searchFiles)
  ipcMain.handle('search-unified', unifiedSearchHandlers.searchUnifiedHandler)

  // Automation handlers (Shortcuts & Plugins)
  try {
    logger.log('[Handlers] Registering automation handlers')
    
    if (!automationHandlers) {
      throw new Error('automationHandlers module is undefined')
    }

    if (typeof automationHandlers.getShortcuts !== 'function') {
      logger.error('[Handlers] getShortcuts is not a function:', automationHandlers.getShortcuts)
    }

    ipcMain.handle('get-shortcuts', automationHandlers.getShortcuts)
    ipcMain.handle('run-shortcut', automationHandlers.runShortcut)
    ipcMain.handle('get-plugins', automationHandlers.getPlugins)
    ipcMain.handle('run-plugin', automationHandlers.runPlugin)
  } catch (error) {
    logger.error('[Handlers] Error registering automation handlers:', error)
    // Register dummy handlers to prevent renderer crash
    ipcMain.handle('get-shortcuts', async () => [])
    ipcMain.handle('run-shortcut', async () => ({ success: false, error: 'Automation unavailable' }))
  }

  // Action handlers
  ipcMain.handle('open-file', actionHandlers.openFile)
  ipcMain.handle('get-tabs', actionHandlers.getTabs)
  ipcMain.handle('activate-tab', actionHandlers.activateTab)
  ipcMain.handle('get-apps', actionHandlers.getApps)
  ipcMain.handle('get-app-icon', actionHandlers.getAppIcon)
  ipcMain.handle('get-app-icon-by-name', actionHandlers.getAppIconByName)
  ipcMain.handle('open-app', actionHandlers.openApp)
  ipcMain.handle('open-url', actionHandlers.openUrl)
  ipcMain.handle('get-settings', actionHandlers.getSettings)
  ipcMain.handle('save-settings', actionHandlers.saveSettings)
  ipcMain.handle('clear-apps-cache', actionHandlers.clearAppsCache)

  // System handlers
  ipcMain.handle('execute-command', systemHandlers.executeCommand)

  // Window handlers
  ipcMain.handle('resize-window', windowHandlers.resizeWindow)
  ipcMain.handle('mark-onboarding-complete', windowHandlers.markOnboardingComplete)
  ipcMain.on('hide-window', windowHandlers.hideWindow)
  ipcMain.on('renderer-ready', windowHandlers.rendererReady)
  ipcMain.on('set-search-active', windowHandlers.setSearchActive)
  ipcMain.on('set-has-query', windowHandlers.setHasQuery)

  // Settings window
  ipcMain.handle('show-settings', () => {
    settingsWindow.openSettingsWindow()
    return true
  })

  // Scriptsmith window
  ipcMain.handle('show-scriptsmith', (_event, prompt = '') => {
    try {
      scriptsmithWindow.openScriptsmithWindow(prompt)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide()
      }
      return true
    } catch (error) {
      logger.error('[Handlers] Failed to open Scriptsmith window:', error)
      return false
    }
  })

  // Scriptsmith handlers (AI Script Generation)
  ipcMain.handle('scriptsmith-generate', scriptsmithHandlers.generateScript)
  ipcMain.handle('scriptsmith-save', scriptsmithHandlers.saveScript)
  ipcMain.handle('scriptsmith-set-api-key', scriptsmithHandlers.setApiKey)
  ipcMain.handle('scriptsmith-set-provider', scriptsmithHandlers.setProvider)
  ipcMain.handle('scriptsmith-set-model', scriptsmithHandlers.setModel)
  ipcMain.handle('scriptsmith-get-providers', scriptsmithHandlers.getProviders)
  ipcMain.handle('scriptsmith-get-models', scriptsmithHandlers.getModels)
  ipcMain.handle('scriptsmith-get-config', scriptsmithHandlers.getCurrentConfig)
  ipcMain.handle('scriptsmith-has-api-key', scriptsmithHandlers.hasApiKey)
}

module.exports = {
  registerHandlers,
}
