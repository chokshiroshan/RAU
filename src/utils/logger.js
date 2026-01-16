/**
 * Safe logging utilities
 * Prevents EPIPE crashes when stdout/stderr pipes are closed
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

// Current log level - change to filter output
const CURRENT_LOG_LEVEL = LOG_LEVELS.DEBUG

/**
 * Safe console.log wrapper that won't crash on EPIPE
 */
export function safeLog(...args) {
  try {
    console.log(...args)
  } catch (e) {
    // Silently ignore EPIPE and other logging errors
  }
}

/**
 * Safe console.error wrapper that won't crash on EPIPE
 */
export function safeError(...args) {
  try {
    console.error(...args)
  } catch (e) {
    // Silently ignore EPIPE and other logging errors
  }
}

/**
 * Safe console.warn wrapper that won't crash on EPIPE
 */
export function safeWarn(...args) {
  try {
    console.warn(...args)
  } catch (e) {
    // Silently ignore EPIPE and other logging errors
  }
}

/**
 * Structured logger with component prefix
 */
export const logger = {
  debug(component, message, ...args) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      safeLog(`[${component}]`, message, ...args)
    }
  },

  info(component, message, ...args) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      safeLog(`[${component}]`, message, ...args)
    }
  },

  warn(component, message, ...args) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
      safeWarn(`[${component}]`, message, ...args)
    }
  },

  error(component, message, ...args) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      safeError(`[${component}]`, message, ...args)
    }
  },
}
