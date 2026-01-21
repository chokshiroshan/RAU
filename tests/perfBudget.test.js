const { test, describe } = require('node:test')
const assert = require('node:assert')
const { performance } = require('node:perf_hooks')
const proxyquire = require('proxyquire')

const bigList = (count, type) => Array.from({ length: count }, (_, i) => ({
  name: `${type}-${i}`,
  title: `${type}-${i}`,
  url: `https://example.com/${type}/${i}`,
  path: `/tmp/${type}/${i}`,
}))

const unifiedSearch = proxyquire('../electron/main-process/services/unifiedSearchService', {
  '../config': { getSettings: () => ({ searchApps: true, searchTabs: true, searchFiles: true, searchCommands: true, searchShortcuts: true, searchPlugins: true, telemetryEnabled: false, webBangs: {} }) },
  '../handlers/actionHandler': {
    getApps: async () => bigList(500, 'app').map(item => ({ name: item.name, path: item.path })),
    getTabs: async () => bigList(500, 'tab').map(item => ({ title: item.title, url: item.url, browser: 'Chrome', windowIndex: 1, tabIndex: 1 })),
  },
  '../handlers/searchHandler': {
    searchFiles: async () => bigList(500, 'file').map(item => ({ name: item.name, path: item.path }))
  },
  '../handlers/automationHandler': {
    getShortcuts: async () => [],
    getPlugins: async () => []
  }
})

describe('Unified search perf budget', () => {
  test('search completes within budget', async () => {
    const start = performance.now()
    const results = await unifiedSearch.searchUnified('app-1', {}, 1, 'test')
    const elapsed = performance.now() - start

    assert.ok(results.length > 0)
    assert.ok(elapsed < 500, `Search took too long: ${elapsed}ms`)
  })
})
