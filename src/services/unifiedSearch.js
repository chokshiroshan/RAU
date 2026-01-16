import Fuse from 'fuse.js'
import { searchFiles } from './fileSearch'
import { getAllApps } from './appSearch'
import { searchCommands } from './commandSearch'
import { getWebSearchResult } from './webSearch'
import { ipcRenderer } from './electron'

// Regex to validate safe math expressions (numbers and basic operators only)
const MATH_EXPRESSION_REGEX = /^[\d\s+\-*/().%^]+$/

/**
 * Safely evaluate a math expression
 * Only allows numbers and basic math operators
 * @param {string} expression - The expression to evaluate
 * @returns {number|null} The result or null if not a valid expression
 */
function evaluateExpression(expression) {
  // Check if it looks like a math expression
  if (!MATH_EXPRESSION_REGEX.test(expression)) {
    return null
  }

  // Must contain at least one operator to be considered a calculation
  if (!/[+\-*/^%]/.test(expression)) {
    return null
  }

  try {
    // Replace ^ with ** for exponentiation
    const normalizedExpr = expression.replace(/\^/g, '**')

    // Use Function constructor (safer than eval, but still isolated)
    const result = new Function(`return (${normalizedExpr})`)()

    // Only return valid numeric results
    if (typeof result === 'number' && isFinite(result)) {
      // Round to reasonable precision to avoid floating point weirdness
      return Math.round(result * 1000000) / 1000000
    }
    return null
  } catch {
    return null
  }
}

// Fuse.js options for fuzzy search
const fuseOptions = {
  keys: [
    { name: 'name', weight: 3.0 },  // App name (highest priority)
    { name: 'title', weight: 2.0 }, // Tab title
    { name: 'url', weight: 1.5 },   // Tab URL
    { name: 'path', weight: 1.0 },  // File path
  ],
  threshold: 0.2, // Stricter threshold to reduce unrelated results (lower = stricter)
  distance: 50,   // Reduced distance for tighter matching
  includeScore: true,
  shouldSort: true,
  minMatchCharLength: 2, // Require at least 2 characters
  ignoreLocation: true,
}

/**
 * Search for apps, files, and tabs
 * @param {string} query - Search query
 * @returns {Promise<Array>} Combined array of app, file, and tab results
 */
