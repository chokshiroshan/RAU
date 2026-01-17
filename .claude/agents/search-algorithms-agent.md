---
name: search-algorithms-agent
description: Expert in search functionality, result ranking, and performance optimization using Fuse.js. Use proactively when optimizing search results, implementing custom scoring, or tuning search performance for large datasets.
---

# Search Algorithms Agent

## Primary Responsibilities
- Fuse.js configuration and scoring algorithm optimization
- Multi-source result combination and ranking strategies
- Search performance optimization and caching
- Fuzzy matching and relevance tuning
- Query processing and validation

## Core Expertise
- **Fuzzy Search**: Advanced Fuse.js configuration with custom weights and thresholds
- **Result Ranking**: Multi-factor scoring algorithms for relevance determination
- **Performance Optimization**: Search caching, debouncing, and parallel execution
- **Query Processing**: Input validation, normalization, and special case handling
- **Relevance Tuning**: User feedback integration and machine learning approaches

## Key Files/Directories
- `src/services/unifiedSearch.js` - Main search orchestrator
- `src/services/fileSearch.js` - File search implementation
- `src/services/appSearch.js` - Application search
- `src/services/commandSearch.js` - System commands
- `src/constants/config.js` - Search configuration constants

## Common Tasks

### 1. Fuse.js Configuration Optimization

**Advanced Fuse.js Setup**:
```javascript
// src/services/unifiedSearch.js
const fuseOptions = {
  keys: [
    { 
      name: 'name', 
      weight: 3.0,           // App names (highest priority)
      threshold: 0.3,        // More lenient for names
      distance: 30           // Tighter matching for names
    },
    { 
      name: 'title', 
      weight: 2.5,           // Tab titles (high priority)
      threshold: 0.2,        // Standard threshold
      distance: 50           // Standard distance
    },
    { 
      name: 'url', 
      weight: 1.8,           // URLs (medium priority)
      threshold: 0.1,        // Strict matching for URLs
      distance: 100          // Wider distance for URLs
    },
    { 
      name: 'path', 
      weight: 1.2,           // File paths (lower priority)
      threshold: 0.15,       // Slightly strict for paths
      distance: 80           // Standard distance
    },
    { 
      name: 'content', 
      weight: 0.8,           // File content (lowest priority)
      threshold: 0.4,        // Lenient for content
      distance: 200          // Wide distance for content
    }
  ],
  threshold: 0.2,              // Global threshold
  distance: 50,                // Default distance
  includeScore: true,          // Include relevance scores
  shouldSort: true,            // Sort by relevance
  minMatchCharLength: 2,       // Require 2+ characters
  ignoreLocation: true,        // Don't penalize location
  useExtendedSearch: true,     // Enable extended search features
  findAllMatches: false,       // Find best match only
  location: 0,                 // Start from beginning
  caseSensitive: false,       // Case insensitive
  includeMatches: false,       // Don't include match details
  sortFn: customSortFunction   // Custom sorting algorithm
}

// Custom sorting function for multi-factor ranking
function customSortFunction(a, b) {
  // Base score from Fuse.js
  const scoreDiff = a.score - b.score
  
  // Priority weighting
  const aPriority = RESULT_PRIORITIES[a.item.type] || 0
  const bPriority = RESULT_PRIORITIES[b.item.type] || 0
  const priorityDiff = bPriority - aPriority
  
  // Recent usage boost
  const aRecent = getRecentUsageScore(a.item)
  const bRecent = getRecentUsageScore(b.item)
  const recentDiff = bRecent - aRecent
  
  // Combine factors with weights
  const combinedScore = (
    scoreDiff * 0.4 +           // 40% Fuse.js score
    priorityDiff * 0.4 +       // 40% Priority weighting
    recentDiff * 0.2           // 20% Recent usage
  )
  
  return combinedScore
}
```

### 2. Multi-Source Result Combination

