/**
 * Search-related IPC handlers
 * Handles file search, app search, and tab search operations
 */

const path = require('path')
const { execFile } = require('child_process')
const {
  validateSearchQuery,
} = require('../../../shared/validation/validators')
const { getSettings } = require('../config')
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
  const settings = getSettings()
  const exclusions = settings.fileExclusions || []

  return new Promise((resolve) => {
    // Use standard -name for reliable filename search
    // We request more results (200) to allow for exclusion filtering
    execFile('mdfind', ['-name', sanitizedQuery, '-limit', '200'],
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

        const rawResults = stdout.split('\n').filter(line => line.trim() !== '')
        
        // Post-process filtering for exclusions
        const filteredResults = rawResults.filter(filePath => {
            for (const exclusion of exclusions) {
                const cleanEx = exclusion.replace(/^\*\*\/|\*\*$/g, '')
                if (filePath.includes(cleanEx)) {
                    return false
                }
            }
            return true
        })

        const results = filteredResults
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
