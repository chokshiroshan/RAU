const logger = require('../logger');
const { success, error } = require('../../../shared/utils/ipcResponse');

// Lazy load services to prevent startup crashes if dependencies fail
let shortcutsService = null;
let pluginService = null;

function getShortcutsService() {
  if (!shortcutsService) {
    try {
      shortcutsService = require('../services/shortcutsService');
    } catch (e) {
      logger.error('[AutomationHandler] Failed to load shortcutsService:', e);
      // Return dummy service
      return { getShortcuts: async () => [], runShortcut: async () => {} };
    }
  }
  return shortcutsService;
}

function getPluginService() {
  if (!pluginService) {
    try {
      pluginService = require('../services/pluginService');
    } catch (e) {
      logger.error('[AutomationHandler] Failed to load pluginService:', e);
      // Return dummy service
      return { getPlugins: async () => [], runPlugin: async () => {} };
    }
  }
  return pluginService;
}

/**
 * Get all shortcuts
 */
async function getShortcuts() {
  try {
    const service = getShortcutsService();
    const shortcuts = await service.getShortcuts();
    return shortcuts.map(name => ({
      name,
      type: 'shortcut',
      description: 'macOS Shortcut'
    }));
  } catch (err) {
    logger.error('[AutomationHandler] Error fetching shortcuts:', err);
    return [];
  }
}

/**
 * Run a shortcut
 */
async function runShortcut(_event, name, input) {
  try {
    const service = getShortcutsService();
    await service.runShortcut(name, input);
    return success();
  } catch (err) {
    logger.error(`[AutomationHandler] Error running shortcut ${name}:`, err);
    return error(err);
  }
}

/**
 * Get all plugins
 */
async function getPlugins() {
  try {
    const service = getPluginService();
    return await service.getPlugins();
  } catch (err) {
    logger.error('[AutomationHandler] Error fetching plugins:', err);
    return [];
  }
}

/**
 * Run a plugin
 */
async function runPlugin(_event, filename) {
  try {
    const service = getPluginService();
    await service.runPlugin(filename);
    return success();
  } catch (err) {
    logger.error(`[AutomationHandler] Error running plugin ${filename}:`, err);
    return error(err);
  }
}

module.exports = {
  getShortcuts,
  runShortcut,
  getPlugins,
  runPlugin,
};
