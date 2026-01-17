/**
 * Default settings for RAU
 */

export const DEFAULT_SETTINGS = {
  // Search categories enabled by default
  searchApps: true,
  searchTabs: true,
  searchFiles: true,

  // UI preferences
  onboardingComplete: false,

  // Advanced settings
  maxResults: 20,
  searchDebounceMs: 150,
}

/**
 * Get default settings with user overrides
 * @param {Object} userSettings - User's saved settings
 * @returns {Object} Merged settings
 */
export function getSettingsWithDefaults(userSettings = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...userSettings,
  }
}
