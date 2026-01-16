/**
 * Input validation utilities
 * Centralized validation functions for security and robustness
 */

/**
 * Validate that a value is a non-empty string
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid string
 */
export function isValidString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Validate that a value is a positive integer
 * @param {any} value - Value to validate
 * @returns {number|null} The number if valid, null otherwise
 */
export function validatePositiveInt(value) {
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 1) return null
  return num
}

/**
 * Validate search query
 * @param {any} query - Query to validate
 * @param {number} minLength - Minimum length (default 2)
 * @param {number} maxLength - Maximum length (default 1000)
 * @returns {string|null} Trimmed query if valid, null otherwise
 */
export function validateQuery(query, minLength = 2, maxLength = 1000) {
  if (typeof query !== 'string') return null
  const trimmed = query.trim()
  if (trimmed.length < minLength || trimmed.length > maxLength) return null
  return trimmed
}

/**
 * Validate file path
 * @param {any} filePath - Path to validate
 * @returns {boolean} True if path appears valid
 */
export function isValidPath(filePath) {
  if (typeof filePath !== 'string') return false
  if (filePath.trim().length === 0) return false
  // Basic sanity check - must start with /
  if (!filePath.startsWith('/')) return false
  return true
}

/**
 * Validate settings object
 * @param {any} settings - Settings to validate
 * @returns {object} Validated settings with defaults applied
 */
export function validateSettings(settings) {
  const defaults = {
    searchApps: true,
    searchTabs: true,
    searchFiles: true,
  }

  if (!settings || typeof settings !== 'object') {
    return defaults
  }

  return {
    searchApps: typeof settings.searchApps === 'boolean' ? settings.searchApps : defaults.searchApps,
    searchTabs: typeof settings.searchTabs === 'boolean' ? settings.searchTabs : defaults.searchTabs,
    searchFiles: typeof settings.searchFiles === 'boolean' ? settings.searchFiles : defaults.searchFiles,
  }
}

/**
 * Escape string for AppleScript
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for AppleScript
 */
export function escapeAppleScriptString(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/"/g, '\\"')    // Escape double quotes
}
