const fs = require('fs/promises');
const path = require('path');
const { app } = require('electron');
const { execFile } = require('child_process');
const logger = require('../logger');
const { validatePluginFilename } = require('../../../shared/validation/validators');

// Define plugin directory (in Documents/RAU/plugins)
// In dev, this might be relative to the project root if we are running from there.
// For robustness, we'll try to resolve it relative to the user's documents.
let PLUGINS_DIR;
try {
  PLUGINS_DIR = path.join(app.getPath('documents'), 'RAU', 'plugins');
} catch (error) {
  // If app is not ready, we might fail to get path. 
  // However, this module is required at top-level. 
  // We should defer PLUGINS_DIR initialization or handle the error.
  console.error('[PluginService] Failed to initialize PLUGINS_DIR at startup:', error);
  // Fallback or leave undefined (will be fixed in lazy getter)
}

class PluginService {
  constructor() {
    this.cachedPlugins = [];
    this.lastFetch = 0;
    this.CACHE_TTL = 5000; // 5 seconds (fast refresh for dev)
  }

  getPluginsDir() {
    if (!PLUGINS_DIR) {
        try {
            PLUGINS_DIR = path.join(app.getPath('documents'), 'RAU', 'plugins');
        } catch (e) {
            logger.error('[PluginService] Could not determine plugins directory:', e);
            return null;
        }
    }
    return PLUGINS_DIR;
  }

  /**
   * Ensure the plugins directory exists
   */
  async ensureDir() {
    const dir = this.getPluginsDir();
    if (!dir) return;

    try {
      await fs.access(dir);
    } catch {
      try {
        await fs.mkdir(dir, { recursive: true });
        logger.log(`[PluginService] Created plugins directory at ${dir}`);
      } catch (err) {
        logger.error('[PluginService] Failed to create plugins directory:', err);
      }
    }
  }

  /**
   * Parse metadata from AppleScript content
   * syntax: -- @key: value
   */
  parseMetadata(content) {
    const metadata = {
      name: null,
      description: null,
      icon: null,
    };

    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^--\s*@(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        if (Object.keys(metadata).includes(key)) {
          metadata[key] = value.trim();
        }
      }
    }
    return metadata;
  }

  /**
   * Get all valid plugins
   */
  async getPlugins() {
    const now = Date.now();
    if (this.cachedPlugins.length > 0 && now - this.lastFetch < this.CACHE_TTL) {
      return this.cachedPlugins;
    }

    const dir = this.getPluginsDir();
    if (!dir) return [];

    await this.ensureDir();

    try {
      const files = await fs.readdir(dir);
      const plugins = [];

      for (const file of files) {
        if (!file.endsWith('.applescript')) continue;

        const filePath = path.join(dir, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const meta = this.parseMetadata(content);
          
          // Use filename as fallback name
          const name = meta.name || file.replace('.applescript', '');

          plugins.push({
            id: file,
            name: name,
            description: meta.description || 'Custom AppleScript Plugin',
            path: filePath,
            type: 'plugin',
            icon: meta.icon
          });
        } catch (err) {
          logger.warn(`[PluginService] Failed to load plugin ${file}:`, err);
        }
      }

      this.cachedPlugins = plugins;
      this.lastFetch = now;
      logger.log(`[PluginService] Loaded ${plugins.length} plugins`);
      return plugins;

    } catch (err) {
      logger.error('[PluginService] Failed to list plugins:', err);
      return [];
    }
  }

  /**
   * Run a plugin script
   */
  async runPlugin(filename) {
    const validation = validatePluginFilename(filename);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const dir = this.getPluginsDir();
    if (!dir) throw new Error('Plugins directory unavailable');

    const filePath = path.join(dir, validation.value);
    logger.log(`[PluginService] Running plugin: ${validation.value}`);

    return new Promise((resolve, reject) => {
      execFile('osascript', [filePath], (error, stdout, stderr) => {
        if (error) {
          logger.error(`[PluginService] Execution failed for ${filename}:`, error);
          return reject(error);
        }
        resolve(stdout);
      });
    });
  }
}

module.exports = new PluginService();