**Result Orchestration**:
```javascript
// src/services/unifiedSearch.js
export async function searchUnified(query, filters) {
  const activeFilters = filters || { apps: true, files: true, tabs: true, commands: true }
  
  // Query validation and preprocessing
  if (!isValidQuery(query)) return []
  
  const trimmedQuery = query.trim()
  
  // Special case handling (calculator, commands, web search)
  const specialResult = handleSpecialQueries(trimmedQuery)
  if (specialResult) return [specialResult]
  
  // Parallel search execution
  const searchPromises = []
  const searchContext = { query: trimmedQuery, timestamp: Date.now() }
  
  // App search
  if (activeFilters.apps) {
    searchPromises.push(
      searchApps(searchContext).catch(err => {
        safeError('[UnifiedSearch] App search failed:', err)
        return []
      })
    )
  }
  
  // Tab search
  if (activeFilters.tabs) {
    searchPromises.push(
      searchTabs(searchContext).catch(err => {
        safeError('[UnifiedSearch] Tab search failed:', err)
        return []
      })
    )
  }
  
  // File search
  if (activeFilters.files) {
    searchPromises.push(
      searchFiles(searchContext).catch(err => {
        safeError('[UnifiedSearch] File search failed:', err)
        return []
      })
    )
  }
  
  // Command search
  if (activeFilters.commands) {
    searchPromises.push(
      searchCommands(searchContext).catch(err => {
        safeError('[UnifiedSearch] Command search failed:', err)
        return []
      })
    )
  }
  
  // Execute all searches in parallel
  const results = await Promise.all(searchPromises)
  
  // Combine and rank results
  return combineAndRankResults(results.flat(), searchContext)
}

// Advanced result combination
function combineAndRankResults(rawResults, context) {
  // Group results by type for processing
  const groupedResults = groupResultsByType(rawResults)
  
  // Apply type-specific optimizations
  const optimizedResults = {
    apps: optimizeAppResults(groupedResults.apps, context),
    tabs: optimizeTabResults(groupedResults.tabs, context),
    files: optimizeFileResults(groupedResults.files, context),
    commands: optimizeCommandResults(groupedResults.commands, context)
  }
  
  // Combine all optimized results
  const allResults = [
    ...optimizedResults.apps,
    ...optimizedResults.tabs,
    ...optimizedResults.files,
    ...optimizedResults.commands
  ]
  
  // Apply global ranking
  const rankedResults = applyGlobalRanking(allResults, context)
  
  // Apply result limits and diversity
  return applyResultLimits(rankedResults, context)
}
```

### 3. Performance Optimization

**Search Caching Strategy**:
```javascript
// src/services/searchCache.js
class SearchCache {
  constructor(maxSize = 1000, ttl = 300000) { // 5 minutes TTL
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
    this.accessOrder = [] // LRU tracking
  }
  
  get(key) {
    const item = this.cache.get(key)
    if (!item) return null
    
    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      return null
    }
    
    // Update LRU order
    this.updateAccessOrder(key)
    return item.data
  }
  
  set(key, data) {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.accessOrder.shift()
      this.cache.delete(oldestKey)
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
    
    this.updateAccessOrder(key)
  }
  
  updateAccessOrder(key) {
    this.removeFromAccessOrder(key)
    this.accessOrder.push(key)
  }
  
  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }
  
  clear() {
    this.cache.clear()
    this.accessOrder = []
  }
}

// Usage in unified search
const searchCache = new SearchCache(500, 180000) // 3 minutes, 500 entries

export async function searchUnified(query, filters) {
  // Generate cache key
  const cacheKey = generateCacheKey(query, filters)
  
  // Check cache first
  const cachedResults = searchCache.get(cacheKey)
  if (cachedResults) {
    safeLog('[UnifiedSearch] Cache hit for query:', query)
    return cachedResults
  }
  
  // Perform search
  const results = await performSearch(query, filters)
  
  // Cache results
  searchCache.set(cacheKey, results)
  
  return results
}

function generateCacheKey(query, filters) {
  const filterString = Object.entries(filters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join(',')
  
  return `${query.toLowerCase()}|${filterString}`
}
```

