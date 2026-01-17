/**
 * Window management IPC handlers
 * Handles window resizing, hiding, and onboarding
 */

const { getSettings, saveSettings } = require('../config')
const logger = require('../logger')
const { WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_HEIGHT_COLLAPSED } = require('../constants')

let mainWindow = null

/**
 * Set the main window reference
 */
function setMainWindow(window) {
  mainWindow = window
}

/**
 * Resize window based on content
 * CSS handles visual transitions, this updates window bounds for click-through behavior
 */
function resizeWindow(_event, heightInput) {
  if (!mainWindow || mainWindow.isDestroyed()) return false

  const height = typeof heightInput === 'number'
    ? heightInput
    : typeof heightInput === 'object' && heightInput !== null
      ? heightInput.height
      : null

  if (!Number.isFinite(height)) {
    return false
  }

  // Clamp between collapsed and max
  const targetHeight = Math.max(WINDOW_HEIGHT_COLLAPSED, Math.min(height, WINDOW_HEIGHT))
  // Use false to prevent Electron's resize animation - CSS handles the visual transition
  mainWindow.setSize(WINDOW_WIDTH, targetHeight, false)
  return true
}

/**
 * Hide window
 */
function hideWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide()
  }
}

/**
 * Mark onboarding as complete
 */
function markOnboardingComplete() {
  const settings = getSettings()
  settings.onboardingComplete = true
  saveSettings(settings)
  logger.log('[WindowHandler] Onboarding marked complete')
  // Collapse window to search bar size
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setSize(WINDOW_WIDTH, WINDOW_HEIGHT_COLLAPSED)
  }
  return true
}

/**
 * Signal renderer is ready
 */
function rendererReady() {
  logger.log('[WindowHandler] Renderer signaled ready')
}

module.exports = {
  setMainWindow,
  resizeWindow,
  hideWindow,
  markOnboardingComplete,
  rendererReady,
}
