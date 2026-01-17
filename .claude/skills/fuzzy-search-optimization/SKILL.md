---
name: fuzzy-search-optimization
description: Provides advanced patterns, configurations, and optimization techniques for implementing high-performance fuzzy search using Fuse.js, including custom scoring algorithms, performance tuning, and relevance optimization. Use when optimizing Fuse.js configuration, implementing custom scoring, tuning performance for large datasets, or debugging fuzzy search quality and performance issues.
# Fuzzy Search Optimization Skill

## Purpose
Provides advanced patterns, configurations, and optimization techniques for implementing high-performance fuzzy search using Fuse.js in ContextSearch, including custom scoring algorithms, performance tuning, and relevance optimization.

## When to Use
- Optimizing Fuse.js configuration for better search results
- Implementing custom scoring algorithms for relevance
- Tuning search performance for large datasets
- Adding advanced search features (weights, thresholds, custom keys)
- Debugging fuzzy search quality and performance issues

## Key Patterns

### 1. Advanced Fuse.js Configuration

**Optimized Configuration for ContextSearch**:
```javascript
// src/services/searchConfig.js
export const SEARCH_CONFIG = {
  // Core Fuse.js options
  fuseOptions: {
    // Search keys with custom weights and thresholds
    keys: [
      {
        name: 'name',
        weight: 3.5,           // Highest priority for exact names
        threshold: 0.2,        // Strict matching for names
        distance: 30,           // Tight distance for names
        caseSensitive: false,   // Case insensitive
        ignoreLocation: false,  // Consider location for names
      },
      {
        name: 'title',
        weight: 2.8,           // High priority for titles
        threshold: 0.3,        // Moderate threshold for titles
        distance: 50,           // Standard distance
        caseSensitive: false,
        ignoreLocation: true,   // Ignore location for titles
      },
      {
        name: 'url',
        weight: 1.8,           // Medium priority for URLs
        threshold: 0.1,        // Strict matching for URLs
        distance: 100,          // Wider distance for URLs
        caseSensitive: false,
        ignoreLocation: true,
      },
      {
        name: 'path',
        weight: 1.2,           // Lower priority for paths
        threshold: 0.15,       // Slightly strict for paths
        distance: 80,           // Standard distance
        caseSensitive: false,
        ignoreLocation: true,
      },
      {
        name: 'content',
        weight: 0.8,           // Lowest priority for content
        threshold: 0.4,        // Lenient for content
        distance: 200,          // Wide distance for content
        caseSensitive: false,
        ignoreLocation: true,
      }
    ],
    
    // Global search options
    threshold: 0.25,              // Global threshold (stricter than default)
    distance: 50,                // Default distance
    includeScore: true,          // Include relevance scores
    shouldSort: true,            // Sort by relevance
    minMatchCharLength: 2,       // Require 2+ characters
    ignoreLocation: true,        // Don't penalize location globally
    useExtendedSearch: true,     // Enable extended search features
    findAllMatches: false,       // Find best match only
    location: 0,                 // Start from beginning
    caseSensitive: false,       // Case insensitive
    includeMatches: false,       // Don't include match details for performance
    sortFn: customSortFunction,   // Custom sorting algorithm
  },
  
  // Performance settings
  performance: {
    maxResults: 20,              // Limit results for performance
    enableCaching: true,         // Enable result caching
    cacheSize: 100,              // Cache size
    cacheTimeout: 300000,         // 5 minutes cache TTL
    enablePreFiltering: true,    // Pre-filter datasets
    preFilterThreshold: 1000,    // Pre-filter if dataset > 1000 items
  },
  
  // Relevance tuning
  relevance: {
    enableBoosting: true,        // Enable relevance boosting
    boostRecentUsage: 0.2,       // Boost recently used items
    boostExactMatches: 0.5,      // Boost exact matches
    boostPrefixMatches: 0.3,     // Boost prefix matches
    boostTypePriority: 0.4,      // Boost based on result type
  }
}

// Custom sorting function for multi-factor relevance
function customSortFunction(a, b) {
  // Base Fuse.js score (lower is better)
  const scoreDiff = a.score - b.score
  
  // Type priority weighting
  const aPriority = RESULT_PRIORITIES[a.item.type] || 0
  const bPriority = RESULT_PRIORITIES[b.item.type] || 0
  const priorityDiff = bPriority - aPriority
  
  // Exact match bonus
  const aExact = isExactMatch(a.item, a.query)
  const bExact = isExactMatch(b.item, b.query)
  const exactDiff = (bExact ? 1 : 0) - (aExact ? 1 : 0)
  
  // Prefix match bonus
  const aPrefix = isPrefixMatch(a.item, a.query)
  const bPrefix = isPrefixMatch(b.item, b.query)
  const prefixDiff = (bPrefix ? 1 : 0) - (aPrefix ? 1 : 0)
  
  // Recent usage bonus
  const aRecent = getRecentUsageScore(a.item)
  const bRecent = getRecentUsageScore(b.item)
  const recentDiff = bRecent - aRecent
  
  // Combine factors with weights
  const combinedScore = (
    scoreDiff * 0.4 +           // 40% Fuse.js score
    priorityDiff * 0.3 +       // 30% Type priority
    exactDiff * 0.15 +         // 15% Exact match bonus
    prefixDiff * 0.1 +         // 10% Prefix match bonus
    recentDiff * 0.05          // 5% Recent usage
  )
  
  return combinedScore
}
```

