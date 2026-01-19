/**
 * Input validation utilities for RAU
 * Provides centralized validation for all IPC handlers
 */

const path = require('path')

/**
 * Validate file path exists and is safe
 * @param {string} filePath - Path to validate
 * @returns {{valid: boolean, error?: string, value?: string}}
 */
function validateFilePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: 'Invalid file path' }
  }

  // Prevent path traversal attacks
  const normalized = path.normalize(filePath)
  if (normalized.includes('..')) {
    return { valid: false, error: 'Path traversal detected' }
  }

  // Limit length to prevent buffer issues
  if (normalized.length > 4096) {
    return { valid: false, error: 'Path too long' }
  }

  return { valid: true, value: normalized }
}

/**
 * Validate app bundle path
 * @param {string} appPath - Path to .app bundle
 * @returns {{valid: boolean, error?: string, value?: string}}
 */
function validateAppPath(appPath) {
  const filePathCheck = validateFilePath(appPath)
  if (!filePathCheck.valid) {
    return filePathCheck
  }

  if (!appPath.endsWith('.app')) {
    return { valid: false, error: 'Not an application bundle' }
  }

  return filePathCheck
}

/**
 * Validate positive integer (for window/tab indices)
 * @param {any} value - Value to validate
 * @returns {{valid: boolean, error?: string, value?: number}}
 */
function validatePositiveInt(value) {
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 1) {
    return { valid: false, error: 'Invalid index (must be positive integer)' }
  }
  return { valid: true, value: num }
}

/**
 * Validate URL protocol for opening external URLs
 * @param {string} url - URL to validate
 * @returns {{valid: boolean, error?: string, value?: string}}
 */
function validateUrlProtocol(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Invalid URL' }
  }

  try {
    const parsed = new URL(url)

    // Strict whitelist of allowed protocols
    const ALLOWED_PROTOCOLS = ['https:', 'http:', 'mailto:']

    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return {
        valid: false,
        error: `Blocked: protocol "${parsed.protocol}" not allowed`
      }
    }

    return { valid: true, value: url }
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Validate and sanitize search query
 * @param {string} query - Search query
 * @returns {{valid: boolean, error?: string, value?: string}}
 */
function validateSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Invalid query' }
  }

  const trimmed = query.trim()

  // Empty query
  if (trimmed === '') {
    return { valid: false, error: 'Empty query' }
  }

  // Limit length to prevent DoS
  if (trimmed.length > 500) {
    return { valid: false, error: 'Query too long' }
  }

  // Remove potentially dangerous characters (for mdfind safety)
  // Allow letters, numbers, spaces, and common file name characters
  const sanitized = trimmed.replace(/[^\p{L}\p{N}\s\-_.@]/gu, '').slice(0, 100)

  if (sanitized === '') {
    return { valid: false, error: 'No valid characters in query' }
  }

  return { valid: true, value: sanitized }
}

/**
 * Validate plugin filename to prevent path traversal
 * Only allows alphanumeric, underscore, hyphen, and .applescript extension
 * @param {string} filename - Plugin filename to validate
 * @returns {{valid: boolean, error?: string, value?: string}}
 */
function validatePluginFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return { valid: false, error: 'Invalid plugin filename' }
  }

  const trimmed = filename.trim()

  // Must end with .applescript
  if (!trimmed.endsWith('.applescript')) {
    return { valid: false, error: 'Plugin must be an .applescript file' }
  }

  // Prevent path traversal - no slashes, no dots except for extension
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return { valid: false, error: 'Path traversal detected in plugin filename' }
  }

  // Check for parent directory traversal patterns
  if (trimmed.includes('..')) {
    return { valid: false, error: 'Path traversal detected in plugin filename' }
  }

  // Only allow safe characters: alphanumeric, underscore, hyphen, space, and the extension dot
  const baseName = trimmed.slice(0, -12) // Remove '.applescript'
  if (!/^[\w\s-]+$/.test(baseName)) {
    return { valid: false, error: 'Plugin filename contains invalid characters' }
  }

  // Limit length
  if (trimmed.length > 255) {
    return { valid: false, error: 'Plugin filename too long' }
  }

  return { valid: true, value: trimmed }
}

/**
 * Validate shortcut name to prevent command injection
 * Allows typical shortcut names but blocks dangerous patterns
 * @param {string} name - Shortcut name to validate
 * @returns {{valid: boolean, error?: string, value?: string}}
 */
function validateShortcutName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Invalid shortcut name' }
  }

  const trimmed = name.trim()

  // Empty name
  if (trimmed === '') {
    return { valid: false, error: 'Empty shortcut name' }
  }

  // Limit length to prevent DoS
  if (trimmed.length > 500) {
    return { valid: false, error: 'Shortcut name too long' }
  }

  // Block command-line flag injection (names starting with -)
  if (trimmed.startsWith('-')) {
    return { valid: false, error: 'Shortcut name cannot start with hyphen' }
  }

  // Block shell metacharacters that could cause issues
  const dangerousChars = /[`$|;&<>]/
  if (dangerousChars.test(trimmed)) {
    return { valid: false, error: 'Shortcut name contains invalid characters' }
  }

  return { valid: true, value: trimmed }
}

/**
 * Sanitize a string for use in mdfind queries
 * Escapes quotes and other characters that could break the query
 * @param {string} str - String to sanitize for mdfind
 * @returns {string} Sanitized string safe for mdfind queries
 */
function sanitizeMdfindQuery(str) {
  if (!str || typeof str !== 'string') return ''
  
  // Escape double quotes and backslashes
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
}

module.exports = {
  validateFilePath,
  validateAppPath,
  validatePositiveInt,
  validateUrlProtocol,
  validateSearchQuery,
  validatePluginFilename,
  validateShortcutName,
  sanitizeMdfindQuery,
}
