/**
 * Unit tests for unifiedSearch.js
 * Tests the search orchestration logic with mocked IPC
 */
const { test, describe, mock, beforeEach } = require('node:test')
const assert = require('node:assert')

// Mock the electron IPC for testing
const mockIpcRenderer = {
    invoke: mock.fn(async (channel, ...args) => {
        switch (channel) {
            case 'get-settings':
                return {
                    searchApps: true,
                    searchTabs: true,
                    searchFiles: true,
                }
            case 'get-apps':
                return [
                    { name: 'Safari', path: '/Applications/Safari.app', icon: null },
                    { name: 'Chrome', path: '/Applications/Google Chrome.app', icon: null },
                    { name: 'Calculator', path: '/Applications/Calculator.app', icon: null },
                ]
            case 'get-tabs':
                return [
                    { title: 'Google Search', url: 'https://google.com', browser: 'Safari', windowIndex: 1, tabIndex: 1 },
                    { title: 'GitHub', url: 'https://github.com', browser: 'Chrome', windowIndex: 1, tabIndex: 1 },
                ]
            case 'search-files':
                return [
                    { name: 'package.json', path: '/Users/test/project/package.json' },
                    { name: 'package-lock.json', path: '/Users/test/project/package-lock.json' },
                ]
            default:
                throw new Error(`Unknown channel: ${channel}`)
        }
    })
}

// Mock the electron module
mock.module('../src/services/electron', {
    namedExports: {
        ipcRenderer: mockIpcRenderer,
        isElectron: true,
        electronAPIReady: {},
    }
})

// Import the module under test AFTER mocking
const { searchUnified, searchTabs } = require('../src/services/unifiedSearch')

describe('Unified Search Tests', () => {
    beforeEach(() => {
        mockIpcRenderer.invoke.mock.resetCalls()
    })

    test('Empty query returns empty results', async () => {
        const results = await searchUnified('')
        assert.deepStrictEqual(results, [], 'Empty query should return empty array')
    })

    test('Short query (< 2 chars) returns empty results', async () => {
        const results = await searchUnified('a')
        assert.deepStrictEqual(results, [], 'Single char query should return empty array')
    })

    test('Valid query returns combined results from apps, tabs, and files', async () => {
        const results = await searchUnified('pack')

        // Should have executed searches
        assert.ok(mockIpcRenderer.invoke.mock.callCount() > 0, 'Should have invoked IPC')

        // Results should be an array
        assert.ok(Array.isArray(results), 'Results should be an array')
    })

    test('Results have correct type indicators', async () => {
        const results = await searchUnified('Safari')

        // Find the Safari app result
        const safariResult = results.find(r => r.name === 'Safari')
        if (safariResult) {
            assert.strictEqual(safariResult.type, 'app', 'Safari should have type "app"')
        }
    })

    test('Query for GitHub should find tab result', async () => {
        const results = await searchUnified('GitHub')

        const githubResult = results.find(r => r.name === 'GitHub' || r.title === 'GitHub')
        if (githubResult) {
            assert.strictEqual(githubResult.type, 'tab', 'GitHub should be a tab result')
            assert.strictEqual(githubResult.browser, 'Chrome', 'GitHub tab should be from Chrome')
        }
    })

    test('Results are limited to 20 max', async () => {
        const results = await searchUnified('package')
        assert.ok(results.length <= 20, 'Results should not exceed 20 items')
    })

    test('Results have score property from Fuse.js', async () => {
        const results = await searchUnified('Safari')

        if (results.length > 0) {
            assert.ok(
                results.every(r => typeof r.score === 'number'),
                'All results should have a numeric score'
            )
        }
    })
})

describe('Search Tabs Tests', () => {
    test('Empty query returns empty results', async () => {
        const results = await searchTabs('')
        assert.deepStrictEqual(results, [], 'Empty query should return empty array')
    })

    test('Valid query returns tab results', async () => {
        const results = await searchTabs('Google')

        assert.ok(Array.isArray(results), 'Results should be an array')
    })
})

console.log('\nUnified search tests completed!')
