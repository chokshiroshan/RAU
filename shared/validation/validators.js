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

module.exports = {
  validateFilePath,
  validateAppPath,
  validatePositiveInt,
  validateUrlProtocol,
  validateSearchQuery,
}
