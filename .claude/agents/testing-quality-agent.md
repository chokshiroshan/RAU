---
name: testing-quality-agent
description: Expert in testing strategy, test development, and quality assurance. Use proactively when creating comprehensive tests, implementing quality patterns, or ensuring test coverage.
---

# Testing Quality Agent

## Primary Responsibilities
- Unit and integration testing strategies and implementation
- Mock design for Electron APIs and external dependencies
- Performance testing and profiling for search operations
- Error handling validation and edge case testing
- Test coverage analysis and quality metrics

## Core Expertise
- **Testing Frameworks**: Node.js built-in test runner, React Testing Library, Electron testing
- **Mock Design**: Comprehensive mocking for Electron APIs, file system, AppleScript
- **Test Architecture**: Unit, integration, and E2E testing patterns
- **Quality Metrics**: Coverage analysis, performance benchmarks, reliability testing
- **CI/CD Integration**: Automated testing pipelines and quality gates

## Key Files/Directories
- `tests/` - All test files and test utilities
- `tests/mocks/` - Mock implementations for external dependencies
- `tests/fixtures/` - Test data and sample responses
- `package.json` - Test scripts and dependencies
- `test-setup.js` - Global test configuration and utilities

## Common Tasks

### 1. Comprehensive Test Architecture

**Test Structure Organization**:
```
tests/
├── unit/                    # Unit tests
│   ├── services/           # Service layer tests
│   ├── components/         # React component tests
│   └── utils/              # Utility function tests
├── integration/            # Integration tests
│   ├── ipc/               # IPC communication tests
│   ├── search/            # Search integration tests
│   └── browser/           # Browser integration tests
├── e2e/                   # End-to-end tests
│   ├── workflows/         # User workflow tests
│   └── performance/       # Performance tests
├── mocks/                 # Mock implementations
│   ├── electron.js        # Electron API mocks
│   ├── filesystem.js      # File system mocks
│   └── applescript.js     # AppleScript mocks
└── fixtures/              # Test data
    ├── apps.json          # Sample app data
    ├── tabs.json          # Sample tab data
    └── files.json         # Sample file data
```

**Global Test Setup** (`test-setup.js`):
```javascript
// test-setup.js
const { test, describe } = require('node:test')
const assert = require('node:assert')

// Global test utilities
global.testUtils = {
  // Mock Electron APIs
  mockElectronAPI: (mockData = {}) => {
    const mockIPC = {
      invoke: async (channel, ...args) => {
        const mockResponse = mockData[channel]
        if (typeof mockResponse === 'function') {
          return mockResponse(...args)
        }
        return mockResponse || {}
      },
      send: (channel, ...args) => {
        // Handle send events
      },
      on: (channel, listener) => {
        // Handle event listeners
      },
      removeAllListeners: (channel) => {
        // Clean up listeners
      }
    }
    
    global.window = { electronAPI: mockIPC }
    return mockIPC
  },
  
  // Create test fixtures
  createMockApps: (count = 10) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `app-${i}`,
      name: `Test App ${i}`,
      path: `/Applications/TestApp${i}.app`,
      icon: null,
      type: 'app'
    }))
  },
  
  createMockTabs: (count = 20) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `tab-${i}`,
      title: `Test Tab ${i}`,
      url: `https://example.com/tab${i}`,
      browser: 'Safari',
      windowIndex: 1,
      tabIndex: i + 1,
      type: 'tab'
    }))
  },
  
  createMockFiles: (count = 15) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `file-${i}`,
      name: `test-file-${i}.txt`,
      path: `/Users/test/test-file-${i}.txt`,
      type: 'file'
    }))
  },
  
  // Performance measurement
  measureTime: async (fn) => {
    const start = Date.now()
    const result = await fn()
    const duration = Date.now() - start
    return { result, duration }
  },
  
  // Assertion helpers
  assertValidResult: (result) => {
    assert(result.id, 'Result must have id')
    assert(result.name || result.title, 'Result must have name or title')
    assert(result.type, 'Result must have type')
  },
  
  assertSearchResults: (results, expectedType = null) => {
    assert(Array.isArray(results), 'Results must be array')
    results.forEach(result => testUtils.assertValidResult(result))
    
    if (expectedType) {
      const hasExpectedType = results.some(r => r.type === expectedType)
      assert(hasExpectedType, `Results must include ${expectedType} type`)
    }
  }
}

