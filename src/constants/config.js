/**
 * Application configuration constants
 * Centralized location for all hardcoded values
 */

// Window dimensions
export const WINDOW_WIDTH = 700
export const WINDOW_HEIGHT = 600
export const WINDOW_TOP_OFFSET = 80 // Distance from top of screen (like Spotlight)

// Search settings
export const SEARCH_DEBOUNCE_MS = 150
export const SEARCH_TIMEOUT_MS = 5000
export const MAX_SEARCH_RESULTS = 20

// Fuzzy search thresholds (lower = stricter matching)
export const UNIFIED_SEARCH_THRESHOLD = 0.2
export const FILE_SEARCH_THRESHOLD = 0.4
export const SCORE_FILTER_THRESHOLD = 0.25
export const SCORE_TIEBREAKER_THRESHOLD = 0.05

// Search distance (for Fuse.js)
export const UNIFIED_SEARCH_DISTANCE = 50
export const FILE_SEARCH_DISTANCE = 200

// Cache settings
export const TAB_CACHE_DURATION_MS = 2000
export const MAX_ICON_CACHE_SIZE = 100

// Timeouts
export const ICON_EXTRACTION_TIMEOUT_MS = 10000
export const MDFIND_TIMEOUT_MS = 10000
export const APPLESCRIPT_TIMEOUT_MS = 5000

// Icon settings
export const ICON_SIZE = 64
