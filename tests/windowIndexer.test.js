/**
 * Test script for universal window indexing
 * Tests the new windowIndexer service and enhanced tab discovery
 */

const { getSystemWindows, getEnhancedApps, clearCache } = require('../src/services/windowIndexer')

async function testWindowIndexer() {
  console.log('\n=== Testing Universal Window Indexer ===\n')
  
  try {
    // Test 1: Get enhanced apps list
    console.log('1. Getting enhanced apps list...')
    const enhancedApps = getEnhancedApps()
    console.log(`Found ${enhancedApps.length} apps with enhanced capabilities:`)
    enhancedApps.forEach(app => {
      console.log(`  - ${app.name}: ${app.category} (tabs:${app.tabs}, docs:${app.documents}, paths:${app.paths})`)
    })
    console.log()
    
    // Test 2: Get system windows without selection
    console.log('2. Getting all system windows...')
    clearCache() // Clear cache for fresh test
    const allWindows = await getSystemWindows()
    console.log(`Found ${allWindows.length} windows total`)
    console.log(`From ${new Set(allWindows.map(w => w.appName)).size} different applications`)
    
    // Show first few windows
    console.log('\nFirst 5 windows:')
    allWindows.slice(0, 5).forEach((window, i) => {
      console.log(`  ${i+1}. ${window.appName}: "${window.title}" (${window.type})`)
      if (window.capability) {
        console.log(`     Capability: ${window.capability.category}`)
      }
    })
    console.log()
    
    // Test 3: Test with selected apps (if any)
    const sampleApps = ['Safari', 'Google Chrome', 'Finder', 'VS Code', 'Terminal'].filter(app => 
      enhancedApps.some(enhanced => enhanced.name === app)
    )
    
    if (sampleApps.length > 0) {
      console.log(`3. Testing with selected apps: ${sampleApps.join(', ')}`)
      const selectedWindows = await getSystemWindows({ selectedApps: sampleApps })
      console.log(`Found ${selectedWindows.length} windows from selected apps`)
      
      selectedWindows.forEach((window, i) => {
        console.log(`  ${i+1}. ${window.appName}: "${window.title}" (${window.type})`)
      })
      console.log()
    }
    
    // Test 4: Test cache performance
    console.log('4. Testing cache performance...')
    const start = Date.now()
    const cachedWindows = await getSystemWindows() // Should be cached
    const cacheTime = Date.now() - start
    console.log(`Cache lookup took ${cacheTime}ms (should be very fast)`)
    console.log(`Returned ${cachedWindows.length} windows`)
    console.log()
    
    console.log('✅ Universal Window Indexer test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
if (require.main === module) {
  testWindowIndexer()
}

module.exports = { testWindowIndexer }