### 2. Dynamic Search Configuration

**Adaptive Configuration Based on Query Type**:
```javascript
// src/services/adaptiveSearch.js
export class AdaptiveSearchConfig {
  constructor() {
    this.queryPatterns = new Map([
      [/^[a-zA-Z0-9._-]+$/, 'exact-match'],    // Simple exact match
      [/^[a-zA-Z]{2,}$/, 'app-search'],          // Likely app name
      [/^https?:\/\//, 'url-search'],            // URL search
      [/^[a-zA-Z0-9._-]+\.(js|jsx|ts|tsx|json|md)$/, 'file-search'], // File extension
      [/^[\d\s+\-*/().%^]+$/, 'calculator'],     // Math expression
      [/^(sleep|lock|restart|shutdown|logout)$/, 'command'] // System command
    ])
    
    this.configurations = {
      'exact-match': {
        threshold: 0.1,
        distance: 20,
        keys: [
          { name: 'name', weight: 4.0, threshold: 0.1 },
          { name: 'path', weight: 2.0, threshold: 0.1 }
        ]
      },
      'app-search': {
        threshold: 0.2,
        distance: 30,
        keys: [
          { name: 'name', weight: 4.5, threshold: 0.15 },
          { name: 'path', weight: 1.0, threshold: 0.3 }
        ]
      },
      'url-search': {
        threshold: 0.15,
        distance: 100,
        keys: [
          { name: 'url', weight: 3.5, threshold: 0.1 },
          { name: 'title', weight: 2.0, threshold: 0.3 }
        ]
      },
      'file-search': {
        threshold: 0.3,
        distance: 80,
        keys: [
          { name: 'name', weight: 3.0, threshold: 0.2 },
          { name: 'path', weight: 1.5, threshold: 0.4 }
        ]
      },
      'general': SEARCH_CONFIG.fuseOptions
    }
  }
  
  getConfiguration(query, dataset) {
    // Detect query type
    const queryType = this.detectQueryType(query)
    const baseConfig = this.configurations[queryType] || this.configurations.general
    
    // Adapt based on dataset size
    const adaptedConfig = this.adaptForDataset(baseConfig, dataset)
    
    // Adapt based on query length
    return this.adaptForQueryLength(adaptedConfig, query)
  }
  
  detectQueryType(query) {
    for (const [pattern, type] of this.queryPatterns) {
      if (pattern.test(query)) {
        return type
      }
    }
    return 'general'
  }
  
  adaptForDataset(config, dataset) {
    const datasetSize = dataset.length
    
    if (datasetSize > 1000) {
      // Large dataset optimizations
      return {
        ...config,
        threshold: Math.max(config.threshold, 0.3), // Stricter threshold
        minMatchCharLength: Math.max(config.minMatchCharLength, 3),
        keys: config.keys.map(key => ({
          ...key,
          threshold: Math.max(key.threshold, 0.2)
        }))
      }
    } else if (datasetSize < 50) {
      // Small dataset optimizations
      return {
        ...config,
        threshold: Math.min(config.threshold, 0.15), // More lenient
        minMatchCharLength: Math.min(config.minMatchCharLength, 1),
        findAllMatches: true // Find all matches for small datasets
      }
    }
    
    return config
  }
  
  adaptForQueryLength(config, query) {
    const queryLength = query.length
    
    if (queryLength < 3) {
      // Short query - more lenient
      return {
        ...config,
        threshold: Math.min(config.threshold, 0.4),
        minMatchCharLength: 1
      }
    } else if (queryLength > 10) {
      // Long query - stricter
      return {
        ...config,
        threshold: Math.max(config.threshold, 0.15),
        minMatchCharLength: Math.max(config.minMatchCharLength, 3)
      }
    }
    
    return config
  }
}
```