### 4. Query Processing and Validation

**Advanced Query Processing**:
```javascript
// src/services/queryProcessor.js
export class QueryProcessor {
  constructor() {
    this.specialPatterns = new Map([
      [/^[\d\s+\-*/().%^]+$/, 'calculator'],
      [/^(sleep|lock|restart|shutdown|logout|empty\s+trash)$/, 'command'],
      [/^(g|google)\s+(.+)$/, 'web-search'],
      [/^(open|launch)\s+(.+)$/, 'app-launch'],
      [/^(find|search)\s+(.+)$/, 'file-search']
    ])
  }
  
  processQuery(query) {
    const processed = {
      original: query,
      normalized: this.normalizeQuery(query),
      type: this.detectQueryType(query),
      intent: this.detectQueryIntent(query),
      confidence: this.calculateConfidence(query),
      suggestions: this.generateSuggestions(query)
    }
    
    return processed
  }
  
  normalizeQuery(query) {
    return query
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-./]/g, '') // Remove special chars except safe ones
  }
  
  detectQueryType(query) {
    for (const [pattern, type] of this.specialPatterns) {
      if (pattern.test(query)) {
        return type
      }
    }
    return 'general-search'
  }
  
  detectQueryIntent(query) {
    const normalized = this.normalizeQuery(query)
    
    // File intent indicators
    if (normalized.includes('.') || normalized.includes('/')) {
      return 'file'
    }
    
    // App intent indicators
    if (APP_ALIASES.has(normalized)) {
      return 'app'
    }
    
    // Tab intent indicators
    if (normalized.includes('http') || normalized.includes('www')) {
      return 'tab'
    }
    
    return 'general'
  }
  
  calculateConfidence(query) {
    let confidence = 0.5 // Base confidence
    
    // Length confidence
    if (query.length >= 3) confidence += 0.1
    if (query.length >= 5) confidence += 0.1
    
    // Pattern confidence
    if (this.detectQueryType(query) !== 'general-search') {
      confidence += 0.2
    }
    
    // Intent confidence
    const intent = this.detectQueryIntent(query)
    if (intent !== 'general') {
      confidence += 0.1
    }
    
    return Math.min(confidence, 1.0)
  }
  
  generateSuggestions(query) {
    const suggestions = []
    const normalized = this.normalizeQuery(query)
    
    // App suggestions
    for (const [alias, appName] of APP_ALIASES) {
      if (alias.includes(normalized) && !alias === normalized) {
        suggestions.push({
          type: 'app',
          text: appName,
          confidence: calculateStringSimilarity(normalized, alias)
        })
      }
    }
    
    // Command suggestions
    for (const command of SYSTEM_COMMANDS) {
      if (command.includes(normalized) && !command === normalized) {
        suggestions.push({
          type: 'command',
          text: command,
          confidence: calculateStringSimilarity(normalized, command)
        })
      }
    }
    
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5) // Top 5 suggestions
  }
}
```

### 5. Relevance Tuning with User Feedback

