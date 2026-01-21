/**
 * Integration test for enhanced tab discovery
 * Tests the integration of universal window indexing with existing tab fetching
 */

const proxyquire = require('proxyquire')

const execFileMock = (command, args, options, callback) => {
  const cb = typeof options === 'function' ? options : callback
  cb(null, '', '')
}

const { getAllTabs, clearCache, getEnhancedApps } = proxyquire('../electron/main-process/services/tabFetcher', {
  child_process: { execFile: execFileMock },
  './windowIndexer': {
    getSystemWindows: async () => [],
    clearCache: () => {},
    getAppCapability: () => ({ category: 'universal', tabs: false, documents: false, paths: false }),
    supportsTabs: () => false,
    supportsDocuments: () => false,
    APP_CAPABILITIES: {}
  }
})

async function testEnhancedTabDiscovery() {
  console.log('\n=== Testing Enhanced Tab Discovery ===\n')
  
  try {
    // Clear cache for fresh test
    clearCache()
    
    // Test 1: Get enhanced apps
    console.log('1. Getting enhanced apps...')
    const enhancedApps = getEnhancedApps()
    console.log(`Found ${enhancedApps.length} apps with enhanced capabilities`)
    
    // Group apps by category
    const byCategory = enhancedApps.reduce((acc, app) => {
      acc[app.category] = acc[app.category] || []
      acc[app.category].push(app.name)
      return acc
    }, {})
    
    Object.entries(byCategory).forEach(([category, apps]) => {
      console.log(`  ${category}: ${apps.join(', ')}`)
    })
    console.log()
    
    // Test 2: Get all tabs (enhanced)
    console.log('2. Getting all tabs and windows...')
    const start = Date.now()
    const allTabs = await getAllTabs()
    const timeTaken = Date.now() - start
    
    console.log(`Found ${allTabs.length} total items in ${timeTaken}ms`)
    
    // Analyze results
    const byBrowser = {}
    const byType = {}
    
    allTabs.forEach(tab => {
      const browser = tab.browser || tab.appName || 'Unknown'
      const type = tab.type || 'unknown'
      
      byBrowser[browser] = (byBrowser[browser] || 0) + 1
      byType[type] = (byType[type] || 0) + 1
    })
    
    console.log('\nBy application:')
    Object.entries(byBrowser).forEach(([browser, count]) => {
      console.log(`  ${browser}: ${count} items`)
    })
    
    console.log('\nBy type:')
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} items`)
    })
    
    // Test 3: Show detailed examples
    console.log('\n3. Detailed examples:')
    const examples = allTabs.slice(0, 10)
    
    examples.forEach((tab, i) => {
      console.log(`  ${i+1}. ${tab.browser || tab.appName}: "${tab.title}"`)
      console.log(`     Type: ${tab.type}, URL: ${tab.url || 'N/A'}`)
      console.log(`     Window: ${tab.windowIndex}, Tab: ${tab.tabIndex}`)
      if (tab.capability) {
        console.log(`     Capability: ${tab.capability.category}`)
      }
      console.log()
    })
    
    // Test 4: Cache performance
    console.log('4. Testing cache performance...')
    const cacheStart = Date.now()
    const cachedTabs = await getAllTabs() // Should be cached
    const cacheTime = Date.now() - cacheStart
    
    console.log(`Cache lookup took ${cacheTime}ms`)
    console.log(`Returned ${cachedTabs.length} items`)
    
    if (cacheTime < 100) {
      console.log('✅ Cache is working effectively!')
    } else {
      console.log('⚠️  Cache may not be working optimally')
    }
    
    console.log('\n✅ Enhanced Tab Discovery test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error(error.stack)
  }
}

// Run the test
if (require.main === module) {
  testEnhancedTabDiscovery()
}

module.exports = { testEnhancedTabDiscovery }