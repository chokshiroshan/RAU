/**
 * Electron main process configuration constants
 * Centralized location for all hardcoded values
 */

// Window dimensions
const WINDOW_WIDTH = 700
const WINDOW_HEIGHT = 700
const WINDOW_HEIGHT_COLLAPSED = 62 // Just the search bar (no results)
const WINDOW_TOP_OFFSET = 80 // Distance from top of screen (like Spotlight)

// Settings window dimensions
const SETTINGS_WINDOW_WIDTH = 450
const SETTINGS_WINDOW_HEIGHT = 400

// Blur delay (prevents accidental closes during rapid interactions)
const BLUR_DELAY_MS = 100

// Window recreation delay after crash
const CRASH_RECOVERY_DELAY_MS = 1000

// Timeouts (in milliseconds)
const MDFIND_TIMEOUT_MS = 1000 // mdfind command timeout (reduced for snappy feel)
const ICON_EXTRACTION_TIMEOUT_MS = 10000 // Icon extraction timeout
const APPLESCRIPT_TIMEOUT_MS = 5000 // AppleScript execution timeout
const OPEN_APP_TIMEOUT_MS = 5000 // App/file open timeout

// Cache settings
const APPS_CACHE_TTL_MS = 600000 // 10 minutes - invalidate apps cache after this time
const MAX_ICON_CACHE_SIZE = 100 // Maximum number of icons to cache

module.exports = {
  // Window dimensions
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  WINDOW_HEIGHT_COLLAPSED,
  WINDOW_TOP_OFFSET,
  SETTINGS_WINDOW_WIDTH,
  SETTINGS_WINDOW_HEIGHT,

  // Timing
  BLUR_DELAY_MS,
  CRASH_RECOVERY_DELAY_MS,
  MDFIND_TIMEOUT_MS,
  ICON_EXTRACTION_TIMEOUT_MS,
  APPLESCRIPT_TIMEOUT_MS,
  OPEN_APP_TIMEOUT_MS,

  // Cache settings
  APPS_CACHE_TTL_MS,
  MAX_ICON_CACHE_SIZE,
}