### 3. Performance-Optimized Search Implementation

**High-Performance Search Service**:
```javascript
// src/services/optimizedSearch.js
export class OptimizedSearchService {
  constructor() {
    this.fuseInstances = new Map() // Cache Fuse instances
    this.resultCache = new Map()     // Cache search results
    this.adaptiveConfig = new AdaptiveSearchConfig()
    this.performanceMonitor = new SearchPerformanceMonitor()
  }
  
  async search(query, dataset, options = {}) {
    const startTime = Date.now()
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(query, dataset, options)
      const cachedResult = this.resultCache.get(cacheKey)
      if (cachedResult && this.isCacheValid(cachedResult)) {
        this.performanceMonitor.recordCacheHit()
        return cachedResult.results
      }
      
      // Get or create Fuse instance
      const fuse = this.getOrCreateFuseInstance(dataset, options)
      
      // Get adaptive configuration
      const config = this.adaptiveConfig.getConfiguration(query, dataset)
      
      // Apply configuration to Fuse instance
      this.applyConfiguration(fuse, config)
      
      // Perform search
      const rawResults = fuse.search(query)
      
      // Apply post-processing
      const processedResults = this.postProcessResults(rawResults, query, options)
      
      // Cache results
      this.cacheResults(cacheKey, processedResults)
      
      // Record performance metrics
      const duration = Date.now() - startTime
      this.performanceMonitor.recordSearch(duration, dataset.length, processedResults.length)
      
      return processedResults
      
    } catch (error) {
      this.performanceMonitor.recordError(error)
      throw error
    }
  }
  
  getOrCreateFuseInstance(dataset, options) {
    const datasetKey = this.generateDatasetKey(dataset, options)
    
    if (!this.fuseInstances.has(datasetKey)) {
      const config = this.adaptiveConfig.getConfiguration('general', dataset)
      const fuse = new Fuse(dataset, config)
      this.fuseInstances.set(datasetKey, fuse)
      
      // Clean up old instances if too many
      if (this.fuseInstances.size > 10) {
        const oldestKey = this.fuseInstances.keys().next().value
        this.fuseInstances.delete(oldestKey)
      }
    }
    
    return this.fuseInstances.get(datasetKey)
  }
  
  applyConfiguration(fuse, config) {
    // Update Fuse options (Note: Fuse.js doesn't support runtime config changes)
    // This would require creating a new instance
    return fuse
  }
  
  postProcessResults(results, query, options) {
    let processedResults = results
    
    // Apply relevance boosting
    if (options.enableBoosting) {
      processedResults = this.applyRelevanceBoosting(processedResults, query)
    }
    
    // Apply type filtering
    if (options.typeFilter) {
      processedResults = processedResults.filter(result => 
        options.typeFilter.includes(result.item.type)
      )
    }
    
    // Apply result limits
    if (options.maxResults) {
      processedResults = processedResults.slice(0, options.maxResults)
    }
    
    // Apply diversity (ensure different types)
    if (options.ensureDiversity) {
      processedResults = this.applyDiversity(processedResults)
    }
    
    return processedResults
  }
  
  applyRelevanceBoosting(results, query) {
    return results.map(result => {
      const boosted = { ...result }
      
      // Exact match boost
      if (this.isExactMatch(result.item, query)) {
        boosted.score = Math.max(0, boosted.score - 0.5)
      }
      
      // Prefix match boost
      if (this.isPrefixMatch(result.item, query)) {
        boosted.score = Math.max(0, boosted.score - 0.3)
      }
      
      // Type priority boost
      const typePriority = RESULT_PRIORITIES[result.item.type] || 0
      boosted.score = Math.max(0, boosted.score - (typePriority * 0.1))
      
      // Recent usage boost
      const recentScore = this.getRecentUsageScore(result.item)
      boosted.score = Math.max(0, boosted.score - (recentScore * 0.2))
      
      return boosted
    })
  }
  
  applyDiversity(results) {
    const diversified = []
    const typeCounts = {}
    const maxPerType = 5 // Maximum results per type
    
    for (const result of results) {
      const type = result.item.type
      const count = typeCounts[type] || 0
      
      if (count < maxPerType) {
        diversified.push(result)
        typeCounts[type] = count + 1
      }
      
      // Stop if we have enough diverse results
      if (diversified.length >= 20) break
    }
    
    return diversified
  }
  
  generateCacheKey(query, dataset, options) {
    const queryHash = this.hashString(query.toLowerCase())
    const datasetHash = this.hashString(JSON.stringify(dataset.slice(0, 10))) // Sample for hash
    const optionsHash = this.hashString(JSON.stringify(options))
    
    return `${queryHash}-${datasetHash}-${optionsHash}`
  }
  
  generateDatasetKey(dataset, options) {
    const sample = dataset.slice(0, 5) // Sample for key generation
    const sampleHash = this.hashString(JSON.stringify(sample))
    const optionsHash = this.hashString(JSON.stringify(options))
    
    return `${sampleHash}-${optionsHash}`
  }
  
  hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }
  
  isExactMatch(item, query) {
    const queryLower = query.toLowerCase()
    
    return (
      (item.name && item.name.toLowerCase() === queryLower) ||
      (item.title && item.title.toLowerCase() === queryLower) ||
      (item.path && item.path.toLowerCase() === queryLower)
    )
  }
  
  isPrefixMatch(item, query) {
    const queryLower = query.toLowerCase()
    
    return (
      (item.name && item.name.toLowerCase().startsWith(queryLower)) ||
      (item.title && item.title.toLowerCase().startsWith(queryLower)) ||
      (item.path && item.path.toLowerCase().startsWith(queryLower))
    )
  }
  
  getRecentUsageScore(item) {
    // Implementation would check recent usage history
    return 0 // Placeholder
  }
  
  isCacheValid(cachedResult) {
    const maxAge = 300000 // 5 minutes
    return (Date.now() - cachedResult.timestamp) < maxAge
  }
  
  cacheResults(key, results) {
    this.resultCache.set(key, {
      results,
      timestamp: Date.now()
    })
    
    // Clean up old cache entries
    if (this.resultCache.size > 100) {
      const oldestKey = this.resultCache.keys().next().value
      this.resultCache.delete(oldestKey)
    }
  }
  
  getPerformanceMetrics() {
    return this.performanceMonitor.getMetrics()
  }
}
```

