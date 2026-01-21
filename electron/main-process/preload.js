/**
 * Preload script for RAU
 * Bridges the main process and renderer using contextBridge
 *
 * This script runs in the renderer process but has access to Node.js APIs.
 * It exposes a safe, limited API to the renderer via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron')
// const logger = require('./logger')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire ipcRenderer object
contextBridge.exposeInMainWorld('electronAPI', {
  // Event listeners
  onWindowShown: (callback) => {
    ipcRenderer.on('window-shown', callback)
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('window-shown', callback)
  },

  onRendererReady: (callback) => {
    ipcRenderer.once('renderer-ready', callback)
  },

  // Commands (invoke/handle pattern - returns Promise)
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  searchFiles: (query) => ipcRenderer.invoke('search-files', query),
  searchUnified: (query, filters, requestId) => ipcRenderer.invoke('search-unified', query, filters, requestId),
  getTabs: () => ipcRenderer.invoke('get-tabs'),
  activateTab: (tab) => ipcRenderer.invoke('activate-tab', tab),
  getApps: () => ipcRenderer.invoke('get-apps'),
  getAppIcon: (appPath) => ipcRenderer.invoke('get-app-icon', appPath),
  getAppIconByName: (appName) => ipcRenderer.invoke('get-app-icon-by-name', appName),
  openApp: (appPath) => ipcRenderer.invoke('open-app', appPath),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  clearAppsCache: () => ipcRenderer.invoke('clear-apps-cache'),
  executeCommand: (action) => ipcRenderer.invoke('execute-command', action),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),

  // Fire-and-forget messages
  hideWindow: () => ipcRenderer.send('hide-window'),
  signalRendererReady: () => ipcRenderer.send('renderer-ready'),
  setSearchActive: (active) => ipcRenderer.send('set-search-active', active),
  setHasQuery: (has) => ipcRenderer.send('set-has-query', has),

  // Window management
  resizeWindow: (expanded) => ipcRenderer.invoke('resize-window', expanded),

  // Onboarding state
  markOnboardingComplete: () => ipcRenderer.invoke('mark-onboarding-complete'),

  // Settings
  showSettings: () => ipcRenderer.invoke('show-settings'),

  // Scriptsmith window
  showScriptsmith: (prompt) => ipcRenderer.invoke('show-scriptsmith', prompt),

  // Automation (Shortcuts & Plugins)
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  runShortcut: (name, input) => ipcRenderer.invoke('run-shortcut', name, input),
  getPlugins: () => ipcRenderer.invoke('get-plugins'),
  runPlugin: (filename) => ipcRenderer.invoke('run-plugin', filename),

  // Scriptsmith (AI Script Generation)
  scriptsmithGenerate: (prompt) => ipcRenderer.invoke('scriptsmith-generate', prompt),
  scriptsmithSave: (script, filename) => ipcRenderer.invoke('scriptsmith-save', script, filename),
  scriptsmithSetApiKey: (provider, key) => ipcRenderer.invoke('scriptsmith-set-api-key', provider, key),
  scriptsmithSetProvider: (provider) => ipcRenderer.invoke('scriptsmith-set-provider', provider),
  scriptsmithSetModel: (model) => ipcRenderer.invoke('scriptsmith-set-model', model),
  scriptsmithGetProviders: () => ipcRenderer.invoke('scriptsmith-get-providers'),
  scriptsmithGetModels: (provider) => ipcRenderer.invoke('scriptsmith-get-models', provider),
  scriptsmithGetConfig: () => ipcRenderer.invoke('scriptsmith-get-config'),
  scriptsmithHasApiKey: () => ipcRenderer.invoke('scriptsmith-has-api-key'),
})

// Log when preload script is loaded
console.log('[Preload] Electron API exposed to renderer')
