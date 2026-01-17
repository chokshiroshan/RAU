/**
 * Shared configuration constants for RAU
 * Single source of truth for both main and renderer processes
 */

// ============================================================================
// WINDOW CONFIGURATION
// ============================================================================

export const WINDOW = {
  WIDTH: 700,
  HEIGHT: 700,
  HEIGHT_COLLAPSED: 62,
  TOP_OFFSET: 80,
}

// ============================================================================
// TIMEOUTS (in milliseconds)
// ============================================================================

export const TIMEOUTS = {
  MDFIND: 1000,              // 1 second for mdfind (file/app search)
  ICON_EXTRACTION: 10000,    // 10 seconds for icon extraction
  APPLESCRIPT: 5000,         // 5 seconds for AppleScript commands
  OPEN_APP: 5000,            // 5 seconds to open application
  SEARCH: 5000,              // 5 second search timeout
  UNIVERSAL_WINDOWS: 10000,  // 10 seconds for universal windows fetch
}

// ============================================================================
// CACHE SETTINGS
// ============================================================================

export const CACHE = {
  APPS_TTL_MS: 600000,       // 10 minutes for apps cache
  ICON_MAX_SIZE: 100,        // Maximum number of icons to cache
  TAB_DURATION_MS: 10000,    // 10 seconds for tabs cache
  TAB_PREWARM: true,         // Enable tab cache pre-warming on startup
}

// ============================================================================
// SEARCH CONFIGURATION
// ============================================================================

export const SEARCH = {
  DEBOUNCE_MS: 150,          // Delay before executing search
  MAX_RESULTS: 20,           // Maximum number of results to return

  // Fuse.js scoring thresholds
  THRESHOLD: {
    UNIFIED: 0.2,            // Main search threshold
    FILE: 0.4,               // File search threshold
    SCORE_FILTER: 0.25,      // Filter results below this score
    TIEBREAKER: 0.05,        // Score difference for priority tiebreaker
  },

  // Fuse.js distance settings
  DISTANCE: {
    UNIFIED: 50,             // Main search distance
    FILE: 200,               // File search distance
  },

  // Fuse.js field weights
  WEIGHTS: {
    NAME: 3.0,               // App name (highest priority)
    TITLE: 2.0,              // Tab title
    URL: 1.5,                // Tab URL
    PATH: 1.0,               // File path
  },
}

// ============================================================================
// LIMITS
// ============================================================================

export const LIMITS = {
  MAX_SEARCH_RESULTS: 100,   // Max results from mdfind
  MAX_PATH_LENGTH: 4096,     // Max file path length
  MAX_QUERY_LENGTH: 500,     // Max search query length
  MAX_SANITIZED_QUERY: 100,  // Max sanitized query length
}

// ============================================================================
// ICON CACHE
// ============================================================================

export const ICON_CACHE = {
  MAX_SIZE: 100,             // Maximum number of cached icons
  EVICTION: 'lru',           // LRU (least recently used) eviction policy
}

// ============================================================================
// ALLOWED URL PROTOCOLS
// ============================================================================

export const URL_PROTOCOLS = {
  ALLOWED: ['https:', 'http:', 'mailto:'],
}
