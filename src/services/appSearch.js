import { ipcRenderer } from './electron'
import { logger } from '../utils/logger'

/**
 * Get all installed macOS applications
 * This function queries the Electron main process which uses mdfind to discover apps
 * @returns {Promise<Array>} Array of app objects with name, path, and icon
 */
export async function getAllApps() {
  if (!ipcRenderer) {
    logger.warn('AppSearch', 'ipcRenderer unavailable; cannot fetch apps.')
    return []
  }

  try {
    const apps = await ipcRenderer.invoke('get-apps')
    return apps
  } catch (error) {
    logger.error('AppSearch', 'Error fetching apps', error)
    return []
  }
}

