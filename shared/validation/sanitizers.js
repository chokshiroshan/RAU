/**
 * String sanitization utilities for ContextSearch
 */

/**
 * Escape a string for use in AppleScript
 * Escapes backslashes, double quotes, single quotes, newlines, and carriage returns
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for AppleScript
 */
function escapeAppleScriptString(str) {
  if (typeof str !== 'string') return ''

  return str
    .replace(/\\/g, '\\\\')    // Escape backslashes first
    .replace(/"/g, '\\"')      // Escape double quotes
    .replace(/'/g, "\\'")      // Escape single quotes
    .replace(/\n/g, '\\n')     // Escape newlines
    .replace(/\r/g, '\\r')     // Escape carriage returns
    .replace(/\t/g, '\\t')     // Escape tabs
}

module.exports = {
  escapeAppleScriptString,
}