### 4. Search Performance Monitoring

**Performance Monitoring and Analytics**:
```javascript
// src/services/searchPerformanceMonitor.js
export class SearchPerformanceMonitor {
  constructor() {
    this.metrics = {
      totalSearches: 0,
      cacheHits: 0,
      errors: 0,
      totalTime: 0,
      averageTime: 0,
      maxTime: 0,
      minTime: Infinity,
      recentTimes: []
    }
    
    this.queryMetrics = new Map()
    this.typeMetrics = new Map()
  }
  
  recordSearch(duration, datasetSize, resultCount, query = '', type = 'general') {
    this.metrics.totalSearches++
    this.metrics.totalTime += duration
    this.metrics.averageTime = this.metrics.totalTime / this.metrics.totalSearches
    this.metrics.maxTime = Math.max(this.metrics.maxTime, duration)
    this.metrics.minTime = Math.min(this.metrics.minTime, duration)
    
    // Keep recent times for trend analysis
    this.metrics.recentTimes.push(duration)
    if (this.metrics.recentTimes.length > 100) {
      this.metrics.recentTimes.shift()
    }
    
    // Query-specific metrics
    if (!this.queryMetrics.has(query)) {
      this.queryMetrics.set(query, {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        datasetSizes: [],
        resultCounts: []
      })
    }
    
    const queryMetric = this.queryMetrics.get(query)
    queryMetric.count++
    queryMetric.totalTime += duration
    queryMetric.averageTime = queryMetric.totalTime / queryMetric.count
    queryMetric.datasetSizes.push(datasetSize)
    queryMetric.resultCounts.push(resultCount)
    
    // Type-specific metrics
    if (!this.typeMetrics.has(type)) {
      this.typeMetrics.set(type, {
        count: 0,
        totalTime: 0,
        averageTime: 0
      })
    }
    
    const typeMetric = this.typeMetrics.get(type)
    typeMetric.count++
    typeMetric.totalTime += duration
    typeMetric.averageTime = typeMetric.totalTime / typeMetric.count
  }
  
  recordCacheHit() {
    this.metrics.cacheHits++
  }
  
  recordError(error) {
    this.metrics.errors++
    console.error('[SearchPerformance] Error:', error)
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.totalSearches > 0 
        ? this.metrics.cacheHits / this.metrics.totalSearches 
        : 0,
      errorRate: this.metrics.totalSearches > 0 
        ? this.metrics.errors / this.metrics.totalSearches 
        : 0,
      recentAverageTime: this.metrics.recentTimes.length > 0
        ? this.metrics.recentTimes.reduce((a, b) => a + b, 0) / this.metrics.recentTimes.length
        : 0
    }
  }
  
  getQueryMetrics(query) {
    return this.queryMetrics.get(query) || null
  }
  
  getTypeMetrics(type) {
    return this.typeMetrics.get(type) || null
  }
  
  getSlowQueries(threshold = 1000) {
    const slowQueries = []
    
    for (const [query, metric] of this.queryMetrics.entries()) {
      if (metric.averageTime > threshold) {
        slowQueries.push({
          query,
          averageTime: metric.averageTime,
          count: metric.count
        })
      }
    }
    
    return slowQueries.sort((a, b) => b.averageTime - a.averageTime)
  }
  
  getPerformanceReport() {
    const metrics = this.getMetrics()
    const slowQueries = this.getSlowQueries()
    
    return {
      summary: {
        totalSearches: metrics.totalSearches,
        averageTime: Math.round(metrics.averageTime),
        cacheHitRate: Math.round(metrics.cacheHitRate * 100),
        errorRate: Math.round(metrics.errorRate * 100)
      },
      performance: {
        maxTime: metrics.maxTime,
        minTime: metrics.minTime === Infinity ? 0 : metrics.minTime,
        recentAverageTime: Math.round(metrics.recentAverageTime)
      },
      issues: {
        slowQueries: slowQueries.slice(0, 10), // Top 10 slow queries
        highErrorRate: metrics.errorRate > 0.05, // 5% error rate threshold
        lowCacheHitRate: metrics.cacheHitRate < 0.3 // 30% cache hit rate threshold
      }
    }
  }
}
```

