/**
 * Safe logging utility for Electron main process
 *
 * Prevents EPIPE/EIO crashes when stdout/stderr streams are closed
 * (e.g., during app quit, when output piped to closed programs)
 */

const fs = require('fs')
const path = require('path')

// Log file location (in user's home directory)
const LOG_FILE = path.join(require('os').homedir(), '.rau.log')

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

function resolveLogLevel() {
  const explicit = process.env.RAU_LOG_LEVEL || process.env.LOG_LEVEL
  if (explicit) {
    switch (explicit.toLowerCase()) {
      case 'debug':
        return LOG_LEVELS.DEBUG
      case 'info':
        return LOG_LEVELS.INFO
      case 'warn':
        return LOG_LEVELS.WARN
      case 'error':
        return LOG_LEVELS.ERROR
      default:
        return LOG_LEVELS.INFO
    }
  }
  if (process.env.DEBUG) return LOG_LEVELS.DEBUG
  if (process.env.NODE_ENV === 'development') return LOG_LEVELS.DEBUG
  return LOG_LEVELS.INFO
}

const CURRENT_LOG_LEVEL = resolveLogLevel()

// Track if streams are writable
let stdoutWritable = true
let stderrWritable = true

// Intercept stream errors to mark as unwritable
if (process.stdout) {
  process.stdout.on('error', () => {
    stdoutWritable = false
  })
}
if (process.stderr) {
  process.stderr.on('error', () => {
    stderrWritable = false
  })
}

/**
 * Write to log file as fallback
 */
function writeToFile(level, args) {
  try {
    const timestamp = new Date().toISOString()
    const message = args.map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ')
    fs.appendFileSync(LOG_FILE, `[${timestamp}] [${level}] ${message}\n`)
  } catch {
    // Silently fail if file writing fails
  }
}

/**
 * Safe console.log replacement
 */
function log(...args) {
  if (CURRENT_LOG_LEVEL > LOG_LEVELS.INFO) return
  if (stdoutWritable) {
    try {
      console.log(...args)
    } catch {
      stdoutWritable = false
      writeToFile('INFO', args)
    }
  } else {
    writeToFile('INFO', args)
  }
}

function debug(...args) {
  if (CURRENT_LOG_LEVEL > LOG_LEVELS.DEBUG) return
  if (stdoutWritable) {
    try {
      console.log(...args)
    } catch {
      stdoutWritable = false
      writeToFile('DEBUG', args)
    }
  } else {
    writeToFile('DEBUG', args)
  }
}

/**
 * Safe console.error replacement
 */
function error(...args) {
  if (CURRENT_LOG_LEVEL > LOG_LEVELS.ERROR) return
  if (stderrWritable) {
    try {
      console.error(...args)
    } catch {
      stderrWritable = false
      writeToFile('ERROR', args)
    }
  } else {
    writeToFile('ERROR', args)
  }
}

/**
 * Safe console.warn replacement
 */
function warn(...args) {
  if (CURRENT_LOG_LEVEL > LOG_LEVELS.WARN) return
  if (stderrWritable) {
    try {
      console.warn(...args)
    } catch {
      stderrWritable = false
      writeToFile('WARN', args)
    }
  } else {
    writeToFile('WARN', args)
  }
}

module.exports = {
  log,
  debug,
  error,
  warn,
}
