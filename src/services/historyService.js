/**
 * Search History Service
 * Stores recent selections for quick access when search is empty
 */

const HISTORY_KEY = 'rau-history'
const MAX_HISTORY_SIZE = 20

/**
 * Get the search history from localStorage
 * @returns {Array} Array of history items
 */
export function getHistory() {
    try {
        const stored = localStorage.getItem(HISTORY_KEY)
        if (!stored) return []

        const history = JSON.parse(stored)
        return Array.isArray(history) ? history : []
    } catch (error) {
        console.error('[History] Error reading history:', error)
        return []
    }
}

/**
 * Add an item to the search history
 * Removes duplicates and keeps the most recent at the top
 * @param {Object} item - The item to add (app, tab, or file)
 */
export function addToHistory(item) {
    try {
        if (!item || !item.type) return

        const history = getHistory()

        // Create a unique key for the item based on type
        const itemKey = getItemKey(item)

        // Remove any existing duplicate
        const filteredHistory = history.filter(h => getItemKey(h) !== itemKey)

        // Add new item at the beginning
        const newHistory = [
            {
                ...item,
                timestamp: Date.now(),
            },
            ...filteredHistory,
        ].slice(0, MAX_HISTORY_SIZE)

        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
    } catch (error) {
        console.error('[History] Error saving to history:', error)
    }
}

/**
 * Clear all search history
 */
export function clearHistory() {
    try {
        localStorage.removeItem(HISTORY_KEY)
    } catch (error) {
        console.error('[History] Error clearing history:', error)
    }
}

/**
 * Get a unique key for an item based on its type
 * @param {Object} item - The item to get a key for
 * @returns {string} Unique key string
 */
function getItemKey(item) {
    switch (item.type) {
        case 'app':
            return `app:${item.path}`
        case 'tab':
            return `tab:${item.url}`
        case 'file':
            return `file:${item.path}`
        default:
            return `unknown:${item.path || item.url || item.name}`
    }
}

export default {
    getHistory,
    addToHistory,
    clearHistory,
}