### 5. Search Quality Analysis

**Quality Metrics and Analysis**:
```javascript
// src/services/searchQualityAnalyzer.js
export class SearchQualityAnalyzer {
  constructor() {
    this.qualityMetrics = {
      precision: [],
      recall: [],
      f1Score: [],
      userSatisfaction: []
    }
  }
  
  analyzeSearchResults(query, results, expectedResults = [], userSelection = null) {
    const analysis = {
      query,
      resultCount: results.length,
      expectedCount: expectedResults.length,
      relevantResults: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      userSatisfaction: 0,
      issues: []
    }
    
    // Calculate precision (relevant results / total results)
    if (results.length > 0) {
      const relevantCount = this.countRelevantResults(results, expectedResults)
      analysis.relevantResults = relevantCount
      analysis.precision = relevantCount / results.length
    }
    
    // Calculate recall (relevant results found / total relevant results)
    if (expectedResults.length > 0) {
      analysis.recall = analysis.relevantResults / expectedResults.length
    }
    
    // Calculate F1 score
    if (analysis.precision + analysis.recall > 0) {
      analysis.f1Score = 2 * (analysis.precision * analysis.recall) / (analysis.precision + analysis.recall)
    }
    
    // Analyze user satisfaction
    if (userSelection) {
      analysis.userSatisfaction = this.calculateUserSatisfaction(userSelection, results, expectedResults)
    }
    
    // Identify quality issues
    analysis.issues = this.identifyQualityIssues(analysis)
    
    // Store metrics for trend analysis
    this.storeQualityMetrics(analysis)
    
    return analysis
  }
  
  countRelevantResults(results, expectedResults) {
    return results.filter(result => 
      expectedResults.some(expected => 
        this.isResultRelevant(result, expected)
      )
    ).length
  }
  
  isResultRelevant(result, expected) {
    // Check if result matches expected criteria
    return (
      result.id === expected.id ||
      (result.name && expected.name && result.name.toLowerCase() === expected.name.toLowerCase()) ||
      (result.url && expected.url && result.url === expected.url)
    )
  }
  
  calculateUserSatisfaction(userSelection, results, expectedResults) {
    let satisfaction = 0.5 // Base satisfaction
    
    // Bonus if user selected a relevant result
    if (expectedResults.length > 0) {
      const isSelectedRelevant = expectedResults.some(expected => 
        this.isResultRelevant(userSelection, expected)
      )
      if (isSelectedRelevant) {
        satisfaction += 0.3
      }
    }
    
    // Bonus if user selected from top results
    const selectedIndex = results.findIndex(r => r.id === userSelection.id)
    if (selectedIndex !== -1 && selectedIndex < 5) {
      satisfaction += 0.2
    }
    
    return Math.min(1, satisfaction)
  }
  
  identifyQualityIssues(analysis) {
    const issues = []
    
    // Low precision issue
    if (analysis.precision < 0.5) {
      issues.push({
        type: 'low_precision',
        severity: 'high',
        message: `Low precision: ${Math.round(analysis.precision * 100)}%`,
        suggestion: 'Adjust search thresholds or improve result ranking'
      })
    }
    
    // Low recall issue
    if (analysis.recall < 0.3) {
      issues.push({
        type: 'low_recall',
        severity: 'medium',
        message: `Low recall: ${Math.round(analysis.recall * 100)}%`,
        suggestion: 'Expand search scope or improve data indexing'
      })
    }
    
    // Too many results issue
    if (analysis.resultCount > 50) {
      issues.push({
        type: 'too_many_results',
        severity: 'medium',
        message: `Too many results: ${analysis.resultCount}`,
        suggestion: 'Increase search threshold or improve result filtering'
      })
    }
    
    // No results issue
    if (analysis.resultCount === 0 && analysis.expectedCount > 0) {
      issues.push({
        type: 'no_results',
        severity: 'high',
        message: 'No results found but expected results exist',
        suggestion: 'Check search configuration or data availability'
      })
    }
    
    return issues
  }
  
  storeQualityMetrics(analysis) {
    this.qualityMetrics.precision.push(analysis.precision)
    this.qualityMetrics.recall.push(analysis.recall)
    this.qualityMetrics.f1Score.push(analysis.f1Score)
    this.qualityMetrics.userSatisfaction.push(analysis.userSatisfaction)
    
    // Keep only recent metrics
    const maxHistory = 100
    Object.keys(this.qualityMetrics).forEach(key => {
      if (this.qualityMetrics[key].length > maxHistory) {
        this.qualityMetrics[key] = this.qualityMetrics[key].slice(-maxHistory)
      }
    })
  }
  
  getQualityReport() {
    const calculateAverage = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    
    return {
      average: {
        precision: calculateAverage(this.qualityMetrics.precision),
        recall: calculateAverage(this.qualityMetrics.recall),
        f1Score: calculateAverage(this.qualityMetrics.f1Score),
        userSatisfaction: calculateAverage(this.qualityMetrics.userSatisfaction)
      },
      trend: {
        precision: this.calculateTrend(this.qualityMetrics.precision),
        recall: this.calculateTrend(this.qualityMetrics.recall),
        f1Score: this.calculateTrend(this.qualityMetrics.f1Score),
        userSatisfaction: this.calculateTrend(this.qualityMetrics.userSatisfaction)
      },
      sampleSize: this.qualityMetrics.precision.length
    }
  }
  
  calculateTrend(values) {
    if (values.length < 10) return 'insufficient_data'
    
    const recent = values.slice(-5)
    const older = values.slice(-10, -5)
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
    
    const change = (recentAvg - olderAvg) / olderAvg
    
    if (change > 0.1) return 'improving'
    if (change < -0.1) return 'declining'
    return 'stable'
  }
}
```

