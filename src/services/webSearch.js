/**
 * Web Search Service
 * Provides web search fallback and bang prefix support
 */

// Default fallbacks if no settings provided
const DEFAULT_ENGINES = {
    g: { name: 'Google', url: 'https://google.com/search?q=', icon: '🔍' },
    default: { name: 'Google', url: 'https://google.com/search?q=', icon: '🔍' },
}

/**
 * Check if query starts with a bang prefix
 * @param {string} query - Search query
 * @param {Object} customBangs - Dictionary of bang definitions
 * @returns {Object|null} Bang info with engine and search term, or null
 */
export function parseBangQuery(query, customBangs = {}) {
    // Match "bang term" -> group 1: bang, group 2: term
    const match = query.match(/^([a-zA-Z0-9]+)\s+(.+)$/)
    
    if (match) {
        const prefix = match[1].toLowerCase()
        const searchTerm = match[2].trim()
        
        // Check if prefix exists in provided bangs or defaults
        const engine = customBangs[prefix] || DEFAULT_ENGINES[prefix]
        
        if (engine) {
            return { engine, searchTerm, prefix }
        }
    }
    return null
}

/**
 * Get a web search result for the query
 * @param {string} query - Search query
 * @param {boolean} isFallback - Whether this is a fallback (no local results)
 * @param {Object} customBangs - Dictionary of bang definitions
 * @returns {Object} Web search result object
 */
export function getWebSearchResult(query, isFallback = false, customBangs = {}) {
    const bangInfo = parseBangQuery(query, customBangs)

    if (bangInfo) {
        // Bang prefix detected
        return {
            type: 'web-search',
            name: `Search ${bangInfo.engine.name} for "${bangInfo.searchTerm}"`,
            url: bangInfo.engine.url + encodeURIComponent(bangInfo.searchTerm),
            engine: bangInfo.engine.name,
            icon: bangInfo.engine.icon,
            priority: 10, // Highest priority for explicit bang searches
            score: 0,
        }
    }

    // Default fallback to Google
    const engine = DEFAULT_ENGINES.default
    return {
        type: 'web-search',
        name: isFallback
            ? `Search Google for "${query}"`
            : `Search the web for "${query}"`,
        url: engine.url + encodeURIComponent(query),
        engine: engine.name,
        icon: engine.icon,
        priority: isFallback ? 0 : -1, // Lower priority as fallback
        score: 1, // Worst score since it's a fallback
    }
}

/**
 * Check if query is a bang search (starts with bang prefix)
 * @param {string} query - Search query
 * @param {Object} customBangs - Dictionary of bang definitions
 * @returns {boolean}
 */
export function isBangSearch(query, customBangs = {}) {
    return parseBangQuery(query, customBangs) !== null
}

export default {
    getWebSearchResult,
    parseBangQuery,
    isBangSearch,
}
