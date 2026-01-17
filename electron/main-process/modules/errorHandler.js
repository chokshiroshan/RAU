/**
 * Error Handler Module
 * Handles fatal errors and provides recovery mechanisms
 */

const { app, dialog } = require('electron')
const logger = require('../logger')

// References set externally to avoid circular deps
let createWindowCallback = null
let registerHandlersCallback = null

/**
 * Set the callback for creating windows
 * @param {Function} callback - Function to create the main window
 */
function setCreateWindowCallback(callback) {
  createWindowCallback = callback
}

/**
 * Set the callback for registering handlers
 * @param {Function} callback - Function to register IPC handlers
 */
function setRegisterHandlersCallback(callback) {
  registerHandlersCallback = callback
}

/**
 * Show error dialog and attempt graceful recovery
 * @param {string} type - Error type description
 * @param {Error} error - The error object
 */
function handleFatalError(type, error) {
  logger.error(`[FATAL] ${type}:`, error)

  // Show user-facing dialog
  dialog.showErrorBox(
    'RAU Error',
    `An unexpected error occurred:\n\n${error.message}\n\nThe app will attempt to recover.`
  )

  // Attempt recovery: recreate window for renderer crashes
  if (type === 'Renderer crash' && createWindowCallback) {
    createWindowCallback().then(win => {
      if (registerHandlersCallback) {
        registerHandlersCallback(win)
      }
    }).catch(() => {
      // If recovery fails, quit
      app.quit()
    })
  } else {
    // For other fatal errors, quit cleanly
    app.quit()
  }
}

/**
 * Set up global error handlers for the process
 */
function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (error) => {
    handleFatalError('Uncaught exception', error)
  })

  process.on('unhandledRejection', (reason, _promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    handleFatalError('Unhandled rejection', error)
  })
}

module.exports = {
  handleFatalError,
  setupGlobalErrorHandlers,
  setCreateWindowCallback,
  setRegisterHandlersCallback,
}
