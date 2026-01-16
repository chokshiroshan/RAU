const { test, describe } = require('node:test')
const assert = require('node:assert')
const Fuse = require('fuse.js')

// Fuse.js options (same as in fileSearch.js)
const fuseOptions = {
  keys: ['name', 'path'],
  threshold: 0.6, // Higher threshold = more lenient fuzzy matching
  distance: 200,
  includeScore: true,
  shouldSort: true,
  minMatchCharLength: 1,
}

/**
 * Perform fuzzy search on an array of items
 * @param {Array} items - Array of items with name and path
 * @param {string} query - Search query
 * @returns {Array} Filtered and ranked results (max 20)
 */
function fuzzySearch(items, query) {
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

// Test data - simulating file search results
const testFiles = [
  { name: 'package.json', path: '/Users/test/project/package.json' },
  { name: 'package-lock.json', path: '/Users/test/project/package-lock.json' },
  { name: 'tsconfig.json', path: '/Users/test/project/tsconfig.json' },
  { name: 'index.js', path: '/Users/test/project/src/index.js' },
  { name: 'App.jsx', path: '/Users/test/project/src/App.jsx' },
  { name: 'README.md', path: '/Users/test/project/README.md' },
  { name: 'config.yaml', path: '/Users/test/project/config.yaml' },
  { name: 'main.js', path: '/Users/test/project/electron/main.js' },
  { name: 'styles.css', path: '/Users/test/project/src/styles.css' },
  { name: 'utils.js', path: '/Users/test/project/src/utils.js' },
]

describe('File Search Tests', () => {
  test('Search returns results for valid query', () => {
    const results = fuzzySearch(testFiles, 'package')

    assert.ok(results.length > 0, 'Should return at least one result')
    assert.ok(
      results.some(r => r.name.includes('package')),
      'Results should include files with "package" in the name'
    )
    console.log('Test 1 passed: Search returns results for valid query')
  })

  test('Fuzzy matching works - "pckg" finds "package.json"', () => {
    const results = fuzzySearch(testFiles, 'pckg')

    assert.ok(results.length > 0, 'Fuzzy search should return results')
    assert.ok(
      results.some(r => r.name === 'package.json'),
      'Fuzzy search should find package.json when searching "pckg"'
    )
    console.log('Test 2 passed: Fuzzy matching works')
  })

  test('Search limits to 20 results max', () => {
    // Create a large test dataset
    const manyFiles = []
    for (let i = 0; i < 50; i++) {
      manyFiles.push({
        name: `file${i}.js`,
        path: `/Users/test/project/file${i}.js`,
      })
    }

    const results = fuzzySearch(manyFiles, 'file')

    assert.ok(results.length <= 20, 'Results should be limited to 20 max')
    console.log('Test 3 passed: Search limits to 20 results max')
  })

  test('Empty query returns empty results', () => {
    const results = fuzzySearch(testFiles, '')

    assert.strictEqual(results.length, 0, 'Empty query should return no results')
    console.log('Test 4 passed: Empty query returns empty results')
  })

  test('Search with no matches returns empty array', () => {
    const results = fuzzySearch(testFiles, 'zzzznonexistent')

    assert.strictEqual(results.length, 0, 'Non-matching query should return no results')
    console.log('Test 5 passed: No matches returns empty array')
  })
})

console.log('\nAll tests completed!')
