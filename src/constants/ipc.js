/**
 * IPC channel names
 * Centralized location to prevent typos and enable refactoring
 */

export const IPC_CHANNELS = {
  // Window events
  WINDOW_SHOWN: 'window-shown',
  HIDE_WINDOW: 'hide-window',
  RENDERER_READY: 'renderer-ready',

  // Actions
  OPEN_APP: 'open-app',
  OPEN_FILE: 'open-file',
  ACTIVATE_TAB: 'activate-tab',

  // Search/Data
  SEARCH_FILES: 'search-files',
  GET_APPS: 'get-apps',
  GET_TABS: 'get-tabs',
  GET_APP_ICON: 'get-app-icon',

  // Settings
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
}
