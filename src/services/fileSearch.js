import { ipcRenderer } from './electron'
import { logger } from '../utils/logger'

/**
 * Search for files using mdfind and fuzzy matching
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of search results
 */
export async function searchFiles(query) {
  if (!query || query.trim() === '') {
    return []
  }

  try {
    if (!ipcRenderer) {
      logger.warn('FileSearch', 'ipcRenderer unavailable; cannot invoke main-process search.')
      return []
    }

    // Get files from mdfind via IPC
    const mdfindResults = await ipcRenderer.invoke('search-files', query)

    if (!mdfindResults || mdfindResults.length === 0) {
      return []
    }

    // Return results directly; unified search handles ranking
    return mdfindResults.slice(0, 100).map(result => ({
      name: result.name,
      path: result.path,
      score: result.score,
    }))
  } catch (error) {
    logger.error('FileSearch', 'File search error', error)
    return []
  }
}