export async function searchUnified(query) {
  console.log('[UnifiedSearch] Search started for query:', query)

  if (!query || query.trim() === '') {
    console.log('[UnifiedSearch] Empty query, returning empty')
    return []
  }

  const trimmedQuery = query.trim()

  if (trimmedQuery.length < 2) {
    console.log('[UnifiedSearch] Query too short (< 2 chars), returning empty')
    return []
  }

  // Check for calculator expressions (basic math)
  const calculatorResult = evaluateExpression(trimmedQuery)
  if (calculatorResult !== null) {
    console.log('[UnifiedSearch] Calculator result:', calculatorResult)
    return [{
      type: 'calculator',
      name: `= ${calculatorResult}`,
      expression: trimmedQuery,
      result: calculatorResult,
      priority: 10, // Highest priority
      score: 0, // Best score
    }]
  }

  try {
    if (!ipcRenderer) {
      console.error('[UnifiedSearch] ipcRenderer unavailable; skipping searches.')
      return []
    }

    console.log('[UnifiedSearch] Fetching settings...')

    // Get settings to determine which categories to search
    const settings = await ipcRenderer.invoke('get-settings')
    console.log('[UnifiedSearch] Settings fetched:', settings)

    // Build search promises based on settings
    const searchPromises = []

    console.log('[UnifiedSearch] Starting parallel searches...')

    if (settings.searchApps !== false) {
      console.log('[UnifiedSearch] App search enabled')
      searchPromises.push(
        getAllApps().catch(err => {
          console.warn('[UnifiedSearch] App search failed:', err.message)
          return []
        })
      )
    } else {
      searchPromises.push(Promise.resolve([]))
    }

    if (settings.searchTabs !== false) {
      console.log('[UnifiedSearch] Tab search enabled')
      searchPromises.push(
        ipcRenderer.invoke('get-tabs').catch(err => {
          console.warn('[UnifiedSearch] Tab search failed:', err.message)
          return []
        })
      )
    } else {
      searchPromises.push(Promise.resolve([]))
    }

    if (settings.searchFiles !== false) {
      console.log('[UnifiedSearch] File search enabled')
      searchPromises.push(
        searchFiles(trimmedQuery).catch(err => {
          console.warn('[UnifiedSearch] File search failed:', err.message)
          return []
        })
      )
    } else {
      searchPromises.push(Promise.resolve([]))
    }

    // Search apps, files, and tabs in parallel with timeout
    const searchPromise = Promise.all(searchPromises)

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Search timeout')), 5000)
    )

    const [apps, tabs, fileResults] = await Promise.race([
      searchPromise,
      timeoutPromise
    ]).catch(err => {
      console.error('[UnifiedSearch] Search error:', err.message)
      return [[], [], []]
    })

    console.log(`[UnifiedSearch] Raw results - Apps: ${apps.length}, Files: ${fileResults.length}, Tabs: ${tabs.length}`)

    // Add type indicator to app results with priority boost
    const appsWithType = apps.map(app => ({
      ...app,
      type: 'app',
      priority: 3, // Highest priority
    }))

    // Add type indicator to tab results with priority boost
    const tabsWithType = tabs.map(tab => ({
      ...tab,
      type: 'tab',
      name: tab.title,
      priority: 2, // Medium priority
    }))

    // Add type indicator to file results
    const filesWithType = fileResults.map(file => ({
      ...file,
      type: 'file',
      priority: 1, // Lowest priority
    }))

    // Search for system commands (these bypass Fuse.js)
    const commands = searchCommands(trimmedQuery)
    console.log(`[UnifiedSearch] Found ${commands.length} matching commands`)

    // Combine all result types for Fuse.js (NOT commands - they are pre-matched)
    const allResults = [...appsWithType, ...tabsWithType, ...filesWithType]

    // Apply fuzzy search on combined results
    let fuzzyResults = []
    if (allResults.length > 0) {
      const fuse = new Fuse(allResults, fuseOptions)
      fuzzyResults = fuse.search(trimmedQuery)
      console.log(`[UnifiedSearch] After fuzzy search: ${fuzzyResults.length} results`)
    }

    // Filter and map fuzzy results
    const matchedResults = fuzzyResults
      .filter(result => result.score < 0.25) // Only keep good matches
      .slice(0, 18) // Leave room for commands
      .map(result => ({
        ...result.item,
        score: result.score,
      }))
      .sort((a, b) => {
        // Primary sort: by match score (lower = better match)
        const scoreDiff = (a.score || 0) - (b.score || 0)
        // Use priority as tiebreaker only for very similar scores (within 0.05)
        if (Math.abs(scoreDiff) < 0.05) {
          return (b.priority || 0) - (a.priority || 0)
        }
        return scoreDiff
      })

    // Prepend commands to results (they're already filtered by searchCommands)
    const commandsWithScore = commands.map(cmd => ({ ...cmd, score: 0 }))
    const finalResults = [...commandsWithScore, ...matchedResults].slice(0, 20)

    // If no results at all, show web search fallback
    if (finalResults.length === 0) {
      console.log('[UnifiedSearch] No results, adding web search fallback')
      return [getWebSearchResult(trimmedQuery, true)]
    }

    console.log(`[UnifiedSearch] Final results: ${finalResults.length} items`)
    return finalResults
  } catch (error) {
    console.error('[UnifiedSearch] Unexpected error:', error)
    return []
  }
}

/**
 * Search only tabs
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of tab results
 */
export async function searchTabs(query) {
  if (!query || query.trim() === '') {
    return []
  }

  try {
    const tabs = await ipcRenderer.invoke('get-tabs')

    // Add type indicator and normalize field names
    const tabsWithType = tabs.map(tab => ({
      ...tab,
      type: 'tab',
      name: tab.title,
    }))

    // Apply fuzzy search
    const fuse = new Fuse(tabsWithType, fuseOptions)
    const fuzzyResults = fuse.search(query)

    // Return top 20 results
    return fuzzyResults.slice(0, 20).map(result => ({
      ...result.item,
      score: result.score,
    }))
  } catch (error) {
    console.error('Tab search error:', error)
    return []
  }
}

