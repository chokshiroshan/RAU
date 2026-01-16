/**
 * Electron bridge for the renderer process.
 *
 * With contextIsolation enabled, we access the main process via the
 * contextBridge API exposed in preload.js (window.electronAPI).
 */

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
    console.warn('[Electron] Not in Electron context, cannot invoke:', method)
    return null
  }
  try {
    return await electronAPI[method](...args)
  } catch (error) {
    console.error(`[Electron] Error invoking ${method}:`, error)
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
    console.warn('[Electron] Not in Electron context, cannot send:', method)
    return
  }
  try {
    electronAPI[method](...args)
  } catch (error) {
    console.error(`[Electron] Error sending ${method}:`, error)
  }
}

// Convenience exports matching the old ipcRenderer pattern
export const ipcRenderer = {
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
    }
    const method = methodMap[channel]
    if (!method) {
      throw new Error(`Unknown IPC channel: ${channel}`)
    }
    return invoke(method, ...args)
  },

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

  once: (channel, callback) => {
    if (channel === 'renderer-ready') {
      electronAPI?.onRendererReady?.(callback)
    }
  },

  removeListener: (channel, callback) => {
    // No-op for compatibility: on() returns an unsubscribe function
    // Legacy code may call removeListener, but cleanup is handled via unsubscribe
    // This prevents runtime errors when removeListener is called
  },
}

export const electron = { ipcRenderer }