**Learning from User Behavior**:
```javascript
// src/services/relevanceTuner.js
export class RelevanceTuner {
  constructor() {
    this.userFeedback = new Map()
    this.resultWeights = new Map()
    this.loadFeedbackData()
  }
  
  recordUserSelection(result, query, position) {
    const key = `${result.type}:${result.id}`
    const feedback = this.userFeedback.get(key) || {
      selections: 0,
      lastSelected: 0,
      averagePosition: position,
      queries: new Set()
    }
    
    feedback.selections++
    feedback.lastSelected = Date.now()
    feedback.averagePosition = (feedback.averagePosition + position) / 2
    feedback.queries.add(query)
    
    this.userFeedback.set(key, feedback)
    this.saveFeedbackData()
  }
  
  calculateRelevanceBoost(result, query) {
    const key = `${result.type}:${result.id}`
    const feedback = this.userFeedback.get(key)
    
    if (!feedback) return 0
    
    let boost = 0
    
    // Selection frequency boost
    const selectionRate = feedback.selections / Math.max(1, feedback.queries.size)
    boost += selectionRate * 0.3
    
    // Recency boost
    const daysSinceLastSelection = (Date.now() - feedback.lastSelected) / (1000 * 60 * 60 * 24)
    const recencyBoost = Math.max(0, 1 - daysSinceLastSelection / 30) // Decay over 30 days
    boost += recencyBoost * 0.2
    
    // Position boost (better positions get more boost)
    const positionBoost = Math.max(0, 1 - feedback.averagePosition / 10)
    boost += positionBoost * 0.1
    
    return boost
  }
  
  updateFuseWeights() {
    // Analyze user feedback to adjust Fuse.js weights
    const feedbackAnalysis = this.analyzeFeedback()
    
    // Adjust weights based on user behavior
    const adjustedWeights = {
      name: 3.0 + feedbackAnalysis.nameWeight,
      title: 2.0 + feedbackAnalysis.titleWeight,
      url: 1.5 + feedbackAnalysis.urlWeight,
      path: 1.0 + feedbackAnalysis.pathWeight
    }
    
    return adjustedWeights
  }
  
  analyzeFeedback() {
    const analysis = {
      nameWeight: 0,
      titleWeight: 0,
      urlWeight: 0,
      pathWeight: 0
    }
    
    let totalFeedback = 0
    
    for (const [key, feedback] of this.userFeedback) {
      const [type] = key.split(':')
      totalFeedback += feedback.selections
      
      // Categorize feedback by result type
      if (type === 'app') {
        analysis.nameWeight += feedback.selections
      } else if (type === 'tab') {
        analysis.titleWeight += feedback.selections
        analysis.urlWeight += feedback.selections
      } else if (type === 'file') {
        analysis.pathWeight += feedback.selections
      }
    }
    
    // Normalize weights
    if (totalFeedback > 0) {
      Object.keys(analysis).forEach(key => {
        analysis[key] = (analysis[key] / totalFeedback) * 2 - 1 // Range: -1 to 1
      })
    }
    
    return analysis
  }
}
```

## Testing Approach

### Search Performance Testing
```javascript
// tests/searchPerformance.test.js
describe('Search Performance', () => {
  test('should complete search within time limit', async () => {
    const startTime = Date.now()
    const results = await searchUnified('test query', { apps: true, tabs: true })
    const duration = Date.now() - startTime
    
    expect(duration).toBeLessThan(1000) // 1 second max
    expect(results.length).toBeGreaterThan(0)
  })
  
  test('should handle large result sets efficiently', async () => {
    // Mock large dataset
    const largeDataset = generateMockResults(1000)
    const startTime = Date.now()
    const rankedResults = applyGlobalRanking(largeDataset)
    const duration = Date.now() - startTime
    
    expect(duration).toBeLessThan(500) // 500ms max for ranking
    expect(rankedResults.length).toBeLessThanOrEqual(20) // Result limit applied
  })
  
  test('should maintain cache hit rate', async () => {
    const query = 'repeated query'
    
    // First search (cache miss)
    await searchUnified(query)
    
    // Second search (cache hit)
    const startTime = Date.now()
    await searchUnified(query)
    const duration = Date.now() - startTime
    
    expect(duration).toBeLessThan(50) // Should be very fast from cache
  })
})
```

### Relevance Testing
```javascript
// tests/searchRelevance.test.js
describe('Search Relevance', () => {
  test('should rank apps higher than files', async () => {
    const results = await searchUnified('safari', { apps: true, files: true })
    const appResults = results.filter(r => r.type === 'app')
    const fileResults = results.filter(r => r.type === 'file')
    
    // Apps should appear before files for "safari" query
    if (appResults.length > 0 && fileResults.length > 0) {
      const firstAppIndex = results.findIndex(r => r.type === 'app')
      const firstFileIndex = results.findIndex(r => r.type === 'file')
      expect(firstAppIndex).toBeLessThan(firstFileIndex)
    }
  })
  
  test('should boost frequently selected results', async () => {
    // Simulate user selecting a specific result
    const tuner = new RelevanceTuner()
    const testResult = { type: 'app', id: 'safari', name: 'Safari' }
    tuner.recordUserSelection(testResult, 'safari', 1)
    
    // Search again
    const results = await searchUnified('safari', { apps: true })
    const safariResult = results.find(r => r.id === 'safari')
    
    // Should be boosted to top position
    expect(results[0].id).toBe('safari')
  })
})
```

