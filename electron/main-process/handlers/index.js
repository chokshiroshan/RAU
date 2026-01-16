/**
 * IPC Handler Registry
 * Registers all IPC handlers with the main process
 */

const { ipcMain } = require('electron')
const searchHandlers = require('./searchHandler')
const actionHandlers = require('./actionHandler')
const systemHandlers = require('./systemHandler')
const windowHandlers = require('./windowHandler')

/**
 * Register all IPC handlers
 */
function registerHandlers(mainWindow) {
  // Set window reference for handlers that need it
  windowHandlers.setMainWindow(mainWindow)
  actionHandlers.setMainWindow(mainWindow)
  systemHandlers.setMainWindow(mainWindow)

  // Search handlers
  ipcMain.handle('search-files', searchHandlers.searchFiles)

  // Action handlers
  ipcMain.handle('open-file', actionHandlers.openFile)
  ipcMain.handle('get-tabs', actionHandlers.getTabs)
  ipcMain.handle('activate-tab', actionHandlers.activateTab)
  ipcMain.handle('get-apps', actionHandlers.getApps)
  ipcMain.handle('get-app-icon', actionHandlers.getAppIcon)
  ipcMain.handle('open-app', actionHandlers.openApp)
  ipcMain.handle('open-url', actionHandlers.openUrl)
  ipcMain.handle('get-settings', actionHandlers.getSettings)
  ipcMain.handle('save-settings', actionHandlers.saveSettings)

  // System handlers
  ipcMain.handle('execute-command', systemHandlers.executeCommand)

  // Window handlers
  ipcMain.handle('resize-window', windowHandlers.resizeWindow)
  ipcMain.handle('mark-onboarding-complete', windowHandlers.markOnboardingComplete)
  ipcMain.on('hide-window', windowHandlers.hideWindow)
  ipcMain.on('renderer-ready', windowHandlers.rendererReady)
}

module.exports = {
  registerHandlers,
}
