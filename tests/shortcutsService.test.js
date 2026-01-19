const { test, describe, beforeEach } = require('node:test')
const assert = require('node:assert')

// Setup mocks first
const mockExecFileHandler = {
  handler: null
}

const mockExecFile = (cmd, args, callback) => {
  if (mockExecFileHandler.handler) {
    mockExecFileHandler.handler(cmd, args, callback)
  } else {
    callback(null, '', '')
  }
}

// Mock child_process
require('child_process').execFile = mockExecFile

// Mock logger - this is the tricky part because the service requires it
// We need to verify where the service imports logger from.
// It uses: const { logger } = require('../logger');
// The path is relative to electron/main-process/services/shortcutsService.js
// So it resolves to electron/main-process/logger.js

// We need to populate the cache for logger BEFORE requiring service
const loggerPath = require.resolve('../electron/main-process/logger')
require.cache[loggerPath] = {
  id: loggerPath,
  filename: loggerPath,
  loaded: true,
  exports: {
    logger: {
      log: () => { },
      error: () => { },
      warn: () => { },
      debug: () => { }
    }
  }
}

// Now clear service cache to ensure it picks up our mocks
const servicePath = require.resolve('../electron/main-process/services/shortcutsService')
delete require.cache[servicePath]

const shortcutsService = require('../electron/main-process/services/shortcutsService')

describe('ShortcutsService', () => {
  beforeEach(() => {
    mockExecFileHandler.handler = null
    shortcutsService.cachedShortcuts = []
    shortcutsService.lastFetch = 0
  })

  test('getShortcuts should return list of shortcuts', async () => {
    let callCount = 0
    mockExecFileHandler.handler = (cmd, args, callback) => {
      callCount++
      callback(null, 'Shortcut 1\nShortcut 2\n', '')
    }

    const shortcuts = await shortcutsService.getShortcuts()
    assert.deepStrictEqual(shortcuts, ['Shortcut 1', 'Shortcut 2'])
    assert.strictEqual(callCount, 1)
  })

  test('getShortcuts should handle empty output', async () => {
    mockExecFileHandler.handler = (cmd, args, callback) => {
      callback(null, '\n', '')
    }

    const shortcuts = await shortcutsService.getShortcuts()
    assert.deepStrictEqual(shortcuts, [])
  })

  test('getShortcuts should handle error', async () => {
    mockExecFileHandler.handler = (cmd, args, callback) => {
      callback(new Error('Command failed'), '', '')
    }

    const shortcuts = await shortcutsService.getShortcuts()
    assert.deepStrictEqual(shortcuts, [])
  })

  test('runShortcut should execute correct command', async () => {
    let capturedArgs = null
    mockExecFileHandler.handler = (cmd, args, callback) => {
      capturedArgs = { cmd, args }
      callback(null, 'Done', '')
    }

    await shortcutsService.runShortcut('My Shortcut')

    assert.strictEqual(capturedArgs.cmd, 'shortcuts')
    assert.deepStrictEqual(capturedArgs.args, ['run', 'My Shortcut'])
  })
})
