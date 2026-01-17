import Fuse from 'fuse.js'
import { ipcRenderer } from './electron'
import { logger } from '../utils/logger'

// Fuse.js options for fuzzy search
const fuseOptions = {
  keys: ['name', 'path'],
  threshold: 0.4, // Stricter matching to reduce unrelated results (reduced from 0.6)
  distance: 200,
  includeScore: true,
  shouldSort: true,
  minMatchCharLength: 1,
}

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

    // Apply fuzzy search to refine and rank results
    const fuse = new Fuse(mdfindResults, fuseOptions)
    const fuzzyResults = fuse.search(query)

    // Return top 20 results, mapped to simpler format
    return fuzzyResults
      .slice(0, 20)
      .map(result => ({
        name: result.item.name,
        path: result.item.path,
        score: result.score,
      }))
  } catch (error) {
    logger.error('FileSearch', 'File search error', error)
    return []
  }
}

/**
 * Exported for testing purposes - performs fuzzy search on an array
 * @param {Array} items - Array of items to search
 * @param {string} query - Search query
 * @returns {Array} Filtered and ranked results
 */
export function fuzzySearch(items, query) {
  if (!items || items.length === 0 || !query) {
    return []
  }

  const fuse = new Fuse(items, fuseOptions)
  const results = fuse.search(query)

  return results.slice(0, 20).map(result => ({
    name: result.item.name,
    path: result.item.path,
    score: result.score,
  }))
}
