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

/**
 * Safe console.error replacement
 */
function error(...args) {
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
  error,
  warn,
}
