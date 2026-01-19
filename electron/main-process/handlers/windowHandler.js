/**
 * Window management IPC handlers
 * Handles window resizing, hiding, and onboarding
 */

const { screen } = require('electron')
const { getSettings, saveSettings } = require('../config')
const logger = require('../logger')
const { WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_HEIGHT_COLLAPSED } = require('../constants')

let mainWindow = null
let searchActive = false
let hasQuery = false

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
function resizeWindow(_event, input) {
  if (!mainWindow || mainWindow.isDestroyed()) return false

  let height = null
  let width = null

  if (typeof input === 'number') {
    height = input
    width = WINDOW_WIDTH
  } else if (typeof input === 'object' && input !== null) {
    height = input.height
    width = input.width || WINDOW_WIDTH
  }

  if (!Number.isFinite(height)) {
    return false
  }

  // Clamp height between collapsed and max
  const targetHeight = Math.max(WINDOW_HEIGHT_COLLAPSED, Math.min(height, WINDOW_HEIGHT))

  if (width !== mainWindow.getBounds().width) {
    // If width changing, re-center horizontally
    const cursorPosition = screen.getCursorScreenPoint()
    const activeDisplay = screen.getDisplayNearestPoint(cursorPosition)
    const { width: screenWidth } = activeDisplay.workAreaSize
    const { x: displayX } = activeDisplay.workArea

    // Calculate new X to center
    const newX = Math.round(displayX + (screenWidth - width) / 2)

    // Update bounds (pos + size)
    mainWindow.setBounds({
      x: newX,
      width: width,
      height: targetHeight
    }, false) // false = no animation
  } else {
    // Just height change
    mainWindow.setSize(width, targetHeight, false)
  }

  return true
}

/**
 * Hide window
 */
function hideWindow() {
  logger.log('[WindowHandler] hideWindow() IPC called')
  logger.log('[WindowHandler] Stack trace:', new Error().stack)
  if (mainWindow && !mainWindow.isDestroyed()) {
    logger.log('[WindowHandler] HIDING window via IPC')
    mainWindow.hide()
  } else {
    logger.log('[WindowHandler] Window null/destroyed, skipping hide')
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

/**
 * Set search active state (prevents blur-hide during search)
 */
function setSearchActive(_event, active) {
  const wasActive = searchActive
  searchActive = active
  if (wasActive !== active) {
    logger.log(`[WindowHandler] Search active: ${active}`)
  }
}

/**
 * Check if search is currently active
 */
function isSearchActive() {
  return searchActive
}

/**
 * Set query state (prevents blur-hide when user has typed a query)
 */
function setHasQuery(_event, has) {
  const wasHas = hasQuery
  hasQuery = has
  if (wasHas !== has) {
    logger.log(`[WindowHandler] Has query: ${has}`)
  }
}

/**
 * Check if user has entered a query
 */
function getHasQuery() {
  return hasQuery
}

module.exports = {
  setMainWindow,
  resizeWindow,
  hideWindow,
  markOnboardingComplete,
  rendererReady,
  setSearchActive,
  isSearchActive,
  setHasQuery,
  getHasQuery,
}
