/**
 * Search-related IPC handlers
 * Handles file search, app search, and tab search operations
 */

const path = require('path')
const { execFile } = require('child_process')
const {
  validateSearchQuery,
} = require('../../shared/validation/validators')
const logger = require('../logger')

/**
 * Search files using mdfind
 */
async function searchFiles(_event, query) {
  // Validate and sanitize query
  const validation = validateSearchQuery(query)
  if (!validation.valid) {
    return []
  }

  const sanitizedQuery = validation.value

  return new Promise((resolve) => {
    execFile('mdfind', ['-name', sanitizedQuery, '-limit', '100'],
      { timeout: 1000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
        if (error) {
          if (error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
            logger.warn('[SearchHandler] mdfind returned too many results, using partial data')
          } else {
            logger.error('[SearchHandler] mdfind error:', error)
          }
          resolve([])
          return
        }

        const results = stdout
          .split('\n')
          .filter(line => line.trim() !== '')
          .slice(0, 100)
          .map(filePath => ({
            path: filePath,
            name: path.basename(filePath),
          }))

        resolve(results)
      })
  })
}

module.exports = {
  searchFiles,
}
