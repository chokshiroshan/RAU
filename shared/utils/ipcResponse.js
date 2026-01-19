/**
 * Standardized IPC Response Helpers
 * Ensures consistent return format for all IPC handlers
 */

/**
 * Create a success response
 * @param {any} data - The data to return
 * @returns {{success: true, data: any}}
 */
function success(data = null) {
  return { success: true, data }
}

/**
 * Create an error response
 * @param {string|Error} error - The error message or object
 * @param {string} [code] - Optional error code
 * @returns {{success: false, error: string, code?: string}}
 */
function error(err, code = null) {
  const message = err instanceof Error ? err.message : String(err)
  return {
    success: false,
    error: message,
    ...(code && { code })
  }
}

module.exports = {
  success,
  error
}