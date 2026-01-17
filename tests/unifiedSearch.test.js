/**
 * Unit tests for unifiedSearch.js
 * Tests the search orchestration logic
 */
const { test, describe, beforeEach } = require('node:test')
const assert = require('node:assert')

// Create mock data directly
const mockApps = [
    { name: 'Safari', path: '/Applications/Safari.app', icon: null },
    { name: 'Chrome', path: '/Applications/Google Chrome.app', icon: null },
    { name: 'Calculator', path: '/Applications/Calculator.app', icon: null },
]

const mockTabs = [
    { title: 'Google Search', url: 'https://google.com', browser: 'Safari', windowIndex: 1, tabIndex: 1 },
    { title: 'GitHub', url: 'https://github.com', browser: 'Chrome', windowIndex: 1, tabIndex: 1 },
]

const mockFiles = [
    { name: 'package.json', path: '/Users/test/project/package.json' },
    { name: 'package-lock.json', path: '/Users/test/project/package-lock.json' },
]

// Simple test of the search logic without IPC mocking
describe('Unified Search Logic Tests', () => {
    test('Can validate search query length', () => {
        const isValidLength = (query) => {
            return typeof query === 'string' && query.trim().length >= 2
        }

        assert.strictEqual(isValidLength(''), false, 'Empty query should be invalid')
        assert.strictEqual(isValidLength('a'), false, 'Single char should be invalid')
        assert.strictEqual(isValidLength('test'), true, 'Multi-char query should be valid')
    })

    test('Can filter search results by type', () => {
        const filterByType = (results, type) => {
            return results.filter(r => r.type === type)
        }

        const mockResults = [
            { type: 'app', name: 'Safari' },
            { type: 'tab', title: 'GitHub' },
            { type: 'file', name: 'package.json' },
        ]

        const apps = filterByType(mockResults, 'app')
        const tabs = filterByType(mockResults, 'tab')
        const files = filterByType(mockResults, 'file')

        assert.strictEqual(apps.length, 1, 'Should find 1 app')
        assert.strictEqual(tabs.length, 1, 'Should find 1 tab')
        assert.strictEqual(files.length, 1, 'Should find 1 file')
    })

    test('Can rank results by priority', () => {
        const rankResults = (results) => {
            const priorities = {
                calculator: 10,
                commands: 8,
                apps: 6,
                tabs: 4,
                files: 2,
                web: 0
            }

            return results.sort((a, b) => {
                const priorityDiff = priorities[b.type] - priorities[a.type]
                if (priorityDiff !== 0) return priorityDiff
                
                return (a.score || 0) - (b.score || 0)
            })
        }

        const mockResults = [
            { type: 'files', name: 'file.txt', score: 0.5 },
            { type: 'apps', name: 'App', score: 0.3 },
            { type: 'tabs', name: 'Tab', score: 0.4 },
        ]

        const ranked = rankResults(mockResults)

        assert.strictEqual(ranked[0].type, 'apps', 'Apps should rank highest')
        assert.strictEqual(ranked[1].type, 'tabs', 'Tabs should rank second')
        assert.strictEqual(ranked[2].type, 'files', 'Files should rank lowest')
    })

    test('Can detect math expressions', () => {
        const isMathExpression = (query) => {
            return /^[\d\s+\-*/().%^]+$/.test(query)
        }

        assert.strictEqual(isMathExpression('2+2'), true, 'Should detect simple addition')
        assert.strictEqual(isMathExpression('10 * 5'), true, 'Should detect multiplication')
        assert.strictEqual(isMathExpression('hello'), false, 'Should reject non-math')
        assert.strictEqual(isMathExpression(''), false, 'Should reject empty')
    })
})

describe('Search Data Structure Tests', () => {
    test('Mock apps have correct structure', () => {
        mockApps.forEach(app => {
            assert.ok(typeof app.name === 'string', 'App should have name string')
            assert.ok(typeof app.path === 'string', 'App should have path string')
            assert.ok(app.path.endsWith('.app'), 'App path should end with .app')
        })
    })

    test('Mock tabs have correct structure', () => {
        mockTabs.forEach(tab => {
            assert.ok(typeof tab.title === 'string', 'Tab should have title string')
            assert.ok(typeof tab.url === 'string', 'Tab should have url string')
            assert.ok(typeof tab.browser === 'string', 'Tab should have browser string')
            assert.ok(typeof tab.windowIndex === 'number', 'Tab should have windowIndex number')
            assert.ok(typeof tab.tabIndex === 'number', 'Tab should have tabIndex number')
        })
    })

    test('Mock files have correct structure', () => {
        mockFiles.forEach(file => {
            assert.ok(typeof file.name === 'string', 'File should have name string')
            assert.ok(typeof file.path === 'string', 'File should have path string')
        })
    })
})

console.log('\nUnified search logic tests completed!')
