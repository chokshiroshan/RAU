/**
 * Web Search Service
 * Provides web search fallback and bang prefix support
 */

// Search engine definitions
const SEARCH_ENGINES = {
    g: { name: 'Google', url: 'https://google.com/search?q=', icon: '🔍' },
    w: { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Search/', icon: '📚' },
    yt: { name: 'YouTube', url: 'https://youtube.com/results?search_query=', icon: '▶️' },
    gh: { name: 'GitHub', url: 'https://github.com/search?q=', icon: '🐙' },
    so: { name: 'Stack Overflow', url: 'https://stackoverflow.com/search?q=', icon: '📋' },
    r: { name: 'Reddit', url: 'https://reddit.com/search?q=', icon: '🤖' },
    default: { name: 'Google', url: 'https://google.com/search?q=', icon: '🔍' },
}

// Regex to match bang prefixes like "g ", "yt ", etc.
const BANG_REGEX = /^(g|w|yt|gh|so|r)\s+(.+)$/i

/**
 * Check if query starts with a bang prefix
 * @param {string} query - Search query
 * @returns {Object|null} Bang info with engine and search term, or null
 */
export function parseBangQuery(query) {
    const match = query.match(BANG_REGEX)
    if (match) {
        const prefix = match[1].toLowerCase()
        const searchTerm = match[2].trim()
        const engine = SEARCH_ENGINES[prefix]
        return { engine, searchTerm, prefix }
    }
    return null
}

/**
 * Get a web search result for the query
 * @param {string} query - Search query
 * @param {boolean} isFallback - Whether this is a fallback (no local results)
 * @returns {Object} Web search result object
 */
export function getWebSearchResult(query, isFallback = false) {
    const bangInfo = parseBangQuery(query)

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
    const engine = SEARCH_ENGINES.default
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
 * @returns {boolean}
 */
export function isBangSearch(query) {
    return BANG_REGEX.test(query)
}

export default {
    getWebSearchResult,
    parseBangQuery,
    isBangSearch,
}
