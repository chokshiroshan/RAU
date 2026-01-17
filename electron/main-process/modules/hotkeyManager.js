/**
 * Hotkey Manager Module
 * Handles global hotkey registration and cleanup
 */

const { globalShortcut } = require('electron')
const logger = require('../logger')

// Default hotkey combination
const DEFAULT_HOTKEY = 'CommandOrControl+Shift+Space'

// Reference to toggle callback
let toggleCallback = null

/**
 * Set the toggle callback function
 * @param {Function} callback - Function to call when hotkey is pressed
 */
function setToggleCallback(callback) {
  toggleCallback = callback
}

/**
 * Register the global hotkey
 * @param {string} [hotkey] - Hotkey combination (default: Cmd+Shift+Space)
 * @returns {boolean} True if registration succeeded
 */
function registerHotkey(hotkey = DEFAULT_HOTKEY) {
  const success = globalShortcut.register(hotkey, () => {
    logger.log(`[Hotkey] ${hotkey} triggered`)
    if (toggleCallback) {
      toggleCallback().catch(err => logger.error('[Hotkey] Error:', err))
    }
  })

  if (!success) {
    logger.error(`[Hotkey] Failed to register ${hotkey}`)
  } else {
    logger.log(`[Hotkey] Registered: ${hotkey}`)
  }

  return success
}

/**
 * Unregister all global hotkeys
 */
function unregisterAll() {
  globalShortcut.unregisterAll()
  logger.log('[Hotkey] Unregistered all hotkeys')
}

/**
 * Check if a hotkey is registered
 * @param {string} hotkey - Hotkey combination to check
 * @returns {boolean} True if hotkey is registered
 */
function isRegistered(hotkey) {
  return globalShortcut.isRegistered(hotkey)
}

module.exports = {
  registerHotkey,
  unregisterAll,
  isRegistered,
  setToggleCallback,
  DEFAULT_HOTKEY,
}