## Common Pitfalls and Solutions

### Pitfall 1: Poor Fuse.js Configuration
**Problem**: Default configuration doesn't work well for specific use cases.

**Solution**:
```javascript
// Use adaptive configuration based on query and dataset
const adaptiveConfig = new AdaptiveSearchConfig()
const config = adaptiveConfig.getConfiguration(query, dataset)
const fuse = new Fuse(dataset, config)
```

### Pitfall 2: Performance Issues with Large Datasets
**Problem**: Search becomes slow with thousands of items.

**Solution**:
```javascript
// Implement pre-filtering and caching
if (dataset.length > 1000) {
  dataset = dataset.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
}

// Use result caching
const cacheKey = generateCacheKey(query, dataset)
if (cache.has(cacheKey)) {
  return cache.get(cacheKey)
}
```

### Pitfall 3: Irrelevant Result Ranking
**Problem**: Results don't match user expectations.

**Solution**:
```javascript
// Implement custom scoring with multiple factors
const customScore = (
  fuseScore * 0.4 +           // Fuse.js score
  typePriority * 0.3 +       // Type priority
  exactMatch * 0.2 +         // Exact match bonus
  recentUsage * 0.1         // Recent usage bonus
)
```

## When to Use This Skill
Use this skill when:
- Optimizing search result quality and relevance
- Improving search performance for large datasets
- Implementing custom scoring algorithms
- Debugging search quality issues
- Adding advanced search features
- Monitoring search performance and quality

## Related Files
- `src/services/unifiedSearch.js` - Main search orchestrator
- `src/services/searchConfig.js` - Search configuration
- `src/services/adaptiveSearch.js` - Adaptive search logic
- `src/services/searchPerformanceMonitor.js` - Performance monitoring
- `src/services/searchQualityAnalyzer.js` - Quality analysis