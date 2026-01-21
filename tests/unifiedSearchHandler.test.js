const { test, describe } = require('node:test')
const assert = require('node:assert')
const proxyquire = require('proxyquire')

const { searchUnifiedHandler } = proxyquire('../electron/main-process/handlers/unifiedSearchHandler', {
  '../services/unifiedSearchService': {
    searchUnified: async () => ['ok']
  }
})

describe('Unified search handler cancellation', () => {
  test('ignores stale requestId for same sender', async () => {
    const event = { sender: { id: 'sender-1' } }
    const first = await searchUnifiedHandler(event, 'test', {}, 2)
    const stale = await searchUnifiedHandler(event, 'test', {}, 1)

    assert.deepStrictEqual(first, ['ok'])
    assert.deepStrictEqual(stale, [])
  })
})
