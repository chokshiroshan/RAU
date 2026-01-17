/**
 * Electron bridge for the renderer process.
 *
 * With contextIsolation enabled, we access the main process via the
 * contextBridge API exposed in preload.js (window.electronAPI).
 */

import { logger } from '../utils/logger'

// Get the exposed API from preload script
const electronAPI = typeof window !== 'undefined' ? window.electronAPI : null

export const isElectron = Boolean(electronAPI)

// Export the API directly for convenience
export const electronAPIReady = electronAPI

/**
 * Wrapper for IPC invoke calls that gracefully handles non-Electron contexts
 * @param {string} method - The method name on electronAPI
 * @param  {...any} args - Arguments to pass
 * @returns {Promise<any>} Result from IPC handler
 */
async function invoke(method, ...args) {
  if (!electronAPI) {
    logger.warn('Electron', 'Not in Electron context, cannot invoke:', method)
    return null
  }
  try {
    return await electronAPI[method](...args)
  } catch (error) {
    logger.error('Electron', `Error invoking ${method}:`, error)
    throw error
  }
}

/**
 * Wrapper for IPC send calls (fire-and-forget)
 * @param {string} method - The method name on electronAPI
 * @param  {...any} args - Arguments to pass
 */
function send(method, ...args) {
  if (!electronAPI) {
    logger.warn('Electron', 'Not in Electron context, cannot send:', method)
    return
  }
  try {
    electronAPI[method](...args)
  } catch (error) {
    logger.error('Electron', `Error sending ${method}:`, error)
  }
}

/**
 * Compatibility shim providing ipcRenderer-like API for renderer process.
 * Maps legacy IPC channel names to the new contextBridge API methods.
 */
export const ipcRenderer = {
  /**
   * Invoke an IPC handler and wait for response
   * @param {string} channel - Legacy IPC channel name (e.g., 'get-tabs')
   * @param {...any} args - Arguments to pass to the handler
   * @returns {Promise<any>} Result from the main process handler
   */
  invoke: (channel, ...args) => {
    const methodMap = {
      'open-file': 'openFile',
      'search-files': 'searchFiles',
      'get-tabs': 'getTabs',
      'activate-tab': 'activateTab',
      'get-apps': 'getApps',
      'get-app-icon': 'getAppIcon',
      'open-app': 'openApp',
      'get-settings': 'getSettings',
      'save-settings': 'saveSettings',
      'resize-window': 'resizeWindow',
      'execute-command': 'executeCommand',
      'open-url': 'openUrl',
      'mark-onboarding-complete': 'markOnboardingComplete',
      'show-settings': 'showSettings',
    }
    const method = methodMap[channel]
    if (!method) {
      throw new Error(`Unknown IPC channel: ${channel}`)
    }
    return invoke(method, ...args)
  },

  /**
   * Send a fire-and-forget message to the main process
   * @param {string} channel - Legacy IPC channel name
   * @param {...any} args - Arguments to pass
   */
  send: (channel, ...args) => {
    const methodMap = {
      'hide-window': 'hideWindow',
      'renderer-ready': 'signalRendererReady',
    }
    const method = methodMap[channel]
    if (!method) {
      throw new Error(`Unknown IPC channel: ${channel}`)
    }
    send(method, ...args)
  },

  /**
   * Register a listener for events from the main process
   * @param {string} channel - Legacy IPC channel name
   * @param {Function} callback - Event handler function
   * @returns {Function|undefined} Unsubscribe function
   */
  on: (channel, callback) => {
    const listenerMap = {
      'window-shown': 'onWindowShown',
    }
    const method = listenerMap[channel]
    if (!method) {
      throw new Error(`Unknown IPC channel for on: ${channel}`)
    }
    return electronAPI?.[method]?.(callback)
  },

  /**
   * Register a one-time listener for events from the main process
   * @param {string} channel - Legacy IPC channel name
   * @param {Function} callback - Event handler function
   */
  once: (channel, callback) => {
    if (channel === 'renderer-ready') {
      electronAPI?.onRendererReady?.(callback)
    }
  },

  /**
   * Remove an event listener (no-op for compatibility)
   * @param {string} channel - Legacy IPC channel name
   * @param {Function} callback - Original callback to remove
   */
  removeListener: (channel, callback) => {
    // on() returns an unsubscribe function; this is a no-op for legacy compatibility
  },
}

export const electron = { ipcRenderer }
