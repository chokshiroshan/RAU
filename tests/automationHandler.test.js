const { test, describe, mock } = require('node:test');
const assert = require('node:assert');
const proxyquire = require('proxyquire').noCallThru();

// Mocks
const mockShortcutsService = {
  getShortcuts: mock.fn(async () => ['Shortcut 1', 'Shortcut 2']),
  runShortcut: mock.fn(async () => 'Output'),
};

const mockPluginService = {
  getPlugins: mock.fn(async () => [{ name: 'Plugin 1' }]),
  runPlugin: mock.fn(async () => 'Output'),
};

// Import automationHandler with mocked dependencies
const automationHandler = proxyquire('../electron/main-process/handlers/automationHandler', {
  '../services/shortcutsService': mockShortcutsService,
  '../services/pluginService': mockPluginService,
  '../logger': { error: () => {}, log: () => {} }, // Silence logger
  '../../../shared/utils/ipcResponse': require('../shared/utils/ipcResponse'),
});

describe('Automation IPC Integration Tests', () => {
  describe('runShortcut', () => {
    test('should execute shortcut service when valid', async () => {
      const result = await automationHandler.runShortcut(null, 'My Shortcut');
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(mockShortcutsService.runShortcut.mock.callCount(), 1);
      assert.strictEqual(mockShortcutsService.runShortcut.mock.calls[0].arguments[0], 'My Shortcut');
    });

    test('should handle service errors gracefully', async () => {
      // Mock failure
      mockShortcutsService.runShortcut.mock.mockImplementationOnce(async () => {
        throw new Error('Shortcut execution failed');
      });

      const result = await automationHandler.runShortcut(null, 'Broken Shortcut');
      
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Shortcut execution failed');
    });
  });

  describe('runPlugin', () => {
    test('should execute plugin service when valid', async () => {
      const result = await automationHandler.runPlugin(null, 'test-plugin.applescript');
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(mockPluginService.runPlugin.mock.callCount(), 1);
      assert.strictEqual(mockPluginService.runPlugin.mock.calls[0].arguments[0], 'test-plugin.applescript');
    });

    test('should handle service errors gracefully', async () => {
      // Mock failure
      mockPluginService.runPlugin.mock.mockImplementationOnce(async () => {
        throw new Error('Plugin execution failed');
      });

      const result = await automationHandler.runPlugin(null, 'broken-plugin.applescript');
      
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Plugin execution failed');
    });
  });
});