// Export for use in test files
module.exports = { test, describe, assert, testUtils }
```

### 2. Service Layer Testing

**Search Service Tests** (`tests/unit/services/unifiedSearch.test.js`):
```javascript
const { test, describe, assert, testUtils } = require('../../../test-setup')
const { searchUnified } = require('../../../src/services/unifiedSearch')

describe('Unified Search Service', () => {
  beforeEach(() => {
    // Reset mocks before each test
    testUtils.mockElectronAPI({
      'get-apps': testUtils.createMockApps(5),
      'get-tabs': testUtils.createMockTabs(10),
      'search-files': testUtils.createMockFiles(8)
    })
  })
  
  test('should return combined results from all sources', async () => {
    const results = await searchUnified('test query')
    
    assert(results.length > 0, 'Should return results')
    testUtils.assertSearchResults(results)
    
    // Verify all types are present
    const types = new Set(results.map(r => r.type))
    assert(types.has('app'), 'Should include app results')
    assert(types.has('tab'), 'Should include tab results')
    assert(types.has('file'), 'Should include file results')
  })
  
  test('should respect search filters', async () => {
    const results = await searchUnified('test query', { 
      apps: true, 
      tabs: false, 
      files: false 
    })
    
    testUtils.assertSearchResults(results, 'app')
    
    // Should only have app results
    const nonAppResults = results.filter(r => r.type !== 'app')
    assert(nonAppResults.length === 0, 'Should only return app results')
  })
  
  test('should handle empty query gracefully', async () => {
    const results = await searchUnified('')
    
    assert(results.length === 0, 'Empty query should return no results')
  })
  
  test('should handle special queries (calculator)', async () => {
    const results = await searchUnified('2+2')
    
    assert(results.length === 1, 'Calculator should return single result')
    assert(results[0].type === 'calculator', 'Should be calculator type')
    assert(results[0].result === 4, 'Should calculate correctly')
  })
  
  test('should rank results by relevance', async () => {
    const results = await searchUnified('safari')
    
    // Safari app should rank higher than other results
    const safariApp = results.find(r => r.name === 'Safari' && r.type === 'app')
    const otherResults = results.filter(r => r.name !== 'Safari')
    
    if (safariApp && otherResults.length > 0) {
      const safariIndex = results.indexOf(safariApp)
      const firstOtherIndex = results.indexOf(otherResults[0])
      assert(safariIndex < firstOtherIndex, 'Safari should rank higher')
    }
  })
  
  test('should handle IPC errors gracefully', async () => {
    // Mock IPC error
    testUtils.mockElectronAPI({
      'get-apps': () => { throw new Error('IPC Error') },
      'get-tabs': testUtils.createMockTabs(5),
      'search-files': testUtils.createMockFiles(3)
    })
    
    const results = await searchUnified('test query')
    
    // Should return results from working services
    testUtils.assertSearchResults(results)
    assert(results.some(r => r.type === 'tab'), 'Should include tab results')
    assert(results.some(r => r.type === 'file'), 'Should include file results')
    
    // Should not include app results (failed service)
    const appResults = results.filter(r => r.type === 'app')
    assert(appResults.length === 0, 'Should not include app results')
  })
})
```

**Tab Fetcher Tests** (`tests/unit/services/tabFetcher.test.js`):
```javascript
const { test, describe, assert, testUtils } = require('../../../test-setup')
const { getAllTabs, activateTab } = require('../../../src/services/tabFetcher')

