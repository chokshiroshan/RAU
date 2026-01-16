/**
 * Window management IPC handlers
 * Handles window resizing, hiding, and onboarding
 */

const { getSettings, saveSettings } = require('../config')
const logger = require('../logger')

let mainWindow = null

/**
 * Set the main window reference
 */
function setMainWindow(window) {
  mainWindow = window
}

/**
 * Resize window based on content
 */
function resizeWindow(_event, height) {
  if (!mainWindow || mainWindow.isDestroyed()) return false
  // Clamp between collapsed and max
  const targetHeight = Math.max(62, Math.min(height, 700))
  mainWindow.setSize(700, targetHeight)
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
    mainWindow.setSize(700, 62)
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
