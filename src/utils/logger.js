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

const IS_DEV = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV

function resolveLogLevel() {
  try {
    if (typeof window !== 'undefined') {
      const override = window.__RAU_LOG_LEVEL || window.localStorage?.getItem('rau-log-level')
      if (override) {
        const level = String(override).toLowerCase()
        if (level === 'debug') return LOG_LEVELS.DEBUG
        if (level === 'info') return LOG_LEVELS.INFO
        if (level === 'warn') return LOG_LEVELS.WARN
        if (level === 'error') return LOG_LEVELS.ERROR
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return IS_DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO
}

const CURRENT_LOG_LEVEL = resolveLogLevel()

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