describe('Tab Fetcher Service', () => {
  beforeEach(() => {
    testUtils.mockElectronAPI({
      'get-tabs': testUtils.createMockTabs(15)
    })
  })
  
  test('should fetch tabs from all browsers', async () => {
    const tabs = await getAllTabs()
    
    assert(Array.isArray(tabs), 'Should return array')
    assert(tabs.length > 0, 'Should return tabs')
    
    tabs.forEach(tab => {
      assert(tab.title, 'Tab must have title')
      assert(tab.url, 'Tab must have URL')
      assert(tab.browser, 'Tab must have browser')
      assert(typeof tab.windowIndex === 'number', 'Tab must have window index')
      assert(typeof tab.tabIndex === 'number', 'Tab must have tab index')
    })
  })
  
  test('should filter tabs by selected browsers', async () => {
    const tabs = await getAllTabs({ selectedApps: ['Safari', 'Chrome'] })
    
    tabs.forEach(tab => {
      assert(['Safari', 'Chrome'].includes(tab.browser), 'Tab should be from selected browser')
    })
  })
  
  test('should handle browser selection with aliases', async () => {
    const tabs = await getAllTabs({ selectedApps: ['Chrome'] })
    
    tabs.forEach(tab => {
      assert(['Google Chrome', 'Chrome'].includes(tab.browser), 'Should handle Chrome alias')
    })
  })
  
  test('should activate tab successfully', async () => {
    const testTab = testUtils.createMockTabs(1)[0]
    
    testUtils.mockElectronAPI({
      'activate-tab': () => ({ success: true })
    })
    
    const result = await activateTab(testTab)
    
    assert(result.success === true, 'Should activate tab successfully')
  })
  
  test('should handle tab activation failure', async () => {
    const testTab = testUtils.createMockTabs(1)[0]
    
    testUtils.mockElectronAPI({
      'activate-tab': () => ({ success: false, error: 'Tab not found' })
    })
    
    const result = await activateTab(testTab)
    
    assert(result.success === false, 'Should handle activation failure')
    assert(result.error, 'Should return error message')
  })
  
  test('should implement caching correctly', async () => {
    // First call should fetch from IPC
    const tabs1 = await getAllTabs()
    
    // Second call should use cache (no IPC call)
    const tabs2 = await getAllTabs()
    
    assert.deepEqual(tabs1, tabs2, 'Cached results should be identical')
  })
})
```

### 3. React Component Testing

**Search Bar Component Tests** (`tests/unit/components/SearchBar.test.jsx`):
```javascript
const { test, describe, assert } = require('node:test')
const React = require('react')
const { render, screen, fireEvent } = require('@testing-library/react')
const { JSDOM } = require('jsdom')

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
global.window = dom.window
global.document = dom.window.document
global.navigator = dom.window.navigator

// Mock Electron API
global.window.electronAPI = {
  hideWindow: () => {},
  resizeWindow: () => {}
}

const SearchBar = require('../../../src/components/SearchBar.jsx').default

describe('SearchBar Component', () => {
  test('should render search input', () => {
    render(React.createElement(SearchBar, {
      query: '',
      onQueryChange: () => {},
      onSubmit: () => {}
    }))
    
    const input = screen.getByPlaceholderText('Search apps, tabs, files...')
    assert(input, 'Should render search input')
  })
  
  test('should call onQueryChange when typing', () => {
    let calledValue = ''
    const onQueryChange = (value) => { calledValue = value }
    
    render(React.createElement(SearchBar, {
      query: '',
      onQueryChange,
      onSubmit: () => {}
    }))
    
    const input = screen.getByPlaceholderText('Search apps, tabs, files...')
    fireEvent.change(input, { target: { value: 'test' } })
    
    assert(calledValue === 'test', 'Should call onQueryChange with typed value')
  })
  
  test('should call onSubmit when form submitted', () => {
    let submitted = false
    const onSubmit = () => { submitted = true }
    
    render(React.createElement(SearchBar, {
      query: 'test',
      onQueryChange: () => {},
      onSubmit
    }))
    
    const form = screen.getByRole('form') || screen.getByTestId('search-form')
    fireEvent.submit(form)
    
    assert(submitted, 'Should call onSubmit when form submitted')
  })
  
  test('should show loading indicator when loading', () => {
    render(React.createElement(SearchBar, {
      query: 'test',
      onQueryChange: () => {},
      onSubmit: () => {},
      isLoading: true
    }))
    
    const loadingIndicator = screen.getByTestId('loading-indicator')
    assert(loadingIndicator, 'Should show loading indicator')
  })
  
  test('should focus input on mount', () => {
    render(React.createElement(SearchBar, {
      query: '',
      onQueryChange: () => {},
      onSubmit: () => {}
    }))
    
    const input = screen.getByPlaceholderText('Search apps, tabs, files...')
    assert(input === document.activeElement, 'Input should be focused on mount')
  })
})
```

### 4. Integration Testing

**IPC Communication Tests** (`tests/integration/ipc.test.js`):
```javascript
const { test, describe, assert, testUtils } = require('../../test-setup')
const { ipcMain } = require('electron')

