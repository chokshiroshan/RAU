/**
 * Main Process Modules Index
 * Exports all modules for clean imports
 */

const windowManager = require('./windowManager')
const appMenu = require('./appMenu')
const hotkeyManager = require('./hotkeyManager')
const settingsWindow = require('./settingsWindow')
const errorHandler = require('./errorHandler')

module.exports = {
  windowManager,
  appMenu,
  hotkeyManager,
  settingsWindow,
  errorHandler,
}
