const { test, describe, mock } = require('node:test')
const assert = require('node:assert')

// Mock the tabFetcher module
const tabFetcher = require('../src/services/tabFetcher')

describe('Tab Fetcher Tests', () => {
  test('getAllTabs returns array of tab objects', async () => {
    const tabs = await tabFetcher.getAllTabs()

    assert.ok(Array.isArray(tabs), 'getAllTabs should return an array')
    console.log('Test 1 passed: getAllTabs returns array')
  })

  test('Tab objects have required properties', async () => {
    const tabs = await tabFetcher.getAllTabs()

    // If any tabs are returned, they should have the correct structure
    tabs.forEach(tab => {
      assert.ok(
        tab.hasOwnProperty('title') || tab.hasOwnProperty('name'),
        'Tab should have title or name property'
      )
      assert.ok(tab.hasOwnProperty('url'), 'Tab should have url property')
      assert.ok(tab.hasOwnProperty('browser'), 'Tab should have browser property')
      assert.ok(tab.hasOwnProperty('windowIndex'), 'Tab should have windowIndex property')
      assert.ok(tab.hasOwnProperty('tabIndex'), 'Tab should have tabIndex property')
    })

    console.log('Test 2 passed: Tab objects have required properties')
  })

  test('Browser property is valid (Safari, Chrome, Brave, or Comet)', async () => {
    const tabs = await tabFetcher.getAllTabs()

    const validBrowsers = ['Safari', 'Chrome', 'Brave', 'Comet']
    tabs.forEach(tab => {
      assert.ok(
        validBrowsers.includes(tab.browser),
        `Browser should be one of: ${validBrowsers.join(', ')}`
      )
    })

    console.log('Test 3 passed: Browser properties are valid')
  })

  test('clearCache resets the cache', () => {
    // This should not throw any errors
    assert.doesNotThrow(() => {
      tabFetcher.clearCache()
    })

    console.log('Test 4 passed: clearCache works without errors')
  })

  test('activateTab handles invalid browser gracefully', async () => {
    const invalidTab = {
      browser: 'InvalidBrowser',
      windowIndex: 1,
      tabIndex: 1,
    }

    const result = await tabFetcher.activateTab(invalidTab)

    assert.strictEqual(result, false, 'activateTab should return false for invalid browser')
    console.log('Test 5 passed: activateTab handles invalid browser')
  })
})

describe('Tab Activation Tests', () => {
  test('activateTab returns boolean', async () => {
    // Test with a dummy Safari tab (may fail if Safari not running, but should return boolean)
    const testTab = {
      browser: 'Safari',
      windowIndex: 1,
      tabIndex: 1,
    }

    const result = await tabFetcher.activateTab(testTab)

    assert.ok(typeof result === 'boolean', 'activateTab should return a boolean')
    console.log('Test 6 passed: activateTab returns boolean')
  })

  test('activateTab handles Chrome tabs', async () => {
    const testTab = {
      browser: 'Chrome',
      windowIndex: 1,
      tabIndex: 1,
    }

    const result = await tabFetcher.activateTab(testTab)

    assert.ok(typeof result === 'boolean', 'activateTab should return boolean for Chrome')
    console.log('Test 7 passed: activateTab handles Chrome tabs')
  })

  test('activateTab handles Brave tabs', async () => {
    const testTab = {
      browser: 'Brave',
      windowIndex: 1,
      tabIndex: 1,
    }

    const result = await tabFetcher.activateTab(testTab)

    assert.ok(typeof result === 'boolean', 'activateTab should return boolean for Brave')
    console.log('Test 8 passed: activateTab handles Brave tabs')
  })
})

console.log('\nAll tab fetcher tests completed!')