describe('IPC Communication Integration', () => {
  let mockWindow
  
  beforeEach(() => {
    mockWindow = {
      webContents: {
        send: () => {}
      }
    }
    
    // Register handlers
    require('../../../electron/main-process/handlers').registerHandlers(mockWindow)
  })
  
  afterEach(() => {
    // Clean up handlers
    ipcMain.removeAllListeners()
  })
  
  test('should handle get-apps request', async () => {
    // Mock file system
    const mockExecFile = (command, args, callback) => {
      if (command === 'mdfind' && args.includes('kMDItemKind == "Application"')) {
        callback(null, '/Applications/Safari.app\n/Applications/Chrome.app')
      }
    }
    
    // Test handler
    const { getApps } = require('../../../electron/main-process/handlers/actionHandler')
    const result = await getApps()
    
    assert(Array.isArray(result), 'Should return array')
    assert(result.length > 0, 'Should return apps')
    
    result.forEach(app => {
      assert(app.name, 'App must have name')
      assert(app.path, 'App must have path')
      assert(app.path.endsWith('.app'), 'App path must end with .app')
    })
  })
  
  test('should validate file paths in open-file request', async () => {
    const { openFile } = require('../../../electron/main-process/handlers/actionHandler')
    
    // Test invalid path
    const invalidResult = await openFile(null, '../../../etc/passwd')
    assert(invalidResult.success === false, 'Should reject invalid path')
    assert(invalidResult.error.includes('Invalid'), 'Should return validation error')
    
    // Test valid path (mock exists)
    const validResult = await openFile(null, '/Applications/Safari.app')
    // Would normally check file exists, but for testing we just validate format
  })
  
  test('should handle rate limiting', async () => {
    // This would test rate limiting implementation
    // Implementation depends on specific rate limiting strategy
    assert(true, 'Rate limiting test placeholder')
  })
})
```

### 5. Performance Testing

**Search Performance Tests** (`tests/e2e/performance.test.js`):
```javascript
const { test, describe, assert, testUtils } = require('../../test-setup')
const { searchUnified } = require('../../../src/services/unifiedSearch')

describe('Search Performance Tests', () => {
  test('should complete search within time limits', async () => {
    const { result, duration } = await testUtils.measureTime(async () => {
      return await searchUnified('performance test query')
    })
    
    assert(result.length > 0, 'Should return results')
    assert(duration < 1000, 'Should complete within 1 second')
    
    console.log(`Search completed in ${duration}ms with ${result.length} results`)
  })
  
  test('should handle large result sets efficiently', async () => {
    // Mock large dataset
    const largeMockData = {
      'get-apps': testUtils.createMockApps(100),
      'get-tabs': testUtils.createMockTabs(500),
      'search-files': testUtils.createMockFiles(200)
    }
    
    testUtils.mockElectronAPI(largeMockData)
    
    const { result, duration } = await testUtils.measureTime(async () => {
      return await searchUnified('large dataset test')
    })
    
    assert(result.length <= 20, 'Should limit results to 20')
    assert(duration < 2000, 'Should handle large dataset within 2 seconds')
    
    console.log(`Large dataset search: ${duration}ms, ${result.length} results`)
  })
  
  test('should maintain performance with repeated searches', async () => {
    const durations = []
    
    for (let i = 0; i < 10; i++) {
      const { duration } = await testUtils.measureTime(async () => {
        return await searchUnified(`repeated search ${i}`)
      })
      durations.push(duration)
    }
    
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
    const maxDuration = Math.max(...durations)
    
    assert(avgDuration < 500, 'Average search should be under 500ms')
    assert(maxDuration < 1000, 'No search should exceed 1 second')
    
    console.log(`Repeated searches: avg ${avgDuration}ms, max ${maxDuration}ms`)
  })
  
  test('should measure memory usage', async () => {
    const initialMemory = process.memoryUsage()
    
    // Perform many searches
    for (let i = 0; i < 50; i++) {
      await searchUnified(`memory test ${i}`)
    }
    
    const finalMemory = process.memoryUsage()
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
    
    // Memory increase should be reasonable (less than 50MB)
    assert(memoryIncrease < 50 * 1024 * 1024, 'Memory increase should be under 50MB')
    
    console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
  })
})
```

### 6. Test Coverage and Quality Metrics

**Coverage Analysis** (`tests/coverage/coverage.test.js`):
```javascript
const { test, describe, assert } = require('node:test')
const { createCoverageMap } = require('../coverage/coverageAnalyzer')