## Integration Notes
- **Service Integration**: Works with all search services (apps, tabs, files, commands)
- **Caching Integration**: Integrates with search cache for performance
- **UI Integration**: Provides ranked results with confidence scores
- **Settings Integration**: Search preferences and tuning parameters

## Common Search Issues

### 1. Poor Result Ranking
**Problem**: Irrelevant results appear at top.

**Solutions**:
```javascript
// Adjust Fuse.js weights based on user feedback
const dynamicWeights = relevanceTuner.updateFuseWeights()
const fuseOptions = { ...baseOptions, keys: dynamicWeights }

// Add manual boosting for specific cases
function applyManualBoosts(results, query) {
  return results.map(result => {
    let boost = 0
    
    // Boost exact matches
    if (result.name.toLowerCase() === query.toLowerCase()) {
      boost += 2.0
    }
    
    // Boost prefix matches
    if (result.name.toLowerCase().startsWith(query.toLowerCase())) {
      boost += 1.0
    }
    
    // Apply boost to score
    result.score = Math.max(0, result.score - boost)
    return result
  })
}
```

### 2. Slow Search Performance
**Problem**: Search takes too long to complete.

**Solutions**:
```javascript
// Implement progressive search
async function progressiveSearch(query, filters) {
  // Fast initial search
  const quickResults = await quickSearch(query, filters)
  
  // Return quick results immediately
  if (quickResults.length > 0) {
    return quickResults
  }
  
  // Full search in background
  return await fullSearch(query, filters)
}

// Optimize search order by likelihood
const searchOrder = ['apps', 'commands', 'tabs', 'files'] // Fastest to slowest
```

### 3. Memory Usage Growth
**Problem**: Search cache grows too large.

**Solutions**:
```javascript
// Implement intelligent cache eviction
class IntelligentSearchCache extends SearchCache {
  constructor(maxSize = 500, ttl = 180000) {
    super(maxSize, ttl)
    this.accessFrequency = new Map()
  }
  
  get(key) {
    const result = super.get(key)
    if (result) {
      // Track access frequency
      const freq = this.accessFrequency.get(key) || 0
      this.accessFrequency.set(key, freq + 1)
    }
    return result
  }
  
  evictLeastValuable() {
    // Find least valuable entry (low frequency, old timestamp)
    let leastValuableKey = null
    let leastValuableScore = Infinity
    
    for (const [key, item] of this.cache.entries()) {
      const frequency = this.accessFrequency.get(key) || 0
      const age = Date.now() - item.timestamp
      const score = frequency / age // Frequency per unit time
      
      if (score < leastValuableScore) {
        leastValuableScore = score
        leastValuableKey = key
      }
    }
    
    if (leastValuableKey) {
      this.cache.delete(leastValuableKey)
      this.accessFrequency.delete(leastValuableKey)
      this.removeFromAccessOrder(leastValuableKey)
    }
  }
}
```

## When to Use This Agent
Use this agent when working on:
- Optimizing search result ranking and relevance
- Improving search performance and caching
- Implementing fuzzy search with Fuse.js
- Adding new search categories or algorithms
- Tuning search based on user feedback
- Debugging search quality issues

## Related Documentation
- [Architecture Guide](docs/ARCHITECTURE.md) - Search service integration
- [API Reference](docs/API.md) - Search service APIs
- [Performance Agent](.claude/agents/performance-agent.md) - Performance optimization
- [React UI Agent](.claude/agents/react-ui-agent.md) - Search interface optimization
