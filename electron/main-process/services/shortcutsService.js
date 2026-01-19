const { execFile } = require('child_process');
const logger = require('../logger');
const { validateShortcutName } = require('../../../shared/validation/validators');

/**
 * Service to interact with macOS Shortcuts
 */
class ShortcutsService {
  constructor() {
    this.cachedShortcuts = [];
    this.lastFetch = 0;
    this.CACHE_TTL = 60 * 1000; // 1 minute cache
  }

  /**
   * List all available shortcuts
   * @returns {Promise<Array>} Array of shortcut names
   */
  async getShortcuts() {
    const now = Date.now();
    if (this.cachedShortcuts.length > 0 && now - this.lastFetch < this.CACHE_TTL) {
      return this.cachedShortcuts;
    }

    return new Promise((resolve, reject) => {
      execFile('shortcuts', ['list'], (error, stdout, stderr) => {
        if (error) {
          // If command not found (pre-macOS 12), return empty
          if (error.code === 'ENOENT') {
            logger.warn('[Shortcuts] CLI tool not found (requires macOS 12+)');
            return resolve([]);
          }
          logger.error('[Shortcuts] Failed to list shortcuts:', error);
          return resolve([]);
        }

        const shortcuts = stdout
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);

        this.cachedShortcuts = shortcuts;
        this.lastFetch = now;
        logger.log(`[Shortcuts] Found ${shortcuts.length} shortcuts`);
        resolve(shortcuts);
      });
    });
  }

  /**
   * Run a specific shortcut
   * @param {string} name - Name of the shortcut
   * @param {string} [input] - Optional text input to pass to the shortcut
   * @returns {Promise<void>}
   */
  async runShortcut(name, input = null) {
    const validation = validateShortcutName(name);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const sanitizedName = validation.value;
    logger.log(`[Shortcuts] Running shortcut: "${sanitizedName}"`);
    
    const args = ['run', '--', sanitizedName];
    
    return new Promise((resolve, reject) => {
      execFile('shortcuts', args, (error, stdout, stderr) => {
        if (error) {
          logger.error(`[Shortcuts] Failed to run "${sanitizedName}":`, error);
          return reject(error);
        }
        logger.log(`[Shortcuts] Successfully ran "${sanitizedName}"`);
        resolve(stdout);
      });
    });
  }
}

module.exports = new ShortcutsService();