describe('Test Coverage Analysis', () => {
  test('should achieve minimum coverage thresholds', async () => {
    const coverage = await createCoverageMap()
    
    // Coverage thresholds
    const COVERAGE_THRESHOLDS = {
      statements: 80,
      branches: 75,
      functions: 85,
      lines: 80
    }
    
    Object.entries(COVERAGE_THRESHOLDSS).forEach(([metric, threshold]) => {
      const coveragePercent = coverage[metric].pct
      assert(
        coveragePercent >= threshold,
        `${metric} coverage ${coveragePercent}% below threshold ${threshold}%`
      )
    })
    
    console.log('Coverage Report:')
    Object.entries(coverage).forEach(([metric, data]) => {
      console.log(`  ${metric}: ${data.pct}% (${data.covered}/${data.total})`)
    })
  })
  
  test('should identify uncovered critical paths', async () => {
    const coverage = await createCoverageMap()
    const criticalFiles = [
      'src/services/unifiedSearch.js',
      'src/services/tabFetcher.js',
      'electron/main-process/handlers/actionHandler.js'
    ]
    
    const uncoveredCritical = criticalFiles.filter(file => {
      const fileCoverage = coverage[file]
      return fileCoverage && fileCoverage.lines.pct < 90
    })
    
    assert(
      uncoveredCritical.length === 0,
      `Critical files with low coverage: ${uncoveredCritical.join(', ')}`
    )
  })
})
```

## Testing Best Practices

### 1. Mock Design Principles
```javascript
// Good mock design - realistic and comprehensive
const createMockElectronAPI = (overrides = {}) => {
  const defaultMocks = {
    'get-apps': () => testUtils.createMockApps(10),
    'get-tabs': () => testUtils.createMockTabs(20),
    'open-app': (path) => ({ success: true }),
    'activate-tab': (tab) => ({ success: true })
  }
  
  return { ...defaultMocks, ...overrides }
}

// Bad mock design - incomplete or unrealistic
const badMock = {
  'get-apps': () => [] // Too simple, doesn't test real scenarios
}
```

### 2. Test Data Management
```javascript
// Use fixtures for consistent test data
const TEST_FIXTURES = {
  apps: require('./fixtures/apps.json'),
  tabs: require('./fixtures/tabs.json'),
  files: require('./fixtures/files.json')
}

// Generate dynamic test data when needed
const generateTestData = (type, count) => {
  switch (type) {
    case 'apps': return testUtils.createMockApps(count)
    case 'tabs': return testUtils.createMockTabs(count)
    case 'files': return testUtils.createMockFiles(count)
    default: throw new Error(`Unknown test data type: ${type}`)
  }
}
```

### 3. Error Testing Strategy
```javascript
// Test both success and error scenarios
test('should handle service errors gracefully', async () => {
  // Test success case
  testUtils.mockElectronAPI({ 'get-apps': () => testUtils.createMockApps(5) })
  const successResult = await getAllApps()
  assert(successResult.length > 0, 'Success case should work')
  
  // Test error case
  testUtils.mockElectronAPI({ 
    'get-apps': () => { throw new Error('Service error') }
  })
  const errorResult = await getAllApps()
  assert(Array.isArray(errorResult), 'Error case should return array')
  assert(errorResult.length === 0, 'Error case should return empty array')
})
```

## When to Use This Agent
Use this agent when working on:
- Writing new tests for services, components, or integration
- Improving test coverage and quality metrics
- Setting up automated testing pipelines
- Debugging test failures and flaky tests
- Performance testing and profiling
- Mock design for external dependencies

## Related Documentation
- [Contributing Guide](CONTRIBUTING.md) - Testing requirements and patterns
- [Architecture Guide](docs/ARCHITECTURE.md) - System design for testability
- [API Reference](docs/API.md) - Service interfaces for testing
- [Security Guide](docs/SECURITY.md) - Security testing considerations
