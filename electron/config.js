const path = require('path')
const fs = require('fs')
const { app } = require('electron')

// Get the path to the settings file
// Store it in the app's directory for portability
function getConfigPath() {
  // If packaged, store in the app's directory
  // If in development, store in the project root
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), 'settings.json')
  } else {
    return path.join(__dirname, '..', 'settings.json')
  }
}

// Default settings
const DEFAULT_SETTINGS = {
  searchApps: true,
  searchTabs: true,
  searchFiles: true
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
      // Create default config file
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_SETTINGS, null, 2))
      console.log('[Config] Created default settings file:', configPath)
      return { ...DEFAULT_SETTINGS }
    }

    // Read and parse config file
    const configData = fs.readFileSync(configPath, 'utf-8')
    const settings = JSON.parse(configData)

    // Merge with defaults to ensure all keys exist
    return { ...DEFAULT_SETTINGS, ...settings }
  } catch (error) {
    console.error('[Config] Error reading settings:', error)
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
    fs.writeFileSync(configPath, JSON.stringify(mergedSettings, null, 2))
    console.log('[Config] Saved settings:', mergedSettings)
    return true
  } catch (error) {
    console.error('[Config] Error saving settings:', error)
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
