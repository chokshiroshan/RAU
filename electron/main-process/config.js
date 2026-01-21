const path = require('path')
const fs = require('fs')
const logger = require('./logger')

// Get the path to the settings file (user-writable, stable across updates)
function getConfigPath() {
  const { app } = require('electron')
  return path.join(app.getPath('userData'), 'settings.json')
}

// Default settings
const DEFAULT_SETTINGS = {
  searchApps: true,
  searchTabs: true,
  searchFiles: true,
  searchCommands: true,
  searchShortcuts: true,
  searchPlugins: true,
  telemetryEnabled: false,
  onboardingComplete: false,
  selectedApps: [],
  // Appearance
  theme: 'system', // 'system', 'light', 'dark'
  windowPosition: 'center', // 'center', 'top'
  // Search Tuning
  fileExclusions: [
    '**/node_modules',
    '**/dist',
    '**/build',
    '**/.git',
    '**/.vscode',
    '**/coverage',
    '**/Library/Caches'
  ],
  webBangs: {
    g: { name: 'Google', url: 'https://google.com/search?q=', icon: '🔍' },
    w: { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Search/', icon: '📚' },
    yt: { name: 'YouTube', url: 'https://youtube.com/results?search_query=', icon: '▶️' },
    gh: { name: 'GitHub', url: 'https://github.com/search?q=', icon: '🐙' },
    so: { name: 'Stack Overflow', url: 'https://stackoverflow.com/search?q=', icon: '📋' },
    r: { name: 'Reddit', url: 'https://reddit.com/search?q=', icon: '🤖' }
  }
}

function getLegacyConfigPaths() {
  const { app } = require('electron')
  const bundledPath = path.join(__dirname, '..', 'settings.json')
  const exeDirPath = path.join(path.dirname(app.getPath('exe')), 'settings.json')

  // In packaged apps, prefer migrating user settings stored next to the executable
  // over any bundled settings shipped with the app.
  if (app.isPackaged) {
    return [exeDirPath, bundledPath]
  }

  // In dev, prefer the repo/electron settings.json first.
  return [bundledPath, exeDirPath]
}

function readSettingsFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    logger.error('[Config] Error reading settings file:', filePath, error)
    return null
  }
}

function writeSettingsFile(filePath, settings) {
  try {
    const dir = path.dirname(filePath)
    fs.mkdirSync(dir, { recursive: true })
    const tempPath = `${filePath}.tmp`
    fs.writeFileSync(tempPath, JSON.stringify(settings, null, 2))
    fs.renameSync(tempPath, filePath)
    return true
  } catch (error) {
    logger.error('[Config] Error writing settings:', error)
    return false
  }
}

function migrateLegacySettings(targetPath) {
  const legacyPaths = getLegacyConfigPaths()
  for (const legacyPath of legacyPaths) {
    const legacySettings = readSettingsFile(legacyPath)
    if (legacySettings) {
      const merged = { ...DEFAULT_SETTINGS, ...legacySettings }
      if (writeSettingsFile(targetPath, merged)) {
        logger.log('[Config] Migrated legacy settings from:', legacyPath)
        return merged
      }
    }
  }
  return null
}

/**
 * Read settings from config file
 * If file doesn't exist, create it with defaults
 */
function getSettings() {
  const configPath = getConfigPath()

  try {
    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      const migrated = migrateLegacySettings(configPath)
      if (migrated) return migrated

      // Create default config file
      writeSettingsFile(configPath, { ...DEFAULT_SETTINGS })
      logger.log('[Config] Created default settings file:', configPath)
      return { ...DEFAULT_SETTINGS }
    }

    // Read and parse config file
    const settings = readSettingsFile(configPath)
    if (!settings) {
      return { ...DEFAULT_SETTINGS }
    }

    // Merge with defaults to ensure all keys exist
    return { ...DEFAULT_SETTINGS, ...settings }
  } catch (error) {
    logger.error('[Config] Error reading settings:', error)
    return { ...DEFAULT_SETTINGS }
  }
}

/**
 * Save settings to config file
 */
function saveSettings(settings) {
  const configPath = getConfigPath()

  try {
    // Merge with defaults to ensure all keys exist
    const mergedSettings = { ...DEFAULT_SETTINGS, ...settings }

    // Write to config file
    writeSettingsFile(configPath, mergedSettings)
    logger.log('[Config] Saved settings:', mergedSettings)
    return true
  } catch (error) {
    logger.error('[Config] Error saving settings:', error)
    return false
  }
}

/**
 * Update a specific setting
 */
function updateSetting(key, value) {
  const settings = getSettings()
  settings[key] = value
  return saveSettings(settings)
}

module.exports = {
  getSettings,
  saveSettings,
  updateSetting,
  getConfigPath
}
