/**
 * System command IPC handlers
 * Handles system-level operations like sleep, lock, shutdown, etc.
 */

const { execFile } = require('child_process')
const logger = require('../logger')

let mainWindow = null

/**
 * Set the main window reference
 */
function setMainWindow(window) {
  mainWindow = window
}

/**
 * Execute system commands
 * Returns proper success/failure status
 */
async function executeCommand(_event, action) {
  // Hide window before executing command
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide()
  }

  return new Promise((resolve) => {
    let command = ''
    let args = []

    switch (action) {
      case 'system-sleep':
        command = 'pmset'
        args = ['sleepnow']
        break
      case 'system-lock':
        command = '/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession'
        args = ['-suspend']
        break
      case 'system-trash':
        command = 'osascript'
        args = ['-e', 'tell application "Finder" to empty trash']
        break
      case 'system-restart':
        command = 'osascript'
        args = ['-e', 'tell application "System Events" to restart']
        break
      case 'system-shutdown':
        command = 'osascript'
        args = ['-e', 'tell application "System Events" to shut down']
        break
      case 'system-logout':
        command = 'osascript'
        args = ['-e', 'tell application "System Events" to log out']
        break
      default:
        logger.error('[SystemHandler] Unknown action:', action)
        resolve({ success: false, error: 'Unknown command' })
        return
    }

    execFile(command, args, (error) => {
      if (error) {
        logger.error(`[SystemHandler] ${action} failed:`, error)
        resolve({ success: false, error: error.message })
      } else {
        resolve({ success: true })
      }
    })
  })
}

module.exports = {
  setMainWindow,
  executeCommand,
}
