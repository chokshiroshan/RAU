/**
 * Application Menu Module
 * Creates and manages the native macOS application menu
 */

const { Menu, dialog } = require('electron')

// Reference to settings window opener (set externally to avoid circular deps)
let openSettingsCallback = null

/**
 * Set the callback for opening settings window
 * @param {Function} callback - Function to open settings window
 */
function setOpenSettingsCallback(callback) {
  openSettingsCallback = callback
}

/**
 * Create and set the native macOS application menu
 */
function createAppMenu() {
  const template = [
    {
      label: 'ContextSearch',
      submenu: [
        {
          label: 'Preferences...',
          accelerator: 'Command+,',
          click: () => {
            if (openSettingsCallback) {
              openSettingsCallback()
            }
          }
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'Development',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Command+Option+I',
          click: () => {
            const { BrowserWindow } = require('electron')
            const win = BrowserWindow.getFocusedWindow()
            if (win) {
              win.webContents.toggleDevTools()
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About ContextSearch',
          click: () => {
            dialog.showMessageBox({
              title: 'About ContextSearch',
              message: 'ContextSearch',
              detail: 'A fast, elegant launcher for macOS\n\nVersion 1.0.0'
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

module.exports = {
  createAppMenu,
  setOpenSettingsCallback,
}
