import { ipcRenderer } from '../services/electron'
import { logger } from './logger'

/**
 * Safely invoke an IPC handler without throwing
 * @param {string} channel - IPC channel name
 * @param {...any} args - Arguments to pass to the handler
 * @returns {Promise<any|null>} Result from the main process handler or null on error
 */
export async function safeInvoke(channel, ...args) {
  try {
    return await ipcRenderer.invoke(channel, ...args)
  } catch (error) {
    // Error is already logged by ipcRenderer.invoke in services/electron.js
    // but we log it here again with context if needed, or just suppress the throw
    return null
  }
}
